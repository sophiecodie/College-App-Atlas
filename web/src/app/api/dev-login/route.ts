import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { DEV_STUDENT, devLoginEnabled } from "@/lib/dev-login";
import { startSession } from "@/lib/session-cookie";

/**
 * Local-only sign-in: creates (or reuses) a test student and a database session, then sets the same
 * cookie Auth.js uses for database sessions. Returns 404 unless ATLAS_DEV_LOGIN=true outside production.
 */
export async function POST(request: Request) {
  if (!devLoginEnabled()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, DEV_STUDENT.email)).limit(1);
  if (!user) {
    [user] = await db.insert(users).values(DEV_STUDENT).returning({ id: users.id });
  }

  return startSession(request, user!.id, "/app");
}
