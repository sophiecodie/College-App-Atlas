"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { requireCurrentUser } from "@/lib/app-data";
import { addCollegeForUser } from "@/lib/catalog/user-colleges";
import { getInterests, saveInterests } from "@/lib/research/findings";
import { ensureWorkspaceState, FOCUS_OPTIONS, normalizeSettingsState, updateWorkspaceState } from "@/lib/workspace-state";

const onboardingInput = z.object({
  name: z.string().trim().max(80),
  grade: z.string().trim().max(40),
  location: z.string().trim().max(80),
  colleges: z.array(z.string().trim().min(1).max(120)).max(30),
  focus: z.array(z.enum(FOCUS_OPTIONS)).max(FOCUS_OPTIONS.length),
  interests: z.array(z.string().trim().min(1).max(60)).max(8),
});

export async function completeOnboardingAction(input: z.input<typeof onboardingInput>) {
  const user = await requireCurrentUser();
  const data = onboardingInput.parse(input);
  const workspace = await ensureWorkspaceState(user.id);
  const settings = normalizeSettingsState(workspace.settingsState);

  await updateWorkspaceState(user.id, {
    settingsState: {
      ...settings,
      profile: { ...settings.profile, ...(data.name ? { student_name: data.name } : {}) },
      onboarding: {
        completed: true,
        completedAt: new Date().toISOString(),
        grade: data.grade,
        location: data.location,
        focus: data.focus,
        interests: data.interests,
      },
    },
  });

  for (const slug of data.colleges) {
    const result = await addCollegeForUser(db, user.id, slug, null);
    // Interests double as the starting point for each college's AI research.
    if (data.interests.length > 0 && result !== "unknown_college" && (await getInterests(db, user.id, slug)).length === 0) {
      await saveInterests(db, user.id, slug, data.interests);
    }
  }

  revalidatePath("/app");
  revalidatePath("/colleges");
  return { ok: true as const };
}
