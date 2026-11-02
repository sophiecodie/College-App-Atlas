import { EssaysWorkspace } from "@/app/essays/workspace";
import { getEssayWorkspaceForUser } from "@/lib/essays";
import { requireCurrentUser } from "@/lib/app-data";
import { ensureWorkspaceState, normalizeSettingsState } from "@/lib/workspace-state";

export default async function EssaysPage() {
  const user = await requireCurrentUser();
  const aiBaseUrl = (process.env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const aiModel = process.env.OPENAI_STORYLINES_MODEL ?? "gpt-5.2";
  const aiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const [groups, workspace] = await Promise.all([
    getEssayWorkspaceForUser(user.id),
    ensureWorkspaceState(user.id),
  ]);
  const settings = normalizeSettingsState(workspace.settingsState);

  return (
    <main className="shell shell-wide">
      <section className="workspace-header">
        <div>
          <span className="eyebrow">Writing</span>
          <h1 className="page-title">Essay workspace</h1>
          <p className="lede">
            Pick a prompt, write, and keep your strongest angles close by.
          </p>
        </div>
      </section>

      <EssaysWorkspace
        groups={groups}
        initialPromptId={settings.essayWorkspace.selectedPromptId}
        initialPromptTags={settings.essayWorkspace.promptTags}
        initialStorylineFacts={settings.essayWorkspace.storylineFacts}
        initialStorylineCards={settings.essayWorkspace.storylineCards}
        initialStorylineGeneratedAt={settings.essayWorkspace.storylineGeneratedAt}
        aiConfigured={aiConfigured}
        aiBaseUrl={aiBaseUrl}
        aiModel={aiModel}
      />
    </main>
  );
}
