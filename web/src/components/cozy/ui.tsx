import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { ART } from "@/lib/illustrations";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  art,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  art?: { src: string; width: number; height: number };
}) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="page-title">
          {title} <span className="title-sparkle" aria-hidden="true">✦</span>
        </h1>
        {description ? <p className="lede">{description}</p> : null}
        {actions ? <div className="page-header-actions">{actions}</div> : null}
      </div>
      {art ? <Image alt="" className="page-header-art" height={art.height} src={art.src} width={art.width} /> : null}
    </header>
  );
}

export function IllustratedHero({ title, subtitle, note, children }: { title: ReactNode; subtitle?: ReactNode; note?: string; children?: ReactNode }) {
  return (
    <section className="illustrated-hero">
      <div className="illustrated-hero-art">
        <Image alt="" fill priority sizes="(max-width: 900px) 100vw, 1200px" src={ART.panorama.src} />
      </div>
      <Stars />
      <div className="illustrated-hero-content">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
        {children}
      </div>
      {note ? <div className="sticky-note">“{note}”</div> : null}
    </section>
  );
}

export function Stars() {
  return (
    <>
      <span aria-hidden="true" className="star twinkle" style={{ top: "18%", left: "56%", fontSize: 14 }}>✦</span>
      <span aria-hidden="true" className="star twinkle delay" style={{ top: "34%", left: "64%", fontSize: 10 }}>✦</span>
    </>
  );
}

export function CozyCard({ title, icon, action, className = "", children }: { title?: ReactNode; icon?: ReactNode; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`cozy-card ${className}`}>
      {title ? (
        <div className="card-heading">
          <h2>
            {icon ? <span className="icon">{icon}</span> : null} {title}
          </h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function QuickActionTile({ href, icon, title, hint, tone }: { href: string; icon: ReactNode; title: string; hint: string; tone: "rose" | "blue" | "sage" | "butter" }) {
  return (
    <Link className={`quick-tile tone-${tone}`} href={href}>
      <span className="tile-icon">{icon}</span>
      <strong>{title}</strong>
      <span>{hint}</span>
    </Link>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <Image alt="" height={ART.flowers.height} src={ART.flowers.src} width={ART.flowers.width} />
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div aria-live="polite" className="loading-state">
      <Image alt="" className="loading-flowers" height={ART.flowers.height} src={ART.flowers.src} width={ART.flowers.width} />
      <span>{label}</span>
    </div>
  );
}
