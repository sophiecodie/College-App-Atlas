import { ChevronRight } from "lucide-react";
import Link from "next/link";

export type DeadlineRow = {
  slug: string;
  college: string;
  dateLabel: string;
  flag: string;
  verified: boolean;
};

export function DeadlineList({ rows }: { rows: DeadlineRow[] }) {
  return (
    <div className="deadline-list">
      {rows.map((row) => (
        <Link className="deadline-list-row" href={`/colleges/${row.slug}`} key={row.slug}>
          <span className="deadline-when">{row.dateLabel}</span>
          <span>{row.college}</span>
          <span className={`deadline-flag ${row.verified ? "" : "unverified"}`}>{row.flag}</span>
          <ChevronRight className="muted" size={16} />
        </Link>
      ))}
    </div>
  );
}
