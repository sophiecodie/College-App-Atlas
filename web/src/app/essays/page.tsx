import { EssaysWorkspace } from "@/app/essays/workspace";
import { getEssayWorkspaceForUser } from "@/lib/essays";
import { requireCurrentUser } from "@/lib/app-data";
import { ensureWorkspaceState, normalizeSettingsState } from "@/lib/workspace-state";

export default async function EssaysPage() {
  const user = await requireCurrentUser();
  const [groups, workspace] = await Promise.all([
    getEssayWorkspaceForUser(user.id),
    ensureWorkspaceState(user.id),
  ]);
  const settings = normalizeSettingsState(workspace.settingsState);

  return (
    <main className="shell shell-wide">
      <section className="page-header-row">
        <div>
          <span className="eyebrow">Essays</span>
          <h1 className="page-title">Essay workspace</h1>
          <p className="lede">
            One focused workspace at a time, with the same core rhythm as NiceGUI: choose a prompt,
            draft live, keep versions, and tag the work as you go.
          </p>
        </div>
      </section>

      <EssaysWorkspace
        groups={groups}
        initialPromptId={settings.essayWorkspace.selectedPromptId}
        initialPromptTags={settings.essayWorkspace.promptTags}
      />
    </main>
  );
}
