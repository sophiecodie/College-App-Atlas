import { inArray } from "drizzle-orm";

import { OnboardingFlow } from "@/app/welcome/onboarding-flow";
import { db } from "@/db/client";
import { colleges } from "@/db/schema";
import { getUserColleges, requireCurrentUser } from "@/lib/app-data";
import { ensureWorkspaceState, normalizeSettingsState } from "@/lib/workspace-state";

// Harvard, Stanford, MIT, Yale, Princeton, Columbia, UPenn, Duke, Cornell (IPEDS UNITIDs).
const POPULAR_UNITIDS = [166027, 243744, 166683, 130794, 186131, 190150, 215062, 198419, 190415];

const SHORT_NAMES: Record<number, string> = {
  166027: "Harvard",
  243744: "Stanford",
  166683: "MIT",
  130794: "Yale",
  186131: "Princeton",
  190150: "Columbia",
  215062: "UPenn",
  198419: "Duke",
  190415: "Cornell",
};

export default async function WelcomePage() {
  const user = await requireCurrentUser();
  const [workspace, saved, popularRows] = await Promise.all([
    ensureWorkspaceState(user.id),
    getUserColleges(user.id),
    db.select({ slug: colleges.slug, unitid: colleges.ipedsUnitid }).from(colleges).where(inArray(colleges.ipedsUnitid, POPULAR_UNITIDS)),
  ]);
  const settings = normalizeSettingsState(workspace.settingsState);
  const popular = POPULAR_UNITIDS.map((id) => popularRows.find((row) => row.unitid === id))
    .filter((row): row is { slug: string; unitid: number } => Boolean(row))
    .map((row) => ({ slug: row.slug, name: SHORT_NAMES[row.unitid] ?? row.slug }));

  return (
    <OnboardingFlow
      initial={{
        name: settings.profile.student_name === "Student Name" ? user.name ?? "" : settings.profile.student_name,
        grade: settings.onboarding.grade,
        location: settings.onboarding.location,
        focus: settings.onboarding.focus,
        interests: settings.onboarding.interests,
      }}
      popular={popular}
      savedSlugs={saved.map((row) => row.slug)}
    />
  );
}
