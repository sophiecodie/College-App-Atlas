import { createHash } from "node:crypto";

const STOP_PREFIXES = /^the\s+/;

/** Lowercase, ASCII-folded, punctuation-free form of an institution name, used for matching and search. */
export function normalizeInstitutionName(name: string) {
  return String(name ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bst\.?\s/g, "saint ")
    .replace(/\bmt\.?\s/g, "mount ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(STOP_PREFIXES, "")
    .replace(/\s+/g, " ");
}

export function slugify(value: string) {
  return normalizeInstitutionName(value).replace(/\s+/g, "-").slice(0, 80).replace(/-+$/g, "");
}

/** IPEDS packs aliases into one field separated by "|" or ";" (commas can be part of a name). */
export function splitAliases(raw: string | null | undefined) {
  const value = String(raw ?? "").trim();
  if (!value || value === "-2" || value === "-1") {
    return [];
  }
  const parts = value.split(/\s*[|;]\s*/).flatMap((part) => {
    // "MIT, M.I.T." is two abbreviations; "University of X, Y" is one name. Only split lists of short tokens.
    const pieces = part.split(/\s*,\s*/);
    return pieces.length > 1 && pieces.every((piece) => piece.length <= 12) ? pieces : [part];
  });
  return [...new Set(parts.map((alias) => alias.trim()).filter((alias) => alias.length > 1))];
}

/** Text indexed by the trigram search: official name, aliases and city. */
export function buildSearchText(name: string, aliases: string[], city?: string | null) {
  return [...new Set([name, ...aliases, city ?? ""].map(normalizeInstitutionName).filter(Boolean))].join(" | ");
}

/** Collapses whitespace and trims; must stay in sync with the SQL backfill in 0001_college_database.sql. */
export function hashKeyText(text: string) {
  return String(text ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function contentHash(text: string) {
  return createHash("md5").update(hashKeyText(text)).digest("hex");
}

/**
 * Normalization used to check that extracted text appears verbatim on a source page.
 * It only folds typography (curly quotes, dashes, non-breaking spaces, whitespace), never wording.
 */
export function normalizeForComparison(text: string) {
  return String(text ?? "")
    .normalize("NFKC")
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[  -​  　]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeUrl(raw: string | null | undefined) {
  const value = String(raw ?? "").trim();
  if (!value || value === "-2" || value === "-1") {
    return null;
  }
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return url.toString();
  } catch {
    return null;
  }
}
