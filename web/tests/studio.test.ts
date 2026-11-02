import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { z } from "zod";

import type { AtlasConnection } from "../src/db/connect";
import { AiLimitError, AiOutputError, AiUnavailableError, type ModelCaller, runStructured } from "../src/lib/ai/client";
import { importDirectoryRecords } from "../src/lib/catalog/directory-import";
import { withImportRun } from "../src/lib/catalog/runs";
import {
  buildWhyCollegeConnections,
  linkFindingToPrompt,
  listFindings,
  recheckFinding,
  researchSection,
  setFindingSaved,
} from "../src/lib/research/findings";
import { officialDomain } from "../src/lib/research/search";
import {
  createConnection,
  createIdeaCard,
  createOutlineFromTheme,
  discoverConnections,
  listOutlines,
  updateIdeaCard,
} from "../src/lib/studio/ideas";
import {
  copyDraftToPrompt,
  getEssayFeedback,
  getPersonalStatement,
  restorePersonalStatementVersion,
  savePersonalStatementDraft,
} from "../src/lib/studio/writing";
import { createUser, directoryRecords, fakePages, freshDatabase, ipedsCsv } from "./helpers";

/** A fake model that returns queued responses in order. */
function scripted(...responses: unknown[]): ModelCaller & { calls: number } {
  const caller = (async () => {
    const next = responses[Math.min(caller.calls, responses.length - 1)];
    caller.calls += 1;
    return { text: typeof next === "string" ? next : JSON.stringify(next) };
  }) as unknown as ModelCaller & { calls: number };
  caller.calls = 0;
  return caller;
}

function theme(cardIds: string[], title = "Repair as listening") {
  return {
    title,
    connectedCardIds: cardIds,
    connection: "Both cards involve taking something apart slowly to understand it.",
    whyMeaningful: "It suggests patience as a way of caring.",
    narrativeApproach: "Braid the two moments.",
    structure: ["The radio", "The bakery shift", "What they share"],
    openingScenes: ["Begin with the moment you opened the radio's back panel."],
    reflectiveQuestions: ["What did the radio sound like?", "Who taught you?", "What changed after?"],
    ratings: { authenticity: "strong", specificity: "promising", narrativePotential: "strong", originality: "promising" },
    missingDetails: ["When the bakery job started"],
  };
}

describe("structured AI calls", () => {
  let connection: AtlasConnection;
  let userId: string;
  const schema = z.object({ answer: z.string() });
  const request = { instructions: "x", input: "y", schemaName: "t", jsonSchema: {} };

  before(async () => {
    connection = await freshDatabase();
    userId = await createUser(connection, "ai@example.com");
  });
  after(() => connection.close());

  it("refuses to run without a configured key or caller", async () => {
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    await assert.rejects(runStructured(connection.db, userId, "t", schema, request), AiUnavailableError);
    if (saved) process.env.OPENAI_API_KEY = saved;
  });

  it("retries once on invalid JSON and records usage", async () => {
    const caller = scripted("not json", { answer: "ok" });
    const result = await runStructured(connection.db, userId, "t", schema, request, { caller });
    assert.equal(result.answer, "ok");
    assert.equal(caller.calls, 2);
    const rows = await connection.query<{ status: string }>("select status from ai_usage where user_id = $1 order by created_at", [userId]);
    assert.deepEqual(rows.map((row) => row.status), ["invalid_output", "ok"]);
  });

  it("fails cleanly when both attempts are invalid", async () => {
    await assert.rejects(runStructured(connection.db, userId, "t", schema, request, { caller: scripted({ wrong: 1 }) }), AiOutputError);
  });

  it("enforces the per-user daily limit", async () => {
    await assert.rejects(
      runStructured(connection.db, userId, "t", schema, request, { caller: scripted({ answer: "x" }), dailyLimit: 2 }),
      AiLimitError,
    );
  });
});

