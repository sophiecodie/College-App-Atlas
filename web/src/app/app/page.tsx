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
      <section className="app-hero">
        <div>
          <span className="eyebrow">Your Dashboard</span>
          <h1 className="page-title">
            {user.name ? `${user.name.split(" ")[0]}'s dashboard` : "Application dashboard"}
          </h1>
          <p className="lede">
            Keep track of colleges, tasks, and what to work on next.
          </p>
        </div>
        <div className="cta-row">
          <Link className="button" href="/colleges">
            Open colleges
          </Link>
          <Link className="button button-secondary" href="/essays">
            Open essays
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

      <section className="dashboard-status-strip">
        <div className="dashboard-status-item">
          <span className="stat-label">Saved colleges</span>
          <strong>{colleges.length}</strong>
        </div>
        <div className="dashboard-status-item">
          <span className="stat-label">Active tasks</span>
          <strong>{activeTasks}</strong>
        </div>
        <div className="dashboard-status-item">
          <span className="stat-label">Drafting now</span>
          <strong>{draftingColleges}</strong>
        </div>
      </section>

      <section className="two-up dashboard-lower">
        <div className="panel">
          <div className="subpanel-header">
            <strong>To-Do List</strong>
            <span className="muted">{activeTasks} active</span>
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

        <div className="panel dashboard-note-card">
          <strong>Resume where you left off</strong>
          <p className="muted">
            Your list, tasks, and essay setup are already saved. Use this page for quick triage,
            then jump back into a college or the essays workspace.
          </p>
          <div className="cta-row">
            <Link className="button button-secondary" href="/essays">
              Open essays
            </Link>
            <Link className="button button-secondary" href="/research">
              Open research
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
