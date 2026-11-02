"use client";

import { useMemo, useState } from "react";

import { reuseDraftAction } from "@/app/essays/studio-actions";
import type { LibraryEntry } from "@/lib/studio/writing";

type Props = {
  entries: LibraryEntry[];
  targets: Array<{ promptId: string; label: string }>;
};

export function EssayLibrary({ entries, targets }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Record<string, string>>({});
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = entries.filter(
      (entry) => !needle || `${entry.content} ${entry.promptText} ${entry.collegeName}`.toLowerCase().includes(needle),
    );
    const map = new Map<string, LibraryEntry[]>();
    for (const entry of filtered) map.set(entry.category, [...(map.get(entry.category) ?? []), entry]);
    return [...map.entries()].sort(([a], [b]) => (a === "Personal Statement" ? -1 : b === "Personal Statement" ? 1 : a.localeCompare(b)));
  }, [entries, query]);

  async function reuse(entry: LibraryEntry, targetPromptId: string) {
    if (!targetPromptId) return;
    setStatus((current) => ({ ...current, [entry.draftId]: "Copying…" }));
    const result = await reuseDraftAction(entry.draftId, targetPromptId);
    setStatus((current) => ({
      ...current,
      [entry.draftId]: result.ok ? "Copied as a new version. Open Supplemental Essays to adapt it." : result.error,
    }));
  }

  if (entries.length === 0) {
    return (
      <div className="empty-panel">
        <strong>Your library is empty</strong>
        <p className="muted">Everything you write in the personal statement and supplemental essays collects here by theme.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <input className="field" onChange={(event) => setQuery(event.target.value)} placeholder="Search your writing" type="search" value={query} />
      <div className="library-groups">
      {groups.map(([category, rows]) => (
        <section className="panel" key={category}>
          <div className="subpanel-header">
            <strong>{category}</strong>
            <span className="muted">{rows.length}</span>
          </div>
          <div className="library-grid">
            {rows.map((entry) => (
              <article className="library-card" key={entry.draftId}>
                <span className="section-kicker">{entry.collegeName}</span>
                <p className="library-prompt">{entry.promptText}</p>
                <p className="library-excerpt">{entry.content.slice(0, 260)}{entry.content.length > 260 ? "…" : ""}</p>
                <span className="muted">
                  {entry.words} words · {new Date(entry.updatedAt).toLocaleDateString()}
                  {entry.sharedWith.length > 0 ? ` · same prompt as ${entry.sharedWith.join(", ")}` : ""}
                </span>
                <select aria-label="Reuse in another prompt" className="field" defaultValue="" onChange={(event) => reuse(entry, event.target.value)}>
                  <option value="">Reuse in…</option>
                  {targets
                    .filter((target) => target.promptId !== entry.promptId)
                    .map((target) => (
                      <option key={target.promptId} value={target.promptId}>
                        {target.label}
                      </option>
                    ))}
                </select>
                {status[entry.draftId] ? <span className="muted">{status[entry.draftId]}</span> : null}
              </article>
            ))}
          </div>
        </section>
      ))}
      </div>
    </div>
  );
}
