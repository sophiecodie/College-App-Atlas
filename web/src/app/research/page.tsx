import { getUserColleges, requireCurrentUser } from "@/lib/app-data";
import { updateResearchEntry } from "@/app/workspace-actions";
import { ensureWorkspaceState, normalizeResearchData } from "@/lib/workspace-state";

export default async function ResearchPage() {
  const user = await requireCurrentUser();
  const [colleges, workspace] = await Promise.all([
    getUserColleges(user.id),
    ensureWorkspaceState(user.id),
  ]);
  const researchData = normalizeResearchData(workspace.researchData);

  return (
    <main className="shell">
      <section className="page-header-row">
        <div>
          <span className="eyebrow">Research</span>
          <h1 className="page-title">Research overview</h1>
          <p className="lede">
            NiceGUI has both a database view and per-college research workspace. This web page now
            stores the same research notes in account-backed workspace state.
          </p>
        </div>
      </section>
      <section className="stack">
        {colleges.map((college) => {
          const entry = researchData[college.slug] ?? {
            location: "TBD",
            reach_level: "--",
            visit_status: "No Visit",
            priority_level: "--",
            general_notes: "",
            academic_programs: "",
            campus_culture: "",
            why_us_material: "",
            personal_reflections: "",
          };
          return (
            <form action={updateResearchEntry} className="panel stack" key={college.id}>
              <input name="collegeSlug" type="hidden" value={college.slug} />
              <div className="subpanel-header">
                <strong>{college.name}</strong>
                <span className="pill">{college.selectedApplicationType ?? "Application type not set"}</span>
              </div>
              <div className="three-up">
                <input className="field" defaultValue={entry.location} name="location" placeholder="Location" />
                <select className="field" defaultValue={entry.reach_level} name="reach_level">
                  <option value="--">Reach level</option>
                  <option value="High Reach">High Reach</option>
                  <option value="Reach">Reach</option>
                  <option value="Target">Target</option>
                  <option value="Safety">Safety</option>
                </select>
                <select className="field" defaultValue={entry.priority_level} name="priority_level">
                  <option value="--">Priority</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <select className="field" defaultValue={entry.visit_status} name="visit_status">
                <option value="Visited">Visited</option>
                <option value="Planned">Planned</option>
                <option value="No Visit">No Visit</option>
              </select>
              <textarea className="field field-textarea" defaultValue={entry.general_notes} name="general_notes" placeholder="General notes" rows={4} />
              <textarea className="field field-textarea" defaultValue={entry.academic_programs} name="academic_programs" placeholder="Academic programs" rows={3} />
              <textarea className="field field-textarea" defaultValue={entry.campus_culture} name="campus_culture" placeholder="Campus culture" rows={3} />
              <textarea className="field field-textarea" defaultValue={entry.why_us_material} name="why_us_material" placeholder="Why us material" rows={3} />
              <textarea className="field field-textarea" defaultValue={entry.personal_reflections} name="personal_reflections" placeholder="Personal reflections" rows={3} />
              <button className="button" type="submit">Save research notes</button>
            </form>
          );
        })}
      </section>
    </main>
  );
}
