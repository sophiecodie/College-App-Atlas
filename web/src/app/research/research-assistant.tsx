"use client";

// Icon and pastel tone per research section.
const SECTION_STYLE = {
  academic_programs: { icon: GraduationCap, tone: "tone-rose" },
  courses: { icon: BookOpen, tone: "tone-butter" },
  labs_faculty: { icon: FlaskConical, tone: "tone-blue" },
  clubs: { icon: Users, tone: "tone-sage" },
  culture: { icon: Landmark, tone: "tone-rose" },
  interdisciplinary: { icon: Shapes, tone: "tone-blue" },
  career: { icon: Briefcase, tone: "tone-butter" },
  why_college: { icon: Heart, tone: "tone-sage" },
} as const;

import { BookOpen, Briefcase, FlaskConical, GraduationCap, Heart, Landmark, Shapes, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { MoreMenu, type MoreMenuItem } from "@/components/cozy/more-menu";
import { useState } from "react";

import {
  addFindingToNotesAction,
  clearUnsavedFindingsAction,
  deleteFindingAction,
  editFindingAction,
  linkFindingAction,
  recheckFindingAction,
  runResearchSectionAction,
  saveFindingAction,
} from "@/app/research/ai-actions";
import type { FindingView } from "@/lib/research/findings";

type SectionMeta = { id: string; label: string };

type Props = {
  collegeSlug: string;
  collegeName: string;
  officialUrl: string | null;
  interests: string[];
  findings: FindingView[];
  prompts: Array<{ promptId: string; label: string }>;
  links: Array<{ promptId: string; findingId: string }>;
  sections: SectionMeta[];
  missingConfig: string[];
};

type RunState = Record<string, { state: "queued" | "running" | "done" | "error"; message?: string }>;

const STATUS_LABEL: Record<string, string> = {
  source_matched: "Quote found on source",
  source_changed: "Source changed, recheck",
  source_unreachable: "Source unreachable",
  user_added: "Your note",
};

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ResearchAssistant({
  collegeSlug,
  collegeName,
  officialUrl,
  interests,
  findings,
  prompts,
  links,
  sections,
  missingConfig,
}: Props) {
  const router = useRouter();
  const [interestText, setInterestText] = useState(interests.join(", "));
  const [selected, setSelected] = useState<Set<string>>(new Set(sections.filter((s) => s.id !== "why_college").map((s) => s.id)));
  const [runs, setRuns] = useState<RunState>({});
  const running = Object.values(runs).some((run) => run.state === "running" || run.state === "queued");
  const ready = missingConfig.length === 0;

  async function runSections(ids: string[]) {
    // "Why this college?" is built from the other findings, so it always runs last.
    const ordered = [...ids.filter((id) => id !== "why_college"), ...ids.filter((id) => id === "why_college")];
    setRuns((current) => ({ ...current, ...Object.fromEntries(ordered.map((id) => [id, { state: "queued" as const }])) }));
    for (const id of ordered) {
      setRuns((current) => ({ ...current, [id]: { state: "running" } }));
      const result = await runResearchSectionAction(collegeSlug, id, interestText);
      setRuns((current) => ({
        ...current,
        [id]: result.ok
          ? { state: "done", message: `${result.data.kept} finding${result.data.kept === 1 ? "" : "s"}` }
          : { state: "error", message: result.error },
      }));
      router.refresh();
    }
  }

  const bySection = new Map<string, FindingView[]>();
  for (const finding of findings) bySection.set(finding.section, [...(bySection.get(finding.section) ?? []), finding]);
  const findingTitle = new Map(findings.map((finding) => [finding.id, finding.title]));

  return (
    <div className="research-layout">
      <aside className="panel research-controls">
        <h3 className="research-controls-title">AI research</h3>
        <label className="field-label" htmlFor="research-interests">
          Your interests
        </label>
        <textarea
          className="field field-textarea"
          id="research-interests"
          onChange={(event) => setInterestText(event.target.value)}
          placeholder="e.g. neuroscience, dance, undergraduate research"
          rows={3}
          value={interestText}
        />
        <span className="muted">Comma-separated. Only these and the college name are sent to search.</span>

        <div className="field-label">Sections to research</div>
        <div className="research-section-picks">
          {sections.map((section) => (
            <label className="check-inline" key={section.id}>
              <input
                checked={selected.has(section.id)}
                onChange={() =>
                  setSelected((current) => {
                    const next = new Set(current);
                    if (next.has(section.id)) next.delete(section.id);
                    else next.add(section.id);
                    return next;
                  })
                }
                type="checkbox"
              />
              {section.label}
              {runs[section.id] ? (
                <span className={`run-state ${runs[section.id]!.state}`}>
                  {runs[section.id]!.state === "running" ? "researching…" : runs[section.id]!.state === "queued" ? "queued" : runs[section.id]!.message}
                </span>
              ) : null}
            </label>
          ))}
        </div>

        <button className="button" disabled={!ready || running || selected.size === 0} onClick={() => runSections([...selected])} type="button">
          {running ? "Researching…" : `Research ${selected.size} section${selected.size === 1 ? "" : "s"}`}
        </button>
        {!ready ? (
          <p className="ai-disabled-note">AI Research is off until these server settings are added: {missingConfig.join(", ")}.</p>
        ) : null}
        {Object.entries(runs)
          .filter(([, run]) => run.state === "error")
          .map(([id, run]) => (
            <div className="essay-error-banner" key={id}>
              {sections.find((s) => s.id === id)?.label}: {run.message}{" "}
              <button className="subtle-link" onClick={() => runSections([id])} type="button">
                Retry
              </button>
            </div>
          ))}

        <p className="muted research-sourcing">
          Searches are limited to {collegeName}&apos;s official website{officialUrl ? ` (${new URL(officialUrl).hostname})` : ""}. A
          finding is kept only if its supporting quote is found on the page it cites.
        </p>
        <div className="research-control-links">
          {findings.some((finding) => !finding.saved) ? (
            <button
              className="subtle-link"
              onClick={async () => {
                if (window.confirm("Delete every research result you haven't saved (all colleges)?")) {
                  await clearUnsavedFindingsAction();
                  router.refresh();
                }
              }}
              type="button"
            >
              Clear unsaved results
            </button>
          ) : null}
        </div>
      </aside>

      <div className="research-results">
        {findings.length === 0 ? (
          <div className="empty-panel">
            <strong>No AI research for {collegeName} yet</strong>
            <p className="muted">Add your interests, pick sections, and press Research. Each result appears as a card with its source.</p>
          </div>
        ) : null}
        {sections
          .filter((section) => bySection.has(section.id))
          .map((section) => (
            <section className="panel research-section" key={section.id}>
              <div className="subpanel-header">
                <strong className="research-section-title">
                  {(() => {
                    const style = SECTION_STYLE[section.id as keyof typeof SECTION_STYLE];
                    const Icon = style?.icon ?? BookOpen;
                    return (
                      <span className={`research-section-icon ${style?.tone ?? "tone-rose"}`}>
                        <Icon size={16} />
                      </span>
                    );
                  })()}
                  {section.label}
                </strong>
                <button className="subtle-link" disabled={!ready || running} onClick={() => runSections([section.id])} type="button">
                  ↻ Regenerate section
                </button>
              </div>
              <div className="finding-grid">
                {bySection.get(section.id)!.map((finding) => (
                  <FindingCard
                    collegeSlug={collegeSlug}
                    finding={finding}
                    findingTitle={findingTitle}
                    key={finding.id}
                    linkedPrompts={links.filter((link) => link.findingId === finding.id).map((link) => link.promptId)}
                    prompts={prompts}
                  />
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}

function FindingCard({
  finding,
  collegeSlug,
  prompts,
  linkedPrompts,
  findingTitle,
}: {
  finding: FindingView;
  collegeSlug: string;
  prompts: Array<{ promptId: string; label: string }>;
  linkedPrompts: string[];
  findingTitle: Map<string, string>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: finding.title, summary: finding.summary, relevance: finding.relevance, notes: finding.notes });
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function act(work: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    setBusy(true);
    const result = await work();
    setBusy(false);
    setMessage(result.ok ? success ?? null : result.error ?? "Something went wrong.");
    if (result.ok) router.refresh();
  }

  if (editing) {
    return (
      <article className="ca-card finding-card editing">
        <input className="field" onChange={(event) => setForm({ ...form, title: event.target.value })} value={form.title} />
        <textarea className="field field-textarea" onChange={(event) => setForm({ ...form, summary: event.target.value })} rows={3} value={form.summary} />
        <textarea
          className="field field-textarea"
          onChange={(event) => setForm({ ...form, relevance: event.target.value })}
          placeholder="Why it matters to you"
          rows={2}
          value={form.relevance}
        />
        <textarea className="field field-textarea" onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Your notes" rows={2} value={form.notes} />
        <div className="quick-task-row">
          <button className="button" disabled={busy} onClick={() => act(() => editFindingAction(finding.id, form)).then(() => setEditing(false))} type="button">
            Save
          </button>
          <button className="button button-secondary" onClick={() => setEditing(false)} type="button">
            Cancel
          </button>
        </div>
      </article>
    );
  }

  const notesLine = `• ${finding.title}: ${finding.summary}${finding.source ? ` (${finding.source.url})` : ""}`;
  const moreItems: MoreMenuItem[] = [
    { label: "Edit", onSelect: () => setEditing(true) },
    ...(finding.source ? [{ label: "Open source page", href: finding.source.url, external: true }] : []),
    ...(finding.source ? [{ label: "Recheck source", onSelect: () => void act(() => recheckFindingAction(finding.id), "Rechecked the source.") }] : []),
    { label: "Add to “Why us” notes", onSelect: () => void act(() => addFindingToNotesAction(collegeSlug, notesLine), "Added to your “Why us” notes.") },
    ...(prompts.length > 0
      ? [
          {
            label: "Link to essay",
            render: (close: () => void) => (
              <label className="more-menu-field">
                <span>Link to essay</span>
                <select
                  className="field compact"
                  onChange={(event) => {
                    const promptId = event.target.value;
                    if (promptId) void act(() => linkFindingAction(finding.id, promptId, !linkedPrompts.includes(promptId)));
                    close();
                  }}
                  value=""
                >
                  <option value="">{linkedPrompts.length > 0 ? `Linked to ${linkedPrompts.length}` : "Choose a prompt…"}</option>
                  {prompts.map((prompt) => (
                    <option key={prompt.promptId} value={prompt.promptId}>
                      {linkedPrompts.includes(prompt.promptId) ? "✓ " : ""}
                      {prompt.label}
                    </option>
                  ))}
                </select>
              </label>
            ),
          },
        ]
      : []),
    { label: "Delete", danger: true, onSelect: () => window.confirm("Delete this finding?") && void act(() => deleteFindingAction(finding.id)) },
  ];

  return (
    <article className={`ca-card finding-card ${finding.saved ? "saved" : ""} ${open ? "expanded" : ""}`}>
      <header className="ca-card-header">
        <h4 className="ca-card-title">{finding.title}</h4>
        <span className={`ca-badge finding-status ${finding.verificationStatus}`}>{STATUS_LABEL[finding.verificationStatus] ?? finding.verificationStatus}</span>
      </header>
      <p className={`ca-card-summary ${open ? "" : "clamped"}`}>{finding.summary}</p>
      {open ? (
        <div className="ca-card-details">
          {finding.relevance ? (
            <p>
              <strong>Why it fits: </strong>
              {finding.relevance}
            </p>
          ) : null}
          {finding.relatedFindingIds.length > 0 ? (
            <p className="muted">Built from: {finding.relatedFindingIds.map((id) => findingTitle.get(id) ?? "a deleted finding").join(" · ")}</p>
          ) : null}
          {finding.evidence ? <blockquote className="finding-evidence">“{finding.evidence}”</blockquote> : null}
          {finding.notes ? <p className="finding-notes">{finding.notes}</p> : null}
          {linkedPrompts.length > 0 ? <p className="muted">Linked to {linkedPrompts.length} essay{linkedPrompts.length === 1 ? "" : "s"}</p> : null}
        </div>
      ) : null}
      <div className="finding-source">
        {finding.source ? (
          <a href={finding.source.url} rel="noreferrer" target="_blank" title={finding.source.url}>
            {finding.source.title || finding.source.domain} ↗
          </a>
        ) : (
          <span>No source</span>
        )}
        <span className="muted">
          {finding.source?.isOfficial ? "Official site" : finding.source?.domain ?? ""} · checked {dateLabel(finding.checkedAt)}
          {finding.userEdited ? " · edited" : ""}
        </span>
      </div>
      <footer className="ca-card-footer">
        <button aria-expanded={open} className="button button-secondary small" onClick={() => setOpen((value) => !value)} type="button">
          {open ? "Hide details" : "Open details"}
        </button>
        <button className="button button-secondary small" disabled={busy} onClick={() => act(() => saveFindingAction(finding.id, !finding.saved))} type="button">
          {finding.saved ? "★ Saved" : "☆ Save"}
        </button>
        <MoreMenu items={moreItems} />
      </footer>
      {message ? <p className="muted ca-card-message">{message}</p> : null}
    </article>
  );
}
