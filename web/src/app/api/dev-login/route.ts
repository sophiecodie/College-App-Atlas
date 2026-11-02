import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { DEV_STUDENT, devLoginEnabled } from "@/lib/dev-login";

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

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ sessionToken, userId: user!.id, expires });

  const response = NextResponse.redirect(new URL("/app", request.url), 303);
  response.cookies.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });
  return response;
}
