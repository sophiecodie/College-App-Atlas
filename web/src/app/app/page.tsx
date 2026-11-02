import { CalendarDays, CheckCircle2, Circle, ListTodo, NotebookPen, PenLine, Plus, Sprout, Telescope, Trash2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { addHomeTask, deleteHomeTask, toggleHomeTask } from "@/app/dashboard-actions";
import { CollegeCard } from "@/components/cozy/college-card";
import { DeadlineList } from "@/components/cozy/deadline-list";
import { ProgressRing } from "@/components/cozy/progress-ring";
import { CozyCard, EmptyState, IllustratedHero, QuickActionTile } from "@/components/cozy/ui";
import { db } from "@/db/client";
import { getUserColleges, requireCurrentUser } from "@/lib/app-data";
import { currentAcademicYear } from "@/lib/catalog/cycles";
import { formatDeadlineDate, getUpcomingDeadlinesForUser } from "@/lib/catalog/requirements";
import { getEssayWorkspaceForUser } from "@/lib/essays";
import { dueLabel, getCollegeProgress, greetingFor } from "@/lib/progress";
import { getEssayLibrary } from "@/lib/studio/writing";
import { ensureWorkspaceState, normalizeHomeTasks, normalizeSettingsState } from "@/lib/workspace-state";

const NOTES = ["A little progress every day.", "Small steps, big future.", "Your story is worth telling.", "One paragraph at a time."];

function relativeTime(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const [colleges, workspace, deadlines, essayGroups, library] = await Promise.all([
    getUserColleges(user.id),
    ensureWorkspaceState(user.id),
    getUpcomingDeadlinesForUser(db, user.id, currentAcademicYear()),
    getEssayWorkspaceForUser(user.id),
    getEssayLibrary(db, user.id),
  ]);
  const settings = normalizeSettingsState(workspace.settingsState);
  if (!settings.onboarding.completed && colleges.length === 0) {
    redirect("/welcome");
  }

  const tasks = normalizeHomeTasks(workspace.homeTasks);
  const openTasks = tasks.filter((task) => !task.completed);
  const prompts = essayGroups.flatMap((group) => group.prompts);
  const essaysDone = prompts.filter((prompt) => prompt.activeDraft.status === "complete").length;
  const essaysStarted = prompts.filter((prompt) => prompt.activeDraft.status !== "complete" && prompt.activeDraft.content.trim()).length;
  const essaysNotStarted = prompts.length - essaysDone - essaysStarted;
  const progress = colleges.map((college) => ({ college, ...getCollegeProgress(college) }));
  const overall = progress.length ? Math.round(progress.reduce((sum, row) => sum + row.percent, 0) / progress.length) : 0;
  const deadlineBySlug = new Map(deadlines.map((row) => [row.collegeSlug, row]));

  const firstName = settings.profile.student_name !== "Student Name" ? settings.profile.student_name.split(" ")[0] : user.name?.split(" ")[0];
  const greeting = greetingFor(settings.profile.time_zone);
  const note = NOTES[new Date().getUTCDate() % NOTES.length]!;
  const latest = [...library].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
  const continueHref = latest[0]?.promptId === "personal-statement" || !latest[0] ? "/essays?section=personal" : "/essays?section=supplemental";

  const deadlineRows = deadlines
    .filter((row) => row.officialDate || row.personalDate)
    .slice(0, 4)
    .map((row) => {
      const date = row.officialDate ?? row.personalDate!;
      const due = dueLabel(date);
      return {
        slug: row.collegeSlug,
        college: row.collegeName,
        dateLabel: formatDeadlineDate(date),
        flag: row.officialDate ? `(${due?.label ?? "Upcoming"})` : "(your date)",
        verified: Boolean(row.officialDate),
      };
    });
  const unverifiedCount = deadlines.filter((row) => !row.officialDate && !row.personalDate).length;

  return (
    <main className="shell dashboard">
      <IllustratedHero
        note={note}
        subtitle={`${colleges.length} college${colleges.length === 1 ? "" : "s"} · ${currentAcademicYear()} application season`}
        title={
          <>
            {greeting}
            {firstName ? `, ${firstName}` : ""}! <span aria-hidden="true" className="hero-sun">☀</span>
          </>
        }
      >
        <Link className="cozy-button hero-cta" href={continueHref}>
          <PenLine size={16} /> {latest[0] ? "Continue writing" : "Start your personal statement"}
        </Link>
      </IllustratedHero>

      <div className="dashboard-row">
        <CozyCard className="progress-card" icon={<CheckCircle2 size={18} />} title="Application Progress">
          <div className="progress-card-body">
            <ProgressRing label={`${overall}% of college checklists done`} value={overall} />
            <ul className="progress-legend">
              <li>
                <span className="dot done" /> {essaysDone} essays complete
              </li>
              <li>
                <span className="dot doing" /> {essaysStarted} in progress
              </li>
              <li>
                <span className="dot todo" /> {essaysNotStarted} not started
              </li>
            </ul>
          </div>
        </CozyCard>

        <CozyCard
          action={
            <Link className="subtle-link" href="/colleges">
              View all →
            </Link>
          }
          icon={<CalendarDays size={18} />}
          title="Upcoming Deadlines"
        >
          {deadlineRows.length > 0 ? <DeadlineList rows={deadlineRows} /> : <p className="muted">No dates yet. Choose a round on each college to see verified deadlines.</p>}
          {unverifiedCount > 0 ? (
            <p className="muted deadline-footnote">
              {unverifiedCount} college{unverifiedCount === 1 ? "" : "s"} without a verified date. Check the official site, or add your own date on the college page.
            </p>
          ) : null}
        </CozyCard>
      </div>

      <CozyCard
        action={
          <Link className="subtle-link" href="/colleges">
            Open map →
          </Link>
        }
        title="My Colleges"
      >
        <div className="dashboard-colleges">
          {progress.slice(0, 5).map(({ college, percent }) => {
            const deadline = deadlineBySlug.get(college.slug);
            const due = dueLabel(deadline?.officialDate ?? null);
            return (
              <CollegeCard
                college={{
                  slug: college.slug,
                  name: college.name,
                  meta: college.selectedApplicationType ?? "Round not set",
                  percent,
                  dueLabel: due?.label ?? null,
                  dueUrgent: due?.urgent,
                }}
                key={college.id}
              />
            );
          })}
          <Link className="add-college-tile" href="/colleges?view=list">
            <span className="plus">
              <Plus size={18} />
            </span>
            Add a college
          </Link>
        </div>
      </CozyCard>

      <div className="dashboard-row three">
        <CozyCard icon={<ListTodo size={18} />} title="Next Steps">
          <form action={addHomeTask} className="task-add">
            <input aria-label="New task" className="field" name="title" placeholder="Add a next step" required />
            <input aria-label="Due date" className="field" name="dueDate" type="date" />
            <button aria-label="Add task" className="cozy-button" type="submit">
              <Plus size={16} />
            </button>
          </form>
          <div className="task-list">
            {openTasks.slice(0, 6).map((task) => (
              <div className="task-item" key={task.id}>
                <form action={toggleHomeTask}>
                  <input name="taskId" type="hidden" value={task.id} />
                  <button aria-label={`Mark ${task.title} done`} className="task-check" type="submit">
                    <Circle size={18} />
                  </button>
                </form>
                <div className="task-text">
                  <strong>{task.title}</strong>
                  {task.due_date ? <span className="muted">{formatDeadlineDate(task.due_date)}</span> : null}
                </div>
                <form action={deleteHomeTask}>
                  <input name="taskId" type="hidden" value={task.id} />
                  <button aria-label={`Delete ${task.title}`} className="task-delete" type="submit">
                    <Trash2 size={15} />
                  </button>
                </form>
              </div>
            ))}
            {openTasks.length === 0 ? <p className="muted">All caught up. Add the next small step above.</p> : null}
          </div>
        </CozyCard>

        <CozyCard icon={<NotebookPen size={18} />} title="Recent Activity">
          {latest.length > 0 ? (
            <ul className="activity-list">
              {latest.map((entry) => (
                <li key={entry.draftId}>
                  <Link href={entry.promptId === "personal-statement" ? "/essays?section=personal" : "/essays?section=supplemental"}>
                    <strong>{entry.collegeName}</strong>
                    <span className="muted">
                      {entry.words} words · {relativeTime(entry.updatedAt)}
                    </span>
                    <span className="activity-prompt">{entry.promptText}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing written yet">Your latest drafts will show up here.</EmptyState>
          )}
        </CozyCard>

        <CozyCard title="Quick Actions">
          <div className="quick-tiles stacked">
            <QuickActionTile hint="Pick up your latest draft" href={continueHref} icon={<PenLine size={18} />} title="Continue writing" tone="rose" />
            <QuickActionTile hint="Find themes in your experiences" href="/essays?section=garden" icon={<Sprout size={18} />} title="Explore ideas" tone="sage" />
            <QuickActionTile hint="Programs, labs and clubs" href="/research" icon={<Telescope size={18} />} title="Research a college" tone="blue" />
            <QuickActionTile hint="Deadlines and checklists" href="/colleges" icon={<CalendarDays size={18} />} title="Open my map" tone="butter" />
          </div>
        </CozyCard>
      </div>
    </main>
  );
}
