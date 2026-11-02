import { desc, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { signInWithGoogle, signOutUser } from "@/app/actions";
import { db } from "@/db/client";
import { colleges, prompts } from "@/db/schema";

async function loadCatalogSnapshot() {
  const [collegeCountRow, promptCountRow, collegePreview] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(colleges),
    db.select({ count: sql<number>`count(*)::int` }).from(prompts),
    db
      .select({
        slug: colleges.slug,
        name: colleges.name,
        cycle: colleges.applicationCycle,
      })
      .from(colleges)
      .orderBy(desc(colleges.createdAt))
      .limit(5),
  ]);

  return {
    collegeCount: collegeCountRow[0]?.count ?? 0,
    promptCount: promptCountRow[0]?.count ?? 0,
    collegePreview,
  };
}

export default async function HomePage() {
  const session = await auth();
  const catalog = await loadCatalogSnapshot();

  if (session?.user?.email) {
    redirect("/app");
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="panel hero-panel">
          <span className="eyebrow">{session?.user ? "Signed in" : "Student planning, less panic"}</span>
          <h1 className="headline">Map your college application season without losing the plot.</h1>
          <p className="lede">
            College Atlas turns colleges, essay work, and deadlines into one calmer
            workspace. This web app is the real signed-in foundation, with live data,
            saved progress, and room for stronger student-facing tools.
          </p>

          <div className="stack" style={{ marginTop: 24 }}>
            <div className="check">Colleges and prompts already live in the shared catalog.</div>
            <div className="check">Google sign-in and database sessions are already wired up.</div>
            <div className="check">Saved colleges, tasks, and essays are moving into one student route map.</div>
          </div>

          <div className="cta-row">
            {session?.user ? (
              <form action={signOutUser}>
                <button className="button button-secondary" type="submit">
                  Sign out
                </button>
              </form>
            ) : (
              <form action={signInWithGoogle}>
                <button className="button" type="submit">
                  Continue with Google
                </button>
              </form>
            )}
            <span className="helper-text">
              {session?.user
                ? `Signed in as ${session.user.email ?? session.user.name ?? "your account"}.`
                : "Use your Google account to test the real signed-in flow locally."}
            </span>
          </div>
        </div>

        <div className="panel">
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-label">Route map</span>
              <strong>{catalog.collegeCount}</strong>
              <div className="muted">colleges already ready to add</div>
            </div>
            <div className="stat-card">
              <span className="stat-label">Story bank</span>
              <strong>{catalog.promptCount}</strong>
              <div className="muted">essay prompts waiting in the workspace</div>
            </div>
          </div>

          <div className="subpanel">
            <div className="subpanel-header">
              <strong>Live catalog snapshot</strong>
              <span className="muted">Pulled live from Neon</span>
            </div>
            <div className="snapshot-list">
              {catalog.collegePreview.map((college) => (
                <div className="snapshot-row" key={college.slug}>
                  <div>
                    <strong>{college.name}</strong>
                    <div className="muted">{college.slug}</div>
                  </div>
                  <span className="pill">{college.cycle ?? "Cycle TBD"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="meta-grid">
            <div className="meta-card">
              <strong>Now</strong>
              <div className="muted">Sign-in, persistence, and seeded college data are already in place.</div>
            </div>
            <div className="meta-card">
              <strong>Next route</strong>
              <div className="muted">Make the signed-in dashboard feel more like a guided map than a generic tool.</div>
            </div>
            <div className="meta-card">
              <strong>Essays</strong>
              <div className="muted">Storylines and drafting can become the core personal-feeling part of the app.</div>
            </div>
            <div className="meta-card">
              <strong>Direction</strong>
              <div className="muted">This web app is where the lighter, student-facing design system now takes shape.</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
