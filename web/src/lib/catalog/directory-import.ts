import { eq, inArray, sql } from "drizzle-orm";

import type { AtlasDb } from "@/db/connect";
import { colleges } from "@/db/schema";
import { type DirectoryRecord, IPEDS_SOURCE } from "@/lib/catalog/ipeds";
import { buildSearchText, normalizeInstitutionName, slugify } from "@/lib/catalog/normalize";
import type { ImportRun } from "@/lib/catalog/runs";
import { SCORECARD_SOURCE, type ScorecardEnrichment } from "@/lib/catalog/scorecard";

/**
 * Manually created colleges whose short names would not match IPEDS exactly.
 * Slug → IPEDS UNITID, checked against the HD2024 file.
 */
export const MANUAL_COLLEGE_UNITIDS: Record<string, number> = {
  harvard: 166027,
  stanford: 243744,
  duke: 198419,
  princeton: 186131,
  yale: 130794,
};

const BATCH_SIZE = 400;

type ExistingCollege = {
  id: string;
  slug: string;
  name: string;
  origin: string;
  ipedsUnitid: number | null;
  alternativeNames: string[];
  dataSources: string[];
  snapshot: string;
};

type DesiredColumns = Omit<typeof colleges.$inferInsert, "id" | "slug" | "createdAt" | "applicationCycle" | "origin">;

const COMPARED_KEYS = [
  "name",
  "alternativeNames",
  "normalizedName",
  "searchText",
  "city",
  "state",
  "country",
  "institutionLevel",
  "control",
  "sector",
  "carnegieBasic",
  "degreeGranting",
  "hbcu",
  "systemName",
  "opeid",
  "opeid6",
  "isBranchCampus",
  "websiteUrl",
  "admissionsUrl",
  "applicationUrl",
  "isActive",
  "mergedIntoUnitid",
  "dataSources",
] as const;

function snapshotOf(row: Record<string, unknown>) {
  return JSON.stringify(COMPARED_KEYS.map((key) => row[key] ?? null));
}

async function loadExisting(db: AtlasDb) {
  const rows = await db
    .select({
      id: colleges.id,
      slug: colleges.slug,
      name: colleges.name,
      origin: colleges.origin,
      ipedsUnitid: colleges.ipedsUnitid,
      alternativeNames: colleges.alternativeNames,
      normalizedName: colleges.normalizedName,
      searchText: colleges.searchText,
      city: colleges.city,
      state: colleges.state,
      country: colleges.country,
      institutionLevel: colleges.institutionLevel,
      control: colleges.control,
      sector: colleges.sector,
      carnegieBasic: colleges.carnegieBasic,
      degreeGranting: colleges.degreeGranting,
      hbcu: colleges.hbcu,
      systemName: colleges.systemName,
      opeid: colleges.opeid,
      opeid6: colleges.opeid6,
      isBranchCampus: colleges.isBranchCampus,
      websiteUrl: colleges.websiteUrl,
      admissionsUrl: colleges.admissionsUrl,
      applicationUrl: colleges.applicationUrl,
      isActive: colleges.isActive,
      mergedIntoUnitid: colleges.mergedIntoUnitid,
      dataSources: colleges.dataSources,
    })
    .from(colleges);

  return rows.map(
    (row): ExistingCollege => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      origin: row.origin,
      ipedsUnitid: row.ipedsUnitid,
      alternativeNames: row.alternativeNames ?? [],
      dataSources: row.dataSources ?? [],
      snapshot: snapshotOf(row),
    }),
  );
}

