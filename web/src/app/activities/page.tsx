import { addActivity, deleteActivity, updateActivity } from "@/app/workspace-actions";
import { requireCurrentUser } from "@/lib/app-data";
import { ensureWorkspaceState, normalizeActivities } from "@/lib/workspace-state";

export default async function ActivitiesPage() {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const brainstorm = normalizeActivities(workspace.brainstormActivities, "brainstorm");
  const finalList = normalizeActivities(workspace.finalActivities, "final");

  return (
    <main className="shell">
      <section className="page-header-row">
        <div>
          <span className="eyebrow">Activities</span>
          <h1 className="page-title">Activities planner</h1>
          <p className="lede">
            This page now stores both brainstorm ideas and the final ranked list in persisted
            workspace state, matching the main NiceGUI planning flow.
          </p>
        </div>
      </section>
      <section className="two-up">
        <div className="panel">
          <div className="subpanel-header">
            <strong>Brainstorm board</strong>
            <form action={addActivity}>
              <input name="kind" type="hidden" value="brainstorm" />
              <button className="button button-secondary" type="submit">Add idea</button>
            </form>
          </div>
          <div className="snapshot-list">
            {brainstorm.map((activity, index) => (
              <div className="panel sub-card" key={`brainstorm-${index}`}>
                {(() => {
                  const record = activity as Record<string, unknown>;
                  return (
                    <>
                <div className="prompt-card">
                  <strong>{String(record.activity_name || `Idea ${index + 1}`)}</strong>
                  <form action={deleteActivity}>
                    <input name="kind" type="hidden" value="brainstorm" />
                    <input name="index" type="hidden" value={index} />
                    <button className="button button-secondary" type="submit">Remove</button>
                  </form>
                </div>
                <div className="two-up">
                  {[
                    ["activity_name", "Activity name"],
                    ["category", "Category"],
                    ["years_involved", "Years involved"],
                    ["hours_per_week", "Hours / week"],
                    ["notes", "Notes"],
                  ].map(([field, label]) => (
                    <form action={updateActivity} className="stack" key={field}>
                      <input name="kind" type="hidden" value="brainstorm" />
                      <input name="index" type="hidden" value={index} />
                      <input name="field" type="hidden" value={field} />
                      <label className="field-label">{label}</label>
                      <input className="field" defaultValue={String(record[field] ?? "")} name="value" />
                      <button className="button button-secondary" type="submit">Save</button>
                    </form>
                  ))}
                </div>
                    </>
                  );
                })()}
              </div>
            ))}
            {brainstorm.length === 0 ? <p className="muted">No brainstorm activities yet.</p> : null}
          </div>
        </div>

        <div className="panel">
          <div className="subpanel-header">
            <strong>Final activities list</strong>
            <form action={addActivity}>
              <input name="kind" type="hidden" value="final" />
              <button className="button button-secondary" type="submit">Add final activity</button>
            </form>
          </div>
          <div className="snapshot-list">
            {finalList.map((activity, index) => (
              <div className="panel sub-card" key={`final-${index}`}>
                {(() => {
                  const record = activity as Record<string, unknown>;
                  return (
                    <>
                <div className="prompt-card">
                  <strong>{index + 1}. {String(record.activity_name || `Ranked activity ${index + 1}`)}</strong>
                  <form action={deleteActivity}>
                    <input name="kind" type="hidden" value="final" />
                    <input name="index" type="hidden" value={index} />
                    <button className="button button-secondary" type="submit">Remove</button>
                  </form>
                </div>
                <div className="two-up">
                  {[
                    ["activity_name", "Activity name"],
                    ["role_position", "Role"],
                    ["organization", "Organization"],
                    ["category", "Category"],
                    ["years_involved", "Years involved"],
                    ["hours_per_week", "Hours / week"],
                    ["weeks_per_year", "Weeks / year"],
                    ["description", "Description"],
                  ].map(([field, label]) => (
                    <form action={updateActivity} className="stack" key={field}>
                      <input name="kind" type="hidden" value="final" />
                      <input name="index" type="hidden" value={index} />
                      <input name="field" type="hidden" value={field} />
                      <label className="field-label">{label}</label>
                      <input className="field" defaultValue={String(record[field] ?? "")} name="value" />
                      <button className="button button-secondary" type="submit">Save</button>
                    </form>
                  ))}
                </div>
                    </>
                  );
                })()}
              </div>
            ))}
            {finalList.length === 0 ? <p className="muted">No final activities yet.</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
