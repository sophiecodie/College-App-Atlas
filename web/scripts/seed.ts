import { readFile } from "node:fs/promises";
import path from "node:path";

import { db } from "../src/db/client";
import { colleges, promptSources, prompts } from "../src/db/schema";

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

async function main() {
  const [promptRows, sourceRows] = await Promise.all([loadPrompts(), loadPromptSources()]);

  const uniqueColleges = new Map<string, { slug: string; name: string; cycle?: string | null }>();

  for (const prompt of promptRows) {
    uniqueColleges.set(prompt.college_slug, {
      slug: prompt.college_slug,
      name: prompt.college_name,
      cycle: prompt.cycle,
    });
  }

  if (uniqueColleges.size > 0) {
    await db.insert(colleges).values(
      [...uniqueColleges.values()].map((college) => ({
        slug: college.slug,
        name: college.name,
        applicationCycle: college.cycle ?? null,
      })),
    );
  }

  if (sourceRows.length > 0) {
    await db.insert(promptSources).values(
      sourceRows.map((source) => ({
        collegeSlug: source.college_slug,
        sourceUrl: source.source_url,
        sourceType: source.source_type,
        applicationCycle: source.application_cycle ?? null,
        notes: source.notes ?? null,
      })),
    );
  }

  if (promptRows.length > 0) {
    await db.insert(prompts).values(
      promptRows.map((prompt) => ({
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
        programScope: prompt.program_scope ?? [],
        sourceUrl: prompt.source_url ?? null,
        sourceType: prompt.source_type ?? null,
        extractionStatus: prompt.extraction_status ?? null,
        lastUpdated: prompt.last_updated ?? null,
      })),
    );
  }

  console.log(`Seeded ${uniqueColleges.size} colleges, ${sourceRows.length} prompt sources, and ${promptRows.length} prompts.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
