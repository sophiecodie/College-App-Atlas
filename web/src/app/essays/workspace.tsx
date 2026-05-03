"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createEssayVersion, deleteEssayVersion, saveEssayDraft, saveEssayTags } from "@/app/essays/actions";
import {
  type EssayStatus,
  type EssayWorkspaceGroup,
  countCharacters,
  countWords,
  essayStatusLabel,
  ESSAY_STATUS_OPTIONS,
} from "@/lib/essays-shared";
import { promptLimitLabel } from "@/lib/prompts-shared";

type WorkspaceProps = {
  groups: EssayWorkspaceGroup[];
  initialPromptId: string | null;
  initialPromptTags: Record<string, string[]>;
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
}: WorkspaceProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState<null | "draft" | "version" | "tags">(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [groupMode, setGroupMode] = useState<"college" | "tag">("college");
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

  return (
    <section className="essay-shell">
      <aside className="panel essay-sidebar">
        <div className="essay-sidebar-header">
          <div>
            <strong>Essay menu</strong>
            <div className="muted">{prompts.length} active prompts</div>
          </div>
          <div className="essay-group-toggle">
            <button
              className={`essay-toggle-chip ${groupMode === "college" ? "active" : ""}`}
              onClick={() => setGroupMode("college")}
              type="button"
            >
              College
            </button>
            <button
              className={`essay-toggle-chip ${groupMode === "tag" ? "active" : ""}`}
              onClick={() => setGroupMode("tag")}
              type="button"
            >
              Tag
            </button>
          </div>
        </div>

        <div className="essay-sidebar-groups">
          {sidebarGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.id] ?? false;
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
                      onClick={() => setSelectedPromptId(prompt.promptId)}
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

      <div className="panel essay-main">
        {actionError ? <div className="essay-error-banner">{actionError}</div> : null}
        <div className="essay-main-header">
          <div className="stack">
            <div className="essay-kicker-row">
              <span className="pill">{selectedPrompt.collegeName}</span>
              <span className="pill">{selectedPrompt.primaryTag ?? "Other"}</span>
              {selectedPrompt.completed ? <span className="pill">Completed</span> : null}
            </div>
            <h2 className="essay-workspace-title">{selectedPrompt.promptText}</h2>
            <div className="muted">
              {promptLimitLabel(selectedPrompt)} · {formatSavedAt(selectedVersion?.updatedAt ?? null)}
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
              Draft status
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
            Draft text
          </label>
          <textarea
            className="field field-textarea essay-live-textarea"
            id="essay-content"
            onChange={(event) => setDraftContent(event.target.value)}
            placeholder="Start drafting here. The counter updates live as you write."
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
              Manage prompt settings
            </a>
        </div>
      </div>

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
            <span className="muted">Prompt + custom</span>
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
            placeholder="community, identity, reuse later"
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
    </section>
  );
}
