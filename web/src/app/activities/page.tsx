import {
  addActivity,
  deleteActivity,
  moveActivity,
  saveActivity,
} from "@/app/workspace-actions";
import { ConfirmSubmitButton } from "@/app/activities/confirm-submit-button";
import { requireCurrentUser } from "@/lib/app-data";
import { ensureWorkspaceState, normalizeActivities } from "@/lib/workspace-state";

const ACTIVITY_CATEGORIES = [
  "Leadership",
  "Research",
  "Community Service",
  "Academic",
  "Arts",
  "Athletics",
  "Work",
  "Family Responsibilities",
  "Cultural",
  "Other",
] as const;

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function activityInsights(finalList: Array<Record<string, unknown>>) {
  const normalized = finalList.filter((activity) => String(activity.activity_name ?? "").trim().length > 0);
  const leadershipCount = normalized.filter((activity) => {
    const category = String(activity.category ?? "").toLowerCase();
    const role = String(activity.role_position ?? "").toLowerCase();
    return category.includes("lead") || role.includes("captain") || role.includes("president") || role.includes("founder");
  }).length;
  const researchCount = normalized.filter((activity) =>
    String(activity.category ?? "").toLowerCase().includes("research"),
  ).length;
  const communityServiceHours = normalized
    .filter((activity) => String(activity.category ?? "").toLowerCase().includes("community service"))
    .reduce((sum, activity) => sum + (toNumber(activity.hours_per_week) * toNumber(activity.weeks_per_year)), 0);
  const representedCategories = Array.from(
    new Set(
      normalized
        .map((activity) => String(activity.category ?? "").trim())
        .filter(Boolean),
    ),
  );
  const categoryBars = representedCategories
    .map((category) => {
      const count = normalized.filter((activity) => String(activity.category ?? "") === category).length;
      const percent = normalized.length > 0 ? Math.round((count / normalized.length) * 100) : 0;
      return { category, count, percent };
    })
    .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));

  return {
    leadershipCount,
    researchCount,
    communityServiceHours,
    representedCategories,
    categoryBars,
  };
}

