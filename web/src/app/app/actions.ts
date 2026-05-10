"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { userColleges, userPromptPreferences } from "@/db/schema";
import { requireCurrentUser } from "@/lib/app-data";
import {
  defaultFeeEntry,
  defaultRecommendationSlots,
  defaultRequirementsChecklist,
} from "@/lib/workspace-state";

export async function addCollegeToDashboard(formData: FormData) {
  const user = await requireCurrentUser();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();

  if (!collegeSlug) {
    return;
  }

  const [existing] = await db
    .select({ id: userColleges.id })
    .from(userColleges)
    .where(and(eq(userColleges.userId, user.id), eq(userColleges.collegeSlug, collegeSlug)))
    .limit(1);

  if (!existing) {
    await db.insert(userColleges).values({
      userId: user.id,
      collegeSlug,
      selectedApplicationType: "Regular Decision",
      programSelection: "general",
      status: "In Progress",
      quickNotes: "",
      requirementsChecklist: defaultRequirementsChecklist(),
      fees: defaultFeeEntry(),
      requiredRecommendations: defaultRecommendationSlots("required"),
      optionalRecommendations: defaultRecommendationSlots("optional"),
    });
  }

  revalidatePath("/app");
  revalidatePath("/colleges");
  revalidatePath(`/colleges/${collegeSlug}`);
}

export async function updateUserCollege(formData: FormData) {
  const user = await requireCurrentUser();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();

  if (!collegeSlug) {
    return;
  }

  await db
    .update(userColleges)
    .set({
      selectedApplicationType: String(formData.get("selectedApplicationType") ?? "").trim() || null,
      programSelection: String(formData.get("programSelection") ?? "").trim() || null,
      status: String(formData.get("status") ?? "").trim() || null,
      quickNotes: String(formData.get("quickNotes") ?? ""),
      updatedAt: new Date(),
    })
    .where(and(eq(userColleges.userId, user.id), eq(userColleges.collegeSlug, collegeSlug)));

  revalidatePath("/app");
  revalidatePath("/colleges");
  revalidatePath(`/colleges/${collegeSlug}`);
  revalidatePath("/essays");
}

export async function removeCollegeFromDashboard(formData: FormData) {
  const user = await requireCurrentUser();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();

  if (!collegeSlug) {
    return;
  }

  await db
    .delete(userColleges)
    .where(and(eq(userColleges.userId, user.id), eq(userColleges.collegeSlug, collegeSlug)));

  revalidatePath("/app");
  revalidatePath("/colleges");
  revalidatePath(`/colleges/${collegeSlug}`);
  revalidatePath("/research");
  revalidatePath(`/research/${collegeSlug}`);
  revalidatePath("/essays");

  redirect("/colleges");
}

export async function updatePromptPreference(formData: FormData) {
  const user = await requireCurrentUser();
  const promptId = String(formData.get("promptId") ?? "").trim();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();

  if (!promptId || !collegeSlug) {
    return;
  }

  const selected = String(formData.get("selected") ?? "").trim() === "true";
  const completed = String(formData.get("completed") ?? "").trim() === "true";

  const [existing] = await db
    .select({ id: userPromptPreferences.id })
    .from(userPromptPreferences)
    .where(and(eq(userPromptPreferences.userId, user.id), eq(userPromptPreferences.promptId, promptId)))
    .limit(1);

  if (existing) {
    await db
      .update(userPromptPreferences)
      .set({
        selected,
        completed,
        updatedAt: new Date(),
      })
      .where(eq(userPromptPreferences.id, existing.id));
  } else {
    await db.insert(userPromptPreferences).values({
      userId: user.id,
      promptId,
      selected,
      completed,
    });
  }

  revalidatePath(`/colleges/${collegeSlug}`);
  revalidatePath("/essays");
}
