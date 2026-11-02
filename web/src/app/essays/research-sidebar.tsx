"use client";

import { useState } from "react";

import { addToPromptOutlineAction } from "@/app/essays/studio-actions";
import { linkFindingAction } from "@/app/research/ai-actions";
import type { FindingView } from "@/lib/research/findings";

type Props = {
  collegeSlug: string;
  collegeName: string;
  promptId: string;
  findings: FindingView[];
  linkedIds: string[];
};

const SECTION_LABEL: Record<string, string> = {
  academic_programs: "Program",
  courses: "Course",
  labs_faculty: "Research",
  clubs: "Club",
  culture: "Culture",
  interdisciplinary: "Interdisciplinary",
  career: "Career",
  why_college: "Connection",
};

/** Collapsible research panel beside a supplemental essay: saved, source-backed findings for this college. */
export function ResearchSidebar({ collegeSlug, collegeName, promptId, findings, linkedIds }: Props) {
  const [linked, setLinked] = useState(new Set(linkedIds));
  const [status, setStatus] = useState<string | null>(null);

  async function toggleLink(finding: FindingView) {
    const next = !linked.has(finding.id);
    const result = await linkFindingAction(finding.id, promptId, next);
    if (result.ok) {
      setLinked((current) => {
        const copy = new Set(current);
        if (next) copy.add(finding.id);
        else copy.delete(finding.id);
        return copy;
      });
    } else {
      setStatus(result.error);
    }
  }

  async function addToOutline(finding: FindingView) {
    const result = await addToPromptOutlineAction(promptId, {
      heading: finding.title,
      notes: [finding.summary, finding.relevance ? `Why it fits me: ${finding.relevance}` : ""].filter(Boolean).join("\n"),
      ...(finding.source ? { sourceUrl: finding.source.url } : {}),
    });
    setStatus(result.ok ? `Added “${finding.title}” to this essay's outline.` : result.error);
  }

  const ordered = [...findings].sort((a, b) => Number(linked.has(b.id)) - Number(linked.has(a.id)) || Number(b.saved) - Number(a.saved));

  return (
    <details className="essay-research-panel" open={findings.length > 0}>
      <summary>
        <strong>Research for {collegeName}</strong>
        <span className="muted"> · {findings.length}</span>
      </summary>
      {findings.length === 0 ? (
        <p className="muted">
          No saved research yet. <a href={`/research?college=${collegeSlug}`}>Open AI Research</a> to find programs, courses and clubs
          that match your interests.
        </p>
      ) : (
        <div className="essay-research-list">
          {ordered.map((finding) => (
            <div className={`essay-research-item ${linked.has(finding.id) ? "linked" : ""}`} key={finding.id}>
              <div className="essay-research-head">
                <span className="chip">{SECTION_LABEL[finding.section] ?? finding.section}</span>
                <strong>{finding.title}</strong>
              </div>
              <p>{finding.summary}</p>
              {finding.source ? (
                <a className="subtle-link" href={finding.source.url} rel="noreferrer" target="_blank">
                  {finding.source.title || finding.source.domain} ↗
                </a>
              ) : null}
              <div className="essay-research-actions">
                <button className="subtle-link" onClick={() => toggleLink(finding)} type="button">
                  {linked.has(finding.id) ? "Linked ✓" : "Link to essay"}
                </button>
                <button className="subtle-link" onClick={() => addToOutline(finding)} type="button">
                  Add to outline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {status ? <p className="muted">{status}</p> : null}
      <p className="muted essay-research-note">Use findings as starting points. Check the source before naming specifics in your essay.</p>
    </details>
  );
}
