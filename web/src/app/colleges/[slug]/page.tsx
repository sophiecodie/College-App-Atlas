import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  removeCollegeFromDashboard,
  updatePersonalDeadline,
  updatePromptPreference,
  updateUserCollege,
} from "@/app/app/actions";
import { ConfirmSubmitModal } from "@/app/components/confirm-submit-modal";
import { ResearchWorkspaceForm } from "@/app/research/research-workspace-form";
import { ProgressBar } from "@/components/cozy/progress-ring";
import { VerificationNote } from "@/app/components/verification-note";
import { db } from "@/db/client";
import {
  updateCollegeFees,
  updateRecommendationSlots,
  updateRequirements,
} from "@/app/workspace-actions";
import { getUserCollegeBySlug, requireCurrentUser } from "@/lib/app-data";
import { campusArtFor } from "@/lib/illustrations";
import { dueLabel, getCollegeProgress } from "@/lib/progress";
import { APPLICATION_TYPE_OPTIONS, currentAcademicYear, roundFromApplicationType } from "@/lib/catalog/cycles";
import { deadlineForSelection, formatDeadlineDate, getCollegeRequirements } from "@/lib/catalog/requirements";
import {
  getCollegePromptsForUser,
  promptIsActive,
  promptIsApplicable,
  promptLimitLabel,
} from "@/lib/prompts";
import { collegeTabs } from "@/lib/shell";
import {
  ensureWorkspaceState,
  normalizeRecommenders,
  normalizeResearchData,
  REQUIREMENT_SECTIONS,
  TESTING_POLICY_OPTIONS,
} from "@/lib/workspace-state";

const PLATFORM_LABELS: Record<string, string> = {
  common_app: "Common App",
  coalition: "Coalition",
  questbridge: "QuestBridge",
  uc_application: "UC Application",
  applytexas: "ApplyTexas",
  school_specific: "School application",
};

const statuses = [
  "In Progress",
  "Ready to Draft",
  "Drafting",
  "Waiting on Materials",
  "Submitted",
];

const programSelections = [
  { value: "general", label: "General applicant" },
  { value: "engineering", label: "Engineering applicant" },
  { value: "undecided", label: "Undecided" },
];

