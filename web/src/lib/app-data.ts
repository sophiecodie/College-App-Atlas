import { and, asc, eq, notInArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db/client";
import { colleges, prompts, userColleges, users } from "@/db/schema";
import {
  normalizeFeeEntry,
  normalizeRecommendationSlots,
  normalizeRequirementsChecklist,
} from "@/lib/workspace-state";

export type AppUser = {
  id: string;
  email: string;
  name: string | null;
};

export type UserCollegeRecord = {
  id: string;
  slug: string;
  name: string;
  applicationCycle: string | null;
  selectedApplicationType: string | null;
  programSelection: string | null;
  status: string | null;
  quickNotes: string | null;
  promptCount: number;
  requirementsChecklist: Record<string, string | boolean>;
  fees: Record<string, unknown>;
  requiredRecommendations: Array<{ label: string; assigned_recommender: string }>;
  optionalRecommendations: Array<{ label: string; assigned_recommender: string }>;
};

export async function requireCurrentUser(): Promise<AppUser> {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    redirect("/");
  }

  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!row) {
    redirect("/");
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
  };
}

export async function getUserColleges(userId: string): Promise<UserCollegeRecord[]> {
  const rows = await db
    .select({
      id: userColleges.id,
      slug: colleges.slug,
      name: colleges.name,
      applicationCycle: colleges.applicationCycle,
      selectedApplicationType: userColleges.selectedApplicationType,
      programSelection: userColleges.programSelection,
      status: userColleges.status,
      quickNotes: userColleges.quickNotes,
      requirementsChecklist: userColleges.requirementsChecklist,
      fees: userColleges.fees,
      requiredRecommendations: userColleges.requiredRecommendations,
      optionalRecommendations: userColleges.optionalRecommendations,
      promptCount: sql<number>`count(${prompts.id})::int`,
    })
    .from(userColleges)
    .innerJoin(colleges, eq(userColleges.collegeSlug, colleges.slug))
    .leftJoin(prompts, eq(prompts.collegeSlug, colleges.slug))
    .where(eq(userColleges.userId, userId))
    .groupBy(
      userColleges.id,
      colleges.slug,
      colleges.name,
      colleges.applicationCycle,
      userColleges.selectedApplicationType,
      userColleges.programSelection,
      userColleges.status,
      userColleges.quickNotes,
      userColleges.requirementsChecklist,
      userColleges.fees,
      userColleges.requiredRecommendations,
      userColleges.optionalRecommendations,
    )
    .orderBy(asc(colleges.name));

  return rows.map((row) => ({
    ...row,
    requirementsChecklist: normalizeRequirementsChecklist(row.requirementsChecklist),
    fees: normalizeFeeEntry(row.fees, row.name),
    requiredRecommendations: normalizeRecommendationSlots(row.requiredRecommendations, "required"),
    optionalRecommendations: normalizeRecommendationSlots(row.optionalRecommendations, "optional"),
  }));
}

export async function getAvailableColleges(userId: string) {
  const existing = await db
    .select({ slug: userColleges.collegeSlug })
    .from(userColleges)
    .where(eq(userColleges.userId, userId));

  const existingSlugs = existing.map((row) => row.slug);

  return db
    .select({
      id: colleges.id,
      slug: colleges.slug,
      name: colleges.name,
      applicationCycle: colleges.applicationCycle,
      createdAt: colleges.createdAt,
      updatedAt: colleges.updatedAt,
    })
    .from(colleges)
    .where(existingSlugs.length > 0 ? notInArray(colleges.slug, existingSlugs) : undefined)
    .orderBy(asc(colleges.name));
}

export async function getUserCollegeBySlug(userId: string, slug: string) {
  const [record] = await db
    .select({
      id: userColleges.id,
      slug: colleges.slug,
      name: colleges.name,
      applicationCycle: colleges.applicationCycle,
      selectedApplicationType: userColleges.selectedApplicationType,
      programSelection: userColleges.programSelection,
      status: userColleges.status,
      quickNotes: userColleges.quickNotes,
      requirementsChecklist: userColleges.requirementsChecklist,
      fees: userColleges.fees,
      requiredRecommendations: userColleges.requiredRecommendations,
      optionalRecommendations: userColleges.optionalRecommendations,
      promptCount: sql<number>`count(${prompts.id})::int`,
    })
    .from(userColleges)
    .innerJoin(colleges, eq(userColleges.collegeSlug, colleges.slug))
    .leftJoin(prompts, eq(prompts.collegeSlug, colleges.slug))
    .where(and(eq(userColleges.userId, userId), eq(userColleges.collegeSlug, slug)))
    .groupBy(
      userColleges.id,
      colleges.slug,
      colleges.name,
      colleges.applicationCycle,
      userColleges.selectedApplicationType,
      userColleges.programSelection,
      userColleges.status,
      userColleges.quickNotes,
      userColleges.requirementsChecklist,
      userColleges.fees,
      userColleges.requiredRecommendations,
      userColleges.optionalRecommendations,
    );

  if (!record) {
    return null;
  }

  return {
    ...record,
    requirementsChecklist: normalizeRequirementsChecklist(record.requirementsChecklist),
    fees: normalizeFeeEntry(record.fees, record.name),
    requiredRecommendations: normalizeRecommendationSlots(record.requiredRecommendations, "required"),
    optionalRecommendations: normalizeRecommendationSlots(record.optionalRecommendations, "optional"),
  };
}
