import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import type { AtlasDb } from "@/db/connect";
import {
  colleges,
  essayResearchLinks,
  RESEARCH_SECTIONS,
  type ResearchSection,
  researchFindings,
  researchInterests,
  researchSources,
} from "@/db/schema";
import { jsonArray, jsonObject, jsonString, type ModelCaller, runStructured } from "@/lib/ai/client";
import { contentHash, normalizeForComparison } from "@/lib/catalog/normalize";
import type { FetchResult } from "@/lib/ingest/fetcher";
import { isOnDomain, officialDomain, type WebSearch } from "@/lib/research/search";

export const SECTION_INFO: Record<ResearchSection, { label: string; query: string }> = {
  academic_programs: { label: "Academic programs", query: "major program department" },
  courses: { label: "Specific courses", query: "course catalog courses" },
  labs_faculty: { label: "Research labs & faculty", query: "undergraduate research lab faculty" },
  clubs: { label: "Clubs & extracurriculars", query: "student organizations clubs" },
  culture: { label: "Campus culture & traditions", query: "campus traditions student life" },
  interdisciplinary: { label: "Interdisciplinary opportunities", query: "interdisciplinary program certificate" },
  career: { label: "Career & entrepreneurship", query: "career center entrepreneurship internships" },
  why_college: { label: "Why this college? connections", query: "" },
};
export const SEARCH_SECTIONS = RESEARCH_SECTIONS.filter((section) => section !== "why_college");

export function isResearchSection(value: string): value is ResearchSection {
  return (RESEARCH_SECTIONS as readonly string[]).includes(value);
}

export type ResearchDeps = {
  search: WebSearch;
  loadPage: (url: string) => Promise<FetchResult>;
  caller?: ModelCaller;
};

export function parseInterests(raw: string) {
  return [...new Set(raw.split(/[,\n;]/).map((value) => value.trim()).filter(Boolean))].slice(0, 8).map((value) => value.slice(0, 60));
}

export async function getInterests(db: AtlasDb, userId: string, collegeSlug: string) {
  const [row] = await db
    .select({ interests: researchInterests.interests })
    .from(researchInterests)
    .where(and(eq(researchInterests.userId, userId), eq(researchInterests.collegeSlug, collegeSlug)));
  return row?.interests ?? [];
}

export async function saveInterests(db: AtlasDb, userId: string, collegeSlug: string, interests: string[]) {
  await db
    .insert(researchInterests)
    .values({ userId, collegeSlug, interests })
    .onConflictDoUpdate({
      target: [researchInterests.userId, researchInterests.collegeSlug],
      set: { interests, updatedAt: new Date() },
    });
}

async function upsertSource(db: AtlasDb, input: { url: string; title: string; domain: string | null; text: string }) {
  const host = new URL(input.url).hostname.toLowerCase();
  const [row] = await db
    .insert(researchSources)
    .values({
      url: input.url,
      title: input.title.slice(0, 300),
      domain: host,
      isOfficial: isOnDomain(input.url, input.domain),
      contentHash: contentHash(input.text),
      checkedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: researchSources.url,
      set: { title: input.title.slice(0, 300), contentHash: contentHash(input.text), checkedAt: new Date() },
    })
    .returning({ id: researchSources.id });
  return row!.id;
}

const extractSchema = z.object({
  findings: z
    .array(
      z.object({
        title: z.string().min(2).max(160),
        summary: z.string().min(10).max(700),
        relevance: z.string().min(5).max(500),
        sourceNumber: z.number().int(),
        evidence: z.string().min(8).max(500),
      }),
    )
    .max(6),
});

export const EXTRACT_INSTRUCTIONS = [
  "You extract college research findings for a student from the provided source pages ONLY.",
  "Every finding must be stated in its source text. Do not use outside knowledge. Do not invent or guess courses, course numbers, labs, professors, clubs, statistics, or policies.",
  "evidence must be copied word for word from the cited source text (a contiguous passage, under 40 words).",
  "relevance explains briefly how the finding connects to the student's stated interests; don't overstate.",
  "If the sources contain nothing relevant, return an empty findings list.",
  "Length limits: title under 120 characters, summary under 600, relevance under 400, at most 6 findings.",
].join(" ");