export default async function CollegeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireCurrentUser();
  const { slug } = await params;
  const { tab } = await searchParams;
  const college = await getUserCollegeBySlug(user.id, slug);

  if (!college) {
    notFound();
  }

  const [prompts, workspace, requirements] = await Promise.all([
    getCollegePromptsForUser(user.id, slug),
    ensureWorkspaceState(user.id),
    getCollegeRequirements(db, college.collegeId, currentAcademicYear()),
  ]);
  const selectedRound = roundFromApplicationType(college.selectedApplicationType);
  const selectedDeadline = deadlineForSelection(
    requirements.deadlines,
    college.selectedApplicationType,
    college.programSelection,
  );
  const researchData = normalizeResearchData(workspace.researchData);
  const recommenders = normalizeRecommenders(workspace.recommenders);
  const researchEntry = researchData[college.slug] ?? {
    location: "TBD",
    reach_level: "--",
    visit_status: "No Visit",
    priority_level: "--",
    general_notes: "",
    academic_programs: "",
    campus_culture: "",
    why_us_material: "",
    personal_reflections: "",
  };
  const activeTab = collegeTabs.some((item) => item.id === tab) ? tab ?? "overview" : "overview";
  const visibleRequired = prompts.filter(
    (prompt) =>
      promptIsApplicable(college.programSelection, prompt, selectedRound) && prompt.required && !prompt.isOptionalChoice,
  );
  const visibleOptional = prompts.filter(
    (prompt) =>
      promptIsApplicable(college.programSelection, prompt, selectedRound) && (prompt.isOptionalChoice || !prompt.required),
  );
  const officialUrl = college.admissionsUrl ?? college.websiteUrl;
  const collegeProgress = getCollegeProgress(college);
  const heroDue = dueLabel(selectedDeadline?.date ?? null);

  return (
    <main className="shell">
      <Link className="subtle-link college-back" href="/colleges">
        ← Back to My Colleges
      </Link>
      <section className="college-hero cozy-card">
        <div className="college-hero-art">
          <Image alt="" fill priority sizes="320px" src={campusArtFor(college.slug).src} />
        </div>
        <div className="college-hero-body">
          <div className="college-hero-title">
            <div>
              <h1 className="page-title">{college.name}</h1>
              <span className="muted">
                {[[college.city, college.state].filter(Boolean).join(", "), requirements.platforms.map((platform) => PLATFORM_LABELS[platform] ?? platform).join(" · "), requirements.academicYear]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            {heroDue ? (
              <span className={`due-pill ${heroDue.urgent ? "urgent" : ""}`}>
                {heroDue.label}
                <small>{formatDeadlineDate(selectedDeadline!.date)}</small>
              </span>
            ) : (
              <span className="due-pill calm">
                Deadline not verified
                <small>{college.selectedApplicationType ?? "Round not set"}</small>
              </span>
            )}
          </div>
          <div className="college-card-progress">
            <ProgressBar value={collegeProgress.percent} />
            <span>{collegeProgress.percent}%</span>
          </div>
          <div className="college-hero-actions">
            <span className="muted">
              {college.promptCount} prompt{college.promptCount === 1 ? "" : "s"} · {collegeProgress.completedSteps} of {collegeProgress.totalSteps} checkpoints
            </span>
            <form action={removeCollegeFromDashboard}>
              <input name="collegeSlug" type="hidden" value={college.slug} />
              <ConfirmSubmitModal
                confirmClassName="button button-danger"
                confirmLabel="Remove college"
                description={`This will remove ${college.name} from your college list. Your notes, checklist and essay drafts are kept, and come back if you add it again.`}
                title={`Remove ${college.name}?`}
                triggerClassName="button button-secondary"
                triggerLabel="Remove from list"
              />
            </form>
          </div>
        </div>
      </section>

      <nav className="tab-row">
        {collegeTabs.map((item) => (
          <Link
            className={`tab-chip ${activeTab === item.id ? "active" : ""}`}
            href={`/colleges/${college.slug}?tab=${item.id}`}
            key={item.id}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <section className="two-up">
          <form action={updateUserCollege} className="panel stack">
            <input name="collegeSlug" type="hidden" value={college.slug} />

            <div>
              <label className="field-label" htmlFor="selectedApplicationType">
                Application type
              </label>
              <select
                className="field"
                defaultValue={college.selectedApplicationType ?? "Regular Decision"}
                id="selectedApplicationType"
                name="selectedApplicationType"
              >
                {APPLICATION_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="status">
                Status
              </label>
              <select className="field" defaultValue={college.status ?? "In Progress"} id="status" name="status">
                {statuses.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="programSelection">
                Intended track
              </label>
              <select
                className="field"
                defaultValue={college.programSelection ?? "general"}
                id="programSelection"
                name="programSelection"
              >
                {programSelections.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="quickNotes">
                Quick notes
              </label>
              <textarea
                className="field field-textarea"
                defaultValue={college.quickNotes ?? ""}
                id="quickNotes"
                name="quickNotes"
                placeholder="Anything you want to remember about this school."
                rows={6}
              />
            </div>

            <button className="button" type="submit">
              Save college settings
            </button>
          </form>

          <div className="panel stack">
            <div className="subpanel-header">
              <strong>Application requirements · {requirements.academicYear}</strong>
              {requirements.platforms.length > 0 ? (
                <span className="pill">{requirements.platforms.map((platform) => PLATFORM_LABELS[platform] ?? platform).join(" · ")}</span>
              ) : null}
            </div>

            <div className="deadline-highlight">
              <span className="stat-label">Your deadline ({college.selectedApplicationType ?? "no round selected"})</span>
              {selectedDeadline ? (
                <>
                  <strong>{formatDeadlineDate(selectedDeadline.date, selectedDeadline.time, selectedDeadline.timezone)}</strong>
                  {selectedDeadline.conditions ? <span className="muted">{selectedDeadline.conditions}</span> : null}
                  <VerificationNote
                    sourceUrl={selectedDeadline.sourceUrl}
                    staleReason={selectedDeadline.stale ? "stale" : null}
                    status="verified"
                  />
                </>
              ) : (
                <>
                  <strong>Not verified yet</strong>
                  <span className="muted">
                    {requirements.unverifiedDeadlineCount > 0
                      ? "We found deadline information that is still being checked."
                      : "We don't have a verified deadline for this round."}{" "}
                    {officialUrl ? (
                      <a href={officialUrl} rel="noreferrer" target="_blank">
                        Check the official admissions site
                      </a>
                    ) : (
                      "Check the school's official admissions site"
                    )}
                    , and add your own date below to track it.
                  </span>
                </>
              )}
            </div>

            {requirements.deadlines.length > 0 ? (
              <div className="snapshot-list">
                {requirements.deadlines.map((deadline) => (
                  <div className="deadline-row" key={deadline.id}>
                    <span>
                      {deadline.roundLabel}
                      {deadline.programScope.length > 0 ? ` · ${deadline.programScope.join(", ")}` : ""}
                    </span>
                    <strong>{formatDeadlineDate(deadline.date, deadline.time, deadline.timezone)}</strong>
                  </div>
                ))}
              </div>
            ) : null}

            {requirements.cycleNotes ? <p className="muted">{requirements.cycleNotes}</p> : null}

            <form action={updatePersonalDeadline} className="stack">
              <input name="collegeSlug" type="hidden" value={college.slug} />
              <label className="field-label" htmlFor="personalDeadline">
                My own target date (private)
              </label>
              <div className="quick-task-row">
                <input
                  className="field"
                  defaultValue={college.personalDeadline ?? ""}
                  id="personalDeadline"
                  name="personalDeadline"
                  type="date"
                />
                <input
                  className="field"
                  defaultValue={college.personalDeadlineNote ?? ""}
                  name="personalDeadlineNote"
                  placeholder="Note (e.g. scholarship deadline)"
                />
                <button className="button button-secondary" type="submit">
                  Save
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      {activeTab === "essays" ? (
        <section className="two-up">
          <div className="panel">
            <div className="subpanel-header">
              <strong>Required prompts</strong>
              <span className="muted">{visibleRequired.length} visible</span>
            </div>
            <div className="snapshot-list">
              {visibleRequired.length > 0 ? (
                visibleRequired.map((prompt) => (
                  <div className="prompt-card" key={prompt.promptId}>
                    <div>
                      <strong>{prompt.promptText}</strong>
                      <div className="muted">
                        {promptLimitLabel(prompt)} · {prompt.primaryTag ?? "Other"}
                      </div>
                      {prompt.conditionalRules.note ? <div className="muted">{prompt.conditionalRules.note}</div> : null}
                      <VerificationNote
                        officialUrl={officialUrl}
                        sourceUrl={prompt.sourceUrl}
                        staleReason={prompt.staleReason}
                        status={prompt.verificationStatus}
                      />
                    </div>
                    <form action={updatePromptPreference}>
                      <input name="collegeSlug" type="hidden" value={college.slug} />
                      <input name="promptId" type="hidden" value={prompt.promptId} />
                      <input name="selected" type="hidden" value="true" />
                      <input name="completed" type="hidden" value={String(!prompt.completed)} />
                      <button className="button button-secondary" type="submit">
                        {prompt.completed ? "Mark incomplete" : "Mark completed"}
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="muted">
                  {prompts.length === 0
                    ? "No supplemental prompts are on file for this cycle yet. Check the official site; some schools publish them only inside the application."
                    : "No required prompts match the current program selection."}
                </p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="subpanel-header">
              <strong>Optional prompts</strong>
              <span className="muted">{visibleOptional.length} visible</span>
            </div>
            <div className="snapshot-list">
              {visibleOptional.length > 0 ? (
                visibleOptional.map((prompt) => (
                  <div className="prompt-card" key={prompt.promptId}>
                    <div>
                      <strong>{prompt.promptText}</strong>
                      <div className="muted">
                        {promptLimitLabel(prompt)} · {prompt.primaryTag ?? "Other"}
                      </div>
                      {prompt.conditionalRules.note ? <div className="muted">{prompt.conditionalRules.note}</div> : null}
                      <VerificationNote
                        officialUrl={officialUrl}
                        sourceUrl={prompt.sourceUrl}
                        staleReason={prompt.staleReason}
                        status={prompt.verificationStatus}
                      />
                    </div>
                    <div className="prompt-actions">
                      <form action={updatePromptPreference}>
                        <input name="collegeSlug" type="hidden" value={college.slug} />
                        <input name="promptId" type="hidden" value={prompt.promptId} />
                        <input name="selected" type="hidden" value={String(!prompt.selected)} />
                        <input name="completed" type="hidden" value={String(prompt.completed)} />
                        <button className="button button-secondary" type="submit">
                          {prompt.selected ? "Remove" : "Include"}
                        </button>
                      </form>
                      {promptIsActive(college.programSelection, prompt, selectedRound) ? (
                        <form action={updatePromptPreference}>
                          <input name="collegeSlug" type="hidden" value={college.slug} />
                          <input name="promptId" type="hidden" value={prompt.promptId} />
                          <input name="selected" type="hidden" value={String(prompt.selected)} />
                          <input name="completed" type="hidden" value={String(!prompt.completed)} />
                          <button className="button button-secondary" type="submit">
                            {prompt.completed ? "Undo complete" : "Complete"}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">No optional prompts match the current program selection.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "research" ? (
        <ResearchWorkspaceForm
          collegeName={college.name}
          collegeSlug={college.slug}
          collegeStatus={college.status ?? "In Progress"}
          entry={researchEntry}
          selectedApplicationType={college.selectedApplicationType ?? "Regular Decision"}
        />
      ) : null}

      {activeTab === "requirements" ? (
        <div className="requirements-grid">
          {REQUIREMENT_SECTIONS.map((section) => (
            <div className="panel sub-card requirements-panel" key={section.title}>
              <div className="subpanel-header">
                <strong>{section.title}</strong>
                <span className="muted">{section.items.length} items</span>
              </div>
              <div className="requirements-item-list">
                {section.items.map((item) => (
                  <form action={updateRequirements} className="requirement-row" key={item.key}>
                    <input name="collegeSlug" type="hidden" value={college.slug} />
                    <input name="key" type="hidden" value={item.key} />
                    <input name="current" type="hidden" value={JSON.stringify(college.requirementsChecklist)} />
                    <div className="requirement-copy">
                      <strong>{item.label}</strong>
                      <div className="muted requirement-value">
                        {item.type === "checkbox"
                          ? Boolean(college.requirementsChecklist[item.key])
                            ? "Completed"
                            : "Not done yet"
                          : String(college.requirementsChecklist[item.key] ?? TESTING_POLICY_OPTIONS[0])}
                      </div>
                    </div>
                    {item.type === "checkbox" ? (
                      <div className="requirement-actions">
                        <input
                          name="value"
                          type="hidden"
                          value={String(!Boolean(college.requirementsChecklist[item.key]))}
                        />
                        <button className="button button-secondary" type="submit">
                          {Boolean(college.requirementsChecklist[item.key]) ? "Mark incomplete" : "Mark complete"}
                        </button>
                      </div>
                    ) : (
                      <div className="requirement-actions requirement-actions-wide">
                        <select
                          className="field compact-field"
                          defaultValue={String(college.requirementsChecklist[item.key] ?? TESTING_POLICY_OPTIONS[0])}
                          name="value"
                        >
                          {TESTING_POLICY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <button className="button button-secondary" type="submit">
                          Save
                        </button>
                      </div>
                    )}
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {activeTab === "fees" ? (
        <section className="two-up">
          <form action={updateCollegeFees} className="panel stack">
            <input name="collegeSlug" type="hidden" value={college.slug} />
            <input name="current" type="hidden" value={JSON.stringify(college.fees)} />
            <div className="subpanel-header">
              <strong>Application fees</strong>
              <span className="muted">Your own tracking</span>
            </div>
            <label className="field-label" htmlFor="application_fee">Application fee ($)</label>
            <input className="field" defaultValue={Number(college.fees.application_fee ?? 0)} id="application_fee" min={0} name="application_fee" type="number" />
            <div className="two-up">
              <div>
                <label className="field-label" htmlFor="fee_waiver_status">Fee waiver</label>
                <select className="field" defaultValue={String(college.fees.fee_waiver_status ?? "Not requested")} id="fee_waiver_status" name="fee_waiver_status">
                  {["Not requested", "Requested", "Approved", "Not eligible"].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="payment_status">Payment</label>
                <select className="field" defaultValue={String(college.fees.payment_status ?? "Not paid")} id="payment_status" name="payment_status">
                  {["Not paid", "Paid", "Waived"].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            {([
              ["css_profile", "CSS Profile"],
              ["sat_score_send", "SAT score send"],
              ["ap_score_send", "AP score send"],
            ] as const).map(([key, label]) => (
              <div className="quick-task-row" key={key}>
                <label className="check-inline">
                  <input defaultChecked={Boolean(college.fees[`${key}_required`])} name={`${key}_required`} type="checkbox" /> {label}
                </label>
                <input aria-label={`${label} cost`} className="field" defaultValue={Number(college.fees[`${key}_cost`] ?? 0)} min={0} name={`${key}_cost`} type="number" />
              </div>
            ))}
            <textarea className="field field-textarea" defaultValue={String(college.fees.notes ?? "")} name="notes" placeholder="Fee notes" rows={3} />
            <button className="button" type="submit">Save fees</button>
          </form>

          <form action={updateRecommendationSlots} className="panel stack">
            <input name="collegeSlug" type="hidden" value={college.slug} />
            <div className="subpanel-header">
              <strong>Recommendations</strong>
              <span className="muted">{recommenders.length} recommenders saved</span>
            </div>
            {([
              ["required", college.requiredRecommendations],
              ["optional", college.optionalRecommendations],
            ] as const).map(([kind, slots]) =>
              slots.map((slot) => (
                <div key={`${kind}-${slot.label}`}>
                  <input name={`${kind}_label`} type="hidden" value={slot.label} />
                  <label className="field-label">{slot.label}</label>
                  <select className="field" defaultValue={slot.assigned_recommender} name={`${kind}_assigned`}>
                    <option value="">Not assigned</option>
                    {recommenders.map((rec) => (
                      <option key={rec.name} value={rec.name}>
                        {rec.name} ({rec.role}{rec.subject ? `, ${rec.subject}` : ""})
                      </option>
                    ))}
                  </select>
                </div>
              )),
            )}
            {recommenders.length === 0 ? (
              <p className="muted">Add recommenders in Settings to assign them here.</p>
            ) : null}
            <button className="button" type="submit">Save recommendations</button>
          </form>
        </section>
      ) : null}
    </main>
  );
}
