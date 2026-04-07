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
          <span className="eyebrow">
            {session?.user ? "Authenticated MVP" : "Launch Skeleton"}
          </span>
          <h1 className="headline">College Atlas is ready for the real stack.</h1>
          <p className="lede">
            This new <code className="inline">web/</code> app is the Vercel-native
            version of the product. The NiceGUI prototype stays intact while auth,
            persistence, and the essay catalog move onto a production path.
          </p>

          <div className="stack" style={{ marginTop: 24 }}>
            <div className="check">Neon is now storing the shared college and prompt catalog.</div>
            <div className="check">Auth.js is wired for Google sign-in and database sessions.</div>
            <div className="check">The next build step is user-owned data: saved colleges, prompt selections, and drafts.</div>
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
                : "Use your Google account to test the real session flow locally."}
            </span>
          </div>
        </div>

        <div className="panel">
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-label">Catalog</span>
              <strong>{catalog.collegeCount}</strong>
              <div className="muted">colleges seeded into Neon</div>
            </div>
            <div className="stat-card">
              <span className="stat-label">Prompts</span>
              <strong>{catalog.promptCount}</strong>
              <div className="muted">essay prompts ready for the new app</div>
            </div>
          </div>

          <div className="subpanel">
            <div className="subpanel-header">
              <strong>Current Snapshot</strong>
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
              <strong>Today</strong>
              <div className="muted">Database, auth adapter, and seed pipeline are all live.</div>
            </div>
            <div className="meta-card">
              <strong>Next</strong>
              <div className="muted">Build the first signed-in workspace for saved colleges and essay drafts.</div>
            </div>
            <div className="meta-card">
              <strong>Migration</strong>
              <div className="muted">Keep seeding from JSON until the admin workflow moves into the app.</div>
            </div>
            <div className="meta-card">
              <strong>UX</strong>
              <div className="muted">This separate app is where the polished visual direction should now happen.</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
