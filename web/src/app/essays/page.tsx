import { BookMarked, FileText, PenLine, Sprout } from "lucide-react";
import Link from "next/link";

import { EssayLibrary } from "@/app/essays/essay-library";
import { IdeaGarden } from "@/app/essays/idea-garden";
import { PersonalStatementWorkspace } from "@/app/essays/personal-statement";
import { EssaysWorkspace } from "@/app/essays/workspace";
import { PageHeader } from "@/components/cozy/ui";
import { db } from "@/db/client";
import { PERSONAL_STATEMENT_PROMPT_ID } from "@/db/schema";
import { aiConfigured } from "@/lib/ai/client";
import { getUserColleges, requireCurrentUser } from "@/lib/app-data";
import { getEssayWorkspaceForUser } from "@/lib/essays";
import { type FindingView, listFindings, listPromptLinks } from "@/lib/research/findings";
import { listConnections, listIdeaCards, listOutlines, listThemes, type ThemePayload } from "@/lib/studio/ideas";
import { getEssayLibrary, getPersonalStatement, PERSONAL_STATEMENT_WORD_LIMIT } from "@/lib/studio/writing";
import { ART } from "@/lib/illustrations";
import { ensureWorkspaceState, normalizeSettingsState } from "@/lib/workspace-state";

const SECTIONS = [
  { id: "personal", label: "Personal Statement", note: "Your Common App essay", icon: PenLine },
  { id: "garden", label: "Idea Garden", note: "Brainstorm & discover themes", icon: Sprout },
  { id: "supplemental", label: "Supplemental Essays", note: "School-specific prompts", icon: FileText },
  { id: "library", label: "Essay Library", note: "Everything you've written", icon: BookMarked },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

export default async function WritingStudioPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const user = await requireCurrentUser();
  const { section } = await searchParams;
  const active: SectionId = SECTIONS.some((item) => item.id === section) ? (section as SectionId) : "personal";
  const ai = aiConfigured();

  return (
    <main className="shell shell-wide">
      <PageHeader
        art={ART.books}
        description="Brainstorm, outline, and draft. AI helps you notice and question; every word stays yours."
        title="Writing Studio"
      />

      <nav aria-label="Writing Studio sections" className="studio-tabs">
        {SECTIONS.map((item) => (
          <Link
            aria-current={active === item.id ? "page" : undefined}
            className={`studio-tab ${active === item.id ? "active" : ""}`}
            href={`/essays?section=${item.id}`}
            key={item.id}
          >
            <strong>
              <item.icon size={16} /> {item.label}
            </strong>
            <span>{item.note}</span>
          </Link>
        ))}
      </nav>

      {active === "personal" ? <PersonalSection aiReady={ai} userId={user.id} /> : null}
      {active === "garden" ? <GardenSection aiReady={ai} userId={user.id} /> : null}
      {active === "supplemental" ? <SupplementalSection aiReady={ai} userId={user.id} /> : null}
      {active === "library" ? <LibrarySection userId={user.id} /> : null}
    </main>
  );
}

async function PersonalSection({ userId, aiReady }: { userId: string; aiReady: boolean }) {
  const [{ statement, versions }, outlines, themes] = await Promise.all([
    getPersonalStatement(db, userId),
    listOutlines(db, userId, { targetKind: "personal_statement" }),
    listThemes(db, userId, { savedOnly: true }),
  ]);
  return (
    <PersonalStatementWorkspace
      aiConfigured={aiReady}
      notes={statement.notes}
      outlines={outlines.map((row) => ({ id: row.id, title: row.title, sections: row.sections }))}
      savedThemes={themes.map((row) => ({ id: row.id, title: row.title, payload: row.payload as ThemePayload }))}
      selectedPrompt={statement.selectedPrompt}
      versions={versions.map((row) => ({
        id: row.id,
        title: row.title ?? "",
        content: row.content,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }))}
      wordLimit={PERSONAL_STATEMENT_WORD_LIMIT}
    />
  );
}

async function GardenSection({ userId, aiReady }: { userId: string; aiReady: boolean }) {
  const [cards, connections, themes] = await Promise.all([listIdeaCards(db, userId), listConnections(db, userId), listThemes(db, userId)]);
  return (
    <IdeaGarden
      aiConfigured={aiReady}
      cards={cards.map((card) => ({ id: card.id, category: card.category, title: card.title, detail: card.detail, posX: card.posX, posY: card.posY }))}
      connections={connections.map((row) => ({ id: row.id, sourceCardId: row.sourceCardId, targetCardId: row.targetCardId }))}
      themes={themes.map((row) => ({
        id: row.id,
        title: row.title,
        cardIds: row.cardIds,
        saved: row.saved,
        payload: row.payload as ThemePayload,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}

async function SupplementalSection({ userId, aiReady }: { userId: string; aiReady: boolean }) {
  const aiBaseUrl = (process.env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const aiModel = process.env.OPENAI_STORYLINES_MODEL ?? "gpt-5.2";
  const [groups, workspace] = await Promise.all([getEssayWorkspaceForUser(userId), ensureWorkspaceState(userId)]);
  const settings = normalizeSettingsState(workspace.settingsState);
  const slugs = groups.map((group) => group.college.slug);
  const [findings, links] = await Promise.all([listFindings(db, userId, slugs), listPromptLinks(db, userId)]);

  const linkedIds = new Set(links.map((link) => link.findingId));
  const researchFindings: Record<string, FindingView[]> = {};
  for (const finding of findings) {
    if (!finding.saved && !linkedIds.has(finding.id)) continue;
    (researchFindings[finding.collegeSlug] ??= []).push(finding);
  }
  const researchLinks: Record<string, string[]> = {};
  for (const link of links) (researchLinks[link.promptId] ??= []).push(link.findingId);

  if (groups.length === 0) {
    return (
      <div className="empty-panel">
        <strong>No supplemental prompts yet</strong>
        <p className="muted">
          Add colleges in <Link href="/colleges">My Colleges</Link>. Their prompts appear here, grouped by school.
        </p>
      </div>
    );
  }

  return (
    <EssaysWorkspace
      aiBaseUrl={aiBaseUrl}
      aiConfigured={aiReady}
      aiModel={aiModel}
      groups={groups}
      initialPromptId={settings.essayWorkspace.selectedPromptId}
      initialPromptTags={settings.essayWorkspace.promptTags}
      initialStorylineCards={settings.essayWorkspace.storylineCards}
      initialStorylineFacts={settings.essayWorkspace.storylineFacts}
      initialStorylineGeneratedAt={settings.essayWorkspace.storylineGeneratedAt}
      researchFindings={researchFindings}
      researchLinks={researchLinks}
    />
  );
}

async function LibrarySection({ userId }: { userId: string }) {
  const [entries, colleges] = await Promise.all([getEssayLibrary(db, userId), getUserColleges(userId)]);
  const groups = colleges.length > 0 ? await getEssayWorkspaceForUser(userId) : [];
  const targets = [
    { promptId: PERSONAL_STATEMENT_PROMPT_ID, label: "Common App personal statement" },
    ...groups.flatMap((group) =>
      group.prompts.map((prompt) => ({
        promptId: prompt.promptId,
        label: `${group.college.name}: ${prompt.promptText.slice(0, 70)}${prompt.promptText.length > 70 ? "…" : ""}`,
      })),
    ),
  ];
  return <EssayLibrary entries={entries} targets={targets} />;
}
