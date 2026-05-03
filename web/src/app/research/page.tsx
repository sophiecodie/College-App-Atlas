import Link from "next/link";

import { getUserColleges, requireCurrentUser } from "@/lib/app-data";
import {
  getSortMode,
  priorityDotClass,
  reachDotClass,
  RESEARCH_SORT_OPTIONS,
  sortResearchCards,
} from "@/lib/research";
import { defaultResearchEntry, ensureWorkspaceState, normalizeResearchData } from "@/lib/workspace-state";

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const user = await requireCurrentUser();
  const { sort } = await searchParams;
  const [colleges, workspace] = await Promise.all([
    getUserColleges(user.id),
    ensureWorkspaceState(user.id),
  ]);
  const researchData = normalizeResearchData(workspace.researchData);
  const sortBy = getSortMode(sort);

  const rows = sortResearchCards(
    colleges.map((college) => ({
      college,
      entry: researchData[college.slug] ?? defaultResearchEntry(),
    })),
    sortBy,
  );

  return (
    <main className="shell shell-wide">
      <section className="page-header-row">
        <div>
          <span className="eyebrow">Research</span>
          <h1 className="page-title">Research overview</h1>
          <p className="lede">
            Browse your colleges as a visual research board, then open any school into a full-page
            workspace when you are ready to go deep.
          </p>
        </div>
      </section>

      <section className="panel research-gallery-panel">
        <div className="subpanel-header">
          <div>
            <strong>Research board</strong>
            <div className="muted">
              The overview only shows cards now. Click one to open that college in a dedicated workspace.
            </div>
          </div>
          <form action="/research" className="research-sort-form">
            <label className="field-label" htmlFor="research-sort">
              Sort by
            </label>
            <select className="field compact-field" defaultValue={sortBy} id="research-sort" name="sort">
              {RESEARCH_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="button button-secondary" type="submit">
              Reorder
            </button>
          </form>
        </div>

        <div className="research-card-grid">
          {rows.map(({ college, entry }) => {
            const href = `/research/${college.slug}?sort=${sortBy}`;

            return (
              <Link className="research-overview-card research-overview-card-large" href={href} key={college.id}>
                <div className="research-overview-top">
                  <div className="research-card-title-group">
                    <strong>{college.name}</strong>
                    <span className="muted">
                      {college.programSelection ?? "General applicant"}
                    </span>
                  </div>
                  <span className="pill research-mini-pill">{college.selectedApplicationType ?? "App type"}</span>
                </div>

                <div className="research-card-meta">
                  <div className="research-meta-item">
                    <span className="muted">Location</span>
                    <strong>{entry.location || "TBD"}</strong>
                  </div>
                  <div className="research-meta-item">
                    <span className="muted">Visit status</span>
                    <strong>{entry.visit_status}</strong>
                  </div>
                </div>

                <div className="research-dot-row">
                  <span className="research-dot-label">
                    <span className={`research-dot ${reachDotClass(entry.reach_level)}`} />
                    {entry.reach_level === "--" ? "Reach unset" : entry.reach_level}
                  </span>
                  <span className="research-dot-label">
                    <span className={`research-dot ${priorityDotClass(entry.priority_level)}`} />
                    {entry.priority_level === "--" ? "Priority unset" : `${entry.priority_level} priority`}
                  </span>
                </div>

                <div className="research-overview-footer">
                  <span className="pill">{college.status ?? "In Progress"}</span>
                  <span className="research-open-label">Open workspace</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
