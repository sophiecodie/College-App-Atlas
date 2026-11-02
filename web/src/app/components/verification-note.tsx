import { VERIFICATION_LABELS } from "@/lib/prompts-shared";

/**
 * Status line for shared catalog data. Verified data reads as authoritative; anything else says so and
 * points to the school's official page.
 */
export function VerificationNote({
  status,
  sourceUrl,
  officialUrl,
  staleReason,
  compact = false,
}: {
  status: string;
  sourceUrl?: string | null;
  officialUrl?: string | null;
  staleReason?: string | null;
  compact?: boolean;
}) {
  const link = sourceUrl ?? officialUrl ?? null;

  if (status === "verified" && !staleReason) {
    return compact ? (
      <span className="pill pill-verified">Verified</span>
    ) : (
      <span className="verification-note verified">
        Verified from the official site
        {link ? (
          <>
            {" · "}
            <a href={link} rel="noreferrer" target="_blank">
              source
            </a>
          </>
        ) : null}
      </span>
    );
  }

  const label = staleReason ? "Re-checking: the official page changed" : VERIFICATION_LABELS[status] ?? "Not verified";

  if (compact) {
    return <span className="pill pill-unverified">{label}</span>;
  }

  return (
    <span className="verification-note unverified">
      {label}. Confirm the exact wording and limits on the school&apos;s official site
      {link ? (
        <>
          {": "}
          <a href={link} rel="noreferrer" target="_blank">
            open official page
          </a>
        </>
      ) : null}
      .
    </span>
  );
}
