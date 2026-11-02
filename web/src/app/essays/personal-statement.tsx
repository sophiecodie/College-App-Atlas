"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  autosavePersonalStatementAction,
  deleteOutlineAction,
  essayFeedbackAction,
  newPersonalStatementVersionAction,
  restorePersonalStatementVersionAction,
  saveOutlineAction,
  savePersonalStatementNotesAction,
} from "@/app/essays/studio-actions";
import { FeedbackPanel } from "@/app/essays/feedback-panel";
import type { OutlineSection, ThemePayload } from "@/lib/studio/ideas-shared";
import type { EssayFeedback } from "@/lib/studio/writing";

export type PsVersion = { id: string; title: string; content: string; updatedAt: string; createdAt: string };
export type PsOutline = { id: string; title: string; sections: OutlineSection[] };
export type PsTheme = { id: string; title: string; payload: ThemePayload };

type Props = {
  versions: PsVersion[];
  notes: string;
  selectedPrompt: string | null;
  outlines: PsOutline[];
  savedThemes: PsTheme[];
  aiConfigured: boolean;
  wordLimit: number;
};

const PROMPT_CHOICES = [
  "Prompt 1",
  "Prompt 2",
  "Prompt 3",
  "Prompt 4",
  "Prompt 5",
  "Prompt 6",
  "Prompt 7 (topic of your choice)",
];

