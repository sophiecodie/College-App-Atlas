import { readFile } from "node:fs/promises";
import path from "node:path";

import { and, eq } from "drizzle-orm";

import { connectDatabase } from "../src/db/connect";
import { colleges, promptSources, prompts } from "../src/db/schema";
import { contentHash } from "../src/lib/catalog/normalize";
import { ensureCycle } from "../src/lib/ingest/submit";

type PromptRow = {
  prompt_id: string;
  college_name: string;
  college_slug: string;
  cycle?: string | null;
  prompt_text: string;
  word_limit?: number | null;
  word_min?: number | null;
  character_limit?: number | null;
  required?: boolean | null;
  is_optional_choice?: boolean | null;
  prompt_type?: string | null;
  primary_tag?: string | null;
  program_scope?: string[] | null;
  source_url?: string | null;
  source_type?: string | null;
  extraction_status?: string | null;
  last_updated?: string | null;
};

type PromptSourceRow = {
  college_name: string;
  college_slug: string;
  source_url: string;
  source_type: string;
  application_cycle?: string | null;
  notes?: string | null;
};

async function loadPrompts() {
  const filePath = path.resolve(process.cwd(), "..", "prompts.jsonl");
  const contents = await readFile(filePath, "utf8");
  return contents
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as PromptRow);
}

async function loadPromptSources() {
  const filePath = path.resolve(process.cwd(), "..", "prompt_sources.json");
  const contents = await readFile(filePath, "utf8");
  return JSON.parse(contents) as PromptSourceRow[];
}

// Idempotent: existing colleges, sources and prompts (matched by slug / URL / prompt_id) are left untouched.
async function main() {
  const [promptRows, sourceRows] = await Promise.all([loadPrompts(), loadPromptSources()]);
  const connection = await connectDatabase();
  const { db } = connection;

  try {
    const uniqueColleges = new Map<string, { slug: string; name: string; cycle?: string | null }>();

    for (const prompt of promptRows) {
      uniqueColleges.set(prompt.college_slug, {
        slug: prompt.college_slug,
        name: prompt.college_name,
        cycle: prompt.cycle,
      });
    }

    if (uniqueColleges.size > 0) {
      await db
        .insert(colleges)
        .values(
          [...uniqueColleges.values()].map((college) => ({
            slug: college.slug,
            name: college.name,
            applicationCycle: college.cycle ?? null,
            normalizedName: college.name.toLowerCase(),
            searchText: college.name.toLowerCase(),
          })),
        )
        .onConflictDoNothing({ target: colleges.slug });
    }

    const collegeRows = await db.select({ id: colleges.id, slug: colleges.slug }).from(colleges);
    const collegeIds = new Map(collegeRows.map((row) => [row.slug, row.id]));

    let sourcesAdded = 0;
    for (const source of sourceRows) {
      const [existing] = await db
        .select({ id: promptSources.id })
        .from(promptSources)
        .where(and(eq(promptSources.collegeSlug, source.college_slug), eq(promptSources.sourceUrl, source.source_url)))
        .limit(1);
      if (!existing) {
        await db.insert(promptSources).values({
          collegeSlug: source.college_slug,
          sourceUrl: source.source_url,
          sourceType: source.source_type,
          applicationCycle: source.application_cycle ?? null,
          notes: source.notes ?? null,
        });
        sourcesAdded += 1;
      }
    }

    let promptsAdded = 0;
    for (const prompt of promptRows) {
      const collegeId = collegeIds.get(prompt.college_slug) ?? null;
      const cycle =
        collegeId && prompt.cycle && /^\d{4}-\d{4}$/.test(prompt.cycle)
          ? await ensureCycle(db, collegeId, prompt.cycle)
          : null;
      const inserted = await db
        .insert(prompts)
        .values({
          promptId: prompt.prompt_id,
          collegeSlug: prompt.college_slug,
          collegeName: prompt.college_name,
          cycle: prompt.cycle ?? null,
          promptText: prompt.prompt_text,
          promptType: prompt.prompt_type ?? null,
          required: Boolean(prompt.required),
          isOptionalChoice: Boolean(prompt.is_optional_choice),
          wordLimit: prompt.word_limit ?? null,
          wordMin: prompt.word_min ?? null,
          characterLimit: prompt.character_limit ?? null,
          primaryTag: prompt.primary_tag ?? null,
          category: prompt.primary_tag ?? null,
          programScope: prompt.program_scope ?? [],
          sourceUrl: prompt.source_url ?? null,
          sourceType: prompt.source_type ?? null,
          extractionStatus: prompt.extraction_status ?? null,
          lastUpdated: prompt.last_updated ?? null,
          collegeId,
          cycleId: cycle?.id ?? null,
          contentHash: contentHash(prompt.prompt_text),
          // Seed rows are never presented as verified; they wait for review like any other candidate.
          verificationStatus: "pending_review",
          reviewNote: `Legacy seed row (extraction_status=${prompt.extraction_status ?? "unknown"}, captured ${prompt.last_updated ?? "unknown date"}). Re-check against the official page before verifying.`,
        })
        .onConflictDoNothing()
        .returning({ id: prompts.id });
      promptsAdded += inserted.length;
    }

    console.log(
      `Seed complete: ${uniqueColleges.size} colleges checked, ${sourcesAdded} prompt sources added, ${promptsAdded} prompts added (existing rows untouched).`,
    );
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
