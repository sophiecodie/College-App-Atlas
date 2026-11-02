/**
 * Prints catalog totals and per-college verification coverage for a cycle.
 *
 *   npm run catalog:report -- --cycle 2026-2027
 */
import { connectDatabase } from "../src/db/connect";
import { currentAcademicYear } from "../src/lib/catalog/cycles";
import { catalogTotals, coverageReport } from "../src/lib/catalog/review";

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const academicYear = argValue("--cycle") ?? currentAcademicYear();
  const connection = await connectDatabase();
  try {
    console.log(`Catalog in ${connection.label}, cycle ${academicYear}`);
    console.table(await catalogTotals(connection.db, academicYear));
    const coverage = await coverageReport(connection.db, academicYear);
    console.table(
      coverage.map((row) => ({
        college: row.name,
        status: row.publicationStatus,
        verifiedPrompts: row.verifiedPrompts,
        pendingPrompts: row.pendingPrompts,
        verifiedDeadlines: row.verifiedDeadlines,
        pendingDeadlines: row.pendingDeadlines,
        stale: row.staleRecords,
      })),
    );
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