function sourceTextMatches(sourceText: string, evidence: string) {
  const needle = normalizeForComparison(evidence);
  return needle.length >= 8 && normalizeForComparison(sourceText).includes(needle);
}

/**
 * Researches one section for one college: official-domain search → fetch pages → AI extraction →
 * keep only findings whose evidence is found verbatim in the cited source. Unsaved, unedited findings
 * in the section are replaced; saved or edited ones are kept.
 */
export async function researchSection(
  db: AtlasDb,
  userId: string,
  collegeSlug: string,
  section: Exclude<ResearchSection, "why_college">,
  interests: string[],
  deps: ResearchDeps,
) {
  const [college] = await db
    .select({ name: colleges.name, websiteUrl: colleges.websiteUrl, admissionsUrl: colleges.admissionsUrl })
    .from(colleges)
    .where(eq(colleges.slug, collegeSlug))
    .limit(1);
  if (!college) throw new Error("College not found.");
  const domain = officialDomain(college.websiteUrl ?? college.admissionsUrl);
  if (!domain) throw new Error(`${college.name} has no official website on file, so research can't be limited to official sources.`);

  const query = `${college.name} ${interests.join(" ")} ${SECTION_INFO[section].query}`.trim();
  const results = (await deps.search(query, { domain, maxResults: 6 })).filter((row) => isOnDomain(row.url, domain)).slice(0, 4);

  const sources: Array<{ number: number; url: string; title: string; text: string }> = [];
  for (const result of results) {
    const page = await deps.loadPage(result.url);
    const text = page.ok && page.text.trim() ? page.text.slice(0, 9000) : result.snippet;
    if (text.trim()) sources.push({ number: sources.length + 1, url: result.url, title: result.title, text });
  }

  let kept: Array<z.infer<typeof extractSchema>["findings"][number] & { sourceId: string }> = [];
  let rejected = 0;
  if (sources.length > 0) {
    const extracted = await runStructured(
      db,
      userId,
      "research_extract",
      extractSchema,
      {
        instructions: EXTRACT_INSTRUCTIONS,
        input: [
          `College: ${college.name}`,
          `Section: ${SECTION_INFO[section].label}`,
          `Student interests: ${interests.join(", ") || "(none given)"}`,
          ...sources.map((source) => `[Source ${source.number}] ${source.title}\nURL: ${source.url}\n${source.text}`),
        ].join("\n\n"),
        schemaName: "research_findings",
        jsonSchema: jsonObject({
          findings: jsonArray(
            jsonObject({
              title: jsonString,
              summary: jsonString,
              relevance: jsonString,
              sourceNumber: { type: "integer" },
              evidence: jsonString,
            }),
            6,
          ),
        }),
        maxOutputTokens: 3000,
      },
      { caller: deps.caller },
    );
    const sourceIds = new Map<number, string>();
    for (const finding of extracted.findings) {
      const source = sources.find((row) => row.number === finding.sourceNumber);
      if (!source || !sourceTextMatches(source.text, finding.evidence)) {
        rejected += 1;
        continue;
      }
      if (!sourceIds.has(source.number)) {
        sourceIds.set(source.number, await upsertSource(db, { url: source.url, title: source.title, domain, text: source.text }));
      }
      kept.push({ ...finding, sourceId: sourceIds.get(source.number)! });
    }
  }

  await db
    .delete(researchFindings)
    .where(
      and(
        eq(researchFindings.userId, userId),
        eq(researchFindings.collegeSlug, collegeSlug),
        eq(researchFindings.section, section),
        eq(researchFindings.saved, false),
        eq(researchFindings.userEdited, false),
      ),
    );
  kept = kept.slice(0, 6);
  if (kept.length > 0) {
    await db.insert(researchFindings).values(
      kept.map((finding) => ({
        userId,
        collegeSlug,
        section,
        title: finding.title,
        summary: finding.summary,
        relevance: finding.relevance,
        evidence: finding.evidence,
        sourceId: finding.sourceId,
        verificationStatus: "source_matched",
      })),
    );
  }
  return { kept: kept.length, rejected, sourcesSearched: sources.length };
}

const connectionSchema = z.object({
  connections: z
    .array(
      z.object({
        title: z.string().min(3).max(160),
        summary: z.string().min(10).max(700),
        relevance: z.string().min(5).max(500),
        findingIds: z.array(z.string()).min(1).max(4),
      }),
    )
    .max(5),
});

