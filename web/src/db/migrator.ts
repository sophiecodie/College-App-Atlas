import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { AtlasConnection } from "@/db/connect";

export const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

type AppliedRow = { name: string; checksum: string };

/**
 * Applies `migrations/*.sql` in filename order, each inside its own transaction.
 * Applied files are recorded with a checksum; editing an applied file is refused instead of silently re-run.
 */
export async function runMigrations(
  connection: Pick<AtlasConnection, "exec" | "query">,
  options: { dir?: string; log?: (line: string) => void } = {},
) {
  const dir = options.dir ?? MIGRATIONS_DIR;
  const log = options.log ?? (() => {});

  await connection.exec(`
    CREATE TABLE IF NOT EXISTS atlas_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const applied = new Map(
    (await connection.query<AppliedRow>("SELECT name, checksum FROM atlas_migrations")).map((row) => [
      row.name,
      row.checksum,
    ]),
  );

  const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
  const ran: string[] = [];

  for (const file of files) {
    const sqlText = await readFile(path.join(dir, file), "utf8");
    const checksum = createHash("sha256").update(sqlText).digest("hex");
    const previous = applied.get(file);

    if (previous) {
      if (previous !== checksum) {
        throw new Error(`Migration ${file} was edited after it was applied. Add a new migration instead.`);
      }
      continue;
    }

    log(`applying ${file}`);
    const escapedName = file.replace(/'/g, "''");
    await connection.exec(
      `BEGIN;\n${sqlText}\nINSERT INTO atlas_migrations (name, checksum) VALUES ('${escapedName}', '${checksum}');\nCOMMIT;`,
    ).catch(async (error) => {
      await connection.exec("ROLLBACK;").catch(() => {});
      throw new Error(`Migration ${file} failed and was rolled back: ${(error as Error).message}`);
    });
    ran.push(file);
  }

  return { applied: ran, alreadyApplied: [...applied.keys()] };
}
