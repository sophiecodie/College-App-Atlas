import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { sessions } from "@/db/schema";

/**
 * Creates an Auth.js database session for `userId` and redirects with the session cookie set, using the same
 * cookie name Auth.js reads (it adds the `__Secure-` prefix on HTTPS, as on Vercel).
 */
export async function startSession(request: Request, userId: string, redirectTo: string, days = 30) {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ sessionToken, userId, expires });

  const secure = (request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "")) === "https";
  const response = NextResponse.redirect(new URL(redirectTo, request.url), 303);
  response.cookies.set(secure ? "__Secure-authjs.session-token" : "authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires,
  });
  return response;
}
