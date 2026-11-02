import Link from "next/link";

import { ResearchAssistant } from "@/app/research/research-assistant";
import { PageHeader } from "@/components/cozy/ui";
import { ART } from "@/lib/illustrations";
import { ResearchSortSelect } from "@/app/research/sort-select";
import { ResearchStatusCards } from "@/app/research/status-cards";
import { db } from "@/db/client";
import { RESEARCH_SECTIONS } from "@/db/schema";
import { aiConfigured } from "@/lib/ai/client";
import { getUserColleges, requireCurrentUser } from "@/lib/app-data";
import { currentAcademicYear } from "@/lib/catalog/cycles";
import { formatDeadlineDate, getUpcomingDeadlinesForUser } from "@/lib/catalog/requirements";
import { getCollegePromptsForUser } from "@/lib/prompts";
import {
  getSortMode,
  priorityPill,
  reachPill,
  sortResearchCards,
  visitPill,
} from "@/lib/research";
import { getInterests, listFindings, listPromptLinks, SECTION_INFO } from "@/lib/research/findings";
import { searchConfigured } from "@/lib/research/search";
import { defaultResearchEntry, ensureWorkspaceState, normalizeResearchData } from "@/lib/workspace-state";

const PROGRAM_LABELS: Record<string, string> = {
  general: "General applicant",
  engineering: "Engineering applicant",
  undecided: "Undecided",
};

