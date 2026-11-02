import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import type { AtlasDb } from "@/db/connect";
import { type AdmissionRound, applicationCycles, applicationDeadlines, colleges, userColleges } from "@/db/schema";
import { roundFromApplicationType, ROUND_LABELS } from "@/lib/catalog/cycles";

export type DeadlineView = {
  id: string;
  round: AdmissionRound;
  roundLabel: string;
  date: string | null;
  time: string | null;
  timezone: string | null;
  conditions: string | null;
  programScope: string[];
  sourceUrl: string | null;
  lastVerifiedAt: Date | null;
  stale: boolean;
};

export type CollegeRequirements = {
  academicYear: string;
  publicationStatus: string;
  platforms: string[];
  cycleNotes: string | null;
  /** Verified deadlines only: the only ones shown as authoritative. */
  deadlines: DeadlineView[];
  /** Count of deadlines found but not yet verified (shown as "awaiting verification"). */
  unverifiedDeadlineCount: number;
  officialUrl: string | null;
};

export async function getCollegeRequirements(db: AtlasDb, collegeId: string, academicYear: string): Promise<CollegeRequirements> {
  const [college] = await db
    .select({ admissionsUrl: colleges.admissionsUrl, websiteUrl: colleges.websiteUrl })
    .from(colleges)
    .where(eq(colleges.id, collegeId));
  const [cycle] = await db
    .select()
    .from(applicationCycles)
    .where(and(eq(applicationCycles.collegeId, collegeId), eq(applicationCycles.academicYear, academicYear)))
    .limit(1);

  const officialUrl = college?.admissionsUrl ?? college?.websiteUrl ?? null;
  if (!cycle) {
    return {
      academicYear,
      publicationStatus: "unknown",
      platforms: [],
      cycleNotes: null,
      deadlines: [],
      unverifiedDeadlineCount: 0,
      officialUrl,
    };
  }

  const rows = await db
    .select()
    .from(applicationDeadlines)
    .where(eq(applicationDeadlines.cycleId, cycle.id))
    .orderBy(asc(applicationDeadlines.deadlineDate));

  return {
    academicYear,
    publicationStatus: cycle.publicationStatus,
    platforms: cycle.platforms,
    cycleNotes: cycle.notes,
    deadlines: rows
      .filter((row) => row.verificationStatus === "verified")
      .map((row) => ({
        id: row.id,
        round: row.round as AdmissionRound,
        roundLabel: ROUND_LABELS[row.round as AdmissionRound] ?? row.round,
        date: row.deadlineDate,
        time: row.deadlineTime,
        timezone: row.timezone,
        conditions: row.conditions,
        programScope: row.programScope,
        sourceUrl: row.sourceUrl,
        lastVerifiedAt: row.lastVerifiedAt,
        stale: Boolean(row.staleReason),
      })),
    unverifiedDeadlineCount: rows.filter((row) => ["pending_review", "conflicting"].includes(row.verificationStatus)).length,
    officialUrl,
  };
}

/** The verified deadline for the user's selected round and program, if one exists. Never falls back to another round. */
export function deadlineForSelection(
  deadlines: DeadlineView[],
  selectedApplicationType: string | null,
  programSelection: string | null,
) {
  const round = roundFromApplicationType(selectedApplicationType);
  if (!round) {
    return null;
  }
  const program = String(programSelection ?? "").trim().toLowerCase();
  const matches = deadlines.filter((deadline) => deadline.round === round);
  return (
    matches.find((deadline) => deadline.programScope.map((scope) => scope.toLowerCase()).includes(program)) ??
    matches.find((deadline) => deadline.programScope.length === 0) ??
    null
  );
}

export type UpcomingDeadline = {
  collegeSlug: string;
  collegeName: string;
  round: AdmissionRound | null;
  selectedApplicationType: string | null;
  /** Verified official date for the selected round, when one exists. */
  officialDate: string | null;
  officialTime: string | null;
  officialTimezone: string | null;
  /** The student's own date for this school (shown separately and labelled as personal). */
  personalDate: string | null;
  officialUrl: string | null;
  status: "verified" | "awaiting_verification" | "no_round_selected";
};

