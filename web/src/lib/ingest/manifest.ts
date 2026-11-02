import { z } from "zod";

import { ADMISSION_ROUNDS } from "@/db/schema";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const round = z.enum(ADMISSION_ROUNDS);

/** One supplemental prompt as published on an official page. `text` must be verbatim. */
export const manifestPromptSchema = z.object({
  slot: z.string().min(1),
  text: z.string().min(8),
  sourceUrl: z.string().url(),
  promptType: z.enum(["supplemental_essay", "short_answer", "other"]).default("supplemental_essay"),
  required: z.boolean(),
  /** Part of a "choose N of these" group. */
  optionalChoice: z.boolean().default(false),
  wordLimit: z.number().int().positive().nullable().default(null),
  wordMin: z.number().int().positive().nullable().default(null),
  characterLimit: z.number().int().positive().nullable().default(null),
  /** Verbatim snippet from the source that states the limit; required whenever a limit is given. */
  limitEvidence: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  programScope: z.array(z.string()).default([]),
  appliesToRounds: z.array(round).default([]),
  conditionNote: z.string().nullable().default(null),
  /** Legacy prompt_id this prompt replaces (same question slot, new wording). */
  replacesPromptId: z.string().nullable().default(null),
});

/** One deadline. `excerpt` must be verbatim and mention the date. */
export const manifestDeadlineSchema = z.object({
  round,
  date: isoDate.nullable(),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .default(null),
  timezone: z.string().nullable().default(null),
  conditions: z.string().nullable().default(null),
  programScope: z.array(z.string()).default([]),
  sourceUrl: z.string().url(),
  excerpt: z.string().min(4),
});

export const admissionsManifestSchema = z.object({
  unitid: z.number().int().positive(),
  name: z.string(),
  cycle: z.string().regex(/^\d{4}-\d{4}$/),
  platforms: z.array(z.enum(["common_app", "coalition", "questbridge", "uc_application", "applytexas", "school_specific"])).default([]),
  sources: z
    .array(z.object({ url: z.string().url(), kind: z.enum(["essay_prompts", "deadlines", "both"]) }))
    .min(1),
  prompts: z.array(manifestPromptSchema).default([]),
  deadlines: z.array(manifestDeadlineSchema).default([]),
  /** Why something is not captured (e.g. prompts are only shown inside the application portal). */
  unavailable: z
    .object({ prompts: z.string().optional(), deadlines: z.string().optional() })
    .default({}),
  notes: z.string().optional(),
});

export type AdmissionsManifest = z.infer<typeof admissionsManifestSchema>;
export type ManifestPrompt = z.infer<typeof manifestPromptSchema>;
export type ManifestDeadline = z.infer<typeof manifestDeadlineSchema>;
