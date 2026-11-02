import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import type { AtlasConnection } from "../src/db/connect";
import { isAdminEmail } from "../src/lib/admin";
import { currentAcademicYear, roundFromApplicationType } from "../src/lib/catalog/cycles";
import { importDirectoryRecords } from "../src/lib/catalog/directory-import";
import { approve } from "../src/lib/catalog/review";
import { getCollegeRequirements, getUpcomingDeadlinesForUser } from "../src/lib/catalog/requirements";
import { withImportRun } from "../src/lib/catalog/runs";
import { searchColleges } from "../src/lib/catalog/search";
import { addCollegeForUser, removeCollegeForUser } from "../src/lib/catalog/user-colleges";
import { admissionsManifestSchema } from "../src/lib/ingest/manifest";
import { ingestManifest } from "../src/lib/ingest/submit";
import { createUser, directoryRecords, fakePages, freshDatabase, ipedsCsv } from "./helpers";

const URL = "https://admissions.sample.edu/deadlines";
const PAGE = "Early Decision: November 1. Regular Decision: January 5. Engineering applicants: Regular Decision January 2.";

describe("rounds and cycles", () => {
  it("maps stored application-type labels to round codes", () => {
    assert.equal(roundFromApplicationType("Regular Decision"), "RD");
    assert.equal(roundFromApplicationType("Early Decision II"), "ED2");
    assert.equal(roundFromApplicationType("Restrictive Early Action"), "REA");
    assert.equal(roundFromApplicationType("REA"), "REA");
    assert.equal(roundFromApplicationType("App type pending"), null);
    assert.equal(roundFromApplicationType(null), null);
  });

  it("derives the cycle from the Aug 1 boundary unless overridden", () => {
    assert.equal(currentAcademicYear(new Date("2026-07-31T12:00:00Z"), ""), "2025-2026");
    assert.equal(currentAcademicYear(new Date("2026-08-01T12:00:00Z"), ""), "2026-2027");
    assert.equal(currentAcademicYear(new Date("2026-11-01T12:00:00Z"), "2027-2028"), "2027-2028");
  });

  it("only allows listed admin emails", () => {
    assert.equal(isAdminEmail("Admin@Example.com", "admin@example.com, other@example.com"), true);
    assert.equal(isAdminEmail("student@example.com", "admin@example.com"), false);
    assert.equal(isAdminEmail("admin@example.com", ""), false);
    assert.equal(isAdminEmail(null, "admin@example.com"), false);
  });
});

