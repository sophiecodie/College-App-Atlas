"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  applyStorylineToPrompt,
  createEssayVersion,
  deleteEssayVersion,
  generateEssayStorylines,
  saveEssayDraft,
  saveEssayTags,
  saveStorylineFacts,
  toggleSavedStoryline,
} from "@/app/essays/actions";
import {
  type EssayStatus,
  type EssayWorkspaceGroup,
  countCharacters,
  countWords,
  essayStatusLabel,
  ESSAY_STATUS_OPTIONS,
} from "@/lib/essays-shared";
import { promptLimitLabel } from "@/lib/prompts-shared";
import { type StorylineCard, type StorylineFact } from "@/lib/storylines";

type WorkspaceProps = {
  groups: EssayWorkspaceGroup[];
  initialPromptId: string | null;
  initialPromptTags: Record<string, string[]>;
  initialStorylineFacts: StorylineFact[];
  initialStorylineCards: StorylineCard[];
  initialStorylineGeneratedAt: string | null;
  aiConfigured: boolean;
  aiBaseUrl: string;
  aiModel: string;
};

const TAG_GROUP_ORDER = [
  "Why Us",
  "Why Major",
  "Intellectual Curiosity",
  "Community",
  "Identity",
  "Diversity",
  "Adversity",
  "Leadership",
  "Activity",
  "Extracurricular",
  "Service",
  "Roommate",
  "Debate",
  "Short Essays",
  "Other",
] as const;

function formatSavedAt(value: string | null) {
  if (!value) {
    return "No saved version yet";
  }

  const date = new Date(value);
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const day = date.toLocaleString("en-US", { day: "numeric", timeZone: "UTC" });
  const time = date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });

  return `Saved ${month} ${day}, ${time} UTC`;
}

function versionLabel(index: number, title: string) {
  const fallback = `Version ${index + 1}`;
  return title.trim() ? `${fallback} · ${title.trim()}` : fallback;
}

