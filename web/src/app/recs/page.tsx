import { addRecommender, deleteRecommender } from "@/app/workspace-actions";
import { getUserColleges, requireCurrentUser } from "@/lib/app-data";
import { ensureWorkspaceState, normalizeRecommenders } from "@/lib/workspace-state";

export default async function RecommendationsPage() {
  const user = await requireCurrentUser();
  const [workspace, colleges] = await Promise.all([
    ensureWorkspaceState(user.id),
    getUserColleges(user.id),
  ]);
  const recommenders = normalizeRecommenders(workspace.recommenders);

  return (
    <main className="shell">
      <section className="page-header-row">
        <div>
          <span className="eyebrow">Recommendations</span>
          <h1 className="page-title">Recommenders</h1>
          <p className="lede">
            NiceGUI treats recommenders as global profiles with college assignments. This page now
            stores the global profiles, while assignments live on each college page.
          </p>
        </div>
      </section>
      <section className="two-up">
        <div className="panel">
          <div className="subpanel-header">
            <strong>Add recommender</strong>
            <span className="muted">{recommenders.length} saved</span>
          </div>
          <form action={addRecommender} className="stack">
            <input className="field" name="name" placeholder="Name" />
            <input className="field" name="role" placeholder="Role" />
            <input className="field" name="subject" placeholder="Subject" />
            <textarea className="field field-textarea" name="notes" placeholder="Notes" rows={4} />
            <button className="button" type="submit">Save recommender</button>
          </form>
        </div>
        <div className="panel">
          <div className="subpanel-header">
            <strong>Directory</strong>
            <span className="muted">Assignments happen on college pages</span>
          </div>
          <div className="snapshot-list">
            {recommenders.length > 0 ? recommenders.map((rec) => {
              const assigned = colleges
                .filter((college) =>
                  [...college.requiredRecommendations, ...college.optionalRecommendations]
                    .some((slot) => slot.assigned_recommender === rec.name),
                )
                .map((college) => college.name);
              return (
                <div className="prompt-card" key={rec.name}>
                  <div>
                    <strong>{rec.name}</strong>
                    <div className="muted">
                      {rec.role} · {rec.subject || "No subject"} · {assigned.length ? assigned.join(", ") : "No colleges assigned"}
                    </div>
                  </div>
                  <form action={deleteRecommender}>
                    <input name="name" type="hidden" value={rec.name} />
                    <button className="button button-secondary" type="submit">Delete</button>
                  </form>
                </div>
              );
            }) : <p className="muted">No recommenders yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
