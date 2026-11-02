import { and, asc, eq, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { AtlasDb } from "@/db/connect";
import {
  applicationCycles,
  applicationDeadlines,
  colleges,
  prompts,
  type VerificationStatus,
  VERIFICATION_STATUSES,
} from "@/db/schema";
import { contentHash } from "@/lib/catalog/normalize";

export type ReviewEntity = "prompt" | "deadline";
const REVIEWABLE: VerificationStatus[] = ["pending_review", "conflicting"];

export function isVerificationStatus(value: string): value is VerificationStatus {
  return (VERIFICATION_STATUSES as readonly string[]).includes(value);
}

export async function listPromptQueue(db: AtlasDb, options: { includeStale?: boolean; limit?: number } = {}) {
  const previous = alias(prompts, "previous_prompt");
  const condition = options.includeStale
    ? or(inArray(prompts.verificationStatus, REVIEWABLE), isNotNull(prompts.staleReason))
    : inArray(prompts.verificationStatus, REVIEWABLE);
  return db
    .select({
      id: prompts.id,
      promptId: prompts.promptId,
      collegeName: colleges.name,
      collegeSlug: prompts.collegeSlug,
      cycle: prompts.cycle,
      text: prompts.promptText,
      wordLimit: prompts.wordLimit,
      wordMin: prompts.wordMin,
      characterLimit: prompts.characterLimit,
      required: prompts.required,
      optionalChoice: prompts.isOptionalChoice,
      category: prompts.category,
      programScope: prompts.programScope,
      conditionalRules: prompts.conditionalRules,
      status: prompts.verificationStatus,
      sourceUrl: prompts.sourceUrl,
      collectedAt: prompts.collectedAt,
      reviewNote: prompts.reviewNote,
      staleReason: prompts.staleReason,
      ingestSource: prompts.ingestSource,
      previousText: previous.promptText,
      previousStatus: previous.verificationStatus,
      previousWordLimit: previous.wordLimit,
      previousCharacterLimit: previous.characterLimit,
    })
    .from(prompts)
    .leftJoin(colleges, eq(colleges.slug, prompts.collegeSlug))
    .leftJoin(previous, eq(previous.id, prompts.supersedesId))
    .where(condition)
    .orderBy(asc(colleges.name), asc(prompts.displayOrder), asc(prompts.promptId))
    .limit(options.limit ?? 200);
}

export async function listDeadlineQueue(db: AtlasDb, options: { includeStale?: boolean; limit?: number } = {}) {
  const previous = alias(applicationDeadlines, "previous_deadline");
  const condition = options.includeStale
    ? or(inArray(applicationDeadlines.verificationStatus, REVIEWABLE), isNotNull(applicationDeadlines.staleReason))
    : inArray(applicationDeadlines.verificationStatus, REVIEWABLE);
  return db
    .select({
      id: applicationDeadlines.id,
      collegeName: colleges.name,
      collegeSlug: colleges.slug,
      cycle: applicationCycles.academicYear,
      round: applicationDeadlines.round,
      date: applicationDeadlines.deadlineDate,
      time: applicationDeadlines.deadlineTime,
      timezone: applicationDeadlines.timezone,
      conditions: applicationDeadlines.conditions,
      programScope: applicationDeadlines.programScope,
      excerpt: applicationDeadlines.sourceExcerpt,
      status: applicationDeadlines.verificationStatus,
      sourceUrl: applicationDeadlines.sourceUrl,
      collectedAt: applicationDeadlines.collectedAt,
      reviewNote: applicationDeadlines.reviewNote,
      staleReason: applicationDeadlines.staleReason,
      previousDate: previous.deadlineDate,
      previousStatus: previous.verificationStatus,
    })
    .from(applicationDeadlines)
    .innerJoin(colleges, eq(colleges.id, applicationDeadlines.collegeId))
    .innerJoin(applicationCycles, eq(applicationCycles.id, applicationDeadlines.cycleId))
    .leftJoin(previous, eq(previous.id, applicationDeadlines.supersedesId))
    .where(condition)
    .orderBy(asc(colleges.name), asc(applicationDeadlines.deadlineDate))
    .limit(options.limit ?? 200);
}

function appendNote(existing: string | null, note: string) {
  return existing ? `${existing}\n${note}` : note;
}

/** Marks a candidate verified. The verified row it replaces becomes `outdated`; competing candidates become `rejected`. */
export async function approve(db: AtlasDb, entity: ReviewEntity, id: string, reviewer: string) {
  const now = new Date();
  const stamp = `${now.toISOString().slice(0, 10)} ${reviewer}`;

  if (entity === "prompt") {
    const [row] = await db.select().from(prompts).where(eq(prompts.id, id)).limit(1);
    if (!row) throw new Error("Prompt not found");
    if (row.supersedesId) {
      await db
        .update(prompts)
        .set({ verificationStatus: "outdated", reviewNote: `Replaced (${stamp}).`, updatedAt: now })
        .where(and(eq(prompts.id, row.supersedesId), eq(prompts.verificationStatus, "verified")));
    }
    if (row.slotKey && row.cycleId) {
      await db
        .update(prompts)
        .set({ verificationStatus: "rejected", reviewNote: `Another candidate for this question was verified (${stamp}).`, updatedAt: now })
        .where(
          and(
            eq(prompts.cycleId, row.cycleId),
            eq(prompts.slotKey, row.slotKey),
            eq(prompts.verificationStatus, "conflicting"),
            ne(prompts.id, id),
          ),
        );
    }
    await db
      .update(prompts)
      .set({
        verificationStatus: "verified",
        lastVerifiedAt: now,
        verifiedBy: reviewer,
        staleReason: null,
        staleDetectedAt: null,
        extractionStatus: "verified",
        updatedAt: now,
      })
      .where(eq(prompts.id, id));
    return;
  }

  const [row] = await db.select().from(applicationDeadlines).where(eq(applicationDeadlines.id, id)).limit(1);
  if (!row) throw new Error("Deadline not found");
  // One verified deadline per (cycle, round, program); retire the current one first.
  await db
    .update(applicationDeadlines)
    .set({ verificationStatus: "outdated", reviewNote: `Replaced (${stamp}).`, updatedAt: now })
    .where(
      and(
        eq(applicationDeadlines.cycleId, row.cycleId),
        eq(applicationDeadlines.naturalKey, row.naturalKey),
        eq(applicationDeadlines.verificationStatus, "verified"),
        ne(applicationDeadlines.id, id),
      ),
    );
  await db
    .update(applicationDeadlines)
    .set({ verificationStatus: "rejected", reviewNote: `Another candidate for this round was verified (${stamp}).`, updatedAt: now })
    .where(
      and(
        eq(applicationDeadlines.cycleId, row.cycleId),
        eq(applicationDeadlines.naturalKey, row.naturalKey),
        eq(applicationDeadlines.verificationStatus, "conflicting"),
        ne(applicationDeadlines.id, id),
      ),
    );
  await db
    .update(applicationDeadlines)
    .set({
      verificationStatus: "verified",
      lastVerifiedAt: now,
      verifiedBy: reviewer,
      staleReason: null,
      staleDetectedAt: null,
      updatedAt: now,
    })
    .where(eq(applicationDeadlines.id, id));
}

/** Sets a non-verified status (rejected, unavailable, outdated, pending_review, conflicting) with an audit note. */
export async function setStatus(
  db: AtlasDb,
  entity: ReviewEntity,
  id: string,
  status: VerificationStatus,
  reviewer: string,
  note?: string,
) {
  if (status === "verified") {
    return approve(db, entity, id, reviewer);
  }
  const now = new Date();
  const line = `${now.toISOString().slice(0, 10)} ${reviewer}: ${status}${note ? ` — ${note}` : ""}`;
  if (entity === "prompt") {
    const [row] = await db.select({ reviewNote: prompts.reviewNote }).from(prompts).where(eq(prompts.id, id));
    if (!row) throw new Error("Prompt not found");
    await db
      .update(prompts)
      .set({ verificationStatus: status, reviewNote: appendNote(row.reviewNote, line), updatedAt: now })
      .where(eq(prompts.id, id));
    return;
  }
  const [row] = await db
    .select({ reviewNote: applicationDeadlines.reviewNote })
    .from(applicationDeadlines)
    .where(eq(applicationDeadlines.id, id));
  if (!row) throw new Error("Deadline not found");
  await db
    .update(applicationDeadlines)
    .set({ verificationStatus: status, reviewNote: appendNote(row.reviewNote, line), updatedAt: now })
    .where(eq(applicationDeadlines.id, id));
}

/** Confirms a stale-flagged record is still correct after re-checking the source. */
export async function clearStale(db: AtlasDb, entity: ReviewEntity, id: string, reviewer: string) {
  const now = new Date();
  const set = { staleReason: null, staleDetectedAt: null, lastVerifiedAt: now, verifiedBy: reviewer, updatedAt: now };
  if (entity === "prompt") {
    await db.update(prompts).set(set).where(eq(prompts.id, id));
  } else {
    await db.update(applicationDeadlines).set(set).where(eq(applicationDeadlines.id, id));
  }
}

export type PromptEdit = {
  text: string;
  wordLimit: number | null;
  wordMin: number | null;
  characterLimit: number | null;
  required: boolean;
  optionalChoice: boolean;
  category: string | null;
  programScope: string[];
};

/**
 * Corrects a prompt in place so its prompt_id (and every draft attached to it) is unchanged.
 * The previous wording is kept in review_note. Edited rows go back to pending review unless approved after.
 */
export async function editPrompt(db: AtlasDb, id: string, edit: PromptEdit, reviewer: string) {
  const [row] = await db.select().from(prompts).where(eq(prompts.id, id)).limit(1);
  if (!row) throw new Error("Prompt not found");
  const now = new Date();
  const changes: string[] = [];
  if (row.promptText !== edit.text) changes.push(`text was: "${row.promptText}"`);
  if (row.wordLimit !== edit.wordLimit) changes.push(`word limit was ${row.wordLimit ?? "none"}`);
  if (row.characterLimit !== edit.characterLimit) changes.push(`character limit was ${row.characterLimit ?? "none"}`);
  await db
    .update(prompts)
    .set({
      promptText: edit.text,
      contentHash: contentHash(edit.text),
      wordLimit: edit.wordLimit,
      wordMin: edit.wordMin,
      characterLimit: edit.characterLimit,
      required: edit.required,
      isOptionalChoice: edit.optionalChoice,
      category: edit.category,
      primaryTag: edit.category,
      programScope: edit.programScope,
      verificationStatus: row.verificationStatus === "verified" ? "verified" : "pending_review",
      lastVerifiedAt: row.verificationStatus === "verified" ? now : row.lastVerifiedAt,
      verifiedBy: row.verificationStatus === "verified" ? reviewer : row.verifiedBy,
      reviewNote: appendNote(row.reviewNote, `${now.toISOString().slice(0, 10)} ${reviewer} edited${changes.length ? `: ${changes.join("; ")}` : ""}`),
      updatedAt: now,
    })
    .where(eq(prompts.id, id));
}

export type DeadlineEdit = {
  date: string | null;
  time: string | null;
  timezone: string | null;
  conditions: string | null;
};

export async function editDeadline(db: AtlasDb, id: string, edit: DeadlineEdit, reviewer: string) {
  const [row] = await db.select().from(applicationDeadlines).where(eq(applicationDeadlines.id, id)).limit(1);
  if (!row) throw new Error("Deadline not found");
  const now = new Date();
  await db
    .update(applicationDeadlines)
    .set({
      deadlineDate: edit.date,
      deadlineTime: edit.time,
      timezone: edit.timezone,
      conditions: edit.conditions,
      contentHash: contentHash([edit.date ?? "none", edit.time ?? "", edit.timezone ?? "", edit.conditions ?? ""].join("|")),
      lastVerifiedAt: row.verificationStatus === "verified" ? now : row.lastVerifiedAt,
      verifiedBy: row.verificationStatus === "verified" ? reviewer : row.verifiedBy,
      reviewNote: appendNote(
        row.reviewNote,
        `${now.toISOString().slice(0, 10)} ${reviewer} edited: date was ${row.deadlineDate ?? "none"}${row.deadlineTime ? ` ${row.deadlineTime}` : ""}`,
      ),
      updatedAt: now,
    })
    .where(eq(applicationDeadlines.id, id));
}

export type CoverageRow = {
  collegeId: string;
  slug: string;
  name: string;
  admissionsUrl: string | null;
  publicationStatus: string | null;
  cycleNotes: string | null;
  verifiedPrompts: number;
  pendingPrompts: number;
  verifiedDeadlines: number;
  pendingDeadlines: number;
  staleRecords: number;
};

/** Per-college coverage for one cycle, limited to colleges that have a cycle row or any prompt/deadline. */
export async function coverageReport(db: AtlasDb, academicYear: string): Promise<CoverageRow[]> {
  const rows = await db
    .select({
      collegeId: colleges.id,
      slug: colleges.slug,
      name: colleges.name,
      admissionsUrl: colleges.admissionsUrl,
      publicationStatus: applicationCycles.publicationStatus,
      cycleNotes: applicationCycles.notes,
      verifiedPrompts: sql<number>`(select count(*)::int from prompts p where p.cycle_id = ${applicationCycles.id} and p.verification_status = 'verified')`,
      pendingPrompts: sql<number>`(select count(*)::int from prompts p where p.cycle_id = ${applicationCycles.id} and p.verification_status in ('pending_review', 'conflicting'))`,
      verifiedDeadlines: sql<number>`(select count(*)::int from application_deadlines d where d.cycle_id = ${applicationCycles.id} and d.verification_status = 'verified')`,
      pendingDeadlines: sql<number>`(select count(*)::int from application_deadlines d where d.cycle_id = ${applicationCycles.id} and d.verification_status in ('pending_review', 'conflicting'))`,
      staleRecords: sql<number>`((select count(*)::int from prompts p where p.cycle_id = ${applicationCycles.id} and p.stale_reason is not null) + (select count(*)::int from application_deadlines d where d.cycle_id = ${applicationCycles.id} and d.stale_reason is not null))`,
    })
    .from(applicationCycles)
    .innerJoin(colleges, eq(colleges.id, applicationCycles.collegeId))
    .where(eq(applicationCycles.academicYear, academicYear))
    .orderBy(asc(colleges.name));
  return rows;
}

export async function catalogTotals(db: AtlasDb, academicYear: string) {
  const [row] = await db
    .select({
      colleges: sql<number>`(select count(*)::int from colleges)`,
      ipedsColleges: sql<number>`(select count(*)::int from colleges where ipeds_unitid is not null)`,
      fourYear: sql<number>`(select count(*)::int from colleges where institution_level = 'four_year' and is_active)`,
      cycles: sql<number>`(select count(*)::int from application_cycles where academic_year = ${academicYear})`,
      verifiedPrompts: sql<number>`(select count(*)::int from prompts where cycle = ${academicYear} and verification_status = 'verified')`,
      pendingPrompts: sql<number>`(select count(*)::int from prompts where cycle = ${academicYear} and verification_status in ('pending_review', 'conflicting'))`,
      verifiedDeadlines: sql<number>`(select count(*)::int from application_deadlines d join application_cycles c on c.id = d.cycle_id where c.academic_year = ${academicYear} and d.verification_status = 'verified')`,
      pendingDeadlines: sql<number>`(select count(*)::int from application_deadlines d join application_cycles c on c.id = d.cycle_id where c.academic_year = ${academicYear} and d.verification_status in ('pending_review', 'conflicting'))`,
      collegesWithVerifiedPrompts: sql<number>`(select count(distinct college_id)::int from prompts where cycle = ${academicYear} and verification_status = 'verified')`,
      collegesWithVerifiedDeadlines: sql<number>`(select count(distinct d.college_id)::int from application_deadlines d join application_cycles c on c.id = d.cycle_id where c.academic_year = ${academicYear} and d.verification_status = 'verified')`,
    })
    .from(sql`(select 1) as one`);
  return row!;
}

