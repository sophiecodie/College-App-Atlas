import { List, Map as MapIcon } from "lucide-react";
import Link from "next/link";

import { CampusMap, MapLegend, type MapCollege } from "@/app/colleges/campus-map";
import { CollegePicker } from "@/app/colleges/college-picker";
import { CollegeCard } from "@/components/cozy/college-card";
import { CozyCard, EmptyState, PageHeader } from "@/components/cozy/ui";
import { db } from "@/db/client";
import { getUserColleges, requireCurrentUser } from "@/lib/app-data";
import { APPLICATION_TYPE_OPTIONS, currentAcademicYear } from "@/lib/catalog/cycles";
import { getUpcomingDeadlinesForUser } from "@/lib/catalog/requirements";
import { listStates } from "@/lib/catalog/search";
import { dueLabel, getCollegeProgress } from "@/lib/progress";

export default async function CollegesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requireCurrentUser();
  const { view: requestedView } = await searchParams;
  const [savedColleges, states, deadlines] = await Promise.all([
    getUserColleges(user.id),
    listStates(db),
    getUpcomingDeadlinesForUser(db, user.id, currentAcademicYear()),
  ]);
  const view = requestedView === "list" || savedColleges.length === 0 ? "list" : "map";
  const deadlineBySlug = new Map(deadlines.map((row) => [row.collegeSlug, row]));

  // Map order follows the journey: soonest official deadline first.
  const rows = savedColleges
    .map((college) => {
      const deadline = deadlineBySlug.get(college.slug);
      const due = dueLabel(deadline?.officialDate ?? null);
      const { percent } = getCollegeProgress(college);
      const status: MapCollege["status"] =
        college.status === "Submitted" ? "completed" : due?.urgent ? "due_soon" : percent > 20 ? "in_progress" : "not_started";
      return { college, percent, due, status, sortKey: deadline?.officialDate ?? deadline?.personalDate ?? "9999" };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.college.name.localeCompare(b.college.name));

  const counts = { due_soon: 0, in_progress: 0, not_started: 0, completed: 0 };
  for (const row of rows) counts[row.status] += 1;

  return (
    <main className="shell shell-wide">
      <PageHeader
        actions={
          <div className="view-toggle" role="tablist">
            <Link aria-selected={view === "map"} className={view === "map" ? "active" : ""} href="/colleges?view=map" role="tab">
              <MapIcon size={15} /> Map view
            </Link>
            <Link aria-selected={view === "list"} className={view === "list" ? "active" : ""} href="/colleges?view=list" role="tab">
              <List size={15} /> List view
            </Link>
          </div>
        }
        description="Explore and track your application journey."
        title="My Colleges"
      />

      {view === "map" ? (
        <section className="map-layout">
          <aside className="map-side">
            <CozyCard title="Your journey">
              <MapLegend counts={counts} />
            </CozyCard>
            <Link className="cozy-button secondary" href="/colleges?view=list">
              + Add a college
            </Link>
            <p className="muted map-hint">Drag to explore, scroll or pinch to zoom, and click a school to open it.</p>
          </aside>
          <CampusMap
            colleges={rows.map((row) => ({
              slug: row.college.slug,
              name: row.college.name,
              percent: row.percent,
              dueLabel: row.due?.label ?? null,
              status: row.status,
            }))}
          />
        </section>
      ) : (
        <>
          <CozyCard className="picker-card" title="Add a college">
            <p className="muted picker-note">Not every school uses the Common App or asks for supplements.</p>
            <CollegePicker roundOptions={APPLICATION_TYPE_OPTIONS} states={states} />
          </CozyCard>

          <CozyCard title={`${savedColleges.length} college${savedColleges.length === 1 ? "" : "s"} in your list`}>
            {rows.length > 0 ? (
              <div className="colleges-grid">
                {rows.map(({ college, percent, due }) => (
                  <CollegeCard
                    college={{
                      slug: college.slug,
                      name: college.name,
                      meta: [[college.city, college.state].filter(Boolean).join(", "), college.selectedApplicationType ?? "Round not set", `${college.promptCount} prompts`]
                        .filter(Boolean)
                        .join(" · "),
                      percent,
                      dueLabel: due?.label ?? null,
                      dueUrgent: due?.urgent,
                    }}
                    key={college.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="No colleges yet">Search above and press + to start your journey.</EmptyState>
            )}
          </CozyCard>
        </>
      )}
    </main>
  );
}
