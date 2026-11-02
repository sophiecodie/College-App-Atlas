import { saveSettings } from "@/app/dashboard-actions";
import { ConfirmSubmitModal } from "@/app/components/confirm-submit-modal";
import { deleteMyDataAction } from "@/app/settings/data-actions";
import { addRecommender, deleteRecommender } from "@/app/workspace-actions";
import { db } from "@/db/client";
import { aiConfig, aiConfigured, usageToday } from "@/lib/ai/client";
import { requireCurrentUser } from "@/lib/app-data";
import { ensureWorkspaceState, normalizeRecommenders, normalizeSettingsState } from "@/lib/workspace-state";

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const settings = normalizeSettingsState(workspace.settingsState);
  const recommenders = normalizeRecommenders(workspace.recommenders);
  const used = await usageToday(db, user.id);
  const { dailyLimit } = aiConfig();

  return (
    <main className="shell">
      <section className="page-header-row">
        <div>
          <span className="eyebrow">Settings</span>
          <h1 className="page-title">Account settings</h1>
          <p className="lede">
            Signed in as {user.email}. Profile, appearance, recommenders, and your AI data controls.
          </p>
        </div>
      </section>
      <form action={saveSettings} className="two-up">
        <div className="panel stack">
          <strong>Profile</strong>
          <input className="field" defaultValue={settings.profile.student_name} name="student_name" placeholder="Student name" />
          <input className="field" defaultValue={settings.profile.graduation_year} name="graduation_year" placeholder="Graduation year" />
          <input className="field" defaultValue={settings.profile.high_school} name="high_school" placeholder="High school" />
          <input className="field" defaultValue={settings.profile.intended_major} name="intended_major" placeholder="Intended major" />
          <select className="field" defaultValue={settings.profile.time_zone} name="time_zone">
            <option value="America/New_York">America/New_York</option>
            <option value="America/Chicago">America/Chicago</option>
            <option value="America/Denver">America/Denver</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
          </select>
        </div>

        <div className="panel stack">
          <strong>Appearance</strong>
          <select className="field" defaultValue={settings.appearance.accent_theme} name="accent_theme">
            <option value="Rosewood">Rosewood</option>
            <option value="Sage">Sage</option>
            <option value="Navy">Navy</option>
          </select>
          <select className="field" defaultValue={settings.appearance.layout_density} name="layout_density">
            <option value="Compact">Compact</option>
            <option value="Cozy">Cozy</option>
          </select>
          <label className="checkbox-row">
            <input defaultChecked={settings.appearance.dark_mode} name="dark_mode" type="checkbox" />
            <span>Enable dark mode later</span>
          </label>
          <button className="button" type="submit">
            Save settings
          </button>
        </div>
      </form>

      <section className="panel stack settings-section">
        <div className="subpanel-header">
          <strong>Recommenders</strong>
          <span className="muted">Assign them per college under Fees &amp; recommendations</span>
        </div>
        {recommenders.map((rec) => (
          <form action={deleteRecommender} className="task-row" key={rec.name}>
            <input name="name" type="hidden" value={rec.name} />
            <div className="task-main">
              <strong>{rec.name}</strong>
              <div className="muted">{[rec.role, rec.subject, rec.notes].filter(Boolean).join(" · ")}</div>
            </div>
            <button className="button button-secondary" type="submit">Remove</button>
          </form>
        ))}
        <form action={addRecommender} className="quick-task-row">
          <input className="field" name="name" placeholder="Name" required />
          <select className="field" defaultValue="Teacher" name="role">
            <option>Teacher</option>
            <option>Counselor</option>
            <option>Coach</option>
            <option>Mentor</option>
            <option>Other</option>
          </select>
          <input className="field" name="subject" placeholder="Subject" />
          <button className="button" type="submit">Add</button>
        </form>
      </section>
      <section className="panel stack settings-section">
        <div className="subpanel-header">
          <strong>AI &amp; your data</strong>
          <span className="muted">
            {aiConfigured() ? `${used} of ${dailyLimit} AI requests used in the last 24 hours` : "AI features are not configured"}
          </span>
        </div>
        <ul className="settings-privacy">
          <li>AI only runs when you press an AI button. It receives just what that feature needs: selected idea cards, the draft you ask about, or your interests and the college name.</li>
          <li>Requests are sent to the AI provider with storage turned off, and your writing is not used to train models.</li>
          <li>Your ideas, drafts, outlines and research are private to your account.</li>
        </ul>
        <div className="settings-delete-grid">
          {(
            [
              ["unsavedResearch", "Unsaved research results", "Keeps findings you starred or edited."],
              ["research", "All research results", "Your typed research notes are kept."],
              ["themes", "All generated themes", "Idea cards and outlines are kept."],
              ["ideas", "All idea cards and themes", "Clears the Idea Garden."],
              ["outlines", "All outlines", "Essay drafts are kept."],
            ] as const
          ).map(([target, label, note]) => (
            <form action={deleteMyDataAction} className="settings-delete-row" key={target}>
              <input name="target" type="hidden" value={target} />
              <div>
                <strong>{label}</strong>
                <div className="muted">{note}</div>
              </div>
              <ConfirmSubmitModal
                confirmClassName="button button-danger"
                confirmLabel="Delete"
                description={`Permanently delete ${label.toLowerCase()}? This can't be undone. ${note}`}
                title={`Delete ${label.toLowerCase()}?`}
                triggerClassName="button button-secondary"
                triggerLabel="Delete"
              />
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
