import { and, eq, lt, sql } from "drizzle-orm";

import type { AtlasDb } from "@/db/connect";
import { importLocks, importRunErrors, importRuns } from "@/db/schema";

export type RunStats = Record<string, number>;

export class ImportLockedError extends Error {
  constructor(lockName: string) {
    super(`Another "${lockName}" run is in progress. Wait for it to finish, or let its lock expire.`);
  }
}

/**
 * Tracks one import: records the run, collects counters and row errors, and holds a named lock.
 * Locks are rows with an expiry rather than session advisory locks, because Neon's HTTP driver has no
 * long-lived session; a crashed run's lock simply expires.
 */
export class ImportRun {
  readonly stats: RunStats = {};
  private errorCount = 0;

  private constructor(
    private readonly db: AtlasDb,
    readonly id: string,
    readonly lockName: string,
  ) {}

  static async start(
    db: AtlasDb,
    kind: string,
    params: Record<string, unknown> = {},
    options: { lockName?: string; lockMinutes?: number } = {},
  ) {
    const lockName = options.lockName ?? kind;
    const lockMinutes = options.lockMinutes ?? 60;
    const [run] = await db.insert(importRuns).values({ kind, params }).returning({ id: importRuns.id });
    const runId = run!.id;

    await db.delete(importLocks).where(and(eq(importLocks.name, lockName), lt(importLocks.expiresAt, new Date())));
    const acquired = await db
      .insert(importLocks)
      .values({
        name: lockName,
        runId,
        expiresAt: new Date(Date.now() + lockMinutes * 60_000),
      })
      .onConflictDoNothing()
      .returning({ name: importLocks.name });

    if (acquired.length === 0) {
      await db
        .update(importRuns)
        .set({ status: "failed", error: "Skipped: another run holds the lock.", finishedAt: new Date() })
        .where(eq(importRuns.id, runId));
      throw new ImportLockedError(lockName);
    }

    return new ImportRun(db, runId, lockName);
  }

  increment(key: string, by = 1) {
    this.stats[key] = (this.stats[key] ?? 0) + by;
  }

  async recordError(rowRef: string | null, message: string) {
    this.errorCount += 1;
    this.increment("errors");
    await this.db.insert(importRunErrors).values({ runId: this.id, rowRef, message: message.slice(0, 2000) });
  }

  get hasErrors() {
    return this.errorCount > 0;
  }

  async finish(error?: unknown) {
    const status = error ? "failed" : this.errorCount > 0 ? "partial" : "succeeded";
    await this.db
      .update(importRuns)
      .set({
        status,
        stats: this.stats,
        error: error ? String((error as Error)?.message ?? error).slice(0, 2000) : null,
        finishedAt: new Date(),
      })
      .where(eq(importRuns.id, this.id));
    await this.db
      .delete(importLocks)
      .where(and(eq(importLocks.name, this.lockName), eq(importLocks.runId, this.id)));
    return status;
  }
}

/** Runs `work` inside a tracked, locked import run and always releases the lock. */
export async function withImportRun<T>(
  db: AtlasDb,
  kind: string,
  params: Record<string, unknown>,
  work: (run: ImportRun) => Promise<T>,
  options: { lockName?: string; lockMinutes?: number } = {},
) {
  const run = await ImportRun.start(db, kind, params, options);
  try {
    const result = await work(run);
    const status = await run.finish();
    return { runId: run.id, status, stats: run.stats, result };
  } catch (error) {
    await run.finish(error);
    throw error;
  }
}

export async function recentImportRuns(db: AtlasDb, limit = 20) {
  return db
    .select({
      id: importRuns.id,
      kind: importRuns.kind,
      status: importRuns.status,
      stats: importRuns.stats,
      error: importRuns.error,
      startedAt: importRuns.startedAt,
      finishedAt: importRuns.finishedAt,
      errorCount: sql<number>`(select count(*)::int from import_run_errors e where e.run_id = ${importRuns.id})`,
    })
    .from(importRuns)
    .orderBy(sql`${importRuns.startedAt} desc`)
    .limit(limit);
}
