import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { parseSearchFilters, searchColleges } from "@/lib/catalog/search";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Directory search for the college picker. Signed-in users only. */
export async function GET(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filters = { ...parseSearchFilters(params), pageSize: 25 };
  const result = await searchColleges(db, user.id, filters);
  return NextResponse.json(result);
}
