import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { type AdmissionsManifest, admissionsManifestSchema, manifestDeadlineSchema, manifestPromptSchema } from "@/lib/ingest/manifest";
import { validateDeadlineCandidate, validatePromptCandidate } from "@/lib/ingest/validate";

// Resolved from the web/ project root (where npm scripts and `next start` run).
export const MANIFEST_ROOT = path.join(process.cwd(), "data", "admissions");

/**
 * Source adapter contract. Each adapter turns permitted source material into manifest-shaped candidates;
 * fetching, validation against the fetched page, deduplication and the review queue are shared (see submit.ts).
 */
export type SourceAdapter = {
  id: string;
  describe: string;
  loadManifests: (options: { cycle: string; only?: string[] }) => Promise<Array<{ file: string; manifest: AdmissionsManifest } | { file: string; error: string }>>;
};

/**
 * "curated-official": hand- or AI-assisted extractions from official admissions pages, checked into
 * data/admissions/<cycle>/<slug>.json. Every prompt and deadline is re-validated against the live page on ingest.
 */
export const curatedOfficialAdapter: SourceAdapter = {
  id: "curated-official",
  describe: "Curated extractions from official admissions pages (data/admissions/<cycle>/*.json)",
  async loadManifests({ cycle, only }) {
    const dir = path.join(MANIFEST_ROOT, cycle);
    let files: string[];
    try {
      files = (await readdir(dir)).filter((file) => file.endsWith(".json")).sort();
    } catch {
      return [];
    }
    if (only && only.length > 0) {
      files = files.filter((file) => only.includes(file.replace(/\.json$/, "")));
    }
    return Promise.all(
      files.map(async (file) => {
        try {
          const raw = JSON.parse(await readFile(path.join(dir, file), "utf8")) as unknown;
          const parsed = admissionsManifestSchema.safeParse(raw);
          if (!parsed.success) {
            return { file, error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
          }
          if (parsed.data.cycle !== cycle) {
            return { file, error: `Manifest cycle ${parsed.data.cycle} does not match folder ${cycle}` };
          }
          return { file, manifest: parsed.data };
        } catch (error) {
          return { file, error: `Unreadable manifest: ${(error as Error).message}` };
        }
      }),
    );
  },
};

/**
 * Optional AI-assisted extraction (OPENAI_API_KEY). The model only proposes candidates from page text;
 * anything that does not appear verbatim in that text is discarded before it reaches the review queue.
 */
export async function extractCandidatesWithOpenAI(input: {
  collegeName: string;
  academicYear: string;
  url: string;
  pageText: string;
  fetchImpl?: typeof fetch;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set; AI-assisted extraction is disabled.");
  }
  const baseUrl = (process.env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.ADMISSIONS_EXTRACTION_MODEL ?? process.env.OPENAI_STORYLINES_MODEL ?? "gpt-5.2";
  const response = await (input.fetchImpl ?? fetch)(`${baseUrl}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      instructions: [
        "You extract college application requirements from an official admissions web page.",
        "Copy prompt text and deadline excerpts exactly, character for character, from the page text.",
        "Never paraphrase, complete, or infer. If the page does not state something, omit it.",
        `Only include requirements for the ${input.academicYear} first-year application cycle.`,
        'Return JSON: {"prompts":[{"slot","text","required","optionalChoice","wordLimit","characterLimit","limitEvidence","category"}],"deadlines":[{"round","date","excerpt","conditions"}]}.',
        "round is one of ED, ED2, EA, EA2, REA, RD, ROLLING. date is YYYY-MM-DD or null.",
      ].join(" "),
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: `College: ${input.collegeName}\nURL: ${input.url}\n\nPage text:\n${input.pageText.slice(0, 60_000)}` }],
        },
      ],
      text: { format: { type: "json_object" } },
    }),
  });
  if (!response.ok) {
    throw new Error(`Extraction request failed (${response.status})`);
  }
  const payload = (await response.json()) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).map((part) => part.text ?? "").join("") ?? "";
  const parsed = JSON.parse(text) as { prompts?: unknown[]; deadlines?: unknown[] };

  const prompts = (parsed.prompts ?? [])
    .map((raw) => manifestPromptSchema.safeParse({ ...(raw as object), sourceUrl: input.url }))
    .filter((result) => result.success)
    .map((result) => result.data!)
    .filter((prompt) => validatePromptCandidate(prompt, input.pageText).ok);
  const deadlines = (parsed.deadlines ?? [])
    .map((raw) => manifestDeadlineSchema.safeParse({ ...(raw as object), sourceUrl: input.url }))
    .filter((result) => result.success)
    .map((result) => result.data!)
    .filter((deadline) => validateDeadlineCandidate(deadline, input.pageText, input.academicYear).ok);
  return { prompts, deadlines, proposed: (parsed.prompts?.length ?? 0) + (parsed.deadlines?.length ?? 0) };
}