export function EssaysWorkspace({
  groups,
  initialPromptId,
  initialPromptTags,
  initialStorylineFacts,
  initialStorylineCards,
  initialStorylineGeneratedAt,
  aiConfigured,
  aiBaseUrl,
  aiModel,
}: WorkspaceProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState<null | "draft" | "version" | "tags" | "facts" | "storylines" | "storyline">(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<"writing" | "storylines">("writing");
  const [groupMode, setGroupMode] = useState<"college" | "tag">("college");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const prompts = useMemo(() => groups.flatMap((group) => group.prompts), [groups]);
  const firstPromptId = prompts[0]?.promptId ?? null;
  const [selectedPromptId, setSelectedPromptId] = useState(
    initialPromptId && prompts.some((prompt) => prompt.promptId === initialPromptId)
      ? initialPromptId
      : firstPromptId,
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const selectedPrompt = prompts.find((prompt) => prompt.promptId === selectedPromptId) ?? prompts[0] ?? null;
  const [selectedVersionId, setSelectedVersionId] = useState(selectedPrompt?.activeDraft.id ?? null);
  const selectedVersion =
    selectedPrompt?.versions.find((version) => version.id === selectedVersionId) ??
    selectedPrompt?.activeDraft ??
    null;

  const [draftTitle, setDraftTitle] = useState(selectedVersion?.title ?? "");
  const [draftStatus, setDraftStatus] = useState(selectedVersion?.status ?? "not_started");
  const [draftContent, setDraftContent] = useState(selectedVersion?.content ?? "");
  const [tagInput, setTagInput] = useState(selectedPrompt ? (initialPromptTags[selectedPrompt.promptId] ?? []).join(", ") : "");
  const [storylineFactsInput, setStorylineFactsInput] = useState(
    initialStorylineFacts.map((fact) => fact.text).join("\n"),
  );

  useEffect(() => {
    setSelectedVersionId(selectedPrompt?.activeDraft.id ?? null);
  }, [selectedPromptId, selectedPrompt?.activeDraft.id]);

  useEffect(() => {
    setDraftTitle(selectedVersion?.title ?? "");
    setDraftStatus(selectedVersion?.status ?? "not_started");
    setDraftContent(selectedVersion?.content ?? "");
  }, [selectedVersion?.id, selectedVersion?.title, selectedVersion?.status, selectedVersion?.content]);

  useEffect(() => {
    if (!selectedPrompt) {
      setTagInput("");
      return;
    }
    setTagInput((initialPromptTags[selectedPrompt.promptId] ?? []).join(", "));
  }, [initialPromptTags, selectedPrompt?.promptId]);

  useEffect(() => {
    setStorylineFactsInput(initialStorylineFacts.map((fact) => fact.text).join("\n"));
  }, [initialStorylineFacts]);

  if (!selectedPrompt) {
    return (
      <div className="panel empty-panel">
        <strong>No active prompts yet</strong>
        <p className="muted">
          Go to a college page, open the Essays tab, and include the optional prompts you want.
          Required prompts will appear automatically.
        </p>
        <a className="button" href="/colleges">
          Open colleges
        </a>
      </div>
    );
  }

  const limitUnit = selectedPrompt.limitUnit;
  const currentLength =
    limitUnit === "characters" ? countCharacters(draftContent) : countWords(draftContent);
  const isOverLimit =
    selectedPrompt.limitValue !== null ? currentLength > selectedPrompt.limitValue : false;
  const promptTags = initialPromptTags[selectedPrompt.promptId] ?? [];
  const savedStorylineCount = initialStorylineCards.filter((storyline) => storyline.saved).length;

  const sidebarGroups = useMemo(() => {
    if (groupMode === "college") {
      return groups.map((group) => ({
        id: `college:${group.college.slug}`,
        title: group.college.name,
        items: group.prompts,
      }));
    }

    const grouped = new Map<string, EssayWorkspaceGroup["prompts"]>();
    for (const prompt of prompts) {
      const key = prompt.primaryTag ?? "Other";
      const current = grouped.get(key) ?? [];
      current.push(prompt);
      grouped.set(key, current);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => {
        const left = TAG_GROUP_ORDER.indexOf(a[0] as (typeof TAG_GROUP_ORDER)[number]);
        const right = TAG_GROUP_ORDER.indexOf(b[0] as (typeof TAG_GROUP_ORDER)[number]);
        const leftRank = left === -1 ? TAG_GROUP_ORDER.length : left;
        const rightRank = right === -1 ? TAG_GROUP_ORDER.length : right;
        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }
        return a[0].localeCompare(b[0]);
      })
      .map(([title, items]) => ({
        id: `tag:${title}`,
        title,
        items,
      }));
  }, [groupMode, groups, prompts]);

  useEffect(() => {
    setCollapsedGroups((current) => {
      const next: Record<string, boolean> = {};
      for (const group of sidebarGroups) {
        next[group.id] = current[group.id] ?? true;
      }
      return next;
    });
  }, [sidebarGroups]);

  function buildDraftFormData() {
    const formData = new FormData();
    formData.set("draftId", selectedVersion?.id ?? "");
    formData.set("promptId", selectedPrompt.promptId);
    formData.set("collegeSlug", selectedPrompt.collegeSlug);
    formData.set("title", draftTitle);
    formData.set("status", draftStatus);
    formData.set("content", draftContent);
    return formData;
  }

  function toggleGroup(groupId: string) {
    setCollapsedGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }

  function selectPrompt(promptId: string) {
    setSelectedPromptId(promptId);
    setSidebarOpen(false);
  }

  async function handleSaveDraft() {
    try {
      setIsSaving("draft");
      setActionError(null);
      await saveEssayDraft(buildDraftFormData());
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save this version.");
    } finally {
      setIsSaving(null);
    }
  }

  async function handleCreateVersion() {
    try {
      setIsSaving("version");
      setActionError(null);
      await createEssayVersion(buildDraftFormData());
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not create a new version.");
    } finally {
      setIsSaving(null);
    }
  }

  async function handleSaveTags() {
    try {
      setIsSaving("tags");
      setActionError(null);
      const formData = new FormData();
      formData.set("promptId", selectedPrompt.promptId);
      formData.set("tags", tagInput);
      await saveEssayTags(formData);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save tags.");
    } finally {
      setIsSaving(null);
    }
  }

  async function handleDeleteVersion(draftId: string) {
    if (!selectedPrompt || draftId.startsWith("draft-")) {
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this version?");
    if (!confirmed) {
      return;
    }

    try {
      setIsSaving("version");
      setActionError(null);
      const formData = new FormData();
      formData.set("draftId", draftId);
      formData.set("collegeSlug", selectedPrompt.collegeSlug);
      await deleteEssayVersion(formData);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not delete this version.");
    } finally {
      setIsSaving(null);
    }
  }

  async function handleSaveStorylineFacts() {
    try {
      setIsSaving("facts");
      setActionError(null);
      const formData = new FormData();
      formData.set("facts", storylineFactsInput);
      await saveStorylineFacts(formData);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save your facts.");
    } finally {
      setIsSaving(null);
    }
  }

  async function handleGenerateStorylines() {
    try {
      setIsSaving("storylines");
      setActionError(null);
      const formData = new FormData();
      formData.set("facts", storylineFactsInput);
      await generateEssayStorylines(formData);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not generate storylines.");
    } finally {
      setIsSaving(null);
    }
  }

  async function handleToggleSavedStoryline(storylineId: string) {
    try {
      setIsSaving("storyline");
      setActionError(null);
      const formData = new FormData();
      formData.set("storylineId", storylineId);
      await toggleSavedStoryline(formData);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save this storyline.");
    } finally {
      setIsSaving(null);
    }
  }

  async function handleApplyStorylineToPrompt(storylineId: string) {
    try {
      setIsSaving("storyline");
      setActionError(null);
      const formData = new FormData();
      formData.set("storylineId", storylineId);
      formData.set("promptId", selectedPrompt.promptId);
      await applyStorylineToPrompt(formData);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not apply this storyline.");
    } finally {
      setIsSaving(null);
    }
  }

  return (
    <>
      <section className="panel essay-workspace-switcher">
        <div className="essay-switcher-copy">
          <span className="section-kicker">Essays</span>
          <strong>{workspaceMode === "writing" ? "Drafting" : "Storylines"}</strong>
          <div className="muted">
            {workspaceMode === "writing"
              ? "Write one prompt at a time, then keep only the versions and tags you need."
              : "Collect details about yourself first, then build angles you can carry into real prompts."}
          </div>
        </div>
        <div className="essay-switcher-actions">
          <button
            className="button button-secondary"
            onClick={() => setSidebarOpen((current) => !current)}
            type="button"
          >
            {sidebarOpen ? "Hide prompts" : "Browse prompts"}
          </button>
          <div className="essay-group-toggle">
          <button
            className={`essay-toggle-chip ${workspaceMode === "writing" ? "active" : ""}`}
            onClick={() => setWorkspaceMode("writing")}
            type="button"
          >
            Writing
          </button>
          <button
            className={`essay-toggle-chip ${workspaceMode === "storylines" ? "active" : ""}`}
            onClick={() => setWorkspaceMode("storylines")}
            type="button"
          >
            Storylines
          </button>
          </div>
        </div>
      </section>

      <section className={`essay-shell ${workspaceMode === "storylines" ? "storylines-mode" : ""} ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      {sidebarOpen ? (
      <aside className="panel essay-sidebar">
        <div className="essay-sidebar-header">
          <div>
            <strong>Prompt list</strong>
            <div className="muted">{prompts.length} prompts in progress</div>
          </div>
          <div className="essay-group-toggle">
            <button
              className={`essay-toggle-chip ${groupMode === "college" ? "active" : ""}`}
              onClick={() => setGroupMode("college")}
              type="button"
            >
              By school
            </button>
            <button
              className={`essay-toggle-chip ${groupMode === "tag" ? "active" : ""}`}
              onClick={() => setGroupMode("tag")}
              type="button"
            >
              By theme
            </button>
          </div>
        </div>

        <div className="essay-sidebar-current">
          <span className="essay-sidebar-current-label">Current prompt</span>
          <strong>{selectedPrompt.collegeName}</strong>
          <div className="muted essay-sidebar-current-copy">{selectedPrompt.primaryTag ?? "Other"}</div>
        </div>

        <div className="essay-sidebar-groups">
          {sidebarGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.id] ?? true;
            return (
            <div className="essay-sidebar-group" key={group.id}>
              <button
                className="essay-sidebar-group-header"
                onClick={() => toggleGroup(group.id)}
                type="button"
              >
                <span className="essay-sidebar-group-title">{group.title}</span>
                <span className="essay-sidebar-group-count">
                  {group.items.length} {isCollapsed ? "+" : "-"}
                </span>
              </button>
              {!isCollapsed ? <div className="essay-sidebar-items">
                {group.items.map((prompt) => {
                  const active = prompt.promptId === selectedPrompt.promptId;
                  return (
                    <button
                      className={`essay-sidebar-item ${active ? "active" : ""}`}
                      key={prompt.promptId}
                      onClick={() => selectPrompt(prompt.promptId)}
                      type="button"
                    >
                      <span className="essay-sidebar-item-title">{prompt.primaryTag ?? "Other"}</span>
                      <span className="essay-sidebar-item-copy">{prompt.promptText}</span>
                    </button>
                  );
                })}
              </div> : null}
            </div>
          )})}
        </div>
      </aside>
      ) : null}

      {workspaceMode === "writing" ? (
      <div className="panel essay-main">
        {actionError ? <div className="essay-error-banner">{actionError}</div> : null}
        <div className="essay-context-bar">
          <div className="essay-context-copy">
            <span className="essay-context-label">Current prompt</span>
            <strong>{selectedPrompt.collegeName}</strong>
            <div className="muted">{selectedPrompt.primaryTag ?? "Other"} · {promptLimitLabel(selectedPrompt)}</div>
          </div>
          <button
            className="button button-secondary"
            onClick={() => setSidebarOpen(true)}
            type="button"
          >
            Change prompt
          </button>
        </div>
        <div className="essay-main-header">
          <div className="stack">
            <h2 className="essay-workspace-title essay-prompt-title">{selectedPrompt.promptText}</h2>
            <div className="muted">
              {formatSavedAt(selectedVersion?.updatedAt ?? null)}
            </div>
          </div>
          <div className={`essay-live-counter ${isOverLimit ? "over" : ""}`}>
            {currentLength}
            {selectedPrompt.limitValue !== null ? ` / ${selectedPrompt.limitValue}` : ""}
            {limitUnit === "characters" ? " characters" : " words"}
          </div>
        </div>

        <div className="essay-main-fields">
          <div>
            <label className="field-label" htmlFor="essay-version-title">
              Version title
            </label>
            <input
              className="field"
              id="essay-version-title"
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Version title"
              value={draftTitle}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="essay-version-status">
              Status
            </label>
            <select
              className="field"
              id="essay-version-status"
              onChange={(event) => setDraftStatus(event.target.value as EssayStatus)}
              value={draftStatus}
            >
              {ESSAY_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {essayStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="stack">
          <label className="field-label" htmlFor="essay-content">
            Your draft
          </label>
          <textarea
            className="field field-textarea essay-live-textarea"
            id="essay-content"
            onChange={(event) => setDraftContent(event.target.value)}
            placeholder="Start writing here. The counter updates as you go."
            rows={18}
            value={draftContent}
          />
        </div>

        <div className="essay-main-actions">
          <button
            className="button"
            disabled={isSaving !== null}
            onClick={handleSaveDraft}
            type="button"
          >
            {isSaving === "draft" ? "Saving..." : "Save current version"}
          </button>
            <a className="button button-secondary" href={`/colleges/${selectedPrompt.collegeSlug}?tab=essays`}>
              Open prompt settings
            </a>
        </div>
      </div>
      ) : (
      <div className="panel essay-main essay-storylines-workspace">
        {actionError ? <div className="essay-error-banner">{actionError}</div> : null}
        <div className="essay-context-bar">
          <div className="essay-context-copy">
            <span className="essay-context-label">Working with</span>
            <strong>{selectedPrompt.collegeName}</strong>
            <div className="muted">{selectedPrompt.primaryTag ?? "Other"} prompt selected</div>
          </div>
          <button
            className="button button-secondary"
            onClick={() => setSidebarOpen(true)}
            type="button"
          >
            Change prompt
          </button>
        </div>
        <div className="essay-main-header">
          <div className="stack">
            <h2 className="essay-workspace-title">Build story angles first</h2>
            <div className="muted essay-storylines-intro">
              Start with specific details about yourself, then keep only the angles that feel real.
            </div>
          </div>
          <div className="essay-live-counter">
            {savedStorylineCount} saved
          </div>
        </div>

        <div className="essay-storylines-grid">
          <div className="essay-storylines-panel stack">
            <div className="subpanel-header">
              <strong className="essay-panel-title">Interesting facts about me</strong>
              <span className="muted">{storylineFactsInput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length}/21</span>
            </div>
            <p className="muted essay-storylines-copy">
              Add one detail per line. Think quirks, habits, hobbies, routines, or oddly specific things you keep doing.
            </p>
            <details className="essay-ai-debug">
              <summary>AI details</summary>
              <div className="muted">
                AI: {aiConfigured ? "configured" : "missing key"} · model: {aiModel}
              </div>
              <div className="muted essay-ai-url">{aiBaseUrl}</div>
            </details>
            <label className="field-label" htmlFor="storyline-facts">
              One fact per line
            </label>
            <textarea
              className="field field-textarea essay-storyline-textarea"
              id="storyline-facts"
              onChange={(event) => setStorylineFactsInput(event.target.value)}
              placeholder={"I teach kids Scratch\nI make bookmarks\nI mark dance counts in my notebook"}
              rows={10}
              value={storylineFactsInput}
            />
            <div className="essay-main-actions">
              <button
                className="button button-secondary"
                disabled={isSaving !== null}
                onClick={handleSaveStorylineFacts}
                type="button"
              >
                {isSaving === "facts" ? "Saving..." : "Save list"}
              </button>
              <button
                className="button"
                disabled={isSaving !== null}
                onClick={handleGenerateStorylines}
                type="button"
              >
                {isSaving === "storylines" ? "Generating..." : "Generate angles"}
              </button>
            </div>
            {initialStorylineGeneratedAt ? (
              <div className="muted essay-storylines-meta">Last generated {formatSavedAt(initialStorylineGeneratedAt).replace("Saved ", "")}</div>
            ) : null}
          </div>

          <div className="essay-storylines-panel stack">
            <div className="subpanel-header">
              <strong className="essay-panel-title">Generated angles</strong>
              <span className="muted">{initialStorylineCards.length} ideas</span>
            </div>
            <p className="muted essay-storylines-copy">
              Keep the strong ones, then attach them to the prompt you are writing right now.
            </p>
              <div className="essay-storyline-list">
              {initialStorylineCards.length > 0 ? (
                initialStorylineCards.map((storyline) => {
                  const supportingFacts = storyline.supportingFactIds
                    .map((factId) => initialStorylineFacts.find((fact) => fact.id === factId)?.text ?? "")
                    .filter(Boolean);

                  return (
                    <div className={`essay-storyline-card ${storyline.saved ? "saved" : ""}`} key={storyline.id}>
                      <div className="essay-storyline-top">
                        <strong>{storyline.title}</strong>
                        <span className="pill essay-storyline-confidence">{storyline.confidence}</span>
                      </div>
                      <div className="essay-storyline-connection">{storyline.connection}</div>
                      <div className="essay-tag-row">
                        {storyline.sharedValues.map((value) => (
                          <span className="pill" key={value}>
                            {value}
                          </span>
                        ))}
                      </div>
                      {supportingFacts.length > 0 ? (
                        <div className="muted essay-storyline-facts">{supportingFacts.join(" · ")}</div>
                      ) : null}
                      <div className="essay-tag-row">
                        {storyline.possiblePromptTypes.map((promptType) => (
                          <span className="pill pill-warning" key={promptType}>
                            {promptType}
                          </span>
                        ))}
                      </div>
                      <div className="essay-main-actions">
                        <button
                          className="button button-secondary"
                          disabled={isSaving !== null}
                          onClick={() => void handleToggleSavedStoryline(storyline.id)}
                          type="button"
                        >
                          {storyline.saved ? "Unsave" : "Keep"}
                        </button>
                        <button
                          className="button button-secondary"
                          disabled={isSaving !== null}
                          onClick={() => void handleApplyStorylineToPrompt(storyline.id)}
                          type="button"
                        >
                          Use in prompt
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="muted">No storylines yet. Save a few facts, then generate.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {workspaceMode === "writing" ? (
      <aside className="panel essay-right-rail">
        <div className="stack">
          <div className="subpanel-header">
            <strong>Versions</strong>
            <span className="muted">{selectedPrompt.versions.length}</span>
          </div>
          <div className="essay-version-list">
            {selectedPrompt.versions.map((version, index) => (
              <div
                className={`essay-version-button ${version.id === selectedVersion?.id ? "active" : ""}`}
                key={version.id}
              >
                <div className="essay-version-top">
                  <button
                    className="essay-version-main"
                    onClick={() => setSelectedVersionId(version.id)}
                    type="button"
                  >
                    <span>{versionLabel(index, version.title)}</span>
                    <span className="muted">{essayStatusLabel(version.status)}</span>
                  </button>
                  {!version.id.startsWith("draft-") ? (
                    <button
                      aria-label={`Delete ${versionLabel(index, version.title)}`}
                      className="essay-version-delete"
                      disabled={isSaving !== null}
                      onClick={() => void handleDeleteVersion(version.id)}
                      type="button"
                    >
                      x
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <button
            className="button button-secondary"
            disabled={isSaving !== null}
            onClick={handleCreateVersion}
            type="button"
          >
            {isSaving === "version" ? "Saving..." : "Save as new version"}
          </button>
        </div>

        <div className="essay-tags-panel">
          <div className="subpanel-header">
            <strong>Tags</strong>
            <span className="muted">Main theme + custom</span>
          </div>
          <div className="essay-tag-row">
            <span className="pill">{selectedPrompt.primaryTag ?? "Other"}</span>
            {promptTags.map((tag) => (
              <span className="pill" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <label className="field-label" htmlFor="essay-tags">
            Custom tags
          </label>
          <input
            className="field"
            id="essay-tags"
            onChange={(event) => setTagInput(event.target.value)}
            placeholder="identity, community, reuse later"
            value={tagInput}
          />
          <button
            className="button button-secondary"
            disabled={isSaving !== null}
            onClick={handleSaveTags}
            type="button"
          >
            {isSaving === "tags" ? "Saving..." : "Save tags"}
          </button>
        </div>
      </aside>
      ) : null}
    </section>
    </>
  );
}
