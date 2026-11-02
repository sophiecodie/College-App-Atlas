import { normalizeUrl, splitAliases } from "@/lib/catalog/normalize";

/**
 * U.S. Department of Education College Scorecard ("Most-Recent-Cohorts-Institution.csv" or the API).
 * Public data: https://collegescorecard.ed.gov/data/ — the API needs a free api.data.gov key (DATA_GOV_API_KEY).
 * Used only to enrich colleges already identified by IPEDS UNITID; it never creates colleges on its own.
 */
export const SCORECARD_SOURCE = "college_scorecard";

export type ScorecardEnrichment = {
  unitid: number;
  admissionRate: number | null;
  undergradEnrollment: number | null;
  satAverage: number | null;
  websiteUrl: string | null;
  aliases: string[];
};

function numberOrNull(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  const raw = String(value).trim();
  if (!raw || raw === "NULL" || raw === "PrivacySuppressed" || raw === "NA") {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapScorecardCsvRow(record: Record<string, string>): ScorecardEnrichment | { error: string } {
  const unitid = numberOrNull(record.UNITID);
  if (!unitid || !Number.isInteger(unitid)) {
    return { error: `Missing or invalid UNITID (${record.UNITID || "empty"})` };
  }
  const admissionRate = numberOrNull(record.ADM_RATE);
  const enrollment = numberOrNull(record.UGDS);
  const sat = numberOrNull(record.SAT_AVG);
  return {
    unitid,
    admissionRate: admissionRate !== null && admissionRate >= 0 && admissionRate <= 1 ? admissionRate : null,
    undergradEnrollment: enrollment !== null && enrollment >= 0 ? Math.round(enrollment) : null,
    satAverage: sat !== null && sat >= 400 && sat <= 1600 ? Math.round(sat) : null,
    websiteUrl: normalizeUrl(record.INSTURL),
    aliases: splitAliases(record.ALIAS),
  };
}

const API_FIELDS = [
  "id",
  "school.alias",
  "school.school_url",
  "latest.admissions.admission_rate.overall",
  "latest.student.size",
  "latest.admissions.sat_scores.average.overall",
];

/** Pages through the official Scorecard API. Requires `DATA_GOV_API_KEY`; never hard-code a key. */
export async function* fetchScorecardApi(options: {
  apiKey: string;
  perPage?: number;
  maxPages?: number;
  fetchImpl?: typeof fetch;
}): AsyncGenerator<ScorecardEnrichment | { error: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const perPage = options.perPage ?? 100;
  for (let page = 0; page < (options.maxPages ?? Number.POSITIVE_INFINITY); page += 1) {
    const url = new URL("https://api.data.gov/ed/collegescorecard/v1/schools");
    url.searchParams.set("api_key", options.apiKey);
    url.searchParams.set("fields", API_FIELDS.join(","));
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));
    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(`Scorecard API returned HTTP ${response.status} on page ${page}`);
    }
    const body = (await response.json()) as { results?: Array<Record<string, unknown>>; metadata?: { total?: number } };
    const results = body.results ?? [];
    for (const row of results) {
      yield mapScorecardCsvRow({
        UNITID: String(row.id ?? ""),
        ALIAS: String(row["school.alias"] ?? ""),
        INSTURL: String(row["school.school_url"] ?? ""),
        ADM_RATE: String(row["latest.admissions.admission_rate.overall"] ?? ""),
        UGDS: String(row["latest.student.size"] ?? ""),
        SAT_AVG: String(row["latest.admissions.sat_scores.average.overall"] ?? ""),
      });
    }
    if (results.length < perPage) {
      return;
    }
  }
}
