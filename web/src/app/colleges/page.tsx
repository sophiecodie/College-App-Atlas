import Link from "next/link";

import { addCollegeToDashboard } from "@/app/app/actions";
import { ModalShell } from "@/app/components/modal-shell";
import { getAvailableColleges, getUserColleges, requireCurrentUser } from "@/lib/app-data";
import { REQUIREMENT_SECTIONS, TESTING_POLICY_OPTIONS } from "@/lib/workspace-state";

function getCollegeProgress(college: Awaited<ReturnType<typeof getUserColleges>>[number]) {
  let totalRequirementSteps = 0;
  let completedSteps = 0;

  for (const section of REQUIREMENT_SECTIONS) {
    for (const item of section.items) {
      totalRequirementSteps += 1;
      const value = college.requirementsChecklist[item.key];
      if (item.type === "checkbox" && Boolean(value)) {
        completedSteps += 1;
      }
      if (item.type === "select" && typeof value === "string" && value !== TESTING_POLICY_OPTIONS[0]) {
        completedSteps += 1;
      }
    }
  }

  const totalSteps = totalRequirementSteps + 3;

  if (college.selectedApplicationType) {
    completedSteps += 1;
  }
  if (college.programSelection) {
    completedSteps += 1;
  }
  if (college.status && college.status !== "In Progress") {
    completedSteps += 1;
  }

  return {
    completedSteps,
    totalSteps,
    percent: Math.max(8, Math.round((completedSteps / totalSteps) * 100)),
  };
}

export default async function CollegesPage() {
  const user = await requireCurrentUser();
  const [savedColleges, availableColleges] = await Promise.all([
    getUserColleges(user.id),
    getAvailableColleges(user.id),
  ]);

  return (
    <main className="shell">
      <section className="workspace-header">
        <div>
          <span className="eyebrow">Schools</span>
          <h1 className="page-title">College dashboard</h1>
          <p className="lede">
            Keep your saved schools in one place, then open any one for prompts,
            research, requirements, and notes.
          </p>
        </div>
        <div className="workspace-actions">
          <ModalShell
            description="Choose from the seeded catalog and add another school to your workspace."
            title="Add a college"
            triggerClassName="plus-launch-button"
            triggerLabel="+"
          >
            {availableColleges.length > 0 ? (
              <form action={addCollegeToDashboard} className="stack">
                <label className="field-label" htmlFor="collegeSlug">
                  Choose a college
                </label>
                <select
                  className="field"
                  defaultValue={availableColleges[0]?.slug}
                  id="collegeSlug"
                  name="collegeSlug"
                >
                  {availableColleges.map((college) => (
                    <option key={college.slug} value={college.slug}>
                      {college.name}
                    </option>
                  ))}
                </select>
                <button className="button" type="submit">
                  Add to my colleges
                </button>
              </form>
            ) : (
              <p className="muted">You already added every seeded college.</p>
            )}
          </ModalShell>
        </div>
      </section>

      <section className="panel dashboard-route-panel">
        <div className="section-heading-row">
          <div>
            <span className="section-kicker">Saved schools</span>
            <h2 className="section-title">{savedColleges.length} colleges in your list</h2>
          </div>
        </div>

        <section className="colleges-card-grid">
        {savedColleges.length > 0 ? (
          savedColleges.map((college) => {
            const progress = getCollegeProgress(college);

            return (
              <Link className="college-overview-card" href={`/colleges/${college.slug}`} key={college.id}>
                <div className="college-overview-top">
                  <div className="college-overview-title-group">
                    <strong>{college.name}</strong>
                    <span className="muted">{college.applicationCycle ?? "Cycle TBD"}</span>
                  </div>
                  <span className="pill">{college.status ?? "In Progress"}</span>
                </div>

                <div className="college-overview-pill-row">
                  <span className="pill pill-soft">{college.selectedApplicationType ?? "App type pending"}</span>
                  <span className="pill pill-soft">
                    {college.programSelection === "engineering"
                      ? "Engineering"
                      : college.programSelection === "undecided"
                        ? "Undecided"
                        : "General applicant"}
                  </span>
                  <span className="pill pill-soft">{college.promptCount} prompts</span>
                </div>

                <div className="college-overview-progress">
                  <div className="subpanel-header compact">
                    <strong>Progress</strong>
                    <span className="muted">{progress.percent}%</span>
                  </div>
                  <div className="progress-track" aria-hidden="true">
                    <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
                  </div>
                  <div className="muted">
                    {progress.completedSteps} of {progress.totalSteps} setup checkpoints done
                  </div>
                </div>

                <div className="college-overview-footer">
                  <span className="muted college-overview-notes">
                    {college.quickNotes?.trim()
                      ? college.quickNotes
                      : "Open this college to edit notes, prompts, research, and requirements."}
                  </span>
                  <span className="research-open-label">Open college page</span>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="empty-panel">
            <strong>No colleges saved yet</strong>
            <p className="muted">
              Use the plus button to add your first school and start building the list.
            </p>
          </div>
        )}
        </section>
      </section>
    </main>
  );
}
