import Link from "next/link";
import { notFound } from "next/navigation";

import { ResearchWorkspaceForm } from "@/app/research/research-workspace-form";
import { getUserCollegeBySlug, requireCurrentUser } from "@/lib/app-data";
import { getSortMode } from "@/lib/research";
import { defaultResearchEntry, ensureWorkspaceState, normalizeResearchData } from "@/lib/workspace-state";

export default async function ResearchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const user = await requireCurrentUser();
  const { slug } = await params;
  const { sort } = await searchParams;
  const college = await getUserCollegeBySlug(user.id, slug);

  if (!college) {
    notFound();
  }

  const workspace = await ensureWorkspaceState(user.id);
  const researchData = normalizeResearchData(workspace.researchData);
  const entry = researchData[college.slug] ?? defaultResearchEntry();
  const sortBy = getSortMode(sort);

  return (
    <main className="shell shell-wide">
      <section className="research-detail-hero panel">
        <div className="research-detail-hero-top">
          <Link className="button button-secondary" href={`/research?sort=${sortBy}`}>
            Back to research board
          </Link>
          <div className="research-workspace-summary">
            <span className="pill">{college.selectedApplicationType ?? "App type"}</span>
            <span className="pill">{college.status ?? "In Progress"}</span>
          </div>
        </div>

        <div className="research-detail-header">
          <div>
            <span className="eyebrow">College research workspace</span>
            <h1 className="page-title">{college.name}</h1>
            <p className="lede">
              A full-page space for the details you will want later when drafting essays,
              comparing fit, and making final college decisions.
            </p>
          </div>

        </div>
      </section>

      <section className="panel research-detail-workspace">
        <div className="subpanel-header">
          <div>
            <strong>Detailed notes</strong>
            <div className="muted">
              This workspace autosaves your writing and dropdown selections as you work.
            </div>
          </div>
        </div>

        <ResearchWorkspaceForm
          collegeName={college.name}
          collegeSlug={college.slug}
          collegeStatus={college.status ?? "In Progress"}
          entry={entry}
          selectedApplicationType={college.selectedApplicationType ?? "App type"}
        />
      </section>
    </main>
  );
}
