import Link from "next/link";

import { addHomeTask, deleteHomeTask, toggleHomeTask } from "@/app/dashboard-actions";
import { getUserColleges, requireCurrentUser } from "@/lib/app-data";
import { ensureWorkspaceState, normalizeHomeTasks } from "@/lib/workspace-state";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const [colleges, workspace] = await Promise.all([
    getUserColleges(user.id),
    ensureWorkspaceState(user.id),
  ]);
  const tasks = normalizeHomeTasks(workspace.homeTasks);

  return (
    <main className="shell">
      <section className="app-hero">
        <div>
          <span className="eyebrow">Your Dashboard</span>
          <h1 className="page-title">
            {user.name ? `${user.name.split(" ")[0]}'s application dashboard` : "Your application dashboard"}
          </h1>
          <p className="lede">
            This is the first real replacement slice of the NiceGUI app. Your college list now
            belongs to your signed-in account, not a local JSON file.
          </p>
        </div>
        <div className="cta-row">
          <Link className="button" href="/colleges">
            Manage colleges
          </Link>
          <Link className="button button-secondary" href="/essays">
            Essays coming next
          </Link>
        </div>
      </section>

      <section className="card-grid">
        {colleges.length > 0 ? (
          colleges.map((college) => (
            <Link className="panel college-card" href={`/colleges/${college.slug}`} key={college.id}>
              <div className="college-card-top">
                <div>
                  <h2>{college.name}</h2>
                  <p className="muted">{college.selectedApplicationType ?? "Application type not set"}</p>
                </div>
                <span className="pill">{college.status ?? "In Progress"}</span>
              </div>
              <div className="metric-row">
                <div className="metric">
                  <span className="stat-label">Cycle</span>
                  <strong>{college.applicationCycle ?? "TBD"}</strong>
                </div>
                <div className="metric">
                  <span className="stat-label">Prompts</span>
                  <strong>{college.promptCount}</strong>
                </div>
                <div className="metric">
                  <span className="stat-label">Track</span>
                  <strong>{college.programSelection ?? "general"}</strong>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="panel empty-panel">
            <strong>No colleges yet</strong>
            <p className="muted">
              Start by adding your first college in the new web app. That gives us the real
              signed-in data loop we need before we rebuild essays.
            </p>
            <Link className="button" href="/colleges">
              Add your first college
            </Link>
          </div>
        )}
      </section>

      <section className="two-up dashboard-lower">
        <div className="panel">
          <div className="subpanel-header">
            <strong>To-Do List</strong>
            <span className="muted">{tasks.filter((task) => !task.completed).length} active</span>
          </div>
          <form action={addHomeTask} className="quick-task-row">
            <input className="field" name="title" placeholder="Quick add" />
            <input className="field" name="dueDate" type="date" />
            <select className="field" defaultValue="" name="priority">
              <option value="">Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <button className="button" type="submit">
              Add
            </button>
          </form>
          <div className="snapshot-list">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div className={`task-row ${task.completed ? "completed" : ""}`} key={task.id}>
                  <form action={toggleHomeTask}>
                    <input name="taskId" type="hidden" value={task.id} />
                    <button className="task-toggle" type="submit">
                      {task.completed ? "✓" : "○"}
                    </button>
                  </form>
                  <div className="task-main">
                    <strong>{task.title}</strong>
                    <div className="muted">
                      {task.due_date || "No due date"} {task.priority ? `· ${task.priority}` : ""}
                    </div>
                  </div>
                  <form action={deleteHomeTask}>
                    <input name="taskId" type="hidden" value={task.id} />
                    <button className="button button-secondary" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p className="muted">No tasks yet. Add the next thing that matters.</p>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="subpanel-header">
            <strong>Workspace status</strong>
            <span className="pill">Live</span>
          </div>
          <div className="stack">
            <div className="check">Colleges are persisted to Neon.</div>
            <div className="check">Prompt selections are now persisted per user.</div>
            <div className="check">Home tasks are now persisted too.</div>
            <div className="check">Next I am tightening research, college planning, settings, and activities into a cleaner workflow.</div>
          </div>
        </div>
      </section>
    </main>
  );
}