/** "Why this college?" connections built only from the student's existing, source-backed findings. */
export async function buildWhyCollegeConnections(db: AtlasDb, userId: string, collegeSlug: string, interests: string[], caller?: ModelCaller) {
  const findings = await db
    .select({ id: researchFindings.id, title: researchFindings.title, summary: researchFindings.summary, sourceId: researchFindings.sourceId })
    .from(researchFindings)
    .where(
      and(
        eq(researchFindings.userId, userId),
        eq(researchFindings.collegeSlug, collegeSlug),
        sql`${researchFindings.section} <> 'why_college'`,
      ),
    )
    .limit(40);
  if (findings.length === 0) {
    throw new Error("Run at least one other research section first. Connections are built from your source-backed findings.");
  }
  const allowed = new Set(findings.map((row) => row.id));
  const result = await runStructured(
    db,
    userId,
    "research_connections",
    connectionSchema,
    {
      instructions: [
        "Connect the student's interests to specific findings about this college for a 'Why this college?' essay.",
        "Use only the findings provided, citing their ids. Do not add facts. Do not write essay prose; describe the connection the student could explore.",
      ].join(" "),
      input: [
        `Student interests: ${interests.join(", ") || "(none given)"}`,
        ...findings.map((row) => `- id: ${row.id}\n  ${row.title}: ${row.summary}`),
      ].join("\n"),
      schemaName: "why_college_connections",
      jsonSchema: jsonObject({
        connections: jsonArray(
          jsonObject({ title: jsonString, summary: jsonString, relevance: jsonString, findingIds: jsonArray(jsonString, 4) }),
          5,
        ),
      }),
      maxOutputTokens: 2000,
    },
    {
      caller,
      postValidate: (value) =>
        value.connections.some((row) => row.findingIds.some((id) => !allowed.has(id))) ? "a connection cites a finding id that was not provided" : null,
    },
  );

  await db
    .delete(researchFindings)
    .where(
      and(
        eq(researchFindings.userId, userId),
        eq(researchFindings.collegeSlug, collegeSlug),
        eq(researchFindings.section, "why_college"),
        eq(researchFindings.saved, false),
        eq(researchFindings.userEdited, false),
      ),
    );
  const bySource = new Map(findings.map((row) => [row.id, row.sourceId]));
  if (result.connections.length > 0) {
    await db.insert(researchFindings).values(
      result.connections.map((row) => ({
        userId,
        collegeSlug,
        section: "why_college",
        title: row.title,
        summary: row.summary,
        relevance: row.relevance,
        relatedFindingIds: row.findingIds,
        sourceId: bySource.get(row.findingIds[0]!) ?? null,
        verificationStatus: "source_matched",
      })),
    );
  }
  return { kept: result.connections.length };
}

export type FindingView = {
  id: string;
  collegeSlug: string;
  section: ResearchSection;
  title: string;
  summary: string;
  relevance: string;
  evidence: string | null;
  notes: string;
  saved: boolean;
  userEdited: boolean;
  verificationStatus: string;
  checkedAt: string;
  relatedFindingIds: string[];
  source: { url: string; title: string; domain: string; isOfficial: boolean } | null;
};

export async function listFindings(db: AtlasDb, userId: string, collegeSlugs: string[]): Promise<FindingView[]> {
  if (collegeSlugs.length === 0) return [];
  const rows = await db
    .select({
      finding: researchFindings,
      sourceUrl: researchSources.url,
      sourceTitle: researchSources.title,
      sourceDomain: researchSources.domain,
      sourceOfficial: researchSources.isOfficial,
    })
    .from(researchFindings)
    .leftJoin(researchSources, eq(researchSources.id, researchFindings.sourceId))
    .where(and(eq(researchFindings.userId, userId), inArray(researchFindings.collegeSlug, collegeSlugs)))
    .orderBy(asc(researchFindings.section), sql`${researchFindings.saved} desc`, asc(researchFindings.createdAt));
  return rows.map(({ finding, ...source }) => ({
    id: finding.id,
    collegeSlug: finding.collegeSlug,
    section: finding.section as ResearchSection,
    title: finding.title,
    summary: finding.summary,
    relevance: finding.relevance,
    evidence: finding.evidence,
    notes: finding.notes,
    saved: finding.saved,
    userEdited: finding.userEdited,
    verificationStatus: finding.verificationStatus,
    checkedAt: finding.checkedAt.toISOString(),
    relatedFindingIds: finding.relatedFindingIds,
    source: source.sourceUrl
      ? { url: source.sourceUrl, title: source.sourceTitle ?? "", domain: source.sourceDomain ?? "", isOfficial: Boolean(source.sourceOfficial) }
      : null,
  }));
}

