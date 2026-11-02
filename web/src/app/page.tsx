import { ArrowRight, Compass, Map, PenLine, Sprout } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Stars } from "@/components/cozy/ui";
import { ART, CAMPUS_ART } from "@/lib/illustrations";

const FEATURES = [
  {
    title: "Discover Your Story",
    body: "Plant memories, hobbies and quirks in the Idea Garden, then let AI find surprising connections worth writing about.",
    art: ART.flowers,
    icon: Sprout,
    tone: "tone-rose",
    lead: true,
  },
  {
    title: "Write Better Essays",
    body: "A calm editor with autosave, versions, outlines and feedback that asks questions instead of rewriting you.",
    art: ART.books,
    icon: PenLine,
    tone: "tone-butter",
  },
  {
    title: "Explore Colleges",
    body: "Search 5,700+ colleges and research programs, labs and clubs with sources you can check.",
    art: CAMPUS_ART.brick,
    icon: Compass,
    tone: "tone-blue",
  },
  {
    title: "Track Your Journey",
    body: "Deadlines, checklists and progress for every school on one illustrated map.",
    art: CAMPUS_ART.dome,
    icon: Map,
    tone: "tone-sage",
  },
];

const STEPS = [
  ["Tell us about you", "Your grade, the schools on your mind, and what you want help with."],
  ["Find your story", "Brainstorm in the Idea Garden and turn a theme into an outline."],
  ["Write and research", "Draft essays beside sourced research about each college."],
  ["Apply with calm", "Watch deadlines and checklists fill in on your map."],
];

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.email) {
    redirect("/app");
  }

  return (
    <div className="landing">
      <header className="landing-nav">
        <Link className="brand-mark" href="/">
          CollegeAtlas<span className="sparkle">✦</span>
        </Link>
        <nav aria-label="Site">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <Link className="cozy-button" href="/signin">
            Get started
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-sky">
          <Image alt="" fill priority sizes="100vw" src={ART.panorama.src} />
        </div>
        <Stars />
        <div className="landing-hero-copy">
          <h1>Your college journey, mapped out.</h1>
          <p>Discover your story, organize your applications, and find your path to college—all in one cozy place.</p>
          <div className="landing-ctas">
            <Link className="cozy-button large" href="/signin">
              Get started <ArrowRight size={18} />
            </Link>
            <a className="cozy-button secondary large" href="#features">
              Explore features
            </a>
          </div>
          <span className="landing-fineprint">Free · No credit card · Built for students</span>
        </div>
        <div className="sticky-note landing-note">Small steps, brighter futures. ♡</div>
        <div className="landing-desk">
          <Image alt="A cozy desk with books, a mug, a notebook and a laptop showing the CollegeAtlas map" height={ART.desk.height} priority src={ART.desk.src} width={ART.desk.width} />
        </div>
      </section>

      <section className="landing-section" id="features">
        <h2 className="landing-section-title">Everything you need, in one place.</h2>
        <p className="landing-section-sub">AI-powered brainstorming and writing at the heart, with research and tracking alongside.</p>
        <div className="landing-features">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className={`landing-feature cozy-card interactive ${feature.lead ? "lead" : ""}`} key={feature.title}>
                <div className={`landing-feature-art ${feature.tone}`}>
                  <Image alt="" height={feature.art.height} src={feature.art.src} width={feature.art.width} />
                </div>
                <h3>
                  <Icon size={18} /> {feature.title}
                </h3>
                <p>{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-section" id="how-it-works">
        <h2 className="landing-section-title">How it works</h2>
        <ol className="landing-steps">
          {STEPS.map(([title, body], index) => (
            <li className="cozy-card" key={title}>
              <span className="landing-step-number">{index + 1}</span>
              <strong>{title}</strong>
              <p>{body}</p>
            </li>
          ))}
        </ol>
        <div className="landing-final">
          <Image alt="" height={110} src={ART.flowers.src} width={94} />
          <Link className="cozy-button large" href="/signin">
            Start your journey <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <span className="brand-mark">CollegeAtlas</span>
        <span className="muted">Made for students, one small step at a time.</span>
      </footer>
    </div>
  );
}
