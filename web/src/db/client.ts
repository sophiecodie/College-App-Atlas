import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import type { AtlasDb } from "@/db/connect";
import * as schema from "@/db/schema";

/**
 * Local development can run on the embedded PGlite database (ATLAS_PGLITE_DIR) instead of Neon.
 * This is refused in production. One instance is cached per process because PGlite allows a single
 * open handle per data directory.
 */
function createLocalDb(dir: string): AtlasDb {
  if (process.env.NODE_ENV === "production") {
    throw new Error("ATLAS_PGLITE_DIR is for local development only. Use DATABASE_URL in production.");
  }
  const globalCache = globalThis as typeof globalThis & { __atlasLocalDb?: AtlasDb };
  if (!globalCache.__atlasLocalDb) {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
    const { pg_trgm } = require("@electric-sql/pglite/contrib/pg_trgm") as typeof import("@electric-sql/pglite/contrib/pg_trgm");
    const { drizzle: drizzlePglite } = require("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
    /* eslint-enable @typescript-eslint/no-require-imports */
    const client = new PGlite(dir, { extensions: { pg_trgm } });
    globalCache.__atlasLocalDb = drizzlePglite({ client, schema });
  }
  return globalCache.__atlasLocalDb;
}

function createDb() {
  if (process.env.ATLAS_PGLITE_DIR) {
    return createLocalDb(process.env.ATLAS_PGLITE_DIR);
  }
  if (!process.env.DATABASE_URL) {
    // `next build` loads every route module but never queries (all pages render on demand), so builds
    // don't need the database. The placeholder is never connected to; at runtime a missing URL still fails.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return drizzle({ client: neon("postgresql://build:build@localhost:5432/build") });
    }
    throw new Error("DATABASE_URL is required to initialize the database client.");
  }
  return drizzle({ client: neon(process.env.DATABASE_URL) });
}

export const db = createDb() as ReturnType<typeof drizzle>;