export async function updateFinding(
  db: AtlasDb,
  userId: string,
  findingId: string,
  edit: { title: string; summary: string; relevance: string; notes: string },
) {
  await db
    .update(researchFindings)
    .set({
      title: edit.title.trim().slice(0, 160) || "Untitled finding",
      summary: edit.summary.trim().slice(0, 2000),
      relevance: edit.relevance.trim().slice(0, 1000),
      notes: edit.notes.slice(0, 4000),
      userEdited: true,
      saved: true,
      updatedAt: new Date(),
    })
    .where(and(eq(researchFindings.id, findingId), eq(researchFindings.userId, userId)));
}

export async function setFindingSaved(db: AtlasDb, userId: string, findingId: string, saved: boolean) {
  await db
    .update(researchFindings)
    .set({ saved, updatedAt: new Date() })
    .where(and(eq(researchFindings.id, findingId), eq(researchFindings.userId, userId)));
}

export async function deleteFinding(db: AtlasDb, userId: string, findingId: string) {
  await db.delete(researchFindings).where(and(eq(researchFindings.id, findingId), eq(researchFindings.userId, userId)));
}

export async function deleteUnsavedFindings(db: AtlasDb, userId: string) {
  await db.delete(researchFindings).where(and(eq(researchFindings.userId, userId), eq(researchFindings.saved, false)));
}

/** Re-fetches one finding's source and checks that its evidence is still on the page. */
export async function recheckFinding(db: AtlasDb, userId: string, findingId: string, loadPage: ResearchDeps["loadPage"]) {
  const [row] = await db
    .select({ evidence: researchFindings.evidence, url: researchSources.url, sourceId: researchSources.id })
    .from(researchFindings)
    .leftJoin(researchSources, eq(researchSources.id, researchFindings.sourceId))
    .where(and(eq(researchFindings.id, findingId), eq(researchFindings.userId, userId)))
    .limit(1);
  if (!row) throw new Error("Finding not found.");
  if (!row.url) return "user_added";
  const page = await loadPage(row.url);
  const status = !page.ok ? "source_unreachable" : row.evidence && sourceTextMatches(page.text, row.evidence) ? "source_matched" : "source_changed";
  const now = new Date();
  await db.update(researchFindings).set({ verificationStatus: status, checkedAt: now, updatedAt: now }).where(eq(researchFindings.id, findingId));
  if (page.ok && row.sourceId) {
    await db.update(researchSources).set({ checkedAt: now, contentHash: contentHash(page.text) }).where(eq(researchSources.id, row.sourceId));
  }
  return status;
}

export async function linkFindingToPrompt(db: AtlasDb, userId: string, findingId: string, promptId: string) {
  const [owned] = await db
    .select({ id: researchFindings.id })
    .from(researchFindings)
    .where(and(eq(researchFindings.id, findingId), eq(researchFindings.userId, userId)));
  if (!owned) return false;
  await db.insert(essayResearchLinks).values({ userId, findingId, promptId }).onConflictDoNothing();
  await setFindingSaved(db, userId, findingId, true);
  return true;
}

export async function unlinkFindingFromPrompt(db: AtlasDb, userId: string, findingId: string, promptId: string) {
  await db
    .delete(essayResearchLinks)
    .where(and(eq(essayResearchLinks.userId, userId), eq(essayResearchLinks.findingId, findingId), eq(essayResearchLinks.promptId, promptId)));
}

export async function listPromptLinks(db: AtlasDb, userId: string) {
  return db
    .select({ promptId: essayResearchLinks.promptId, findingId: essayResearchLinks.findingId })
    .from(essayResearchLinks)
    .where(eq(essayResearchLinks.userId, userId));
}