export default async function ActivitiesPage() {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const brainstorm = normalizeActivities(workspace.brainstormActivities, "brainstorm");
  const finalList = normalizeActivities(workspace.finalActivities, "final");
  const insights = activityInsights(finalList);

  return (
    <main className="shell">
      <section className="page-header-row">
        <div>
          <span className="eyebrow">Activities</span>
          <h1 className="page-title">Activities planner</h1>
          <p className="lede">
            Brainstorm broadly, refine the strongest entries, and rank the final list the way
            colleges will actually see it.
          </p>
        </div>
      </section>

      <section className="activities-layout">
        <div className="panel">
          <div className="subpanel-header">
            <div>
              <strong>Brainstorm Board</strong>
              <div className="muted">
                Capture possibilities quickly before deciding what belongs in the final application list.
              </div>
            </div>
            <form action={addActivity}>
              <input name="kind" type="hidden" value="brainstorm" />
              <button className="button" type="submit">
                Add brainstorm card
              </button>
            </form>
          </div>

          <div className="activities-board">
            {brainstorm.length > 0 ? (
              brainstorm.map((activity, index) => {
                const record = activity as Record<string, unknown>;
                return (
                  <div className="activity-card brainstorm-card" key={`brainstorm-${index}`}>
                    <div className="activity-card-top">
                      <div>
                        <strong>{String(record.activity_name || `Idea ${index + 1}`)}</strong>
                        <div className="muted">Quick idea card</div>
                      </div>
                      <div className="activity-actions">
                        <form action={deleteActivity}>
                          <input name="kind" type="hidden" value="brainstorm" />
                          <input name="index" type="hidden" value={index} />
                          <ConfirmSubmitButton
                            className="button button-secondary"
                            confirmMessage="Are you sure you want to remove this activity?"
                          >
                            Remove
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>

                    <div className="brainstorm-meta">
                      <span className="brainstorm-badge">{String(record.category || "Other")}</span>
                      <span className="brainstorm-badge">
                        {toNumber(record.hours_per_week)} hrs/week
                      </span>
                    </div>

                    <form action={saveActivity} className="stack">
                      <input name="kind" type="hidden" value="brainstorm" />
                      <input name="index" type="hidden" value={index} />

                      <div className="activity-fields-grid">
                        <div>
                          <label className="field-label" htmlFor={`brainstorm-name-${index}`}>
                            Activity name
                          </label>
                          <input
                            className="field"
                            defaultValue={String(record.activity_name ?? "")}
                            id={`brainstorm-name-${index}`}
                            name="activity_name"
                          />
                        </div>
                        <div>
                          <label className="field-label" htmlFor={`brainstorm-category-${index}`}>
                            Category
                          </label>
                          <select
                            className="field"
                            defaultValue={String(record.category ?? "Other")}
                            id={`brainstorm-category-${index}`}
                            name="category"
                          >
                            {ACTIVITY_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="field-label" htmlFor={`brainstorm-years-${index}`}>
                            Years involved
                          </label>
                          <input
                            className="field"
                            defaultValue={String(record.years_involved ?? "")}
                            id={`brainstorm-years-${index}`}
                            name="years_involved"
                          />
                        </div>
                        <div>
                          <label className="field-label" htmlFor={`brainstorm-hours-${index}`}>
                            Hours/week
                          </label>
                          <input
                            className="field"
                            defaultValue={String(record.hours_per_week ?? 0)}
                            id={`brainstorm-hours-${index}`}
                            min={0}
                            name="hours_per_week"
                            type="number"
                          />
                        </div>
                      </div>

                      <div className="activity-notes">
                        <label className="field-label" htmlFor={`brainstorm-notes-${index}`}>
                          Notes
                        </label>
                        <textarea
                          className="field field-textarea"
                          defaultValue={String(record.notes ?? "")}
                          id={`brainstorm-notes-${index}`}
                          name="notes"
                          rows={4}
                        />
                      </div>

                      <button className="button button-secondary" type="submit">
                        Save card
                      </button>
                    </form>
                  </div>
                );
              })
            ) : (
              <div className="panel empty-panel">
                <strong>No brainstorm cards yet</strong>
                <p className="muted">Start dumping possibilities here before you narrow down the final 10.</p>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="subpanel-header">
            <div>
              <strong>Final Activities List</strong>
              <div className="muted">
                Keep the strongest items first. Move cards up and down to rank them.
              </div>
            </div>
            <form action={addActivity}>
              <input name="kind" type="hidden" value="final" />
              <button className="button" type="submit">
                Add final activity ({finalList.length}/10)
              </button>
            </form>
          </div>

          <div className="activity-final-list">
            {finalList.length > 0 ? (
              finalList.map((activity, index) => {
                const record = activity as Record<string, unknown>;
                return (
                  <div className="activity-card final-card" key={`final-${index}`}>
                    <div className="activity-card-top">
                      <div className="activity-final-title">
                        <div className="activity-rank-pill">{index + 1}</div>
                        <div>
                          <strong>{String(record.activity_name || `Ranked Activity ${index + 1}`)}</strong>
                          <div className="muted">{String(record.organization || "Add organization")}</div>
                        </div>
                      </div>
                      <div className="activity-actions">
                        <form action={moveActivity}>
                          <input name="kind" type="hidden" value="final" />
                          <input name="index" type="hidden" value={index} />
                          <input name="direction" type="hidden" value="-1" />
                          <button className="button button-secondary" disabled={index === 0} type="submit">
                            ↑
                          </button>
                        </form>
                        <form action={moveActivity}>
                          <input name="kind" type="hidden" value="final" />
                          <input name="index" type="hidden" value={index} />
                          <input name="direction" type="hidden" value="1" />
                          <button className="button button-secondary" disabled={index === finalList.length - 1} type="submit">
                            ↓
                          </button>
                        </form>
                        <form action={deleteActivity}>
                          <input name="kind" type="hidden" value="final" />
                          <input name="index" type="hidden" value={index} />
                          <ConfirmSubmitButton
                            className="button button-secondary"
                            confirmMessage="Are you sure you want to remove this activity?"
                          >
                            Remove
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>

                    <form action={saveActivity} className="stack">
                      <input name="kind" type="hidden" value="final" />
                      <input name="index" type="hidden" value={index} />

                      <div className="activity-fields-grid final">
                        <div>
                          <label className="field-label" htmlFor={`final-name-${index}`}>
                            Activity name
                          </label>
                          <input className="field" defaultValue={String(record.activity_name ?? "")} id={`final-name-${index}`} name="activity_name" />
                        </div>
                        <div>
                          <label className="field-label" htmlFor={`final-role-${index}`}>
                            Role / position
                          </label>
                          <input className="field" defaultValue={String(record.role_position ?? "")} id={`final-role-${index}`} name="role_position" />
                        </div>
                        <div>
                          <label className="field-label" htmlFor={`final-org-${index}`}>
                            Organization
                          </label>
                          <input className="field" defaultValue={String(record.organization ?? "")} id={`final-org-${index}`} name="organization" />
                        </div>
                        <div>
                          <label className="field-label" htmlFor={`final-years-${index}`}>
                            Years involved
                          </label>
                          <input className="field" defaultValue={String(record.years_involved ?? "")} id={`final-years-${index}`} name="years_involved" />
                        </div>
                        <div>
                          <label className="field-label" htmlFor={`final-hours-${index}`}>
                            Hours/week
                          </label>
                          <input className="field" defaultValue={String(record.hours_per_week ?? 0)} id={`final-hours-${index}`} min={0} name="hours_per_week" type="number" />
                        </div>
                        <div>
                          <label className="field-label" htmlFor={`final-weeks-${index}`}>
                            Weeks/year
                          </label>
                          <input className="field" defaultValue={String(record.weeks_per_year ?? 0)} id={`final-weeks-${index}`} min={0} name="weeks_per_year" type="number" />
                        </div>
                      </div>

                      <div className="activity-final-bottom-row">
                        <div className="activity-category-field">
                          <label className="field-label" htmlFor={`final-category-${index}`}>
                            Category
                          </label>
                          <select className="field" defaultValue={String(record.category ?? "Other")} id={`final-category-${index}`} name="category">
                            {ACTIVITY_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="activity-description compact">
                        <label className="field-label" htmlFor={`final-description-${index}`}>
                          Description
                        </label>
                        <textarea
                          className="field field-textarea"
                          defaultValue={String(record.description ?? "")}
                          id={`final-description-${index}`}
                          name="description"
                          rows={3}
                        />
                      </div>

                      <button className="button button-secondary" type="submit">
                        Save card
                      </button>
                    </form>
                  </div>
                );
              })
            ) : (
              <div className="panel empty-panel">
                <strong>No final activities yet</strong>
                <p className="muted">Promote your strongest ideas into a ranked final list here.</p>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div>
            <strong>Activity Insights</strong>
            <div className="muted">
              Use these quick signals to spot gaps before you lock in the final top 10.
            </div>
          </div>

          <div className="activity-insights-grid">
            {[
              ["Leadership activities", insights.leadershipCount],
              ["Research activities", insights.researchCount],
              ["Community service hours", insights.communityServiceHours],
              ["Categories represented", insights.representedCategories.length],
            ].map(([label, value]) => (
              <div className="insight-card" key={label}>
                <div className="insight-label">{label}</div>
                <div className="insight-value">{value}</div>
              </div>
            ))}
          </div>

          <section className="two-up">
            <div className="panel sub-card">
              <strong>Category coverage</strong>
              <div className="category-chip-wrap">
                {insights.representedCategories.length > 0 ? (
                  insights.representedCategories.map((category) => (
                    <span className="pill" key={category}>
                      {category}
                    </span>
                  ))
                ) : (
                  <p className="muted">No categories represented yet.</p>
                )}
              </div>
            </div>

            <div className="panel sub-card">
              <strong>Distribution</strong>
              <div className="activity-bar-list">
                {insights.categoryBars.length > 0 ? (
                  insights.categoryBars.map((bar) => (
                    <div className="activity-bar-row" key={bar.category}>
                      <span className="muted">{bar.category}</span>
                      <div className="activity-bar-track">
                        <div className="activity-bar-fill" style={{ width: `${Math.max(10, bar.percent)}%` }} />
                      </div>
                      <span className="muted">{bar.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="muted">Add final activities to see the distribution.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
