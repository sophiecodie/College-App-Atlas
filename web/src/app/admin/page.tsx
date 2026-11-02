import Link from "next/link";
import { notFound } from "next/navigation";

import { editDeadlineAction, editPromptAction, reviewAction } from "@/app/admin/actions";
import { db } from "@/db/client";
import { isAdminEmail } from "@/lib/admin";
import { requireCurrentUser } from "@/lib/app-data";
import { currentAcademicYear, ROUND_LABELS } from "@/lib/catalog/cycles";
import { formatDeadlineDate } from "@/lib/catalog/requirements";
import { catalogTotals, coverageReport, listDeadlineQueue, listPromptQueue } from "@/lib/catalog/review";
import { recentImportRuns } from "@/lib/catalog/runs";
import { promptLimitLabel, VERIFICATION_LABELS } from "@/lib/prompts-shared";

const tabs = [
  { id: "prompts", label: "Essay prompts" },
  { id: "deadlines", label: "Deadlines" },
  { id: "coverage", label: "Coverage" },
  { id: "runs", label: "Import runs" },
];

function DecisionButtons({ entity, id, stale }: { entity: "prompt" | "deadline"; id: string; stale: boolean }) {
  return (
    <form action={reviewAction} className="admin-decisions">
      <input name="entity" type="hidden" value={entity} />
      <input name="id" type="hidden" value={id} />
      <input className="field compact-field" name="note" placeholder="Note (optional)" />
      <button className="button" name="decision" type="submit" value="approve">
        Verify
      </button>
      {stale ? (
        <button className="button button-secondary" name="decision" type="submit" value="still_valid">
          Still correct
        </button>
      ) : null}
      <button className="button button-secondary" name="decision" type="submit" value="rejected">
        Reject
      </button>
      <button className="button button-secondary" name="decision" type="submit" value="unavailable">
        Unavailable
      </button>
      <button className="button button-secondary" name="decision" type="submit" value="outdated">
        Outdated
      </button>
    </form>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireCurrentUser();
  if (!isAdminEmail(user.email)) {
    notFound();
  }
  const { tab } = await searchParams;
  const activeTab = tabs.some((item) => item.id === tab) ? tab! : "prompts";
  const academicYear = currentAcademicYear();

  const totals = await catalogTotals(db, academicYear);
  const promptQueue: Awaited<ReturnType<typeof listPromptQueue>> =
    activeTab === "prompts" ? await listPromptQueue(db, { includeStale: true }) : [];
  const deadlineQueue: Awaited<ReturnType<typeof listDeadlineQueue>> =
    activeTab === "deadlines" ? await listDeadlineQueue(db, { includeStale: true }) : [];
  const coverage: Awaited<ReturnType<typeof coverageReport>> =
    activeTab === "coverage" ? await coverageReport(db, academicYear) : [];
  const runs: Awaited<ReturnType<typeof recentImportRuns>> = activeTab === "runs" ? await recentImportRuns(db, 30) : [];

  return (
    <main className="shell shell-wide">
      <section className="workspace-header">
        <div>
          <span className="eyebrow">Admin</span>
          <h1 className="page-title">Catalog review</h1>
          <p className="lede">
            Check each candidate against its official source before verifying. Only verified records are shown to
            students as authoritative.
          </p>
        </div>
      </section>

      <section className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Colleges</span>
          <strong>{totals.colleges.toLocaleString()}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Verified prompts ({academicYear})</span>
          <strong>
            {totals.verifiedPrompts} <span className="muted">/ {totals.pendingPrompts} pending</span>
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Verified deadlines</span>
          <strong>
            {totals.verifiedDeadlines} <span className="muted">/ {totals.pendingDeadlines} pending</span>
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Colleges with verified data</span>
          <strong>
            {totals.collegesWithVerifiedPrompts} prompts · {totals.collegesWithVerifiedDeadlines} deadlines
          </strong>
        </div>
      </section>

      <nav className="tab-row">
        {tabs.map((item) => (
          <Link className={`tab-chip ${activeTab === item.id ? "active" : ""}`} href={`/admin?tab=${item.id}`} key={item.id}>
            {item.label}
          </Link>
        ))}
      </nav>

      {activeTab === "prompts" ? (
        <section className="stack admin-queue">
          {promptQueue.length === 0 ? <div className="empty-panel">Nothing waiting for review.</div> : null}
          {promptQueue.map((prompt) => (
            <article className="panel admin-review-card" key={prompt.id}>
              <div className="subpanel-header">
                <strong>
                  {prompt.collegeName ?? prompt.collegeSlug} · {prompt.cycle ?? "no cycle"}
                </strong>
                <span className={`pill ${prompt.status === "conflicting" ? "pill-warning" : ""}`}>
                  {VERIFICATION_LABELS[prompt.status] ?? prompt.status}
                </span>
              </div>
              {prompt.staleReason ? <p className="pill pill-warning">{prompt.staleReason}</p> : null}
              <div className={prompt.previousText ? "admin-compare" : ""}>
                {prompt.previousText ? (
                  <div>
                    <span className="stat-label">Current ({VERIFICATION_LABELS[prompt.previousStatus ?? ""] ?? prompt.previousStatus})</span>
                    <p>{prompt.previousText}</p>
                    <span className="muted">
                      {prompt.previousWordLimit ? `${prompt.previousWordLimit} words` : prompt.previousCharacterLimit ? `${prompt.previousCharacterLimit} characters` : "No limit"}
                    </span>
                  </div>
                ) : null}
                <div>
                  {prompt.previousText ? <span className="stat-label">Proposed</span> : null}
                  <p>{prompt.text}</p>
                  <span className="muted">
                    {promptLimitLabel(prompt)} · {prompt.required ? (prompt.optionalChoice ? "Choose from group" : "Required") : "Optional"}
                    {prompt.category ? ` · ${prompt.category}` : ""}
                    {prompt.programScope.length > 0 ? ` · ${prompt.programScope.join(", ")}` : ""}
                  </span>
                </div>
              </div>
              <div className="muted admin-source">
                {prompt.sourceUrl ? (
                  <a href={prompt.sourceUrl} rel="noreferrer" target="_blank">
                    {prompt.sourceUrl}
                  </a>
                ) : (
                  "No source URL"
                )}
                {prompt.collectedAt ? ` · collected ${prompt.collectedAt.toISOString().slice(0, 10)}` : ""}
                {prompt.ingestSource ? ` · ${prompt.ingestSource}` : ""}
              </div>
              {prompt.reviewNote ? <pre className="admin-note">{prompt.reviewNote}</pre> : null}
              <DecisionButtons entity="prompt" id={prompt.id} stale={Boolean(prompt.staleReason)} />
              <details>
                <summary className="subtle-link">Edit</summary>
                <form action={editPromptAction} className="stack">
                  <input name="id" type="hidden" value={prompt.id} />
                  <textarea className="field field-textarea" defaultValue={prompt.text} name="text" rows={4} />
                  <div className="three-up">
                    <input className="field" defaultValue={prompt.wordLimit ?? ""} name="wordLimit" placeholder="Word limit" />
                    <input className="field" defaultValue={prompt.wordMin ?? ""} name="wordMin" placeholder="Word minimum" />
                    <input className="field" defaultValue={prompt.characterLimit ?? ""} name="characterLimit" placeholder="Character limit" />
                  </div>
                  <div className="three-up">
                    <input className="field" defaultValue={prompt.category ?? ""} name="category" placeholder="Category" />
                    <input className="field" defaultValue={prompt.programScope.join(", ")} name="programScope" placeholder="Programs (comma-separated)" />
                    <label className="check-inline">
                      <input defaultChecked={prompt.required} name="required" type="checkbox" /> Required
                      <input defaultChecked={prompt.optionalChoice} name="optionalChoice" type="checkbox" /> Choice group
                    </label>
                  </div>
                  <button className="button button-secondary" type="submit">
                    Save edit
                  </button>
                </form>
              </details>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === "deadlines" ? (
        <section className="stack admin-queue">
          {deadlineQueue.length === 0 ? <div className="empty-panel">Nothing waiting for review.</div> : null}
          {deadlineQueue.map((deadline) => (
            <article className="panel admin-review-card" key={deadline.id}>
              <div className="subpanel-header">
                <strong>
                  {deadline.collegeName} · {ROUND_LABELS[deadline.round as keyof typeof ROUND_LABELS] ?? deadline.round} · {deadline.cycle}
                </strong>
                <span className={`pill ${deadline.status === "conflicting" ? "pill-warning" : ""}`}>
                  {VERIFICATION_LABELS[deadline.status] ?? deadline.status}
                </span>
              </div>
              {deadline.staleReason ? <p className="pill pill-warning">{deadline.staleReason}</p> : null}
              <p>
                <strong>{formatDeadlineDate(deadline.date, deadline.time, deadline.timezone)}</strong>
                {deadline.previousDate ? (
                  <span className="muted"> (current verified: {formatDeadlineDate(deadline.previousDate)})</span>
                ) : null}
                {deadline.conditions ? <span className="muted"> · {deadline.conditions}</span> : null}
                {deadline.programScope.length > 0 ? <span className="muted"> · {deadline.programScope.join(", ")}</span> : null}
              </p>
              {deadline.excerpt ? <blockquote className="admin-excerpt">&ldquo;{deadline.excerpt}&rdquo;</blockquote> : null}
              <div className="muted admin-source">
                {deadline.sourceUrl ? (
                  <a href={deadline.sourceUrl} rel="noreferrer" target="_blank">
                    {deadline.sourceUrl}
                  </a>
                ) : null}
                {deadline.collectedAt ? ` · collected ${deadline.collectedAt.toISOString().slice(0, 10)}` : ""}
              </div>
              {deadline.reviewNote ? <pre className="admin-note">{deadline.reviewNote}</pre> : null}
              <DecisionButtons entity="deadline" id={deadline.id} stale={Boolean(deadline.staleReason)} />
              <details>
                <summary className="subtle-link">Edit</summary>
                <form action={editDeadlineAction} className="quick-task-row">
                  <input name="id" type="hidden" value={deadline.id} />
                  <input className="field" defaultValue={deadline.date ?? ""} name="date" type="date" />
                  <input className="field" defaultValue={deadline.time?.slice(0, 5) ?? ""} name="time" type="time" />
                  <input className="field" defaultValue={deadline.timezone ?? ""} name="timezone" placeholder="Timezone" />
                  <input className="field" defaultValue={deadline.conditions ?? ""} name="conditions" placeholder="Conditions" />
                  <button className="button button-secondary" type="submit">
                    Save edit
                  </button>
                </form>
              </details>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === "coverage" ? (
        <section className="panel">
          <div className="subpanel-header">
            <strong>{coverage.length} colleges with a {academicYear} cycle</strong>
            <span className="muted">Incomplete rows first</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>College</th>
                  <th>Status</th>
                  <th>Prompts (verified / pending)</th>
                  <th>Deadlines (verified / pending)</th>
                  <th>Stale</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...coverage]
                  .sort((a, b) => Number(a.verifiedPrompts > 0 && a.verifiedDeadlines > 0) - Number(b.verifiedPrompts > 0 && b.verifiedDeadlines > 0))
                  .map((row) => (
                    <tr key={row.collegeId}>
                      <td>
                        {row.admissionsUrl ? (
                          <a href={row.admissionsUrl} rel="noreferrer" target="_blank">
                            {row.name}
                          </a>
                        ) : (
                          row.name
                        )}
                      </td>
                      <td>{row.publicationStatus}</td>
                      <td>
                        {row.verifiedPrompts} / {row.pendingPrompts}
                      </td>
                      <td>
                        {row.verifiedDeadlines} / {row.pendingDeadlines}
                      </td>
                      <td>{row.staleRecords || ""}</td>
                      <td className="muted">{row.cycleNotes}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "runs" ? (
        <section className="panel">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Errors</th>
                  <th>Stats</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{run.startedAt.toISOString().replace("T", " ").slice(0, 16)}</td>
                    <td>{run.kind}</td>
                    <td>{run.status}</td>
                    <td>{run.errorCount}</td>
                    <td className="muted">
                      {Object.entries(run.stats as Record<string, number>)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(" · ")}
                      {run.error ? ` · ${run.error}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