/** Deterministic, never-reused slug: name, then name-state, then name-unitid. */
function assignSlug(record: DirectoryRecord, used: Set<string>) {
  const base = slugify(record.name) || `college-${record.unitid}`;
  const candidates = [base, record.state ? `${base}-${record.state.toLowerCase()}` : null, `${base}-${record.unitid}`];
  for (const candidate of candidates) {
    if (candidate && !used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  const fallback = `college-${record.unitid}`;
  used.add(fallback);
  return fallback;
}

function desiredColumns(record: DirectoryRecord, existing: ExistingCollege | undefined, now: Date): DesiredColumns {
  // Keep any names previously attached to the row (a manual name, an older official name) searchable.
  const keptNames = existing
    ? [...existing.alternativeNames, existing.origin === "manual" && existing.name !== record.name ? existing.name : null]
    : [];
  const aliases = [...new Set([...record.aliases, ...keptNames].filter((name): name is string => Boolean(name)))]
    .filter((alias) => alias !== record.name)
    .sort();

  return {
    name: record.name,
    alternativeNames: aliases,
    normalizedName: normalizeInstitutionName(record.name),
    searchText: buildSearchText(record.name, aliases, record.city),
    city: record.city,
    state: record.state,
    country: record.country,
    institutionLevel: record.institutionLevel,
    control: record.control,
    sector: record.sector,
    carnegieBasic: record.carnegieBasic,
    degreeGranting: record.degreeGranting,
    hbcu: record.hbcu,
    systemName: record.systemName,
    opeid: record.opeid,
    opeid6: record.opeid6,
    isBranchCampus: record.isBranchCampus,
    websiteUrl: record.websiteUrl,
    admissionsUrl: record.admissionsUrl,
    applicationUrl: record.applicationUrl,
    isActive: record.isActive,
    mergedIntoUnitid: record.mergedIntoUnitid,
    dataSources: [...new Set([...(existing?.dataSources ?? []), IPEDS_SOURCE])].sort(),
    sourceUpdatedAt: now,
    updatedAt: now,
  };
}

/**
 * Links manually created colleges (no UNITID yet) to IPEDS records:
 * 1. an explicit slug → UNITID mapping, then 2. a unique exact match on normalized name or alias.
 * Ambiguous or conflicting matches are reported and left alone.
 */
async function linkManualColleges(
  db: AtlasDb,
  existing: ExistingCollege[],
  records: DirectoryRecord[],
  run: ImportRun,
) {
  const byUnitid = new Map(records.map((record) => [record.unitid, record]));
  const claimed = new Set(existing.map((row) => row.ipedsUnitid).filter((id): id is number => id !== null));
  const byName = new Map<string, DirectoryRecord[]>();
  for (const record of records) {
    for (const name of [record.name, ...record.aliases]) {
      const key = normalizeInstitutionName(name);
      byName.set(key, [...(byName.get(key) ?? []), record]);
    }
  }

  for (const row of existing) {
    if (row.ipedsUnitid !== null) {
      continue;
    }
    let match: DirectoryRecord | undefined;
    const mapped = MANUAL_COLLEGE_UNITIDS[row.slug];
    if (mapped) {
      match = byUnitid.get(mapped);
    } else {
      const candidates = [
        ...new Map(
          [row.name, ...row.alternativeNames]
            .flatMap((name) => byName.get(normalizeInstitutionName(name)) ?? [])
            .map((record) => [record.unitid, record]),
        ).values(),
      ];
      if (candidates.length > 1) {
        await run.recordError(
          `college:${row.slug}`,
          `Manual college "${row.name}" matches ${candidates.length} IPEDS institutions (${candidates
            .map((record) => `${record.unitid} ${record.name}, ${record.city ?? "?"} ${record.state ?? ""}`)
            .join("; ")}). Left unlinked for review.`,
        );
        run.increment("manualAmbiguous");
        continue;
      }
      match = candidates[0];
    }

    if (!match) {
      run.increment("manualUnmatched");
      continue;
    }
    if (claimed.has(match.unitid)) {
      await run.recordError(
        `college:${row.slug}`,
        `Manual college "${row.name}" matches UNITID ${match.unitid}, which another college row already uses. Review for a duplicate.`,
      );
      run.increment("manualConflicts");
      continue;
    }

    await db.update(colleges).set({ ipedsUnitid: match.unitid }).where(eq(colleges.id, row.id));
    row.ipedsUnitid = match.unitid;
    claimed.add(match.unitid);
    run.increment("manualLinked");
  }
}

const UPSERT_SET = {
  name: sql`excluded.name`,
  alternativeNames: sql`excluded.alternative_names`,
  normalizedName: sql`excluded.normalized_name`,
  searchText: sql`excluded.search_text`,
  city: sql`excluded.city`,
  state: sql`excluded.state`,
  country: sql`excluded.country`,
  institutionLevel: sql`excluded.institution_level`,
  control: sql`excluded.control`,
  sector: sql`excluded.sector`,
  carnegieBasic: sql`excluded.carnegie_basic`,
  degreeGranting: sql`excluded.degree_granting`,
  hbcu: sql`excluded.hbcu`,
  systemName: sql`excluded.system_name`,
  opeid: sql`excluded.opeid`,
  opeid6: sql`excluded.opeid6`,
  isBranchCampus: sql`excluded.is_branch_campus`,
  websiteUrl: sql`excluded.website_url`,
  admissionsUrl: sql`excluded.admissions_url`,
  applicationUrl: sql`excluded.application_url`,
  isActive: sql`excluded.is_active`,
  mergedIntoUnitid: sql`excluded.merged_into_unitid`,
  dataSources: sql`excluded.data_sources`,
  sourceUpdatedAt: sql`excluded.source_updated_at`,
  updatedAt: sql`excluded.updated_at`,
};

export type DirectoryImportOptions = {
  /** Only institutions offering undergraduate programs are imported (default true). */
  undergraduateOnly?: boolean;
  /** Include institutions IPEDS reports as closed or inactive (default false). */
  includeInactive?: boolean;
  /**
   * The input is a complete directory file: previously imported institutions missing from it are marked
   * inactive (never deleted, since users may reference them).
   */
  fullSnapshot?: boolean;
  now?: Date;
};

/** Upserts IPEDS directory records by UNITID. Safe to rerun: unchanged rows are not written. */
export async function importDirectoryRecords(
  db: AtlasDb,
  input: Iterable<DirectoryRecord> | AsyncIterable<DirectoryRecord>,
  run: ImportRun,
  options: DirectoryImportOptions = {},
) {
  const now = options.now ?? new Date();
  const undergraduateOnly = options.undergraduateOnly ?? true;
  const includeInactive = options.includeInactive ?? false;

  const seen = new Map<number, DirectoryRecord>();
  for await (const record of input as AsyncIterable<DirectoryRecord>) {
    run.increment("rowsRead");
    if (seen.has(record.unitid)) {
      run.increment("duplicateRowsInFile");
      await run.recordError(`unitid:${record.unitid}`, "UNITID appears more than once in the source file; kept the first row.");
      continue;
    }
    seen.set(record.unitid, record);
  }

  const allRecords = [...seen.values()];
  const records = allRecords.filter((record) => {
    if (undergraduateOnly && !record.offersUndergrad) {
      run.increment("skippedNoUndergrad");
      return false;
    }
    if (!includeInactive && !record.isActive) {
      run.increment("skippedInactive");
      return false;
    }
    return true;
  });

  const existing = await loadExisting(db);
  await linkManualColleges(db, existing, records, run);

  const existingByUnitid = new Map(
    existing.filter((row) => row.ipedsUnitid !== null).map((row) => [row.ipedsUnitid!, row]),
  );
  const usedSlugs = new Set(existing.map((row) => row.slug));
  const pending: Array<typeof colleges.$inferInsert> = [];

  for (const record of records) {
    const current = existingByUnitid.get(record.unitid);
    const desired = desiredColumns(record, current, now);
    if (current) {
      if (current.snapshot === snapshotOf(desired as Record<string, unknown>)) {
        run.increment("unchanged");
        continue;
      }
      run.increment("updated");
      pending.push({ ...desired, slug: current.slug, ipedsUnitid: record.unitid, origin: current.origin });
    } else {
      run.increment("inserted");
      pending.push({ ...desired, slug: assignSlug(record, usedSlugs), ipedsUnitid: record.unitid, origin: "ipeds" });
    }
  }

  for (let index = 0; index < pending.length; index += BATCH_SIZE) {
    const batch = pending.slice(index, index + BATCH_SIZE);
    try {
      await db
        .insert(colleges)
        .values(batch)
        .onConflictDoUpdate({
          target: colleges.ipedsUnitid,
          targetWhere: sql`ipeds_unitid is not null`,
          set: UPSERT_SET,
        });
    } catch (error) {
      await run.recordError(
        `batch:${index}-${index + batch.length - 1}`,
        `Batch upsert failed: ${(error as Error).message}`,
      );
    }
  }

  if (options.fullSnapshot) {
    const present = new Set(records.map((record) => record.unitid));
    const missing = existing
      .filter((row) => row.ipedsUnitid !== null && row.dataSources.includes(IPEDS_SOURCE) && !present.has(row.ipedsUnitid))
      .map((row) => row.id);
    for (let index = 0; index < missing.length; index += BATCH_SIZE) {
      const ids = missing.slice(index, index + BATCH_SIZE);
      const updated = await db
        .update(colleges)
        .set({ isActive: false, updatedAt: now })
        .where(sql`${inArray(colleges.id, ids)} and ${colleges.isActive} = true`)
        .returning({ id: colleges.id });
      run.increment("markedInactive", updated.length);
    }
  }

  return run.stats;
}

/** Applies Scorecard metrics to colleges matched by UNITID. Rows for unknown UNITIDs are counted, not created. */
export async function applyScorecardEnrichment(
  db: AtlasDb,
  input: Iterable<ScorecardEnrichment> | AsyncIterable<ScorecardEnrichment>,
  run: ImportRun,
  now = new Date(),
) {
  const existing = await db
    .select({
      id: colleges.id,
      unitid: colleges.ipedsUnitid,
      admissionRate: colleges.admissionRate,
      undergradEnrollment: colleges.undergradEnrollment,
      satAverage: colleges.satAverage,
      websiteUrl: colleges.websiteUrl,
      dataSources: colleges.dataSources,
    })
    .from(colleges)
    .where(sql`${colleges.ipedsUnitid} is not null`);
  const byUnitid = new Map(existing.map((row) => [row.unitid!, row]));

  const updates: Array<{ id: string; set: Partial<typeof colleges.$inferInsert> }> = [];
  for await (const row of input as AsyncIterable<ScorecardEnrichment>) {
    run.increment("scorecardRowsRead");
    const current = byUnitid.get(row.unitid);
    if (!current) {
      run.increment("scorecardUnmatched");
      continue;
    }
    const rate = row.admissionRate === null ? null : row.admissionRate.toFixed(4);
    const currentRate = current.admissionRate === null ? null : Number(current.admissionRate).toFixed(4);
    const sources = [...new Set([...(current.dataSources ?? []), SCORECARD_SOURCE])].sort();
    const changed =
      rate !== currentRate ||
      row.undergradEnrollment !== current.undergradEnrollment ||
      row.satAverage !== current.satAverage ||
      (!current.websiteUrl && row.websiteUrl) ||
      sources.join() !== [...(current.dataSources ?? [])].sort().join();
    if (!changed) {
      run.increment("scorecardUnchanged");
      continue;
    }
    updates.push({
      id: current.id,
      set: {
        admissionRate: rate,
        undergradEnrollment: row.undergradEnrollment,
        satAverage: row.satAverage,
        websiteUrl: current.websiteUrl ?? row.websiteUrl,
        dataSources: sources,
        updatedAt: now,
      },
    });
  }

  for (const update of updates) {
    try {
      await db.update(colleges).set(update.set).where(eq(colleges.id, update.id));
      run.increment("scorecardUpdated");
    } catch (error) {
      await run.recordError(`college:${update.id}`, `Scorecard update failed: ${(error as Error).message}`);
    }
  }
  return run.stats;
}
