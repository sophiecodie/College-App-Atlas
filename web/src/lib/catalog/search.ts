import { and, asc, eq, type SQL, sql } from "drizzle-orm";

import type { AtlasDb } from "@/db/connect";
import { colleges, userColleges } from "@/db/schema";
import { normalizeInstitutionName } from "@/lib/catalog/normalize";

export const LEVEL_LABELS: Record<string, string> = {
  four_year: "4-year",
  two_year: "2-year",
  less_than_two_year: "Under 2-year",
  unknown: "Level not reported",
};

export const CONTROL_LABELS: Record<string, string> = {
  public: "Public",
  private_nonprofit: "Private nonprofit",
  private_for_profit: "Private for-profit",
  unknown: "Control not reported",
};

export type CollegeSearchFilters = {
  q?: string;
  state?: string;
  level?: string;
  control?: string;
  page?: number;
  pageSize?: number;
};

export type CollegeSearchResult = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  institutionLevel: string | null;
  control: string | null;
  websiteUrl: string | null;
  admissionsUrl: string | null;
  admissionRate: string | null;
  undergradEnrollment: number | null;
  isBranchCampus: boolean;
  systemName: string | null;
  alternativeNames: string[];
  inList: boolean;
};

export function parseSearchFilters(params: Record<string, string | string[] | undefined>): CollegeSearchFilters {
  const pick = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  const page = Number.parseInt(pick("page") ?? "1", 10);
  return {
    q: pick("q")?.slice(0, 120),
    state: pick("state")?.toUpperCase().slice(0, 2),
    level: pick("level") ?? (pick("q") || pick("state") ? undefined : "four_year"),
    control: pick("control"),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/**
 * Searches the shared directory by name, alias or city (trigram index) with optional filters.
 * Exact and prefix matches rank first, then similarity, then undergraduate size.
 */
export async function searchColleges(db: AtlasDb, userId: string | null, filters: CollegeSearchFilters) {
  const pageSize = Math.min(filters.pageSize ?? 20, 50);
  const page = filters.page ?? 1;
  const conditions: SQL[] = [eq(colleges.isActive, true)];
  const term = normalizeInstitutionName(filters.q ?? "");

  if (term) {
    conditions.push(sql`(${colleges.searchText} ilike ${`%${term}%`} or ${colleges.searchText} % ${term})`);
  }
  if (filters.state && /^[A-Z]{2}$/.test(filters.state)) {
    conditions.push(eq(colleges.state, filters.state));
  }
  if (filters.level && filters.level in LEVEL_LABELS) {
    conditions.push(eq(colleges.institutionLevel, filters.level));
  }
  if (filters.control && filters.control in CONTROL_LABELS) {
    conditions.push(eq(colleges.control, filters.control));
  }

  const where = and(...conditions);
  const rank = term
    ? sql`case
        when ${colleges.normalizedName} = ${term} then 0
        when (' | ' || ${colleges.searchText} || ' | ') like ${`% | ${term} | %`} then 0
        when ${colleges.normalizedName} like ${`${term}%`} then 1
        else 2
      end, similarity(${colleges.searchText}, ${term}) desc`
    : null;

  const inListExpr = userId
    ? sql<boolean>`exists (select 1 from ${userColleges} uc where uc.college_slug = ${colleges.slug} and uc.user_id = ${userId} and uc.archived_at is null)`
    : sql<boolean>`false`;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: colleges.id,
        slug: colleges.slug,
        name: colleges.name,
        city: colleges.city,
        state: colleges.state,
        institutionLevel: colleges.institutionLevel,
        control: colleges.control,
        websiteUrl: colleges.websiteUrl,
        admissionsUrl: colleges.admissionsUrl,
        admissionRate: colleges.admissionRate,
        undergradEnrollment: colleges.undergradEnrollment,
        isBranchCampus: colleges.isBranchCampus,
        systemName: colleges.systemName,
        alternativeNames: colleges.alternativeNames,
        inList: inListExpr,
      })
      .from(colleges)
      .where(where)
      .orderBy(...(rank ? [rank] : []), sql`${colleges.undergradEnrollment} desc nulls last`, asc(colleges.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(colleges).where(where),
  ]);

  return {
    results: rows as CollegeSearchResult[],
    total: totalRows[0]?.count ?? 0,
    page,
    pageSize,
  };
}

export async function listStates(db: AtlasDb) {
  const rows = await db
    .selectDistinct({ state: colleges.state })
    .from(colleges)
    .where(and(eq(colleges.isActive, true), sql`${colleges.state} is not null`))
    .orderBy(asc(colleges.state));
  return rows.map((row) => row.state!).filter(Boolean);
}

export async function getCollegeBySlug(db: AtlasDb, slug: string) {
  const [row] = await db.select().from(colleges).where(eq(colleges.slug, slug)).limit(1);
  return row ?? null;
}

