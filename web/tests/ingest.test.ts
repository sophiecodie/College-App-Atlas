import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import type { z } from "zod";

import type { AtlasConnection } from "../src/db/connect";
import { importDirectoryRecords } from "../src/lib/catalog/directory-import";
import { approve, editPrompt, setStatus } from "../src/lib/catalog/review";
import { withImportRun } from "../src/lib/catalog/runs";
import { parseRobots, robotsAllows } from "../src/lib/ingest/fetcher";
import { htmlToText } from "../src/lib/ingest/html-text";
import { type AdmissionsManifest, admissionsManifestSchema } from "../src/lib/ingest/manifest";
import { refreshAdmissionsSources } from "../src/lib/ingest/refresh";
import { ingestManifest } from "../src/lib/ingest/submit";
import {
  dateWithinCycle,
  excerptMentionsDate,
  validateDeadlineCandidate,
  validatePromptCandidate,
} from "../src/lib/ingest/validate";
import { createUser, directoryRecords, fakePages, freshDatabase, ipedsCsv } from "./helpers";

const URL_A = "https://admissions.example.edu/apply/essays";
const URL_B = "https://other-source.example.org/example-university";

const PAGE_2026 = `
  Supplemental Essays for 2026–2027
  Please respond to the following prompt in 150 words or fewer.
  What would you contribute to the Example University community?
  Optional: Tell us about a book that changed your mind. (Up to 250 words)
  Deadlines: Early Action — November 1. Regular Decision — January 3.
`;

function manifest(overrides: Partial<z.input<typeof admissionsManifestSchema>> = {}): AdmissionsManifest {
  return admissionsManifestSchema.parse({
    unitid: 400001,
    name: "Example University",
    cycle: "2026-2027",
    platforms: ["common_app"],
    sources: [{ url: URL_A, kind: "both" }],
    prompts: [
      {
        slot: "community",
        text: "What would you contribute to the Example University community?",
        sourceUrl: URL_A,
        required: true,
        wordLimit: 150,
        limitEvidence: "150 words or fewer",
        category: "Community",
      },
      {
        slot: "book",
        text: "Tell us about a book that changed your mind.",
        sourceUrl: URL_A,
        required: false,
        optionalChoice: true,
        wordLimit: 250,
        limitEvidence: "Up to 250 words",
      },
    ],
    deadlines: [
      { round: "EA", date: "2026-11-01", sourceUrl: URL_A, excerpt: "Early Action — November 1" },
      { round: "RD", date: "2027-01-03", sourceUrl: URL_A, excerpt: "Regular Decision — January 3" },
    ],
    ...overrides,
  });
}

async function ingest(connection: AtlasConnection, m: AdmissionsManifest, pages: Record<string, string>, adapter = "curated-official") {
  return withImportRun(connection.db, "admissions_ingest", {}, (run) => ingestManifest(connection.db, m, fakePages(pages), run, adapter), {
    lockName: `admissions-${Math.random()}`,
  });
}

async function promptRows(connection: AtlasConnection) {
  return connection.query<{ id: string; prompt_id: string; slot_key: string; prompt_text: string; verification_status: string; cycle: string; supersedes_id: string | null; word_limit: number | null }>(
    "select id, prompt_id, slot_key, prompt_text, verification_status, cycle, supersedes_id, word_limit from prompts where ingest_source is not null order by created_at, prompt_text",
  );
}

async function deadlineRows(connection: AtlasConnection) {
  return connection.query<{ id: string; round: string; deadline_date: string; verification_status: string; stale_reason: string | null }>(
    "select id, round, deadline_date::text, verification_status, stale_reason from application_deadlines order by round, created_at",
  );
}

