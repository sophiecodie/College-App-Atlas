import { and, desc, eq, inArray, sql } from "drizzle-orm";

import type { AtlasDb } from "@/db/connect";
import {
  admissionsSources,
  applicationCycles,
  applicationDeadlines,
  colleges,
  prompts,
  sourceSnapshots,
} from "@/db/schema";
import { contentHash } from "@/lib/catalog/normalize";
import type { ImportRun } from "@/lib/catalog/runs";
import type { FetchResult } from "@/lib/ingest/fetcher";
import type { AdmissionsManifest, ManifestDeadline, ManifestPrompt } from "@/lib/ingest/manifest";
import { validateDeadlineCandidate, validatePromptCandidate } from "@/lib/ingest/validate";

/** Statuses that still describe the current state of a question slot or deadline key. */
const LIVE_STATUSES = ["verified", "pending_review", "conflicting"];

export type CollegeRef = { id: string; slug: string; name: string };

export async function findCollegeByUnitid(db: AtlasDb, unitid: number): Promise<CollegeRef | null> {
  const [row] = await db
    .select({ id: colleges.id, slug: colleges.slug, name: colleges.name })
    .from(colleges)
    .where(eq(colleges.ipedsUnitid, unitid))
    .limit(1);
  return row ?? null;
}

export async function ensureCycle(
  db: AtlasDb,
  collegeId: string,
  academicYear: string,
  update: { platforms?: string[]; publicationStatus?: string; notes?: string | null } = {},
) {
  const [existing] = await db
    .select()
    .from(applicationCycles)
    .where(and(eq(applicationCycles.collegeId, collegeId), eq(applicationCycles.academicYear, academicYear)))
    .limit(1);

  if (!existing) {
    const [created] = await db
      .insert(applicationCycles)
      .values({
        collegeId,
        academicYear,
        platforms: update.platforms ?? [],
        publicationStatus: update.publicationStatus ?? "unknown",
        notes: update.notes ?? null,
      })
      .onConflictDoNothing()
      .returning();
    if (created) {
      return created;
    }
    const [raced] = await db
      .select()
      .from(applicationCycles)
      .where(and(eq(applicationCycles.collegeId, collegeId), eq(applicationCycles.academicYear, academicYear)));
    return raced!;
  }

  const patch: Partial<typeof applicationCycles.$inferInsert> = {};
  if (update.platforms && update.platforms.length > 0 && update.platforms.join() !== existing.platforms.join()) {
    patch.platforms = update.platforms;
  }
  if (update.publicationStatus && update.publicationStatus !== existing.publicationStatus) {
    patch.publicationStatus = update.publicationStatus;
  }
  if (update.notes !== undefined && update.notes !== existing.notes) {
    patch.notes = update.notes;
  }
  if (Object.keys(patch).length === 0) {
    return existing;
  }
  const [updated] = await db
    .update(applicationCycles)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(applicationCycles.id, existing.id))
    .returning();
  return updated!;
}

/** Stores a fetched page. Identical content only bumps last_checked_at, so history holds one row per version. */
export async function recordSnapshot(
  db: AtlasDb,
  input: { collegeId: string | null; result: FetchResult; runId?: string | null },
) {
  const hash = input.result.ok ? contentHash(input.result.text) : null;
  const [latest] = await db
    .select({ id: sourceSnapshots.id, contentHash: sourceSnapshots.contentHash })
    .from(sourceSnapshots)
    .where(eq(sourceSnapshots.sourceUrl, input.result.url))
    .orderBy(desc(sourceSnapshots.fetchedAt))
    .limit(1);

  if (latest && hash && latest.contentHash === hash) {
    await db.update(sourceSnapshots).set({ lastCheckedAt: new Date() }).where(eq(sourceSnapshots.id, latest.id));
    return { snapshotId: latest.id, changed: false, previousHash: latest.contentHash };
  }
  if (!input.result.ok) {
    return { snapshotId: null, changed: false, previousHash: latest?.contentHash ?? null };
  }
  const [inserted] = await db
    .insert(sourceSnapshots)
    .values({
      collegeId: input.collegeId,
      sourceUrl: input.result.url,
      runId: input.runId ?? null,
      httpStatus: input.result.status,
      contentType: input.result.contentType,
      contentHash: hash,
      textContent: input.result.text,
      byteLength: input.result.byteLength,
    })
    .returning({ id: sourceSnapshots.id });
  return { snapshotId: inserted!.id, changed: Boolean(latest), previousHash: latest?.contentHash ?? null };
}

