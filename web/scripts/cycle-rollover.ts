/**
 * Opens a new application cycle: creates `not_yet_published` cycle rows for every college that had one the
 * previous year. Previous cycles, prompts and deadlines are kept untouched as history.
 *
 *   npm run catalog:cycle-rollover -- --to 2027-2028
 */
import { connectDatabase } from "../src/db/connect";
import { currentAcademicYear, nextAcademicYear } from "../src/lib/catalog/cycles";

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const to = argValue("--to") ?? nextAcademicYear(currentAcademicYear());
  if (!/^\d{4}-\d{4}$/.test(to)) {
    throw new Error("--to must look like 2027-2028");
  }
  const [start] = to.split("-").map(Number);
  const from = `${start! - 1}-${start}`;
  const connection = await connectDatabase();
  try {
    const rows = await connection.query<{ id: string }>(
      `insert into application_cycles (college_id, academic_year, platforms, publication_status)
       select college_id, $2, platforms, 'not_yet_published' from application_cycles where academic_year = $1
       on conflict (college_id, academic_year) do nothing
       returning id`,
      [from, to],
    );
    console.log(`Created ${rows.length} ${to} cycle row(s) from ${from}. Existing rows were left unchanged.`);
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
