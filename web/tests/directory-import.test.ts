import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import type { AtlasConnection } from "../src/db/connect";
import { runMigrations } from "../src/db/migrator";
import { parseCsvRows } from "../src/lib/catalog/csv";
import { applyScorecardEnrichment, importDirectoryRecords } from "../src/lib/catalog/directory-import";
import { mapIpedsRow } from "../src/lib/catalog/ipeds";
import { normalizeInstitutionName, splitAliases } from "../src/lib/catalog/normalize";
import { ImportLockedError, ImportRun, withImportRun } from "../src/lib/catalog/runs";
import { mapScorecardCsvRow } from "../src/lib/catalog/scorecard";
import { createUser, directoryRecords, freshDatabase, ipedsCsv } from "./helpers";

async function runImport(connection: AtlasConnection, csv: string, options: Parameters<typeof importDirectoryRecords>[3] = {}) {
  const records = await directoryRecords(csv);
  return withImportRun(connection.db, "directory", {}, (run) => importDirectoryRecords(connection.db, records, run, options));
}

const BASE_ROWS = [
  { UNITID: "166027", INSTNM: "Harvard University", CITY: "Cambridge", STABBR: "MA", OPEID: "00215500" },
  { UNITID: "166683", INSTNM: "Massachusetts Institute of Technology", IALIAS: "MIT, M.I.T.", CITY: "Cambridge", STABBR: "MA", OPEID: "00217800" },
  { UNITID: "110635", INSTNM: "University of California-Berkeley", IALIAS: "UC Berkeley", CITY: "Berkeley", STABBR: "CA", CONTROL: "1", OPEID: "00131200" },
  { UNITID: "100001", INSTNM: "Example Community College", ICLEVEL: "2", CONTROL: "1", STABBR: "TX", OPEID: "00999900" },
  { UNITID: "100002", INSTNM: "Example University-Satellite Campus", OPEID: "00888801", F1SYSTYP: "1", F1SYSNAM: "Example University System" },
  { UNITID: "100003", INSTNM: "Graduate Only Institute", UGOFFER: "2" },
  { UNITID: "100004", INSTNM: "Closed College", CYACTIVE: "3", DEATHYR: "2024" },
];

describe("IPEDS row mapping", () => {
  it("maps codes, URLs and branch campuses without guessing", () => {
    const mapped = mapIpedsRow({
      UNITID: "100002",
      INSTNM: "Example University-Satellite Campus",
      IALIAS: "EUSC|Satellite",
      OPEID: "00888801",
      ICLEVEL: "1",
      CONTROL: "2",
      WEBADDR: "www.example.edu/",
      ADMINURL: "-2",
      CYACTIVE: "1",
      DEATHYR: "-2",
      NEWID: "-2",
      F1SYSTYP: "1",
      F1SYSNAM: "Example University System",
    });
    assert.ok(!("error" in mapped));
    assert.equal(mapped.isBranchCampus, true);
    assert.equal(mapped.opeid6, "008888");
    assert.equal(mapped.websiteUrl, "https://www.example.edu/");
    assert.equal(mapped.admissionsUrl, null);
    assert.equal(mapped.systemName, "Example University System");
    assert.deepEqual(mapped.aliases, ["EUSC", "Satellite"]);
  });

  it("returns errors for missing identifiers and treats -1/-2/-3 and blanks as missing", () => {
    assert.deepEqual(mapIpedsRow({ UNITID: "", INSTNM: "No Id" }), { error: "Missing or invalid UNITID (empty)" });
    assert.deepEqual(mapIpedsRow({ UNITID: "123", INSTNM: "  " }), { error: "UNITID 123 has no INSTNM" });
    const mapped = mapIpedsRow({ UNITID: "123", INSTNM: "Sparse College", ICLEVEL: "-3", CONTROL: "-3", CITY: "", OPEID: "-2" });
    assert.ok(!("error" in mapped));
    assert.equal(mapped.institutionLevel, "unknown");
    assert.equal(mapped.control, "unknown");
    assert.equal(mapped.city, null);
    assert.equal(mapped.opeid, null);
    assert.equal(mapped.isBranchCampus, false);
  });

  it("normalizes names and aliases for matching", () => {
    assert.equal(normalizeInstitutionName("The University of St. Thomas"), "university of saint thomas");
    assert.equal(normalizeInstitutionName("Texas A & M University"), "texas a and m university");
    assert.deepEqual(splitAliases("MIT, M.I.T."), ["MIT", "M.I.T."]);
    assert.deepEqual(splitAliases("University of Maryland, College Park"), ["University of Maryland, College Park"]);
    assert.deepEqual(splitAliases("-2"), []);
  });

  it("parses quoted CSV fields with commas, quotes and newlines", async () => {
    const rows: string[][] = [];
    for await (const row of parseCsvRows(['a,"b, c","say ""hi""","multi\nline"\r\n1,2,3,4'])) rows.push(row);
    assert.deepEqual(rows, [
      ["a", "b, c", 'say "hi"', "multi\nline"],
      ["1", "2", "3", "4"],
    ]);
  });

  it("ignores suppressed or out-of-range Scorecard values", () => {
    const mapped = mapScorecardCsvRow({ UNITID: "166027", ADM_RATE: "PrivacySuppressed", UGDS: "NULL", SAT_AVG: "2400", INSTURL: "" });
    assert.ok(!("error" in mapped));
    assert.equal(mapped.admissionRate, null);
    assert.equal(mapped.undergradEnrollment, null);
    assert.equal(mapped.satAverage, null);
  });
});

