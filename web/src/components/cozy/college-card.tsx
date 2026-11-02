import Image from "next/image";
import Link from "next/link";

import { ProgressBar } from "@/components/cozy/progress-ring";
import { campusArtFor } from "@/lib/illustrations";

export type CollegeCardData = {
  slug: string;
  name: string;
  meta?: string;
  percent: number;
  dueLabel?: string | null;
  dueUrgent?: boolean;
};

export function CollegeCard({ college }: { college: CollegeCardData }) {
  const art = campusArtFor(college.slug);
  return (
    <Link className="college-card cozy-card interactive" href={`/colleges/${college.slug}`} style={{ padding: 0 }}>
      <div className="college-card-art">
        <Image alt="" fill sizes="(max-width: 900px) 100vw, 320px" src={art.src} />
        {college.dueLabel ? <span className={`due-badge ${college.dueUrgent ? "" : "calm"}`}>{college.dueLabel}</span> : null}
      </div>
      <div className="college-card-body">
        <div className="college-card-title">
          <strong>{college.name}</strong>
        </div>
        {college.meta ? <span className="college-card-meta">{college.meta}</span> : null}
        <div className="college-card-progress">
          <ProgressBar value={college.percent} />
          <span>{college.percent}%</span>
        </div>
      </div>
    </Link>
  );
}