describe("Idea Garden", () => {
  let connection: AtlasConnection;
  let userId: string;
  let otherId: string;
  let cardIds: string[];

  before(async () => {
    connection = await freshDatabase();
    userId = await createUser(connection, "garden@example.com");
    otherId = await createUser(connection, "other@example.com");
    const a = await createIdeaCard(connection.db, userId, { category: "memory", title: "Fixing grandma's radio", detail: "Took two weekends" });
    const b = await createIdeaCard(connection.db, userId, { category: "activity", title: "Bakery shifts", detail: "5am Saturdays" });
    const c = await createIdeaCard(connection.db, userId, { category: "trait", title: "Slow reader" });
    cardIds = [a.id, b.id, c.id];
  });
  after(() => connection.close());

  it("rejects invalid card input", async () => {
    await assert.rejects(createIdeaCard(connection.db, userId, { category: "nope" as never, title: "x" }));
    await assert.rejects(createIdeaCard(connection.db, userId, { category: "memory", title: "   " }));
  });

  it("keeps cards private to their owner", async () => {
    assert.equal(await updateIdeaCard(connection.db, otherId, cardIds[0]!, { category: "memory", title: "hijack" }), false);
    assert.equal(await createConnection(connection.db, otherId, cardIds[0]!, cardIds[1]!), null);
    assert.ok(await createConnection(connection.db, userId, cardIds[0]!, cardIds[1]!));
  });

  it("stores themes that cite only the selected cards", async () => {
    const caller = scripted({ themes: [theme([cardIds[0]!, cardIds[1]!])] });
    const stored = await discoverConnections(connection.db, userId, [cardIds[0]!, cardIds[1]!], { caller });
    assert.equal(stored.length, 1);
    assert.deepEqual([...stored[0]!.cardIds].sort(), [cardIds[0]!, cardIds[1]!].sort());
  });

  it("rejects themes that invent or borrow card ids", async () => {
    const invented = scripted({ themes: [theme([cardIds[0]!, "00000000-0000-0000-0000-000000000000"])] });
    await assert.rejects(discoverConnections(connection.db, userId, [cardIds[0]!, cardIds[1]!], { caller: invented }), AiOutputError);
    // A card that exists but wasn't selected is also rejected.
    const unselected = scripted({ themes: [theme([cardIds[0]!, cardIds[2]!])] });
    await assert.rejects(discoverConnections(connection.db, userId, [cardIds[0]!, cardIds[1]!], { caller: unselected }), AiOutputError);
  });

  it("will not analyze another user's cards", async () => {
    await assert.rejects(discoverConnections(connection.db, otherId, cardIds, { caller: scripted({ themes: [] }) }), /your own idea cards/);
  });

  it("creates an outline from a theme and saves the theme", async () => {
    const [row] = await connection.query<{ id: string }>("select id from generated_themes where user_id = $1 limit 1", [userId]);
    await createOutlineFromTheme(connection.db, userId, row!.id);
    const [outline] = await listOutlines(connection.db, userId, { targetKind: "personal_statement" });
    assert.equal(outline!.sections[0]!.heading, "Opening scene");
    assert.equal(outline!.sections.length, 4);
    const [saved] = await connection.query<{ saved: boolean }>("select saved from generated_themes where id = $1", [row!.id]);
    assert.equal(saved!.saved, true);
  });
});

