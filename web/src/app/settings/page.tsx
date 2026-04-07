import { saveSettings } from "@/app/dashboard-actions";
import { requireCurrentUser } from "@/lib/app-data";
import { ensureWorkspaceState, normalizeSettingsState } from "@/lib/workspace-state";

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const settings = normalizeSettingsState(workspace.settingsState);

  return (
    <main className="shell">
      <section className="page-header-row">
        <div>
          <span className="eyebrow">Settings</span>
          <h1 className="page-title">Account settings</h1>
          <p className="lede">
            Signed in as {user.email}. This page now persists the same profile and appearance
            defaults that the NiceGUI settings page was designed around.
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
    </main>
  );
}
