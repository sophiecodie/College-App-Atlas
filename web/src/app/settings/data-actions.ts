"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { essayOutlines, generatedThemes, ideaCards, researchFindings } from "@/db/schema";
import { requireCurrentUser } from "@/lib/app-data";

const TARGETS = {
  ideas: async (userId: string) => {
    await db.delete(generatedThemes).where(eq(generatedThemes.userId, userId));
    await db.delete(ideaCards).where(eq(ideaCards.userId, userId));
  },
  themes: (userId: string) => db.delete(generatedThemes).where(eq(generatedThemes.userId, userId)),
  outlines: (userId: string) => db.delete(essayOutlines).where(eq(essayOutlines.userId, userId)),
  research: (userId: string) => db.delete(researchFindings).where(eq(researchFindings.userId, userId)),
  unsavedResearch: (userId: string) =>
    db.delete(researchFindings).where(and(eq(researchFindings.userId, userId), eq(researchFindings.saved, false))),
} as const;

/** Deletes one category of the signed-in user's AI-related data. Essay drafts are never touched here. */
export async function deleteMyDataAction(formData: FormData) {
  const user = await requireCurrentUser();
  const target = String(formData.get("target") ?? "") as keyof typeof TARGETS;
  if (!(target in TARGETS)) return;
  await TARGETS[target](user.id);
  revalidatePath("/settings");
  revalidatePath("/essays");
  revalidatePath("/research");
}