describe("directory import", () => {
  let connection: AtlasConnection;
  let userId: string;

  before(async () => {
    connection = await freshDatabase();
    // Existing app data from before the catalog: a manual college, a user who saved it, and an essay draft.
    await connection.query("insert into colleges (slug, name, application_cycle) values ('harvard', 'Harvard', '2026-2027'), ('my-local-college', 'My Local College', null)");
    await connection.query(
      "insert into prompts (prompt_id, college_slug, college_name, cycle, prompt_text) values ('harvard-01', 'harvard', 'Harvard', '2026-2027', 'Legacy prompt text')",
    );
    userId = await createUser(connection, "student@example.com");
    await connection.query(
      "insert into user_colleges (user_id, college_slug, quick_notes, status) values ($1, 'harvard', 'Visit in spring', 'Drafting')",
      [userId],
    );
    await connection.query(
      "insert into essay_drafts (user_id, prompt_id, content, status) values ($1, 'harvard-01', 'My draft about Cambridge.', 'drafting')",
      [userId],
    );
  });

  after(() => connection.close());

  it("imports undergraduate, active institutions and links the manual college by UNITID", async () => {
    const result = await runImport(connection, ipedsCsv(BASE_ROWS));
    assert.equal(result.status, "succeeded");
    assert.equal(result.stats.inserted, 4);
    assert.equal(result.stats.manualLinked, 1);
    assert.equal(result.stats.skippedNoUndergrad, 1);
    assert.equal(result.stats.skippedInactive, 1);

    const [harvard] = await connection.query<{ slug: string; name: string; ipeds_unitid: number; origin: string; alternative_names: string[] }>(
      "select slug, name, ipeds_unitid, origin, alternative_names from colleges where ipeds_unitid = 166027",
    );
    assert.equal(harvard!.slug, "harvard", "manual slug is preserved");
    assert.equal(harvard!.origin, "manual");
    assert.equal(harvard!.name, "Harvard University");
    assert.deepEqual(harvard!.alternative_names, ["Harvard"], "the manual name stays searchable");
  });

  it("distinguishes levels and flags branch campuses instead of merging them", async () => {
    const rows = await connection.query<{ name: string; institution_level: string; is_branch_campus: boolean; system_name: string | null }>(
      "select name, institution_level, is_branch_campus, system_name from colleges where ipeds_unitid in (100001, 100002) order by ipeds_unitid",
    );
    assert.equal(rows[0]!.institution_level, "two_year");
    assert.equal(rows[1]!.is_branch_campus, true);
    assert.equal(rows[1]!.system_name, "Example University System");
  });

  it("is idempotent: a rerun writes nothing and creates no duplicates", async () => {
    const before = await connection.query<{ count: number }>("select count(*)::int as count from colleges");
    const result = await runImport(connection, ipedsCsv(BASE_ROWS));
    const afterRows = await connection.query<{ count: number }>("select count(*)::int as count from colleges");
    assert.equal(afterRows[0]!.count, before[0]!.count);
    assert.equal(result.stats.inserted ?? 0, 0);
    assert.equal(result.stats.updated ?? 0, 0);
    assert.equal(result.stats.unchanged, 5);
  });

  it("matches by UNITID when an institution is renamed, keeping its slug", async () => {
    const renamed = BASE_ROWS.map((row) => (row.UNITID === "100001" ? { ...row, INSTNM: "Example State College" } : row));
    const result = await runImport(connection, ipedsCsv(renamed));
    assert.equal(result.stats.updated, 1);
    const [row] = await connection.query<{ slug: string; name: string; alternative_names: string[] }>(
      "select slug, name, alternative_names from colleges where ipeds_unitid = 100001",
    );
    assert.equal(row!.slug, "example-community-college");
    assert.equal(row!.name, "Example State College");
  });

  it("records duplicate UNITIDs in the file as errors and keeps the first row", async () => {
    const rows = [...BASE_ROWS, { UNITID: "166683", INSTNM: "MIT Duplicate Row" }];
    const result = await runImport(connection, ipedsCsv(rows), { fullSnapshot: false });
    assert.equal(result.status, "partial");
    assert.equal(result.stats.duplicateRowsInFile, 1);
    const [mit] = await connection.query<{ name: string }>("select name from colleges where ipeds_unitid = 166683");
    assert.equal(mit!.name, "Massachusetts Institute of Technology");
  });

  it("assigns distinct slugs when names collide", async () => {
    const rows = [
      ...BASE_ROWS,
      { UNITID: "200001", INSTNM: "Massachusetts Institute of Technology", STABBR: "NY", OPEID: "07777700" },
    ];
    await runImport(connection, ipedsCsv(rows), { fullSnapshot: false });
    const slugs = await connection.query<{ slug: string }>(
      "select slug from colleges where ipeds_unitid in (166683, 200001) order by ipeds_unitid",
    );
    assert.deepEqual(
      slugs.map((row) => row.slug),
      ["massachusetts-institute-of-technology", "massachusetts-institute-of-technology-ny"],
    );
  });

  it("marks institutions missing from a full snapshot inactive without deleting them", async () => {
    const withoutBerkeley = BASE_ROWS.filter((row) => row.UNITID !== "110635");
    const result = await runImport(connection, ipedsCsv(withoutBerkeley), { fullSnapshot: true });
    assert.ok((result.stats.markedInactive ?? 0) >= 1);
    const [row] = await connection.query<{ is_active: boolean }>("select is_active from colleges where ipeds_unitid = 110635");
    assert.equal(row!.is_active, false);
  });

  it("leaves manual colleges with no IPEDS match untouched", async () => {
    const [row] = await connection.query<{ slug: string; ipeds_unitid: number | null; origin: string }>(
      "select slug, ipeds_unitid, origin from colleges where slug = 'my-local-college'",
    );
    assert.equal(row!.ipeds_unitid, null);
    assert.equal(row!.origin, "manual");
  });

  it("does not link an ambiguous manual college", async () => {
    await connection.query("insert into colleges (slug, name) values ('twin', 'Twin College')");
    const rows = [
      ...BASE_ROWS,
      { UNITID: "300001", INSTNM: "Twin College", STABBR: "OH", OPEID: "05555500" },
      { UNITID: "300002", INSTNM: "Twin College", STABBR: "OR", OPEID: "05555600" },
    ];
    const result = await runImport(connection, ipedsCsv(rows), { fullSnapshot: false });
    assert.equal(result.stats.manualAmbiguous, 1);
    const [row] = await connection.query<{ ipeds_unitid: number | null }>("select ipeds_unitid from colleges where slug = 'twin'");
    assert.equal(row!.ipeds_unitid, null);
  });

  it("preserves user records and essay drafts across imports", async () => {
    const [saved] = await connection.query<{ quick_notes: string; status: string }>(
      "select quick_notes, status from user_colleges where user_id = $1 and college_slug = 'harvard'",
      [userId],
    );
    assert.equal(saved!.quick_notes, "Visit in spring");
    assert.equal(saved!.status, "Drafting");
    const [draft] = await connection.query<{ content: string; prompt_id: string }>(
      "select content, prompt_id from essay_drafts where user_id = $1",
      [userId],
    );
    assert.equal(draft!.content, "My draft about Cambridge.");
    const [prompt] = await connection.query<{ prompt_text: string }>("select prompt_text from prompts where prompt_id = 'harvard-01'");
    assert.equal(prompt!.prompt_text, "Legacy prompt text");
  });

  it("enriches by UNITID only and never creates colleges from Scorecard rows", async () => {
    const count = async () => (await connection.query<{ count: number }>("select count(*)::int as count from colleges"))[0]!.count;
    const before = await count();
    const result = await withImportRun(connection.db, "scorecard", {}, (run) =>
      applyScorecardEnrichment(
        connection.db,
        [
          { unitid: 166027, admissionRate: 0.0365, undergradEnrollment: 7601, satAverage: null, websiteUrl: null, aliases: [] },
          { unitid: 999999, admissionRate: 0.5, undergradEnrollment: 100, satAverage: null, websiteUrl: null, aliases: [] },
        ],
        run,
      ),
    );
    assert.equal(await count(), before);
    assert.equal(result.stats.scorecardUnmatched, 1);
    const [harvard] = await connection.query<{ admission_rate: string; undergrad_enrollment: number }>(
      "select admission_rate, undergrad_enrollment from colleges where ipeds_unitid = 166027",
    );
    assert.equal(Number(harvard!.admission_rate), 0.0365);
    assert.equal(harvard!.undergrad_enrollment, 7601);
  });
});

