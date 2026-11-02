import { and, eq } from "drizzle-orm";

import type { AtlasDb } from "@/db/connect";
import { colleges, userColleges } from "@/db/schema";
import { APPLICATION_TYPE_OPTIONS } from "@/lib/catalog/cycles";
import {
  defaultFeeEntry,
  defaultRecommendationSlots,
  defaultRequirementsChecklist,
} from "@/lib/workspace-state";

export type AddCollegeResult = "added" | "restored" | "already_in_list" | "unknown_college";

/**
 * Adds a college to one user's list. A previously removed college is restored with its notes, checklist and
 * prompt choices intact; a college already in the list is left exactly as it is.
 */
export async function addCollegeForUser(
  db: AtlasDb,
  userId: string,
  collegeSlug: string,
  applicationType?: string | null,
): Promise<AddCollegeResult> {
  const [college] = await db
    .select({ id: colleges.id, slug: colleges.slug })
    .from(colleges)
    .where(eq(colleges.slug, collegeSlug))
    .limit(1);
  if (!college) {
    return "unknown_college";
  }

  const round = applicationType && APPLICATION_TYPE_OPTIONS.includes(applicationType) ? applicationType : null;
  const [existing] = await db
    .select({ id: userColleges.id, archivedAt: userColleges.archivedAt })
    .from(userColleges)
    .where(and(eq(userColleges.userId, userId), eq(userColleges.collegeSlug, collegeSlug)))
    .limit(1);

  if (existing) {
    if (!existing.archivedAt) {
      return "already_in_list";
    }
    await db
      .update(userColleges)
      .set({
        archivedAt: null,
        collegeId: college.id,
        ...(round ? { selectedApplicationType: round } : {}),
        updatedAt: new Date(),
      })
      .where(eq(userColleges.id, existing.id));
    return "restored";
  }

  await db
    .insert(userColleges)
    .values({
      userId,
      collegeSlug,
      collegeId: college.id,
      selectedApplicationType: round ?? "Regular Decision",
      programSelection: "general",
      status: "In Progress",
      quickNotes: "",
      requirementsChecklist: defaultRequirementsChecklist(),
      fees: defaultFeeEntry(),
      requiredRecommendations: defaultRecommendationSlots("required"),
      optionalRecommendations: defaultRecommendationSlots("optional"),
    })
    .onConflictDoNothing();
  return "added";
}

/** Removes a college from the user's list by archiving it, so notes, progress and drafts survive a re-add. */
export async function removeCollegeForUser(db: AtlasDb, userId: string, collegeSlug: string) {
  const updated = await db
    .update(userColleges)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(userColleges.userId, userId), eq(userColleges.collegeSlug, collegeSlug)))
    .returning({ id: userColleges.id });
  return updated.length > 0;
}

export async function setPersonalDeadline(
  db: AtlasDb,
  userId: string,
  collegeSlug: string,
  date: string | null,
  note: string | null,
) {
  const valid = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  await db
    .update(userColleges)
    .set({ personalDeadline: valid, personalDeadlineNote: note?.trim() || null, updatedAt: new Date() })
    .where(and(eq(userColleges.userId, userId), eq(userColleges.collegeSlug, collegeSlug)));
}