describe("candidate validation", () => {
  it("accepts verbatim text despite typographic differences", () => {
    const prompt = manifest().prompts[0]!;
    const typographic = PAGE_2026.replace("Example University community", "Example\u00A0University community").replace("contribute", "contribute  ");
    assert.deepEqual(validatePromptCandidate(prompt, typographic), { ok: true });
  });

  it("rejects paraphrased prompts and unsupported limits", () => {
    const prompt = { ...manifest().prompts[0]!, text: "What will you contribute to our community?" };
    assert.equal(validatePromptCandidate(prompt, PAGE_2026).ok, false);
    const wrongLimit = { ...manifest().prompts[0]!, wordLimit: 200 };
    assert.equal(validatePromptCandidate(wrongLimit, PAGE_2026).ok, false);
    const noEvidence = { ...manifest().prompts[0]!, limitEvidence: null };
    assert.equal(validatePromptCandidate(noEvidence, PAGE_2026).ok, false);
  });

  it("requires deadline excerpts that state the same date within the cycle", () => {
    assert.equal(excerptMentionsDate("Early Action — November 1", "2026-11-01"), true);
    assert.equal(excerptMentionsDate("Nov. 1st", "2026-11-01"), true);
    assert.equal(excerptMentionsDate("11/1", "2026-11-01"), true);
    assert.equal(excerptMentionsDate("Early ActionNov. 2", "2026-11-02"), true);
    assert.equal(excerptMentionsDate("November 15", "2026-11-01"), false);
    assert.equal(dateWithinCycle("2027-01-03", "2026-2027"), true);
    assert.equal(dateWithinCycle("2026-01-03", "2026-2027"), false);
    const deadline = manifest().deadlines[0]!;
    assert.equal(validateDeadlineCandidate({ ...deadline, date: "2026-11-15" }, PAGE_2026, "2026-2027").ok, false);
    assert.equal(validateDeadlineCandidate({ ...deadline, date: "2025-11-01" }, PAGE_2026, "2026-2027").ok, false);
    assert.equal(validateDeadlineCandidate({ ...deadline, date: null }, PAGE_2026, "2026-2027").ok, false);
  });

  it("converts HTML to text and honours robots.txt", () => {
    const lines = htmlToText("<p>Why&nbsp;us?</p><script>var x</script><li>150&#160;words</li>").split(/\n+/);
    assert.deepEqual(lines, ["Why us?", "150 words"]);
    const rules = parseRobots("User-agent: *\nDisallow: /private\nAllow: /private/public\n\nUser-agent: OtherBot\nDisallow: /");
    assert.equal(robotsAllows(rules, "/apply"), true);
    assert.equal(robotsAllows(rules, "/private/x"), false);
    assert.equal(robotsAllows(rules, "/private/public/page"), true);
    assert.equal(robotsAllows(parseRobots("User-agent: CollegeAtlasBot\nDisallow: /"), "/anything"), false);
  });
});