describe("import runs and migrations", () => {
  it("prevents concurrent runs with the same lock and releases it after failure", async () => {
    const connection = await freshDatabase();
    try {
      const first = await ImportRun.start(connection.db, "directory");
      await assert.rejects(ImportRun.start(connection.db, "directory"), ImportLockedError);
      await first.finish(new Error("boom"));
      const [failed] = await connection.query<{ status: string; error: string }>("select status, error from import_runs where id = $1", [first.id]);
      assert.equal(failed!.status, "failed");
      assert.equal(failed!.error, "boom");
      const second = await ImportRun.start(connection.db, "directory");
      await second.finish();
    } finally {
      await connection.close();
    }
  });

  it("reapplying migrations is a no-op and edited migrations are refused", async () => {
    const connection = await freshDatabase();
    try {
      const again = await runMigrations(connection);
      assert.deepEqual(again.applied, []);
      await connection.query("update atlas_migrations set checksum = 'changed' where name = '0001_college_database.sql'");
      await assert.rejects(runMigrations(connection), /was edited after it was applied/);
    } finally {
      await connection.close();
    }
  });

  it("migrating a database with existing rows backfills links and keeps every row", async () => {
    const { connectDatabase } = await import("../src/db/connect");
    const { readFile } = await import("node:fs/promises");
    const connection = await connectDatabase({ pgliteDir: "memory://" });
    try {
      // Simulate the pre-migration production database: baseline tables plus data.
      await connection.exec(await readFile("migrations/0000_baseline.sql", "utf8"));
      await connection.query("insert into users (email) values ('a@example.com')");
      await connection.query("insert into colleges (slug, name, application_cycle) values ('duke', 'Duke', '2026-2027')");
      await connection.query(
        "insert into prompts (prompt_id, college_slug, college_name, cycle, prompt_text, extraction_status) values ('duke-01', 'duke', 'Duke', '2026-2027', 'Why Duke?', 'confirmed')",
      );
      await connection.query(
        "insert into user_colleges (user_id, college_slug, quick_notes) select id, 'duke', 'note' from users",
      );
      await connection.query(
        "insert into user_colleges (user_id, college_slug, quick_notes) select id, 'duke', 'duplicate row' from users",
      );
      await runMigrations(connection);

      const [prompt] = await connection.query<{ college_id: string | null; cycle_id: string | null; verification_status: string }>(
        "select college_id, cycle_id, verification_status from prompts where prompt_id = 'duke-01'",
      );
      assert.ok(prompt!.college_id);
      assert.ok(prompt!.cycle_id);
      assert.equal(prompt!.verification_status, "pending_review", "legacy rows are not shown as verified");
      const userRows = await connection.query<{ count: number }>("select count(*)::int as count from user_colleges");
      assert.equal(userRows[0]!.count, 2, "duplicate user rows are kept; the unique index is skipped instead");
      const index = await connection.query("select 1 from pg_indexes where indexname = 'user_colleges_user_college_idx'");
      assert.equal(index.length, 0);
    } finally {
      await connection.close();
    }
  });
});
