import Link from "next/link";

import { addCollegeToDashboard } from "@/app/app/actions";
import { getAvailableColleges, getUserColleges, requireCurrentUser } from "@/lib/app-data";

export default async function CollegesPage() {
  const user = await requireCurrentUser();
  const [savedColleges, availableColleges] = await Promise.all([
    getUserColleges(user.id),
    getAvailableColleges(user.id),
  ]);

  return (
    <main className="shell">
      <section className="page-header-row">
        <div>
          <span className="eyebrow">Colleges</span>
          <h1 className="page-title">Build your real college list</h1>
          <p className="lede">
            This replaces the local add-college flow from the NiceGUI app. Once a college is in
            this list, it lives in your account and can drive prompts, drafts, and progress.
          </p>
        </div>
      </section>

      <section className="two-up">
        <div className="panel">
          <div className="subpanel-header">
            <strong>Add a college</strong>
            <span className="muted">{availableColleges.length} available</span>
          </div>
          {availableColleges.length > 0 ? (
            <form action={addCollegeToDashboard} className="stack">
              <label className="field-label" htmlFor="collegeSlug">
                Choose from the seeded catalog
              </label>
              <select className="field" defaultValue={availableColleges[0]?.slug} id="collegeSlug" name="collegeSlug">
                {availableColleges.map((college) => (
                  <option key={college.slug} value={college.slug}>
                    {college.name}
                  </option>
                ))}
              </select>
              <button className="button" type="submit">
                Add to my dashboard
              </button>
            </form>
          ) : (
            <p className="muted">You already added every seeded college. Nice problem to have.</p>
          )}
        </div>

        <div className="panel">
          <div className="subpanel-header">
            <strong>Your saved colleges</strong>
            <span className="muted">{savedColleges.length} saved</span>
          </div>
          <div className="snapshot-list">
            {savedColleges.length > 0 ? (
              savedColleges.map((college) => (
                <Link className="snapshot-row snapshot-link" href={`/colleges/${college.slug}`} key={college.id}>
                  <div>
                    <strong>{college.name}</strong>
                    <div className="muted">
                      {college.selectedApplicationType ?? "Application type not set"} ·{" "}
                      {college.programSelection ?? "general"}
                    </div>
                  </div>
                  <span className="pill">{college.status ?? "In Progress"}</span>
                </Link>
              ))
            ) : (
              <p className="muted">No colleges saved yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
