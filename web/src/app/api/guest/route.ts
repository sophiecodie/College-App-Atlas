import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { GUEST_EMAIL_DOMAIN, guestEnabled } from "@/lib/guest";
import { startSession } from "@/lib/session-cookie";

/**
 * "Start" without an account: creates a private guest user and signs this browser in for a year.
 * Anyone already signed in just continues to their dashboard.
 */
export async function POST(request: Request) {
  if (!guestEnabled()) {
    return NextResponse.json({ error: "Guest access is turned off." }, { status: 404 });
  }
  const session = await auth();
  if (session?.user?.email) {
    return NextResponse.redirect(new URL("/app", request.url), 303);
  }
  const [user] = await db
    .insert(users)
    .values({ email: `guest-${randomUUID()}@${GUEST_EMAIL_DOMAIN}`, name: null })
    .returning({ id: users.id });
  return startSession(request, user!.id, "/app", 365);
}
