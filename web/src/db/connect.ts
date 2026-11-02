import type { PgDatabase } from "drizzle-orm/pg-core";

import * as schema from "@/db/schema";

// Both the Neon and PGlite drizzle databases satisfy this, so catalog code can run against either.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AtlasDb = PgDatabase<any, any, any>;

export type AtlasConnection = {
  db: AtlasDb;
  /** Runs raw multi-statement SQL (used by the migration runner). */
  exec: (sqlText: string) => Promise<void>;
  /** Runs one parameterised query and returns its rows. */
  query: <T = Record<string, unknown>>(sqlText: string, params?: unknown[]) => Promise<T[]>;
  close: () => Promise<void>;
  label: string;
};

/**
 * Opens a connection for scripts and tests.
 * - `ATLAS_PGLITE_DIR` (or `pgliteDir`) selects an embedded Postgres stored on disk (or in memory with "memory://").
 * - Otherwise `DATABASE_URL` is used through Neon's WebSocket pool, which supports multi-statement SQL.
 */
export async function connectDatabase(options: { pgliteDir?: string } = {}): Promise<AtlasConnection> {
  const pgliteDir = options.pgliteDir ?? process.env.ATLAS_PGLITE_DIR;

  if (pgliteDir) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
    const { drizzle } = await import("drizzle-orm/pglite");
    if (!pgliteDir.includes("://")) {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(pgliteDir, { recursive: true });
    }
    const client = new PGlite(pgliteDir, { extensions: { pg_trgm } });
    return {
      db: drizzle({ client, schema }),
      exec: async (sqlText) => {
        await client.exec(sqlText);
      },
      query: async <T>(sqlText: string, params: unknown[] = []) =>
        (await client.query<T>(sqlText, params)).rows,
      close: () => client.close(),
      label: `pglite:${pgliteDir}`,
    };
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Set DATABASE_URL (Neon/Postgres) or ATLAS_PGLITE_DIR (local embedded Postgres).");
  }

  const { Pool, neonConfig } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const ws = (await import("ws")).default;
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: url });

  return {
    db: drizzle({ client: pool, schema }),
    exec: async (sqlText) => {
      // One dedicated client per call, so a failed BEGIN…COMMIT block is rolled back on the same session.
      const client = await pool.connect();
      try {
        await client.query(sqlText);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
    query: async <T>(sqlText: string, params: unknown[] = []) =>
      (await pool.query(sqlText, params)).rows as T[],
    close: () => pool.end(),
    label: `postgres:${new URL(url).host}`,
  };
}
