/**
 * Re-checks registered official admissions pages for changes (low volume: --max sources per run, default 50).
 * Changed pages flag affected records as stale and re-queue curated candidates; verified rows are never replaced.
 *
 *   npm run catalog:refresh-admissions -- --max 25
 */
import { connectDatabase } from "../src/db/connect";
import { currentAcademicYear } from "../src/lib/catalog/cycles";
import { withImportRun } from "../src/lib/catalog/runs";
import { PoliteFetcher } from "../src/lib/ingest/fetcher";
import { refreshAdmissionsSources } from "../src/lib/ingest/refresh";

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const academicYear = argValue("--cycle") ?? currentAcademicYear();
  const maxSources = Number(argValue("--max") ?? 50);
  const fetcher = new PoliteFetcher();
  const connection = await connectDatabase();
  try {
    const result = await withImportRun(
      connection.db,
      "admissions_refresh",
      { academicYear, maxSources },
      (run) => refreshAdmissionsSources(connection.db, (url) => fetcher.fetchPage(url), run, { academicYear, maxSources }),
      { lockName: "admissions", lockMinutes: 60 },
    );
    console.log(`Run ${result.runId}: ${result.status}`);
    console.table(result.stats);
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
