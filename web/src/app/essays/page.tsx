import Link from "next/link";

import { getUserColleges, requireCurrentUser } from "@/lib/app-data";
import { getCollegePromptsForUser, promptIsActive, promptLimitLabel } from "@/lib/prompts";

export default async function EssaysPage() {
  const user = await requireCurrentUser();
  const colleges = await getUserColleges(user.id);
  const promptGroups = await Promise.all(
    colleges.map(async (college) => ({
      college,
      prompts: (await getCollegePromptsForUser(user.id, college.slug)).filter((prompt) =>
        promptIsActive(college.programSelection, prompt),
      ),
    })),
  );
  const activeGroups = promptGroups.filter((group) => group.prompts.length > 0);

  return (
    <main className="shell">
      <section className="page-header-row">
        <div>
          <span className="eyebrow">Essays</span>
          <h1 className="page-title">Essay workspace</h1>
          <p className="lede">
            This page now follows the NiceGUI rule that only active prompts should appear in the
            shared essays workspace.
          </p>
        </div>
      </section>

      {activeGroups.length > 0 ? (
        <section className="stack">
          {activeGroups.map(({ college, prompts }) => (
            <div className="panel" key={college.slug}>
              <div className="subpanel-header">
                <strong>{college.name}</strong>
                <span className="pill">
                  {college.programSelection ?? "general"} · {prompts.length} active
                </span>
              </div>
              <div className="snapshot-list">
                {prompts.map((prompt) => (
                  <div className="prompt-card" key={prompt.promptId}>
                    <div>
                      <strong>{prompt.promptText}</strong>
                      <div className="muted">
                        {promptLimitLabel(prompt)} · {prompt.primaryTag ?? "Other"}
                      </div>
                    </div>
                    <Link className="button button-secondary" href={`/colleges/${college.slug}?tab=essays`}>
                      Open on college page
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <div className="panel empty-panel">
          <strong>No active prompts yet</strong>
          <p className="muted">
            Go to a college page, open the Essays tab, and include the optional prompts you want.
            Required prompts will appear automatically.
          </p>
          <Link className="button" href="/colleges">
            Open colleges
          </Link>
        </div>
      )}
    </main>
  );
}