describe("personal statement and library", () => {
  let connection: AtlasConnection;
  let userId: string;
  let otherId: string;

  before(async () => {
    connection = await freshDatabase();
    userId = await createUser(connection, "writer@example.com");
    otherId = await createUser(connection, "nosy@example.com");
    await connection.query(
      "insert into prompts (prompt_id, college_slug, college_name, prompt_text, content_hash, verification_status) values ('duke-why', 'duke', 'Duke', 'Why Duke?', 'h1', 'verified')",
    );
  });
  after(() => connection.close());

  it("autosaves into the current version and restores by copying", async () => {
    const first = await savePersonalStatementDraft(connection.db, userId, null, "First draft text");
    const same = await savePersonalStatementDraft(connection.db, userId, first.id, "First draft, edited");
    assert.equal(same.id, first.id);
    await restorePersonalStatementVersion(connection.db, userId, first.id);
    const { versions } = await getPersonalStatement(connection.db, userId);
    assert.equal(versions.length, 2, "restore adds a version");
    assert.equal(versions[0]!.content, "First draft, edited", "the original is untouched");
    assert.equal(versions[1]!.content, "First draft, edited");
  });

  it("cannot autosave into someone else's draft", async () => {
    const { versions } = await getPersonalStatement(connection.db, userId);
    await savePersonalStatementDraft(connection.db, otherId, versions[0]!.id, "overwrite attempt");
    const after = await getPersonalStatement(connection.db, userId);
    assert.equal(after.versions[0]!.content, "First draft, edited");
    await assert.rejects(restorePersonalStatementVersion(connection.db, otherId, versions[0]!.id), /not found/);
  });

  it("reuses a draft in another prompt as a new version", async () => {
    const { versions } = await getPersonalStatement(connection.db, userId);
    await connection.query("insert into essay_drafts (user_id, prompt_id, content) values ($1, 'duke-why', 'Existing Duke draft')", [userId]);
    await copyDraftToPrompt(connection.db, userId, versions[0]!.id, "duke-why");
    const rows = await connection.query<{ content: string }>("select content from essay_drafts where prompt_id = 'duke-why' order by created_at", [
    ]);
    assert.deepEqual(rows.map((row) => row.content), ["Existing Duke draft", "First draft, edited"]);
  });

  it("rejects feedback quotes that are not in the draft", async () => {
    const draft = Array.from({ length: 60 }, (_, index) => `word${index}`).join(" ");
    const bad = {
      overview: "Solid start.",
      strengths: [{ observation: "vivid", quote: "a sentence the student never wrote" }],
      questions: ["What happened next?"],
      specificityGaps: [],
      structureNotes: [],
      promptFit: "Fits.",
    };
    await assert.rejects(getEssayFeedback(connection.db, userId, { draft, promptText: "p", wordLimit: 650 }, { caller: scripted(bad) }), AiOutputError);
    const good = { ...bad, strengths: [{ observation: "clear", quote: "word3 word4 word5" }] };
    const result = await getEssayFeedback(connection.db, userId, { draft, promptText: "p", wordLimit: 650 }, { caller: scripted(good) });
    assert.equal(result.strengths[0]!.quote, "word3 word4 word5");
    await assert.rejects(getEssayFeedback(connection.db, userId, { draft: "too short", promptText: "p", wordLimit: 650 }), /at least 40 words/);
  });
});

