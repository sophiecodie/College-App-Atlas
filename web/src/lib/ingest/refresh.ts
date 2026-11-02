import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import type { AtlasDb } from "@/db/connect";
import { admissionsSources, applicationDeadlines, colleges, prompts } from "@/db/schema";
import type { ImportRun } from "@/lib/catalog/runs";
import { curatedOfficialAdapter } from "@/lib/ingest/adapters";
import type { FetchResult } from "@/lib/ingest/fetcher";
import { ingestManifest, recordSnapshot, upsertSourceRegistry } from "@/lib/ingest/submit";
import { sourceContains } from "@/lib/ingest/validate";

const WATCHED_STATUSES = ["verified", "pending_review", "conflicting"];

/**
 * Re-checks registered official sources. When a page's content changes:
 * - verified or pending rows whose text/excerpt is no longer on the page are flagged stale (status unchanged),
 * - the college's curated manifest (if any) is re-ingested, which queues new wording for review.
 * Nothing verified is replaced or removed here.
 */
export async function refreshAdmissionsSources(
  db: AtlasDb,
  loadPage: (url: string) => Promise<FetchResult>,
  run: ImportRun,
  options: { academicYear: string; maxSources?: number },
) {
  const sources = await db
    .select({
      id: admissionsSources.id,
      url: admissionsSources.url,
      kind: admissionsSources.kind,
      adapter: admissionsSources.adapter,
      collegeId: admissionsSources.collegeId,
      slug: colleges.slug,
      unitid: colleges.ipedsUnitid,
    })
    .from(admissionsSources)
    .innerJoin(colleges, eq(colleges.id, admissionsSources.collegeId))
    .where(eq(admissionsSources.enabled, true))
    .orderBy(sql`${admissionsSources.lastCheckedAt} asc nulls first`, asc(admissionsSources.url))
    .limit(options.maxSources ?? 50);

  const changedUnitids = new Set<number>();

  for (const source of sources) {
    const result = await loadPage(source.url);
    const snapshot = await recordSnapshot(db, { collegeId: source.collegeId, result, runId: run.id });
    await upsertSourceRegistry(
      db,
      source.collegeId,
      { url: source.url, kind: source.kind as "essay_prompts" | "deadlines" | "both" },
      result,
      snapshot.changed,
      source.adapter,
    );
    run.increment("sourcesChecked");
    if (!result.ok) {
      run.increment("sourcesFailed");
      await run.recordError(`${source.slug}:${source.url}`, `Refresh failed: ${result.error}`);
      continue;
    }
    if (!snapshot.changed) {
      run.increment("sourcesUnchanged");
      continue;
    }
    run.increment("sourcesChanged");
    if (source.unitid !== null) {
      changedUnitids.add(source.unitid);
    }

    const now = new Date();
    const watchedPrompts = await db
      .select({ id: prompts.id, text: prompts.promptText })
      .from(prompts)
      .where(
        and(
          eq(prompts.sourceUrl, source.url),
          inArray(prompts.verificationStatus, WATCHED_STATUSES),
          or(isNull(prompts.cycle), eq(prompts.cycle, options.academicYear)),
        ),
      );
    for (const row of watchedPrompts) {
      if (!sourceContains(result.text, row.text)) {
        await db
          .update(prompts)
          .set({ staleReason: "Prompt text no longer appears on the official page.", staleDetectedAt: now })
          .where(eq(prompts.id, row.id));
        run.increment("promptsFlaggedStale");
      }
    }

    const watchedDeadlines = await db
      .select({ id: applicationDeadlines.id, excerpt: applicationDeadlines.sourceExcerpt })
      .from(applicationDeadlines)
      .where(
        and(eq(applicationDeadlines.sourceUrl, source.url), inArray(applicationDeadlines.verificationStatus, WATCHED_STATUSES)),
      );
    for (const row of watchedDeadlines) {
      if (row.excerpt && !sourceContains(result.text, row.excerpt)) {
        await db
          .update(applicationDeadlines)
          .set({ staleReason: "Deadline wording no longer appears on the official page.", staleDetectedAt: now })
          .where(eq(applicationDeadlines.id, row.id));
        run.increment("deadlinesFlaggedStale");
      }
    }
  }

  if (changedUnitids.size > 0) {
    const manifests = await curatedOfficialAdapter.loadManifests({ cycle: options.academicYear });
    for (const entry of manifests) {
      if ("error" in entry) {
        await run.recordError(entry.file, entry.error);
        continue;
      }
      if (!changedUnitids.has(entry.manifest.unitid)) {
        continue;
      }
      await ingestManifest(db, entry.manifest, loadPage, run, curatedOfficialAdapter.id);
    }
  }
  return run.stats;
}
