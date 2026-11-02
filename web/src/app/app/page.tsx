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
  const activeTasks = tasks.filter((task) => !task.completed).length;
  const draftingColleges = colleges.filter((college) => college.status === "Drafting").length;

  return (
    <main className="shell">
      <section className="workspace-header">
        <div>
          <span className="eyebrow">Today</span>
          <h1 className="page-title">
            {user.name ? `Hi, ${user.name.split(" ")[0]}` : "Application map"}
          </h1>
          <p className="lede">
            Pick one next move, then jump straight into a school, essay, or task.
          </p>
        </div>
        <div className="workspace-actions">
          <Link className="button button-secondary" href="/colleges">
            Colleges
          </Link>
          <Link className="button button-secondary" href="/essays">
            Essays
          </Link>
          <Link className="button button-secondary" href="/research">
            Research
          </Link>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-main">
          <section className="panel focus-panel">
            <div className="section-heading-row">
              <div>
                <span className="section-kicker">Focus</span>
                <h2 className="section-title">Your application map</h2>
              </div>
            </div>
            <p className="muted focus-copy">
              Keep the process small: one school, one task, or one essay move at a time.
            </p>
            <div className="dashboard-status-strip">
              <div className="dashboard-status-item">
                <span className="stat-label">Schools</span>
                <strong>{colleges.length}</strong>
              </div>
              <div className="dashboard-status-item">
                <span className="stat-label">Open moves</span>
                <strong>{activeTasks}</strong>
              </div>
              <div className="dashboard-status-item">
                <span className="stat-label">Drafting</span>
                <strong>{draftingColleges}</strong>
              </div>
            </div>
          </section>

          <section className="panel dashboard-route-panel">
            <div className="section-heading-row">
              <div>
                <span className="section-kicker">Schools</span>
                <h2 className="section-title">Jump into a college</h2>
              </div>
              <Link className="subtle-link" href="/colleges">
                Open full list
              </Link>
            </div>

            {colleges.length > 0 ? (
              <div className="dashboard-college-list">
                {colleges.map((college) => (
                  <Link className="dashboard-college-row" href={`/colleges/${college.slug}`} key={college.id}>
                    <div className="dashboard-college-main">
                      <strong>{college.name}</strong>
                      <span className="muted">
                        {college.selectedApplicationType ?? "Application type pending"} · {college.promptCount} prompts
                      </span>
                    </div>
                    <span className="pill">{college.status ?? "In Progress"}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-panel">
                <strong>No colleges yet</strong>
                <p className="muted">Start by adding your first school so the rest of the workspace has somewhere to point.</p>
                <Link className="button" href="/colleges">
                  Add your first college
                </Link>
              </div>
            )}
          </section>
        </div>

        <aside className="dashboard-sidebar">
          <section className="panel">
            <div className="section-heading-row">
              <div>
                <span className="section-kicker">Tasks</span>
                <h2 className="section-title">Next steps</h2>
              </div>
              <span className="muted">{activeTasks} active</span>
            </div>
            <form action={addHomeTask} className="quick-task-row">
              <input className="field" name="title" placeholder="Add a next step" />
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
                <p className="muted">No tasks yet. Add the next move that matters.</p>
              )}
            </div>
          </section>

          <section className="panel dashboard-note-card">
            <span className="section-kicker">Shortcuts</span>
            <h2 className="section-title">Pick up where you left off</h2>
            <p className="muted">
              Jump back into essays or research without hunting through the app.
            </p>
            <div className="workspace-actions workspace-actions-stack">
              <Link className="button button-secondary" href="/essays">
                Open essays
              </Link>
              <Link className="button button-secondary" href="/research">
                Open research
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