describe("admissions ingestion and review", () => {
  let connection: AtlasConnection;

  before(async () => {
    connection = await freshDatabase();
    const records = await directoryRecords(ipedsCsv([{ UNITID: "400001", INSTNM: "Example University" }]));
    await withImportRun(connection.db, "directory", {}, (run) => importDirectoryRecords(connection.db, records, run));
  });

  after(() => connection.close());

  it("queues valid candidates as pending review, never verified", async () => {
    const result = await ingest(connection, manifest(), { [URL_A]: PAGE_2026 });
    assert.equal(result.status, "succeeded");
    assert.equal(result.stats.prompts_inserted, 2);
    assert.equal(result.stats.deadlines_inserted, 2);
    const prompts = await promptRows(connection);
    assert.ok(prompts.every((row) => row.verification_status === "pending_review"));
    const [cycle] = await connection.query<{ publication_status: string; platforms: string[] }>(
      "select publication_status, platforms from application_cycles",
    );
    assert.equal(cycle!.publication_status, "published");
    assert.deepEqual(cycle!.platforms, ["common_app"]);
  });

  it("rerunning the same manifest creates no duplicates", async () => {
    const result = await ingest(connection, manifest(), { [URL_A]: PAGE_2026 });
    assert.equal(result.stats.prompts_duplicate, 2);
    assert.equal(result.stats.deadlines_duplicate, 2);
    assert.equal((await promptRows(connection)).length, 2);
    assert.equal((await deadlineRows(connection)).length, 2);
    const snapshots = await connection.query<{ count: number }>("select count(*)::int as count from source_snapshots");
    assert.equal(snapshots[0]!.count, 1, "identical page content is stored once");
  });

  it("does not store candidates that fail validation and logs why", async () => {
    const bad = manifest({
      prompts: [{ ...manifest().prompts[0]!, slot: "invented", text: "Describe your favorite Example University tradition." }],
      deadlines: [{ ...manifest().deadlines[0]!, round: "ED", date: "2026-11-15", excerpt: "Early Action — November 1" }],
    });
    const result = await ingest(connection, bad, { [URL_A]: PAGE_2026 });
    assert.equal(result.status, "partial");
    assert.equal(result.stats.promptsRejectedByValidation, 1);
    assert.equal(result.stats.deadlinesRejectedByValidation, 1);
    assert.equal((await promptRows(connection)).length, 2);
    const errors = await connection.query<{ message: string }>("select message from import_run_errors where run_id = $1", [result.runId]);
    assert.ok(errors.some((error) => /not found verbatim/.test(error.message)));
  });

  it("records an unreachable source as a failure and stores nothing from it", async () => {
    const result = await ingest(connection, manifest({ sources: [{ url: "https://admissions.example.edu/missing", kind: "both" }], prompts: [{ ...manifest().prompts[0]!, sourceUrl: "https://admissions.example.edu/missing", slot: "x", text: "A prompt we could not fetch from anywhere." }], deadlines: [] }), {});
    assert.equal(result.status, "partial");
    assert.equal(result.stats.sourcesUnavailable, 1);
    assert.equal(result.stats.promptsUnverifiable, 1);
    const [source] = await connection.query<{ last_status: number; last_error: string }>(
      "select last_status, last_error from admissions_sources where url = 'https://admissions.example.edu/missing'",
    );
    assert.equal(source!.last_status, 404);
  });

  it("approval makes a record authoritative; new wording is queued without replacing it", async () => {
    const [community] = (await promptRows(connection)).filter((row) => row.slot_key === "community");
    await approve(connection.db, "prompt", community!.id, "admin@example.com");
    const ea = (await deadlineRows(connection)).find((row) => row.round === "EA")!;
    await approve(connection.db, "deadline", ea.id, "admin@example.com");

    const changedPage = PAGE_2026.replace(
      "What would you contribute to the Example University community?",
      "How would you contribute to the Example University community?",
    ).replace("Early Action — November 1", "Early Action — November 3");
    const changed = manifest({
      prompts: [{ ...manifest().prompts[0]!, text: "How would you contribute to the Example University community?" }],
      deadlines: [{ ...manifest().deadlines[0]!, date: "2026-11-03", excerpt: "Early Action — November 3" }],
    });
    const result = await ingest(connection, changed, { [URL_A]: changedPage });
    assert.equal(result.stats.prompts_superseding, 1);
    assert.equal(result.stats.deadlines_superseding, 1);

    const slot = (await promptRows(connection)).filter((row) => row.slot_key === "community");
    const verified = slot.find((row) => row.verification_status === "verified")!;
    const candidate = slot.find((row) => row.verification_status === "pending_review")!;
    assert.equal(verified.prompt_text, "What would you contribute to the Example University community?");
    assert.equal(candidate.supersedes_id, verified.id);

    const eaRows = (await deadlineRows(connection)).filter((row) => row.round === "EA");
    assert.equal(eaRows.find((row) => row.verification_status === "verified")!.deadline_date, "2026-11-01");

    await approve(connection.db, "prompt", candidate.id, "admin@example.com");
    const afterApproval = (await promptRows(connection)).filter((row) => row.slot_key === "community");
    assert.equal(afterApproval.find((row) => row.id === verified.id)!.verification_status, "outdated", "history is kept");
    assert.equal(afterApproval.find((row) => row.id === candidate.id)!.verification_status, "verified");
  });

  it("flags disagreement between two sources as conflicting", async () => {
    const otherPage = "Example University Early Action deadline: November 5";
    const other = manifest({
      sources: [{ url: URL_B, kind: "deadlines" }],
      prompts: [],
      deadlines: [{ round: "EA", date: "2026-11-05", sourceUrl: URL_B, excerpt: "Early Action deadline: November 5" }],
    });
    const result = await ingest(connection, other, { [URL_B]: otherPage }, "other-dataset");
    assert.equal(result.stats.deadlines_conflicting, 1);
    const ea = (await deadlineRows(connection)).filter((row) => row.round === "EA");
    assert.equal(ea.filter((row) => row.verification_status === "conflicting").length, 2);
    assert.equal(ea.filter((row) => row.verification_status === "verified").length, 1, "the verified date is untouched");
  });

  it("keeps prompts year-specific: identical text in a new cycle is a separate record", async () => {
    const nextYear = manifest({
      cycle: "2027-2028",
      deadlines: [],
      prompts: [manifest().prompts[1]!],
    });
    await ingest(connection, nextYear, { [URL_A]: PAGE_2026 });
    const rows = (await promptRows(connection)).filter((row) => row.slot_key === "book");
    assert.deepEqual(rows.map((row) => row.cycle).sort(), ["2026-2027", "2027-2028"]);
    assert.notEqual(rows[0]!.prompt_id, rows[1]!.prompt_id);
  });

  it("editing a prompt keeps its prompt_id so drafts stay attached", async () => {
    const userId = await createUser(connection, "writer@example.com");
    const [book] = (await promptRows(connection)).filter((row) => row.slot_key === "book" && row.cycle === "2026-2027");
    await connection.query("insert into essay_drafts (user_id, prompt_id, content) values ($1, $2, 'Draft one')", [userId, book!.prompt_id]);
    await editPrompt(
      connection.db,
      book!.id,
      {
        text: "Tell us about a book that changed your mind.",
        wordLimit: 200,
        wordMin: null,
        characterLimit: null,
        required: false,
        optionalChoice: true,
        category: "Intellectual Curiosity",
        programScope: [],
      },
      "admin@example.com",
    );
    await setStatus(connection.db, "prompt", book!.id, "unavailable", "admin@example.com", "Removed from the page");
    const [row] = await connection.query<{ prompt_id: string; word_limit: number; verification_status: string; review_note: string }>(
      "select prompt_id, word_limit, verification_status, review_note from prompts where id = $1",
      [book!.id],
    );
    assert.equal(row!.prompt_id, book!.prompt_id);
    assert.equal(row!.word_limit, 200);
    assert.equal(row!.verification_status, "unavailable");
    assert.match(row!.review_note, /word limit was 250/);
    const [draft] = await connection.query<{ content: string }>("select content from essay_drafts where prompt_id = $1", [book!.prompt_id]);
    assert.equal(draft!.content, "Draft one");
  });

  it("scheduled refresh flags verified records stale when the page changes, without changing their status", async () => {
    await connection.query("update admissions_sources set last_checked_at = null");
    const changedAgain = "Supplemental essays have moved. Early Action — November 10.";
    const result = await withImportRun(connection.db, "admissions_refresh", {}, (run) =>
      refreshAdmissionsSources(connection.db, fakePages({ [URL_A]: changedAgain, [URL_B]: "Early Action deadline: November 5" }), run, {
        academicYear: "2026-2027",
      }),
    );
    assert.ok((result.stats.sourcesChanged ?? 0) >= 1);
    const verifiedPrompt = await connection.query<{ verification_status: string; stale_reason: string | null }>(
      "select verification_status, stale_reason from prompts where slot_key = 'community' and verification_status = 'verified'",
    );
    assert.equal(verifiedPrompt.length, 1);
    assert.match(verifiedPrompt[0]!.stale_reason ?? "", /no longer appears/);
  });
});

describe("manifest schema", () => {
  it("rejects malformed manifests", () => {
    assert.equal(admissionsManifestSchema.safeParse({ unitid: 1, name: "x", cycle: "2026", sources: [] }).success, false);
    assert.equal(
      admissionsManifestSchema.safeParse({
        unitid: 1,
        name: "x",
        cycle: "2026-2027",
        sources: [{ url: URL_A, kind: "both" }],
        deadlines: [{ round: "EARLY", date: "2026-11-01", sourceUrl: URL_A, excerpt: "Nov 1" }],
      }).success,
      false,
    );
  });
});

