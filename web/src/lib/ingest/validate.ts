import { normalizeForComparison } from "@/lib/catalog/normalize";
import type { ManifestDeadline, ManifestPrompt } from "@/lib/ingest/manifest";

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export function sourceContains(sourceText: string, snippet: string) {
  const needle = normalizeForComparison(snippet);
  return needle.length > 0 && normalizeForComparison(sourceText).includes(needle);
}

/** True when `excerpt` names the same month and day as `isoDate` ("November 1", "Nov. 1", "11/1"). */
export function excerptMentionsDate(excerpt: string, isoDate: string) {
  const [, month, day] = isoDate.split("-").map(Number);
  if (!month || !day) {
    return false;
  }
  // Page markup sometimes glues a label to its date ("Early ActionNov. 2"); split those before matching.
  const text = normalizeForComparison(excerpt.replace(/([a-z])([A-Z])/g, "$1 $2"));
  const full = MONTHS[month - 1]!;
  const abbreviations = [full, full.slice(0, 3), full.slice(0, 4)];
  const dayPattern = `0?${day}(st|nd|rd|th)?\\b`;
  const named = abbreviations.some((name) => new RegExp(`\\b${name}\\.?\\s+${dayPattern}`).test(text));
  const numeric = new RegExp(`\\b0?${month}/${dayPattern}`).test(text);
  return named || numeric;
}

/** Deadlines must fall between Aug 1 of the cycle's first year and Jul 31 of its second year. */
export function dateWithinCycle(isoDate: string, academicYear: string) {
  const [start, end] = academicYear.split("-");
  return isoDate >= `${start}-08-01` && isoDate <= `${end}-07-31`;
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export function validatePromptCandidate(prompt: ManifestPrompt, sourceText: string): ValidationResult {
  if (!sourceContains(sourceText, prompt.text)) {
    return { ok: false, reason: `Prompt text not found verbatim on ${prompt.sourceUrl}` };
  }
  const limits = [prompt.wordLimit, prompt.wordMin, prompt.characterLimit].filter((value): value is number => value !== null);
  if (limits.length > 0) {
    if (!prompt.limitEvidence) {
      return { ok: false, reason: "A limit was given without limitEvidence from the source" };
    }
    if (!sourceContains(sourceText, prompt.limitEvidence)) {
      return { ok: false, reason: `Limit evidence "${prompt.limitEvidence}" not found on ${prompt.sourceUrl}` };
    }
    const evidence = normalizeForComparison(prompt.limitEvidence).replace(/,/g, "");
    for (const limit of limits) {
      if (!new RegExp(`\\b${limit}\\b`).test(evidence)) {
        return { ok: false, reason: `Limit ${limit} does not appear in limit evidence "${prompt.limitEvidence}"` };
      }
    }
  }
  if (prompt.wordLimit !== null && prompt.characterLimit !== null) {
    return { ok: false, reason: "A prompt cannot have both a word limit and a character limit" };
  }
  return { ok: true };
}

export function validateDeadlineCandidate(
  deadline: ManifestDeadline,
  sourceText: string,
  academicYear: string,
): ValidationResult {
  if (!sourceContains(sourceText, deadline.excerpt)) {
    return { ok: false, reason: `Deadline excerpt "${deadline.excerpt}" not found on ${deadline.sourceUrl}` };
  }
  if (deadline.date === null) {
    if (deadline.round !== "ROLLING" || !/rolling/i.test(deadline.excerpt)) {
      return { ok: false, reason: "Only rolling admission may omit a date, and its excerpt must say so" };
    }
    return { ok: true };
  }
  if (!excerptMentionsDate(deadline.excerpt, deadline.date)) {
    return { ok: false, reason: `Excerpt "${deadline.excerpt}" does not state ${deadline.date}` };
  }
  if (!dateWithinCycle(deadline.date, academicYear)) {
    return { ok: false, reason: `${deadline.date} is outside the ${academicYear} cycle` };
  }
  return { ok: true };
}