/** Deadlines for the user's active colleges in one cycle, using only verified data for official dates. */
export async function getUpcomingDeadlinesForUser(db: AtlasDb, userId: string, academicYear: string) {
  const saved = await db
    .select({
      collegeId: colleges.id,
      slug: colleges.slug,
      name: colleges.name,
      admissionsUrl: colleges.admissionsUrl,
      websiteUrl: colleges.websiteUrl,
      selectedApplicationType: userColleges.selectedApplicationType,
      programSelection: userColleges.programSelection,
      personalDeadline: userColleges.personalDeadline,
    })
    .from(userColleges)
    .innerJoin(colleges, eq(colleges.slug, userColleges.collegeSlug))
    .where(and(eq(userColleges.userId, userId), isNull(userColleges.archivedAt)));

  if (saved.length === 0) {
    return [];
  }

  const deadlineRows = await db
    .select({
      collegeId: applicationDeadlines.collegeId,
      id: applicationDeadlines.id,
      round: applicationDeadlines.round,
      date: applicationDeadlines.deadlineDate,
      time: applicationDeadlines.deadlineTime,
      timezone: applicationDeadlines.timezone,
      conditions: applicationDeadlines.conditions,
      programScope: applicationDeadlines.programScope,
      sourceUrl: applicationDeadlines.sourceUrl,
      lastVerifiedAt: applicationDeadlines.lastVerifiedAt,
      staleReason: applicationDeadlines.staleReason,
    })
    .from(applicationDeadlines)
    .innerJoin(applicationCycles, eq(applicationCycles.id, applicationDeadlines.cycleId))
    .where(
      and(
        eq(applicationCycles.academicYear, academicYear),
        eq(applicationDeadlines.verificationStatus, "verified"),
        inArray(
          applicationDeadlines.collegeId,
          saved.map((row) => row.collegeId),
        ),
      ),
    );

  const byCollege = new Map<string, DeadlineView[]>();
  for (const row of deadlineRows) {
    const list = byCollege.get(row.collegeId) ?? [];
    list.push({
      id: row.id,
      round: row.round as AdmissionRound,
      roundLabel: ROUND_LABELS[row.round as AdmissionRound] ?? row.round,
      date: row.date,
      time: row.time,
      timezone: row.timezone,
      conditions: row.conditions,
      programScope: row.programScope,
      sourceUrl: row.sourceUrl,
      lastVerifiedAt: row.lastVerifiedAt,
      stale: Boolean(row.staleReason),
    });
    byCollege.set(row.collegeId, list);
  }

  const upcoming: UpcomingDeadline[] = saved.map((row) => {
    const round = roundFromApplicationType(row.selectedApplicationType);
    const match = deadlineForSelection(byCollege.get(row.collegeId) ?? [], row.selectedApplicationType, row.programSelection);
    return {
      collegeSlug: row.slug,
      collegeName: row.name,
      round,
      selectedApplicationType: row.selectedApplicationType,
      officialDate: match?.date ?? null,
      officialTime: match?.time ?? null,
      officialTimezone: match?.timezone ?? null,
      personalDate: row.personalDeadline,
      officialUrl: row.admissionsUrl ?? row.websiteUrl,
      status: !round ? "no_round_selected" : match ? "verified" : "awaiting_verification",
    };
  });

  return upcoming.sort((left, right) => {
    const a = left.officialDate ?? left.personalDate ?? "9999";
    const b = right.officialDate ?? right.personalDate ?? "9999";
    return a.localeCompare(b) || left.collegeName.localeCompare(right.collegeName);
  });
}

export function formatDeadlineDate(date: string | null, time?: string | null, timezone?: string | null) {
  if (!date) {
    return "Rolling";
  }
  const label = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return [label, time ? time.slice(0, 5) : null, timezone].filter(Boolean).join(" · ");
}