function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function timeLabel(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function PersonalStatementWorkspace({ versions, notes, selectedPrompt, outlines, savedThemes, aiConfigured, wordLimit }: Props) {
  const router = useRouter();
  const latest = versions.at(-1) ?? null;
  const [draftId, setDraftId] = useState<string | null>(latest?.id ?? null);
  const [content, setContent] = useState(latest?.content ?? "");
  const [saveState, setSaveState] = useState<{ kind: "saved" | "saving" | "dirty" | "error"; at: string | null; error?: string }>({
    kind: "saved",
    at: latest?.updatedAt ?? null,
  });
  const [notesText, setNotesText] = useState(notes);
  const [promptChoice, setPromptChoice] = useState(selectedPrompt ?? "");
  const [focusMode, setFocusMode] = useState(false);
  const [leftTab, setLeftTab] = useState<"outline" | "themes" | "history">("outline");
  const [rightTab, setRightTab] = useState<"notes" | "feedback">("notes");
  const [feedback, setFeedback] = useState<EssayFeedback | null>(null);
  const [feedbackState, setFeedbackState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const [pending, startTransition] = useTransition();
  const firstRender = useRef(true);
  const words = countWords(content);

  // Autosave the current version 1.5s after typing stops.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // Same object when already dirty, so fast typing doesn't trigger a re-render per keystroke.
    setSaveState((state) => (state.kind === "dirty" ? state : { ...state, kind: "dirty" }));
    const timer = setTimeout(async () => {
      setSaveState((state) => ({ ...state, kind: "saving" }));
      const result = await autosavePersonalStatementAction(draftId, content);
      if (result.ok) {
        setDraftId(result.data.id);
        setSaveState({ kind: "saved", at: result.data.savedAt });
      } else {
        setSaveState((state) => ({ ...state, kind: "error", error: result.error }));
      }
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (notesText !== notes || promptChoice !== (selectedPrompt ?? "")) {
        void savePersonalStatementNotesAction(notesText, promptChoice || null);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [notesText, promptChoice, notes, selectedPrompt]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function saveNewVersion() {
    const title = window.prompt("Name this version (optional)", "") ?? "";
    startTransition(async () => {
      const result = await newPersonalStatementVersionAction(content, title);
      if (result.ok) {
        setDraftId(result.data);
        router.refresh();
      }
    });
  }

  function restore(version: PsVersion) {
    if (!window.confirm("Restore this version? It will be copied as a new latest version. Nothing is deleted.")) return;
    startTransition(async () => {
      const result = await restorePersonalStatementVersionAction(version.id);
      if (result.ok) {
        setDraftId(result.data);
        firstRender.current = true;
        setContent(version.content);
        router.refresh();
      }
    });
  }

  async function requestFeedback() {
    setFeedbackState({ loading: true, error: null });
    const result = await essayFeedbackAction(content, `Common App personal statement${promptChoice ? ` (${promptChoice})` : ""}`, wordLimit);
    if (result.ok) {
      setFeedback(result.data);
      setFeedbackState({ loading: false, error: null });
    } else {
      setFeedbackState({ loading: false, error: result.error });
    }
  }

  const saveLabel = useMemo(() => {
    if (saveState.kind === "saving") return "Saving…";
    if (saveState.kind === "dirty") return "Unsaved changes";
    if (saveState.kind === "error") return `Not saved: ${saveState.error}`;
    return saveState.at ? `Saved ${timeLabel(saveState.at)}` : "Not started";
  }, [saveState]);

  const percent = Math.min(100, Math.round((words / wordLimit) * 100));

  return (
    <section className={`ps-layout three-panel ${focusMode ? "focus-mode" : ""}`}>
      {!focusMode ? (
        <aside aria-label="Outline, themes and versions" className="panel ps-side ps-left">
          <div className="ps-side-tabs" role="tablist">
            {(
              [
                ["outline", "Outline"],
                ["themes", `Themes (${savedThemes.length})`],
                ["history", `Versions (${versions.length})`],
              ] as const
            ).map(([id, label]) => (
              <button aria-selected={leftTab === id} className={`tab-chip ${leftTab === id ? "active" : ""}`} key={id} onClick={() => setLeftTab(id)} role="tab" type="button">
                {label}
              </button>
            ))}
          </div>

          {leftTab === "outline" ? <OutlineEditor outlines={outlines} /> : null}

          {leftTab === "themes" ? (
            <div className="stack">
              {savedThemes.length === 0 ? (
                <p className="muted">
                  No saved themes yet. Use <a href="/essays?section=garden">Idea Garden</a> to discover and save some.
                </p>
              ) : (
                savedThemes.map((theme) => (
                  <details className="ps-theme" key={theme.id}>
                    <summary>{theme.title}</summary>
                    <p>{theme.payload.connection}</p>
                    <strong>Questions to answer</strong>
                    <ul>
                      {theme.payload.reflectiveQuestions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  </details>
                ))
              )}
            </div>
          ) : null}

          {leftTab === "history" ? (
            <div className="stack">
              {versions.length === 0 ? <p className="muted">Versions appear here once you start writing.</p> : null}
              {[...versions].reverse().map((version, index) => (
                <div className="ps-version" key={version.id}>
                  <div>
                    <strong>{version.title || `Version ${versions.length - index}`}</strong>
                    <div className="muted">
                      {timeLabel(version.updatedAt)} · {countWords(version.content)} words
                      {version.id === draftId ? " · current" : ""}
                    </div>
                  </div>
                  {version.id !== draftId ? (
                    <button className="button button-secondary" disabled={pending} onClick={() => restore(version)} type="button">
                      Restore
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      ) : null}

      <div className="panel ps-editor">
        <div className="ps-editor-top">
          <div className="ps-editor-meta">
            <span className="section-kicker">Common App personal statement</span>
            <select aria-label="Which prompt" className="field compact-field" onChange={(event) => setPromptChoice(event.target.value)} value={promptChoice}>
              <option value="">Choose a prompt</option>
              {PROMPT_CHOICES.map((choice) => (
                <option key={choice}>{choice}</option>
              ))}
            </select>
            <a className="subtle-link" href="https://www.commonapp.org/blog/common-app-essay-prompts" rel="noreferrer" target="_blank">
              Read the official prompts
            </a>
          </div>
          <div className="ps-editor-actions">
            <span className={`save-status ${saveState.kind}`}>{saveLabel}</span>
            <button className="button button-secondary" onClick={() => setFocusMode((value) => !value)} type="button">
              {focusMode ? "Exit focus (Esc)" : "Focus mode"}
            </button>
          </div>
        </div>

        <textarea
          aria-label="Personal statement draft"
          className="ps-textarea"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Start writing. Your draft saves automatically."
          value={content}
        />

        <div className="ps-editor-bottom">
          <div className={`word-meter ${words > wordLimit ? "over" : ""}`}>
            <div className="word-meter-track" aria-hidden="true">
              <div className="word-meter-fill" style={{ width: `${percent}%` }} />
            </div>
            <span>
              {words} / {wordLimit} words{words > wordLimit ? ` · ${words - wordLimit} over` : ""}
            </span>
          </div>
          <button className="button button-secondary" disabled={pending} onClick={saveNewVersion} type="button">
            Save as new version
          </button>
        </div>
      </div>

      {!focusMode ? (
        <aside aria-label="Progress, notes and feedback" className="panel ps-side ps-right">
          <div className="ps-count-card">
            <span className="section-kicker">Word count</span>
            <strong className={words > wordLimit ? "over" : ""}>{words}</strong>
            <span className="muted">
              of {wordLimit} · {Math.max(0, wordLimit - words)} left
            </span>
          </div>

          <div className="ps-side-tabs" role="tablist">
            {(
              [
                ["notes", "Notes"],
                ["feedback", "AI feedback"],
              ] as const
            ).map(([id, label]) => (
              <button aria-selected={rightTab === id} className={`tab-chip ${rightTab === id ? "active" : ""}`} key={id} onClick={() => setRightTab(id)} role="tab" type="button">
                {label}
              </button>
            ))}
          </div>

          {rightTab === "notes" ? (
            <div className="stack">
              <textarea
                className="field field-textarea"
                onChange={(event) => setNotesText(event.target.value)}
                placeholder="Private notes: memories to include, lines you like, things to cut."
                rows={10}
                value={notesText}
              />
              <span className="muted">Notes save automatically.</span>
            </div>
          ) : null}

          {rightTab === "feedback" ? (
            <FeedbackPanel
              aiConfigured={aiConfigured}
              error={feedbackState.error}
              feedback={feedback}
              loading={feedbackState.loading}
              onRequest={requestFeedback}
            />
          ) : null}
        </aside>
      ) : null}
    </section>
  );
}

function OutlineEditor({ outlines }: { outlines: PsOutline[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(outlines[0]?.id ?? null);
  const active = outlines.find((outline) => outline.id === activeId) ?? null;
  const [title, setTitle] = useState(active?.title ?? "");
  const [sections, setSections] = useState<OutlineSection[]>(active?.sections ?? []);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setTitle(active?.title ?? "");
    setSections(active?.sections ?? []);
  }, [active]);

  if (outlines.length === 0) {
    return (
      <p className="muted">
        No outline yet. In <a href="/essays?section=garden">Idea Garden</a>, press <strong>Create outline</strong> on a theme you like.
      </p>
    );
  }

  async function save() {
    if (!active) return;
    setStatus("Saving…");
    const result = await saveOutlineAction(active.id, title, sections);
    setStatus(result.ok ? "Saved" : result.error);
  }

  async function remove() {
    if (!active || !window.confirm("Delete this outline?")) return;
    await deleteOutlineAction(active.id);
    router.refresh();
  }

  return (
    <div className="stack">
      {outlines.length > 1 ? (
        <select className="field" onChange={(event) => setActiveId(event.target.value)} value={activeId ?? ""}>
          {outlines.map((outline) => (
            <option key={outline.id} value={outline.id}>
              {outline.title}
            </option>
          ))}
        </select>
      ) : null}
      <input className="field" onChange={(event) => setTitle(event.target.value)} value={title} />
      {sections.map((section, index) => (
        <div className="outline-section" key={index}>
          <input
            className="field"
            onChange={(event) => setSections((rows) => rows.map((row, i) => (i === index ? { ...row, heading: event.target.value } : row)))}
            value={section.heading}
          />
          <textarea
            className="field field-textarea"
            onChange={(event) => setSections((rows) => rows.map((row, i) => (i === index ? { ...row, notes: event.target.value } : row)))}
            placeholder="Your notes for this beat"
            rows={2}
            value={section.notes}
          />
          <button className="subtle-link" onClick={() => setSections((rows) => rows.filter((_, i) => i !== index))} type="button">
            Remove
          </button>
        </div>
      ))}
      <button className="subtle-link" onClick={() => setSections((rows) => [...rows, { heading: "New beat", notes: "" }])} type="button">
        + Add beat
      </button>
      <div className="quick-task-row">
        <button className="button" onClick={save} type="button">
          Save outline
        </button>
        <button className="button button-secondary" onClick={remove} type="button">
          Delete
        </button>
        <span className="muted">{status}</span>
      </div>
    </div>
  );
}
