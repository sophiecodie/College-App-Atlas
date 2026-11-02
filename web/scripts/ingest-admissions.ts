/**
 * Ingests curated official-source manifests (data/admissions/<cycle>/*.json) into the review queue.
 * Each prompt and deadline is re-checked against the live official page; anything not found verbatim is
 * logged and skipped. Nothing is marked verified here; an admin approves in /admin.
 *
 *   npm run catalog:ingest-admissions                    # current cycle, all manifests
 *   npm run catalog:ingest-admissions -- --cycle 2026-2027 --only harvard,yale
 */
import { connectDatabase } from "../src/db/connect";
import { currentAcademicYear } from "../src/lib/catalog/cycles";
import { withImportRun } from "../src/lib/catalog/runs";
import { curatedOfficialAdapter } from "../src/lib/ingest/adapters";
import { PoliteFetcher } from "../src/lib/ingest/fetcher";
import { ingestManifest } from "../src/lib/ingest/submit";

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const cycle = argValue("--cycle") ?? currentAcademicYear();
  const only = argValue("--only")?.split(",").map((value) => value.trim()).filter(Boolean);
  const manifests = await curatedOfficialAdapter.loadManifests({ cycle, only });
  if (manifests.length === 0) {
    console.log(`No manifests found for ${cycle}.`);
    return;
  }

  const fetcher = new PoliteFetcher();
  const pageCache = new Map<string, ReturnType<PoliteFetcher["fetchPage"]>>();
  const loadPage = (url: string) => {
    if (!pageCache.has(url)) pageCache.set(url, fetcher.fetchPage(url));
    return pageCache.get(url)!;
  };

  const connection = await connectDatabase();
  console.log(`Ingesting ${manifests.length} manifest(s) for ${cycle} into ${connection.label}`);
  try {
    const result = await withImportRun(
      connection.db,
      "admissions_ingest",
      { cycle, only: only ?? null, manifests: manifests.length },
      async (run) => {
        for (const entry of manifests) {
          if ("error" in entry) {
            await run.recordError(entry.file, entry.error);
            continue;
          }
          process.stdout.write(`  ${entry.manifest.name}… `);
          await ingestManifest(connection.db, entry.manifest, loadPage, run, curatedOfficialAdapter.id);
          console.log("done");
        }
      },
      { lockName: "admissions", lockMinutes: 60 },
    );
    console.log(`Run ${result.runId}: ${result.status}`);
    console.table(result.stats);
    if (result.status !== "succeeded") {
      const errors = await connection.query<{ row_ref: string; message: string }>(
        "select row_ref, message from import_run_errors where run_id = $1 order by created_at",
        [result.runId],
      );
      console.log("Errors:");
      for (const error of errors) console.log(`  ${error.row_ref}: ${error.message}`);
    }
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