export async function upsertSourceRegistry(
  db: AtlasDb,
  collegeId: string,
  source: { url: string; kind: "essay_prompts" | "deadlines" | "both" },
  result: FetchResult | null,
  changed: boolean,
  adapter: string,
) {
  const now = new Date();
  await db
    .insert(admissionsSources)
    .values({
      collegeId,
      url: source.url,
      kind: source.kind,
      adapter,
      lastCheckedAt: result ? now : null,
      lastChangedAt: changed ? now : null,
      lastStatus: result?.status ?? null,
      lastError: result?.error ?? null,
    })
    .onConflictDoUpdate({
      target: [admissionsSources.collegeId, admissionsSources.url],
      set: {
        kind: source.kind,
        adapter,
        lastCheckedAt: result ? now : sql`${admissionsSources.lastCheckedAt}`,
        lastChangedAt: changed ? now : sql`${admissionsSources.lastChangedAt}`,
        lastStatus: result?.status ?? null,
        lastError: result?.error ?? null,
        updatedAt: now,
      },
    });
}

export type SubmitOutcome = "inserted" | "duplicate" | "superseding" | "conflicting" | "rejected_by_validation";

type Evidence = { snapshotId: string | null; collectedAt: Date; ingestSource: string };

export async function submitPrompt(
  db: AtlasDb,
  college: CollegeRef,
  cycle: { id: string; academicYear: string },
  prompt: ManifestPrompt,
  evidence: Evidence,
  displayOrder: number,
): Promise<SubmitOutcome> {
  const hash = contentHash(prompt.text);
  const [duplicate] = await db
    .select({
      id: prompts.id,
      snapshotId: prompts.snapshotId,
      slotKey: prompts.slotKey,
      sourceExcerpt: prompts.sourceExcerpt,
    })
    .from(prompts)
    .where(and(eq(prompts.cycleId, cycle.id), eq(prompts.contentHash, hash)))
    .limit(1);

  if (duplicate) {
    // Same text already known: attach fresh evidence, never change its status or the user-facing id.
    await db
      .update(prompts)
      .set({
        snapshotId: evidence.snapshotId ?? duplicate.snapshotId,
        collectedAt: evidence.collectedAt,
        slotKey: duplicate.slotKey ?? prompt.slot,
        sourceExcerpt: duplicate.sourceExcerpt ?? prompt.text,
        sourceUrl: sql`coalesce(${prompts.sourceUrl}, ${prompt.sourceUrl})`,
        staleReason: null,
        staleDetectedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(prompts.id, duplicate.id));
    return "duplicate";
  }

  const slotConditions = [eq(prompts.slotKey, prompt.slot)];
  if (prompt.replacesPromptId) {
    slotConditions.push(eq(prompts.promptId, prompt.replacesPromptId));
  }
  const live = await db
    .select({ id: prompts.id, status: prompts.verificationStatus, ingestSource: prompts.ingestSource })
    .from(prompts)
    .where(
      and(
        eq(prompts.collegeId, college.id),
        eq(prompts.cycleId, cycle.id),
        inArray(prompts.verificationStatus, LIVE_STATUSES),
        sql`(${sql.join(slotConditions, sql` or `)})`,
      ),
    );

  const verified = live.find((row) => row.status === "verified");
  const pendingSameSource = live.filter((row) => row.status !== "verified" && row.ingestSource === evidence.ingestSource);
  const pendingOtherSource = live.filter((row) => row.status !== "verified" && row.ingestSource !== evidence.ingestSource);

  let status = "pending_review";
  let note: string | null = null;
  let outcome: SubmitOutcome = "inserted";

  if (pendingSameSource.length > 0) {
    // The source changed again before anyone reviewed the earlier candidate: retire the stale candidate.
    await db
      .update(prompts)
      .set({ verificationStatus: "outdated", reviewNote: "Superseded by a newer capture before review.", updatedAt: new Date() })
      .where(inArray(prompts.id, pendingSameSource.map((row) => row.id)));
  }
  if (pendingOtherSource.length > 0) {
    status = "conflicting";
    note = `Differs from ${pendingOtherSource.length} other unreviewed candidate(s) for this question.`;
    await db
      .update(prompts)
      .set({ verificationStatus: "conflicting", reviewNote: "Another source reports different wording.", updatedAt: new Date() })
      .where(inArray(prompts.id, pendingOtherSource.map((row) => row.id)));
    outcome = "conflicting";
  } else if (verified) {
    outcome = "superseding";
    note = "Official page wording differs from the verified prompt. Review before replacing.";
  }

  await db.insert(prompts).values({
    promptId: `${college.slug}-${cycle.academicYear}-${hash.slice(0, 8)}`,
    collegeSlug: college.slug,
    collegeName: college.name,
    collegeId: college.id,
    cycleId: cycle.id,
    cycle: cycle.academicYear,
    promptText: prompt.text,
    promptType: prompt.promptType,
    required: prompt.required,
    isOptionalChoice: prompt.optionalChoice,
    wordLimit: prompt.wordLimit,
    wordMin: prompt.wordMin,
    characterLimit: prompt.characterLimit,
    primaryTag: prompt.category,
    category: prompt.category,
    programScope: prompt.programScope,
    conditionalRules: {
      ...(prompt.appliesToRounds.length > 0 ? { rounds: prompt.appliesToRounds } : {}),
      ...(prompt.conditionNote ? { note: prompt.conditionNote } : {}),
      ...(prompt.limitEvidence ? { limitEvidence: prompt.limitEvidence } : {}),
    },
    displayOrder,
    slotKey: prompt.slot,
    contentHash: hash,
    sourceUrl: prompt.sourceUrl,
    sourceType: "webpage",
    sourceExcerpt: prompt.text,
    snapshotId: evidence.snapshotId,
    ingestSource: evidence.ingestSource,
    extractionStatus: "source_validated",
    verificationStatus: status,
    supersedesId: verified?.id ?? (pendingSameSource[0]?.id ?? null),
    collectedAt: evidence.collectedAt,
    reviewNote: note,
  });
  return outcome;
}

export function deadlineNaturalKey(deadline: Pick<ManifestDeadline, "round" | "programScope">) {
  return [deadline.round, ...[...deadline.programScope].map((scope) => scope.toLowerCase()).sort()].join("|");
}

export function deadlineContentHash(deadline: Pick<ManifestDeadline, "date" | "time" | "timezone" | "conditions">) {
  return contentHash([deadline.date ?? "none", deadline.time ?? "", deadline.timezone ?? "", deadline.conditions ?? ""].join("|"));
}

export async function submitDeadline(
  db: AtlasDb,
  college: CollegeRef,
  cycle: { id: string },
  deadline: ManifestDeadline,
  evidence: Evidence,
): Promise<SubmitOutcome> {
  const naturalKey = deadlineNaturalKey(deadline);
  const hash = deadlineContentHash(deadline);

  const [duplicate] = await db
    .select({ id: applicationDeadlines.id })
    .from(applicationDeadlines)
    .where(
      and(
        eq(applicationDeadlines.cycleId, cycle.id),
        eq(applicationDeadlines.naturalKey, naturalKey),
        eq(applicationDeadlines.contentHash, hash),
      ),
    )
    .limit(1);
  if (duplicate) {
    await db
      .update(applicationDeadlines)
      .set({
        snapshotId: evidence.snapshotId ?? sql`${applicationDeadlines.snapshotId}`,
        collectedAt: evidence.collectedAt,
        staleReason: null,
        staleDetectedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(applicationDeadlines.id, duplicate.id));
    return "duplicate";
  }

  const live = await db
    .select({
      id: applicationDeadlines.id,
      status: applicationDeadlines.verificationStatus,
      ingestSource: applicationDeadlines.ingestSource,
    })
    .from(applicationDeadlines)
    .where(
      and(
        eq(applicationDeadlines.cycleId, cycle.id),
        eq(applicationDeadlines.naturalKey, naturalKey),
        inArray(applicationDeadlines.verificationStatus, LIVE_STATUSES),
      ),
    );
  const verified = live.find((row) => row.status === "verified");
  const pendingSameSource = live.filter((row) => row.status !== "verified" && row.ingestSource === evidence.ingestSource);
  const pendingOtherSource = live.filter((row) => row.status !== "verified" && row.ingestSource !== evidence.ingestSource);

  let status = "pending_review";
  let note: string | null = null;
  let outcome: SubmitOutcome = "inserted";

  if (pendingSameSource.length > 0) {
    await db
      .update(applicationDeadlines)
      .set({ verificationStatus: "outdated", reviewNote: "Superseded by a newer capture before review.", updatedAt: new Date() })
      .where(inArray(applicationDeadlines.id, pendingSameSource.map((row) => row.id)));
  }
  if (pendingOtherSource.length > 0) {
    status = "conflicting";
    note = "Another source reports a different deadline for this round.";
    await db
      .update(applicationDeadlines)
      .set({ verificationStatus: "conflicting", reviewNote: note, updatedAt: new Date() })
      .where(inArray(applicationDeadlines.id, pendingOtherSource.map((row) => row.id)));
    outcome = "conflicting";
  } else if (verified) {
    outcome = "superseding";
    note = "Official page differs from the verified deadline. Review before replacing.";
  }

  await db.insert(applicationDeadlines).values({
    cycleId: cycle.id,
    collegeId: college.id,
    round: deadline.round,
    deadlineDate: deadline.date,
    deadlineTime: deadline.time,
    timezone: deadline.timezone,
    programScope: deadline.programScope,
    conditions: deadline.conditions,
    naturalKey,
    contentHash: hash,
    sourceUrl: deadline.sourceUrl,
    sourceExcerpt: deadline.excerpt,
    snapshotId: evidence.snapshotId,
    ingestSource: evidence.ingestSource,
    verificationStatus: status,
    supersedesId: verified?.id ?? (pendingSameSource[0]?.id ?? null),
    collectedAt: evidence.collectedAt,
    reviewNote: note,
  });
  return outcome;
}

export type PageLoader = (url: string) => Promise<FetchResult>;

/**
 * Runs one manifest: fetch each official source, validate every candidate against the fetched text,
 * and queue the valid ones for review. Candidates that fail validation are logged, never stored.
 */
export async function ingestManifest(
  db: AtlasDb,
  manifest: AdmissionsManifest,
  loadPage: PageLoader,
  run: ImportRun,
  adapter = "curated-official",
) {
  const college = await findCollegeByUnitid(db, manifest.unitid);
  if (!college) {
    await run.recordError(`unitid:${manifest.unitid}`, `${manifest.name}: no college with this UNITID. Run the directory import first.`);
    run.increment("collegesMissing");
    return;
  }

  const pages = new Map<string, { result: FetchResult; snapshotId: string | null }>();
  const urls = new Set([
    ...manifest.sources.map((source) => source.url),
    ...manifest.prompts.map((prompt) => prompt.sourceUrl),
    ...manifest.deadlines.map((deadline) => deadline.sourceUrl),
  ]);
  for (const url of urls) {
    const result = await loadPage(url);
    const snapshot = await recordSnapshot(db, { collegeId: college.id, result, runId: run.id });
    pages.set(url, { result, snapshotId: snapshot.snapshotId });
    const declared = manifest.sources.find((source) => source.url === url);
    await upsertSourceRegistry(db, college.id, { url, kind: declared?.kind ?? "both" }, result, snapshot.changed, adapter);
    if (!result.ok) {
      run.increment("sourcesUnavailable");
      await run.recordError(`${college.slug}:${url}`, `Source not retrieved: ${result.error}`);
    } else {
      run.increment("sourcesFetched");
    }
  }

  const collectedAt = new Date();
  let validPrompts = 0;
  let validDeadlines = 0;
  const cycle = await ensureCycle(db, college.id, manifest.cycle, { platforms: manifest.platforms });

  for (const [index, prompt] of manifest.prompts.entries()) {
    const page = pages.get(prompt.sourceUrl);
    if (!page?.result.ok) {
      run.increment("promptsUnverifiable");
      continue;
    }
    const check = validatePromptCandidate(prompt, page.result.text);
    if (!check.ok) {
      run.increment("promptsRejectedByValidation");
      await run.recordError(`${college.slug}:prompt:${prompt.slot}`, check.reason);
      continue;
    }
    validPrompts += 1;
    const outcome = await submitPrompt(
      db,
      college,
      cycle,
      prompt,
      { snapshotId: page.snapshotId, collectedAt, ingestSource: adapter },
      index + 1,
    );
    run.increment(`prompts_${outcome}`);
  }

  for (const deadline of manifest.deadlines) {
    const page = pages.get(deadline.sourceUrl);
    if (!page?.result.ok) {
      run.increment("deadlinesUnverifiable");
      continue;
    }
    const check = validateDeadlineCandidate(deadline, page.result.text, manifest.cycle);
    if (!check.ok) {
      run.increment("deadlinesRejectedByValidation");
      await run.recordError(`${college.slug}:deadline:${deadline.round}`, check.reason);
      continue;
    }
    validDeadlines += 1;
    const outcome = await submitDeadline(db, college, cycle, deadline, {
      snapshotId: page.snapshotId,
      collectedAt,
      ingestSource: adapter,
    });
    run.increment(`deadlines_${outcome}`);
  }

  const unavailable = [
    manifest.unavailable.prompts ? `Prompts: ${manifest.unavailable.prompts}` : null,
    manifest.unavailable.deadlines ? `Deadlines: ${manifest.unavailable.deadlines}` : null,
  ].filter(Boolean);
  await ensureCycle(db, college.id, manifest.cycle, {
    publicationStatus: validPrompts + validDeadlines > 0 ? "published" : cycle.publicationStatus,
    notes: unavailable.length > 0 ? unavailable.join("\n") : cycle.notes,
  });
  run.increment("collegesProcessed");
}
