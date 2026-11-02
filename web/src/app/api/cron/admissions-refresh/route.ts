import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { currentAcademicYear } from "@/lib/catalog/cycles";
import { ImportLockedError, withImportRun } from "@/lib/catalog/runs";
import { PoliteFetcher } from "@/lib/ingest/fetcher";
import { refreshAdmissionsSources } from "@/lib/ingest/refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Scheduled check of registered official admissions pages. Off unless ADMISSIONS_REFRESH_ENABLED=true and a
 * CRON_SECRET is configured (Vercel Cron sends it as a Bearer token). Low volume by design.
 */
export async function GET(request: Request) {
  if (process.env.ADMISSIONS_REFRESH_ENABLED !== "true") {
    return NextResponse.json({ status: "disabled" }, { status: 404 });
  }
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const academicYear = currentAcademicYear();
  const maxSources = Math.min(Number(process.env.ADMISSIONS_REFRESH_MAX_SOURCES ?? 25) || 25, 100);
  const fetcher = new PoliteFetcher();

  try {
    const result = await withImportRun(
      db,
      "admissions_refresh",
      { academicYear, maxSources, trigger: "cron" },
      (run) => refreshAdmissionsSources(db, (url) => fetcher.fetchPage(url), run, { academicYear, maxSources }),
      { lockName: "admissions", lockMinutes: 30 },
    );
    return NextResponse.json({ runId: result.runId, status: result.status, stats: result.stats });
  } catch (error) {
    if (error instanceof ImportLockedError) {
      return NextResponse.json({ status: "skipped", reason: error.message }, { status: 409 });
    }
    return NextResponse.json({ status: "failed", error: (error as Error).message }, { status: 500 });
  }
}
