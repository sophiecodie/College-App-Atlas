import Link from "next/link";
import { notFound } from "next/navigation";

import { updatePromptPreference, updateUserCollege } from "@/app/app/actions";
import {
  updateCollegeRecommendations,
  updateFees,
  updateRequirements,
  updateResearchEntry,
} from "@/app/workspace-actions";
import { getUserCollegeBySlug, requireCurrentUser } from "@/lib/app-data";
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

const applicationTypes = [
  "Regular Decision",
  "Early Action",
  "Early Decision",
  "Restrictive Early Action",
];

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

  const [prompts, workspace] = await Promise.all([
    getCollegePromptsForUser(user.id, slug),
    ensureWorkspaceState(user.id),
  ]);
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
    (prompt) => promptIsApplicable(college.programSelection, prompt) && prompt.required && !prompt.isOptionalChoice,
  );
  const visibleOptional = prompts.filter(
    (prompt) => promptIsApplicable(college.programSelection, prompt) && prompt.isOptionalChoice,
  );

  return (
    <main className="shell">
      <section className="page-header-row">
        <div>
          <span className="eyebrow">College Command Center</span>
          <h1 className="page-title">{college.name}</h1>
          <p className="lede">
            This route is the web copy of the NiceGUI college command center. The structure now
            matches the original tabs so we can port behavior without changing the mental model.
          </p>
        </div>
        <div className="stat-grid compact">
          <div className="stat-card">
            <span className="stat-label">Cycle</span>
            <strong>{college.applicationCycle ?? "TBD"}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Prompts</span>
            <strong>{college.promptCount}</strong>
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
                {applicationTypes.map((option) => (
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

          <div className="panel">
            <div className="subpanel-header">
              <strong>College summary</strong>
              <span className="pill">Live</span>
            </div>
            <div className="stack">
              <div className="check">Prompt count: {college.promptCount}</div>
              <div className="check">Program selection drives prompt visibility.</div>
              <div className="check">This page now persists the same core setup state as NiceGUI.</div>
            </div>
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
                <p className="muted">No required prompts match the current program selection.</p>
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
                      {promptIsActive(college.programSelection, prompt) ? (
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
        <form action={updateResearchEntry} className="panel stack">
          <input name="collegeSlug" type="hidden" value={college.slug} />
          <div className="three-up">
            <input className="field" defaultValue={researchEntry.location} name="location" placeholder="Location" />
            <select className="field" defaultValue={researchEntry.reach_level} name="reach_level">
              <option value="--">Reach level</option>
              <option value="High Reach">High Reach</option>
              <option value="Reach">Reach</option>
              <option value="Target">Target</option>
              <option value="Safety">Safety</option>
            </select>
            <select className="field" defaultValue={researchEntry.priority_level} name="priority_level">
              <option value="--">Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <select className="field" defaultValue={researchEntry.visit_status} name="visit_status">
            <option value="Visited">Visited</option>
            <option value="Planned">Planned</option>
            <option value="No Visit">No Visit</option>
          </select>
          <textarea className="field field-textarea" defaultValue={researchEntry.general_notes} name="general_notes" placeholder="General notes" rows={4} />
          <textarea className="field field-textarea" defaultValue={researchEntry.academic_programs} name="academic_programs" placeholder="Academic programs" rows={3} />
          <textarea className="field field-textarea" defaultValue={researchEntry.campus_culture} name="campus_culture" placeholder="Campus culture" rows={3} />
          <textarea className="field field-textarea" defaultValue={researchEntry.why_us_material} name="why_us_material" placeholder="Why us material" rows={3} />
          <textarea className="field field-textarea" defaultValue={researchEntry.personal_reflections} name="personal_reflections" placeholder="Personal reflections" rows={3} />
          <button className="button" type="submit">Save research</button>
        </form>
      ) : null}

      {activeTab === "requirements" ? (
        <div className="panel stack">
          {REQUIREMENT_SECTIONS.map((section) => (
            <div className="panel sub-card" key={section.title}>
              <strong>{section.title}</strong>
              <div className="stack">
                {section.items.map((item) => (
                  <form action={updateRequirements} className="prompt-card" key={item.key}>
                    <input name="collegeSlug" type="hidden" value={college.slug} />
                    <input name="key" type="hidden" value={item.key} />
                    <input name="current" type="hidden" value={JSON.stringify(college.requirementsChecklist)} />
                    <div>
                      <strong>{item.label}</strong>
                    </div>
                    {item.type === "checkbox" ? (
                      <>
                        <input
                          name="value"
                          type="hidden"
                          value={String(!Boolean(college.requirementsChecklist[item.key]))}
                        />
                        <button className="button button-secondary" type="submit">
                          {Boolean(college.requirementsChecklist[item.key]) ? "Mark incomplete" : "Mark complete"}
                        </button>
                      </>
                    ) : (
                      <select className="field compact-field" defaultValue={String(college.requirementsChecklist[item.key] ?? TESTING_POLICY_OPTIONS[0])} name="value">
                        {TESTING_POLICY_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    )}
                    {item.type === "select" ? <button className="button button-secondary" type="submit">Save</button> : null}
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === "fees" ? (
        <form action={updateFees} className="panel stack">
          <input name="collegeSlug" type="hidden" value={college.slug} />
          <input name="collegeName" type="hidden" value={college.name} />
          <input name="current" type="hidden" value={JSON.stringify(college.fees)} />
          <div className="four-up">
            <input className="field" defaultValue={String(college.fees.application_fee ?? 0)} name="application_fee" type="number" />
            <select className="field" defaultValue={String(college.fees.fee_waiver_status ?? "Not requested")} name="fee_waiver_status">
              <option value="Not requested">Not requested</option>
              <option value="Requested">Requested</option>
              <option value="Approved">Approved</option>
              <option value="Denied">Denied</option>
            </select>
            <select className="field" defaultValue={String(college.fees.payment_status ?? "Not paid")} name="payment_status">
              <option value="Not paid">Not paid</option>
              <option value="Paid">Paid</option>
            </select>
            <input className="field" defaultValue={String(college.fees.notes ?? "")} name="notes" placeholder="Notes" />
          </div>
          <div className="four-up">
            <label className="checkbox-row"><input defaultChecked={Boolean(college.fees.css_profile_required)} name="css_profile_required" type="checkbox" /><span>CSS Profile</span></label>
            <input className="field" defaultValue={String(college.fees.css_profile_cost ?? 0)} name="css_profile_cost" type="number" />
            <label className="checkbox-row"><input defaultChecked={Boolean(college.fees.fafsa_required)} name="fafsa_required" type="checkbox" /><span>FAFSA</span></label>
            <input className="field" defaultValue={String(college.fees.fafsa_cost ?? 0)} name="fafsa_cost" type="number" />
          </div>
          <div className="four-up">
            <label className="checkbox-row"><input defaultChecked={Boolean(college.fees.sat_score_send_required)} name="sat_score_send_required" type="checkbox" /><span>SAT send</span></label>
            <input className="field" defaultValue={String(college.fees.sat_score_send_cost ?? 0)} name="sat_score_send_cost" type="number" />
            <label className="checkbox-row"><input defaultChecked={Boolean(college.fees.ap_score_send_required)} name="ap_score_send_required" type="checkbox" /><span>AP send</span></label>
            <input className="field" defaultValue={String(college.fees.ap_score_send_cost ?? 0)} name="ap_score_send_cost" type="number" />
          </div>
          <button className="button" type="submit">Save fees</button>
        </form>
      ) : null}

      {activeTab === "recs" ? (
        <section className="two-up">
          <div className="panel">
            <div className="subpanel-header">
              <strong>Required recommenders</strong>
              <span className="muted">{recommenders.length} global options</span>
            </div>
            <div className="stack">
              {college.requiredRecommendations.map((slot, index) => (
                <form action={updateCollegeRecommendations} className="prompt-card" key={`required-${index}`}>
                  <input name="collegeSlug" type="hidden" value={college.slug} />
                  <input name="kind" type="hidden" value="required" />
                  <input name="index" type="hidden" value={index} />
                  <input name="current" type="hidden" value={JSON.stringify(college.requiredRecommendations)} />
                  <strong>{slot.label}</strong>
                  <select className="field compact-field" defaultValue={slot.assigned_recommender} name="assigned_recommender">
                    <option value="">-- Unassigned --</option>
                    {recommenders.map((rec) => (
                      <option key={rec.name} value={rec.name}>{rec.name}</option>
                    ))}
                  </select>
                  <button className="button button-secondary" type="submit">Save</button>
                </form>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="subpanel-header">
              <strong>Optional recommenders</strong>
              <span className="muted">Use the global directory first</span>
            </div>
            <div className="stack">
              {college.optionalRecommendations.map((slot, index) => (
                <form action={updateCollegeRecommendations} className="prompt-card" key={`optional-${index}`}>
                  <input name="collegeSlug" type="hidden" value={college.slug} />
                  <input name="kind" type="hidden" value="optional" />
                  <input name="index" type="hidden" value={index} />
                  <input name="current" type="hidden" value={JSON.stringify(college.optionalRecommendations)} />
                  <strong>{slot.label}</strong>
                  <select className="field compact-field" defaultValue={slot.assigned_recommender} name="assigned_recommender">
                    <option value="">-- Unassigned --</option>
                    {recommenders.map((rec) => (
                      <option key={rec.name} value={rec.name}>{rec.name}</option>
                    ))}
                  </select>
                  <button className="button button-secondary" type="submit">Save</button>
                </form>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