export default async function ResearchPage({ searchParams }: { searchParams: Promise<{ college?: string; sort?: string }> }) {
  const user = await requireCurrentUser();
  const { college: requested, sort } = await searchParams;
  const [colleges, workspace, deadlines] = await Promise.all([
    getUserColleges(user.id),
    ensureWorkspaceState(user.id),
    getUpcomingDeadlinesForUser(db, user.id, currentAcademicYear()),
  ]);
  const researchData = normalizeResearchData(workspace.researchData);
  const deadlineBySlug = new Map(deadlines.map((row) => [row.collegeSlug, row]));

  const header = (
    <PageHeader
      art={ART.books}
      description="Quick overview for each college. Open one for notes and sourced AI research."
      title="Research"
    />
  );

  if (colleges.length === 0) {
    return (
      <main className="shell">
        {header}
        <div className="empty-panel">
          <strong>Add a college first</strong>
          <p className="muted">
            Research works on the schools in <Link href="/colleges">My Colleges</Link>.
          </p>
        </div>
      </main>
    );
  }

  const college = colleges.find((row) => row.slug === requested);

  // ---------------------------------------------------------------- Database view
  if (!college) {
    const sortBy = getSortMode(sort);
    const rows = sortResearchCards(
      colleges.map((row) => {
        const deadline = deadlineBySlug.get(row.slug);
        return {
          college: row,
          entry: researchData[row.slug] ?? defaultResearchEntry(),
          deadline: deadline?.officialDate ?? deadline?.personalDate ?? null,
        };
      }),
      sortBy,
    );

    return (
      <main className="shell shell-wide">
        {header}
        <section className="panel research-database">
          <div className="section-heading-row">
            <h2 className="section-title">Research Database View</h2>
            <ResearchSortSelect value={sortBy} />
          </div>
          <p className="muted research-database-legend">College Name • Location • Reach/Priority • Deadline • Visit</p>

          <div className="research-cards-grid">
            {rows.map(({ college: row, entry, deadline }) => {
              const [reachText, reachClass] = reachPill(entry.reach_level);
              const [priorityText, priorityClass] = priorityPill(entry.priority_level);
              const official = deadlineBySlug.get(row.slug)?.officialDate;
              return (
                <article className="research-list-card research-college-card" key={row.id}>
                  <div className="research-college-main">
                    <strong className="research-college-name">{row.name}</strong>
                    <span className="muted">
                      {entry.location && entry.location !== "TBD"
                        ? entry.location
                        : [row.city, row.state].filter(Boolean).join(", ") || "Location TBD"}{" "}
                      • {PROGRAM_LABELS[row.programSelection ?? "general"] ?? row.programSelection}
                    </span>
                    <div className="status-pill-row">
                      <span className={`status-pill ${reachClass}`}>{reachText}</span>
                      <span className={`status-pill ${priorityClass}`}>{priorityText}</span>
                      <span className="status-pill pill-visit">{visitPill(entry.visit_status)}</span>
                    </div>
                    <span className="muted">
                      Deadline: {deadline ? formatDeadlineDate(deadline) : "TBD"}
                      {deadline && !official ? " (your date)" : ""}
                    </span>
                  </div>
                  <Link className="button button-secondary research-open-button" href={`/research?college=${row.slug}`}>
                    Open Research →
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  // ---------------------------------------------------------------- College workspace
  const entry = researchData[college.slug] ?? defaultResearchEntry();
  const deadline = deadlineBySlug.get(college.slug);
  const [interests, findings, links, prompts] = await Promise.all([
    getInterests(db, user.id, college.slug),
    listFindings(db, user.id, [college.slug]),
    listPromptLinks(db, user.id),
    getCollegePromptsForUser(user.id, college.slug),
  ]);
  const missingConfig = [
    ...(aiConfigured() ? [] : ["an AI provider key (ANTHROPIC_API_KEY or OPENAI_API_KEY)"]),
    ...(searchConfigured() ? [] : ["a web search provider (Claude as AI provider, TAVILY_API_KEY, or BRAVE_SEARCH_API_KEY)"]),
  ];

  return (
    <main className="shell shell-wide">
      {header}
      <div className="section-heading-row research-workspace-head">
        <h2 className="section-title">{college.name} Research Workspace</h2>
        <Link className="subtle-link" href="/research">
          ← Back to Research Database
        </Link>
      </div>

      <ResearchStatusCards
        collegeSlug={college.slug}
        location={entry.location && entry.location !== "TBD" ? entry.location : [college.city, college.state].filter(Boolean).join(", ")}
        priority={entry.priority_level}
        reach={entry.reach_level}
        visit={entry.visit_status}
      />

      <div className="research-info-row">
        <div className="research-status-card">
          <span className="research-status-label">Intended Major / Program</span>
          <strong className="research-info-value">{PROGRAM_LABELS[college.programSelection ?? "general"] ?? college.programSelection}</strong>
          <span className="muted research-info-note">Synced from college page</span>
        </div>
        <div className="research-status-card">
          <span className="research-status-label">Application Deadline</span>
          <strong className="research-info-value">
            {deadline?.officialDate
              ? formatDeadlineDate(deadline.officialDate, deadline.officialTime, deadline.officialTimezone)
              : deadline?.personalDate
                ? `${formatDeadlineDate(deadline.personalDate)} (your date)`
                : "TBD"}
          </strong>
          <span className="muted research-info-note">
            {college.selectedApplicationType ?? "Round not set"} · synced from college page
          </span>
        </div>
        <Link className="research-status-card research-notes-link" href={`/research/${college.slug}`}>
          <span className="research-status-label">Long notes</span>
          <strong className="research-info-value">Open my notes →</strong>
          <span className="muted research-info-note">Programs, culture, why us, reflections</span>
        </Link>
      </div>

      <ResearchAssistant
        collegeName={college.name}
        collegeSlug={college.slug}
        findings={findings}
        interests={interests}
        key={college.slug}
        links={links}
        missingConfig={missingConfig}
        officialUrl={college.websiteUrl ?? college.admissionsUrl}
        prompts={prompts.map((prompt) => ({
          promptId: prompt.promptId,
          label: prompt.promptText.length > 70 ? `${prompt.promptText.slice(0, 70)}…` : prompt.promptText,
        }))}
        sections={RESEARCH_SECTIONS.map((id) => ({ id, label: SECTION_INFO[id].label }))}
      />
    </main>
  );
}