describe("user application records", () => {
  let connection: AtlasConnection;
  let alice: string;
  let bob: string;

  before(async () => {
    connection = await freshDatabase();
    const records = await directoryRecords(
      ipedsCsv([
        { UNITID: "500001", INSTNM: "Sample University", CITY: "Springfield", STABBR: "IL" },
        { UNITID: "500002", INSTNM: "Other College", STABBR: "OH" },
      ]),
    );
    await withImportRun(connection.db, "directory", {}, (run) => importDirectoryRecords(connection.db, records, run));
    alice = await createUser(connection, "alice@example.com");
    bob = await createUser(connection, "bob@example.com");

    const manifest = admissionsManifestSchema.parse({
      unitid: 500001,
      name: "Sample University",
      cycle: "2026-2027",
      sources: [{ url: URL, kind: "deadlines" }],
      deadlines: [
        { round: "ED", date: "2026-11-01", sourceUrl: URL, excerpt: "Early Decision: November 1" },
        { round: "RD", date: "2027-01-05", sourceUrl: URL, excerpt: "Regular Decision: January 5" },
        {
          round: "RD",
          date: "2027-01-02",
          programScope: ["engineering"],
          sourceUrl: URL,
          excerpt: "Engineering applicants: Regular Decision January 2",
        },
      ],
    });
    await withImportRun(connection.db, "admissions_ingest", {}, (run) => ingestManifest(connection.db, manifest, fakePages({ [URL]: PAGE }), run));
  });

  after(() => connection.close());

  it("adding a college twice keeps one record", async () => {
    assert.equal(await addCollegeForUser(connection.db, alice, "sample-university", "Early Decision"), "added");
    assert.equal(await addCollegeForUser(connection.db, alice, "sample-university", "Regular Decision"), "already_in_list");
    const rows = await connection.query<{ selected_application_type: string }>(
      "select selected_application_type from user_colleges where user_id = $1",
      [alice],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.selected_application_type, "Early Decision", "re-adding does not overwrite the user's choice");
    assert.equal(await addCollegeForUser(connection.db, alice, "no-such-college"), "unknown_college");
  });

  it("removing archives the record and re-adding restores notes and progress", async () => {
    await connection.query("update user_colleges set quick_notes = 'Loved the library', status = 'Drafting' where user_id = $1", [alice]);
    assert.equal(await removeCollegeForUser(connection.db, alice, "sample-university"), true);
    const listed = await searchColleges(connection.db, alice, { q: "sample" });
    assert.equal(listed.results[0]!.inList, false);
    assert.deepEqual(await getUpcomingDeadlinesForUser(connection.db, alice, "2026-2027"), []);

    assert.equal(await addCollegeForUser(connection.db, alice, "sample-university"), "restored");
    const [row] = await connection.query<{ quick_notes: string; status: string; archived_at: string | null }>(
      "select quick_notes, status, archived_at from user_colleges where user_id = $1",
      [alice],
    );
    assert.equal(row!.quick_notes, "Loved the library");
    assert.equal(row!.status, "Drafting");
    assert.equal(row!.archived_at, null);
  });

  it("shows no official deadline until one is verified", async () => {
    const [entry] = await getUpcomingDeadlinesForUser(connection.db, alice, "2026-2027");
    assert.equal(entry!.status, "awaiting_verification");
    assert.equal(entry!.officialDate, null);
    const requirements = await getCollegeRequirements(connection.db, (await connection.query<{ id: string }>("select id from colleges where ipeds_unitid = 500001"))[0]!.id, "2026-2027");
    assert.equal(requirements.deadlines.length, 0);
    assert.equal(requirements.unverifiedDeadlineCount, 3);
  });

  it("uses the verified deadline for the selected round only, preferring the program-specific one", async () => {
    const pending = await connection.query<{ id: string }>("select id from application_deadlines");
    for (const row of pending) await approve(connection.db, "deadline", row.id, "admin@example.com");

    let [entry] = await getUpcomingDeadlinesForUser(connection.db, alice, "2026-2027");
    assert.equal(entry!.round, "ED");
    assert.equal(entry!.officialDate, "2026-11-01");

    await connection.query("update user_colleges set selected_application_type = 'Early Action' where user_id = $1", [alice]);
    [entry] = await getUpcomingDeadlinesForUser(connection.db, alice, "2026-2027");
    assert.equal(entry!.status, "awaiting_verification", "no EA deadline exists, so none is assumed");
    assert.equal(entry!.officialDate, null);

    await connection.query(
      "update user_colleges set selected_application_type = 'Regular Decision', program_selection = 'engineering' where user_id = $1",
      [alice],
    );
    [entry] = await getUpcomingDeadlinesForUser(connection.db, alice, "2026-2027");
    assert.equal(entry!.officialDate, "2027-01-02");

    await connection.query("update user_colleges set program_selection = 'general' where user_id = $1", [alice]);
    [entry] = await getUpcomingDeadlinesForUser(connection.db, alice, "2026-2027");
    assert.equal(entry!.officialDate, "2027-01-05");
  });

  it("does not show deadlines from another cycle", async () => {
    assert.equal((await getUpcomingDeadlinesForUser(connection.db, alice, "2027-2028"))[0]!.officialDate, null);
  });

  it("keeps each user's list private", async () => {
    assert.deepEqual(await getUpcomingDeadlinesForUser(connection.db, bob, "2026-2027"), []);
    const forBob = await searchColleges(connection.db, bob, { q: "sample" });
    assert.equal(forBob.results[0]!.inList, false);
    const forAlice = await searchColleges(connection.db, alice, { q: "sample" });
    assert.equal(forAlice.results[0]!.inList, true);
    assert.equal(await removeCollegeForUser(connection.db, bob, "sample-university"), false, "bob cannot remove alice's record");
    const [row] = await connection.query<{ archived_at: string | null }>("select archived_at from user_colleges where user_id = $1", [alice]);
    assert.equal(row!.archived_at, null);
  });

  it("filters search by state, level and control", async () => {
    const illinois = await searchColleges(connection.db, null, { state: "IL" });
    assert.deepEqual(illinois.results.map((row) => row.name), ["Sample University"]);
    const twoYear = await searchColleges(connection.db, null, { level: "two_year" });
    assert.equal(twoYear.total, 0);
  });
});