describe("AI research", () => {
  let connection: AtlasConnection;
  let userId: string;
  let otherId: string;
  const PAGE = "https://www.example.edu/neuro";
  const OFF = "https://blog.other.com/example-u";
  const pageText = "The Neuroscience Program offers an undergraduate research track. Students join the Memory Lab in their second year.";

  const search = async () => [
    { title: "Neuroscience Program", url: PAGE, snippet: "Neuroscience" },
    { title: "Unofficial blog", url: OFF, snippet: "Rumors about clubs" },
  ];

  before(async () => {
    connection = await freshDatabase();
    userId = await createUser(connection, "research@example.com");
    otherId = await createUser(connection, "other@example.com");
    const records = await directoryRecords(ipedsCsv([{ UNITID: "500001", INSTNM: "Example University", WEBADDR: "www.example.edu/" }]));
    await withImportRun(connection.db, "directory", {}, (run) => importDirectoryRecords(connection.db, records, run));
  });
  after(() => connection.close());

  it("derives the official domain", () => {
    assert.equal(officialDomain("https://www.admissions.duke.edu/"), "duke.edu");
    assert.equal(officialDomain("www.example.edu/"), "example.edu");
    assert.equal(officialDomain(null), null);
  });

  it("keeps only findings whose evidence appears on an official source", async () => {
    const caller = scripted({
      findings: [
        { title: "Neuroscience research track", summary: "Undergraduate research track.", relevance: "Matches neuroscience.", sourceNumber: 1, evidence: "offers an undergraduate research track" },
        { title: "Invented lab", summary: "A lab that isn't on the page.", relevance: "Sounds relevant.", sourceNumber: 1, evidence: "the Quantum Dance Lab hosts weekly jams" },
        { title: "Bad source", summary: "Cites a source that wasn't provided.", relevance: "Sounds relevant.", sourceNumber: 7, evidence: "Memory Lab" },
      ],
    });
    const result = await researchSection(connection.db, userId, "example-university", "labs_faculty", ["neuroscience"], {
      search,
      loadPage: fakePages({ [PAGE]: pageText }),
      caller,
    });
    assert.equal(result.kept, 1);
    assert.equal(result.rejected, 2);
    assert.equal(result.sourcesSearched, 1, "off-domain results are never used");
    const [finding] = await listFindings(connection.db, userId, ["example-university"]);
    assert.equal(finding!.source!.isOfficial, true);
    assert.equal(finding!.verificationStatus, "source_matched");
  });

  it("regenerating replaces unsaved findings but keeps saved ones", async () => {
    const [finding] = await listFindings(connection.db, userId, ["example-university"]);
    await setFindingSaved(connection.db, userId, finding!.id, true);
    await researchSection(connection.db, userId, "example-university", "labs_faculty", ["neuroscience"], {
      search,
      loadPage: fakePages({ [PAGE]: pageText }),
      caller: scripted({
        findings: [{ title: "Memory Lab", summary: "Second-year students join.", relevance: "Research.", sourceNumber: 1, evidence: "Students join the Memory Lab in their second year." }],
      }),
    });
    const titles = (await listFindings(connection.db, userId, ["example-university"])).map((row) => row.title).sort();
    assert.deepEqual(titles, ["Memory Lab", "Neuroscience research track"]);
  });

  it("builds why-this-college connections only from existing findings", async () => {
    const findings = await listFindings(connection.db, userId, ["example-university"]);
    await assert.rejects(
      buildWhyCollegeConnections(connection.db, userId, "example-university", ["neuroscience"], scripted({
        connections: [{ title: "Made up", summary: "Connects to a made-up finding.", relevance: "Not real.", findingIds: ["00000000-0000-0000-0000-000000000000"] }],
      })),
      AiOutputError,
    );
    const ok = await buildWhyCollegeConnections(connection.db, userId, "example-university", ["neuroscience"], scripted({
      connections: [{ title: "Research from year two", summary: "Your lab interest meets the Memory Lab.", relevance: "Neuroscience.", findingIds: [findings[0]!.id] }],
    }));
    assert.equal(ok.kept, 1);
  });

  it("recheck marks a finding when its source changes", async () => {
    const [finding] = (await listFindings(connection.db, userId, ["example-university"])).filter((row) => row.section === "labs_faculty");
    assert.equal(await recheckFinding(connection.db, userId, finding!.id, fakePages({ [PAGE]: "This page was redesigned." })), "source_changed");
    assert.equal(await recheckFinding(connection.db, userId, finding!.id, fakePages({})), "source_unreachable");
  });

  it("findings and essay links are private", async () => {
    const [finding] = await listFindings(connection.db, userId, ["example-university"]);
    assert.equal(await linkFindingToPrompt(connection.db, otherId, finding!.id, "any-prompt"), false);
    assert.equal((await listFindings(connection.db, otherId, ["example-university"])).length, 0);
    assert.equal(await linkFindingToPrompt(connection.db, userId, finding!.id, "any-prompt"), true);
  });
});
