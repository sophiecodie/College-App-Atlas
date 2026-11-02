/**
 * Imports the college directory from NCES IPEDS (required) and enriches it with College Scorecard (optional).
 * Idempotent: rerunning updates changed rows only and never duplicates or deletes colleges.
 *
 *   npm run catalog:import-directory                       # download IPEDS HD2024 + latest Scorecard CSV
 *   npm run catalog:import-directory -- --ipeds ./HD2024.csv --scorecard ./Most-Recent-Cohorts-Institution.csv
 *   npm run catalog:import-directory -- --scorecard-api    # Scorecard via API (needs DATA_GOV_API_KEY)
 *   npm run catalog:import-directory -- --no-scorecard --include-inactive
 *   --partial: the IPEDS file is a subset, so colleges missing from it are not marked inactive
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { connectDatabase } from "../src/db/connect";
import { readCsvRecords } from "../src/lib/catalog/csv";
import { applyScorecardEnrichment, importDirectoryRecords } from "../src/lib/catalog/directory-import";
import { type DirectoryRecord, mapIpedsRow } from "../src/lib/catalog/ipeds";
import { ImportRun, withImportRun } from "../src/lib/catalog/runs";
import { fetchScorecardApi, mapScorecardCsvRow, type ScorecardEnrichment } from "../src/lib/catalog/scorecard";

const execFileAsync = promisify(execFile);
const CACHE_DIR = path.join(process.cwd(), ".cache", "federal-data");
const DEFAULT_IPEDS_YEAR = "2024";
const DEFAULT_SCORECARD_URL =
  "https://ed-public-download.scorecard.network/downloads/Most-Recent-Cohorts-Institution_10152026.zip";

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function downloadAndUnzip(url: string, name: string, expectCsv: RegExp) {
  const dir = path.join(CACHE_DIR, name);
  await mkdir(dir, { recursive: true });
  const existing = (await readdir(dir)).find((file) => expectCsv.test(file));
  if (existing) {
    return path.join(dir, existing);
  }
  console.log(`Downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) for ${url}`);
  }
  const zipPath = path.join(dir, "download.zip");
  await writeFile(zipPath, Buffer.from(await response.arrayBuffer()));
  await execFileAsync("unzip", ["-o", "-q", zipPath, "-d", dir]);
  const csv = (await readdir(dir)).find((file) => expectCsv.test(file));
  if (!csv) {
    throw new Error(`No file matching ${expectCsv} in ${url}`);
  }
  return path.join(dir, csv);
}

async function* ipedsRecords(file: string, run: ImportRun): AsyncGenerator<DirectoryRecord> {
  for await (const { line, record } of readCsvRecords(file)) {
    const mapped = mapIpedsRow(record);
    if ("error" in mapped) {
      run.increment("rowsInvalid");
      await run.recordError(`ipeds:line ${line}`, mapped.error);
      continue;
    }
    yield mapped;
  }
}

async function* scorecardRecords(
  source: { file: string } | { apiKey: string },
  run: ImportRun,
): AsyncGenerator<ScorecardEnrichment> {
  const rows =
    "file" in source
      ? (async function* () {
          for await (const { record } of readCsvRecords(source.file)) {
            yield mapScorecardCsvRow(record);
          }
        })()
      : fetchScorecardApi({ apiKey: source.apiKey });
  for await (const mapped of rows) {
    if ("error" in mapped) {
      run.increment("scorecardRowsInvalid");
      await run.recordError("scorecard", mapped.error);
      continue;
    }
    yield mapped;
  }
}

async function main() {
  const ipedsYear = argValue("--ipeds-year") ?? DEFAULT_IPEDS_YEAR;
  const ipedsFile =
    argValue("--ipeds") ??
    (await downloadAndUnzip(`https://nces.ed.gov/ipeds/datacenter/data/HD${ipedsYear}.zip`, `ipeds-hd${ipedsYear}`, /^hd\d{4}\.csv$/i));
  if (!existsSync(ipedsFile)) {
    throw new Error(`IPEDS file not found: ${ipedsFile}`);
  }

  const useScorecard = !process.argv.includes("--no-scorecard");
  const useApi = process.argv.includes("--scorecard-api");
  let scorecardSource: { file: string } | { apiKey: string } | null = null;
  if (useScorecard) {
    if (useApi) {
      const apiKey = process.env.DATA_GOV_API_KEY;
      if (!apiKey) {
        throw new Error("--scorecard-api needs DATA_GOV_API_KEY (free key from https://api.data.gov/signup/).");
      }
      scorecardSource = { apiKey };
    } else {
      scorecardSource = {
        file:
          argValue("--scorecard") ??
          (await downloadAndUnzip(argValue("--scorecard-url") ?? DEFAULT_SCORECARD_URL, "scorecard", /^Most-Recent-Cohorts-Institution\.csv$/i)),
      };
    }
  }

  const connection = await connectDatabase();
  console.log(`Importing into ${connection.label}`);
  try {
    const result = await withImportRun(
      connection.db,
      "directory",
      { ipedsFile: path.basename(ipedsFile), ipedsYear, scorecard: scorecardSource ? ("file" in scorecardSource ? path.basename(scorecardSource.file) : "api") : null },
      async (run) => {
        await importDirectoryRecords(connection.db, ipedsRecords(ipedsFile, run), run, {
          includeInactive: process.argv.includes("--include-inactive"),
          undergraduateOnly: !process.argv.includes("--all-levels"),
          fullSnapshot: !process.argv.includes("--partial"),
        });
        if (scorecardSource) {
          await applyScorecardEnrichment(connection.db, scorecardRecords(scorecardSource, run), run);
        }
      },
      { lockName: "directory", lockMinutes: 90 },
    );
    console.log(`Run ${result.runId}: ${result.status}`);
    console.table(result.stats);
    const [{ count }] = await connection.query<{ count: number }>("select count(*)::int as count from colleges");
    console.log(`Colleges in database: ${count}`);
    if (result.status !== "succeeded") {
      const errors = await connection.query<{ row_ref: string; message: string }>(
        "select row_ref, message from import_run_errors where run_id = $1 order by created_at limit 20",
        [result.runId],
      );
      console.log("First errors:");
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
