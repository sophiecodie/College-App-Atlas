"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { essayDrafts } from "@/db/schema";
import { normalizeEssayStatus } from "@/lib/essays-shared";
import { requireCurrentUser } from "@/lib/app-data";
import {
  ensureWorkspaceState,
  normalizeEssayWorkspaceSettings,
  normalizeSettingsState,
  updateWorkspaceState,
} from "@/lib/workspace-state";

function normalizeTags(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

export async function saveEssayDraft(formData: FormData) {
  const user = await requireCurrentUser();
  const draftId = String(formData.get("draftId") ?? "").trim();
  const promptId = String(formData.get("promptId") ?? "").trim();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  const status = normalizeEssayStatus(String(formData.get("status") ?? ""), content);

  if (!promptId || !collegeSlug) {
    return;
  }

  if (draftId && !draftId.startsWith("draft-")) {
    await db
      .update(essayDrafts)
      .set({
        title,
        content,
        status,
        updatedAt: new Date(),
      })
      .where(and(eq(essayDrafts.id, draftId), eq(essayDrafts.userId, user.id)));
  } else {
    await db.insert(essayDrafts).values({
      userId: user.id,
      promptId,
      title,
      content,
      status,
    });
  }

  revalidatePath("/essays");
  revalidatePath(`/colleges/${collegeSlug}`);
}

export async function createEssayVersion(formData: FormData) {
  const user = await requireCurrentUser();
  const promptId = String(formData.get("promptId") ?? "").trim();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  const status = normalizeEssayStatus(String(formData.get("status") ?? ""), content);

  if (!promptId || !collegeSlug) {
    return;
  }

  await db.insert(essayDrafts).values({
    userId: user.id,
    promptId,
    title,
    content,
    status,
  });

  revalidatePath("/essays");
  revalidatePath(`/colleges/${collegeSlug}`);
}

export async function deleteEssayVersion(formData: FormData) {
  const user = await requireCurrentUser();
  const draftId = String(formData.get("draftId") ?? "").trim();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();

  if (!draftId || !collegeSlug || draftId.startsWith("draft-")) {
    return;
  }

  await db
    .delete(essayDrafts)
    .where(and(eq(essayDrafts.id, draftId), eq(essayDrafts.userId, user.id)));

  revalidatePath("/essays");
  revalidatePath(`/colleges/${collegeSlug}`);
}

export async function saveEssayTags(formData: FormData) {
  const user = await requireCurrentUser();
  const promptId = String(formData.get("promptId") ?? "").trim();
  const tags = normalizeTags(String(formData.get("tags") ?? ""));

  if (!promptId) {
    return;
  }

  const workspace = await ensureWorkspaceState(user.id);
  const settings = normalizeSettingsState(workspace.settingsState);
  const essayWorkspace = normalizeEssayWorkspaceSettings(settings.essayWorkspace);

  await updateWorkspaceState(user.id, {
    settingsState: {
      ...settings,
      essayWorkspace: {
        ...essayWorkspace,
        promptTags: {
          ...essayWorkspace.promptTags,
          [promptId]: tags,
        },
      },
    },
  });

  revalidatePath("/essays");
}
