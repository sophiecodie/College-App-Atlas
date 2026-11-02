"use client";

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  CircleDollarSign,
  FileText,
  GraduationCap,
  Heart,
  Lightbulb,
  Plus,
  Search,
  Check,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { completeOnboardingAction } from "@/app/welcome/actions";
import { ART } from "@/lib/illustrations";

type Initial = { name: string; grade: string; location: string; focus: string[]; interests: string[] };
type Props = { initial: Initial; popular: Array<{ slug: string; name: string }>; savedSlugs: string[] };

const GRADES = ["9th grade", "10th grade", "11th grade", "12th grade", "Gap year", "Transfer student"];
const FOCUS = [
  { id: "Essays", icon: FileText },
  { id: "Deadlines", icon: CalendarDays },
  { id: "Research", icon: Search },
  { id: "Majors & Programs", icon: GraduationCap },
  { id: "Application Tracking", icon: BarChart3 },
  { id: "Extracurriculars", icon: Lightbulb },
  { id: "Recommendations", icon: Heart },
  { id: "Financial Aid", icon: CircleDollarSign },
  { id: "Personal Notes", icon: BookOpen },
] as const;
const STEPS = 5;

export function OnboardingFlow({ initial, popular, savedSlugs }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState({ ...initial, interestsText: initial.interests.join(", ") });
  const [picked, setPicked] = useState<Array<{ slug: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(Math.max(0, Math.min(STEPS - 1, next)));
  }

  function togglePicked(college: { slug: string; name: string }) {
    setPicked((current) =>
      current.some((row) => row.slug === college.slug) ? current.filter((row) => row.slug !== college.slug) : [...current, college],
    );
  }

  function finish() {
    setError(null);
    startTransition(async () => {
      try {
        await completeOnboardingAction({
          name: form.name,
          grade: form.grade,
          location: form.location,
          colleges: picked.map((row) => row.slug),
          focus: form.focus as never,
          interests: form.interestsText.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 8),
        });
        router.push("/app");
        router.refresh();
      } catch {
        setError("Something went wrong saving your answers. Please try again.");
      }
    });
  }

  return (
    <main className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-top">
          {step > 0 && step < STEPS - 1 ? (
            <button aria-label="Back" className="onboarding-back" onClick={() => go(step - 1)} type="button">
              <ChevronLeft size={20} />
            </button>
          ) : (
            <span style={{ width: 32 }} />
          )}
          <div aria-label={`Step ${step + 1} of ${STEPS}`} className="onboarding-progress" role="progressbar">
            {Array.from({ length: STEPS - 1 }, (_, index) => (
              <span className="onboarding-progress-segment" key={index}>
                <motion.span animate={{ scaleX: step > index ? 1 : 0 }} initial={false} transition={{ duration: 0.35 }} />
                <motion.i animate={{ scale: step >= index ? 1 : 0.7, backgroundColor: step >= index ? "#D58D9A" : "#E8D8CF" }} initial={false} />
              </span>
            ))}
          </div>
          <span style={{ width: 32 }} />
        </div>

        <AnimatePresence custom={direction} initial={false} mode="wait">
          <motion.section
            animate={{ opacity: 1, x: 0 }}
            className="onboarding-step"
            custom={direction}
            exit={{ opacity: 0, x: -24 * direction }}
            initial={{ opacity: 0, x: 24 * direction }}
            key={step}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 ? (
              <>
                <h1>Hi there! 👋</h1>
                <p className="muted">Let&apos;s get to know you.</p>
                <label className="field-label" htmlFor="ob-name">What&apos;s your name?</label>
                <input autoFocus className="field" id="ob-name" maxLength={80} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" value={form.name} />
                <label className="field-label" htmlFor="ob-grade">What grade are you in?</label>
                <select className="field" id="ob-grade" onChange={(event) => setForm({ ...form, grade: event.target.value })} value={form.grade}>
                  <option value="">Select grade</option>
                  {GRADES.map((grade) => (
                    <option key={grade}>{grade}</option>
                  ))}
                </select>
                <label className="field-label" htmlFor="ob-location">Where are you located? <span className="muted">(optional)</span></label>
                <input className="field" id="ob-location" maxLength={80} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="City, state, or country" value={form.location} />
                <div className="onboarding-actions">
                  <button className="cozy-button large" onClick={() => go(1)} type="button">
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <h1>Which colleges are you interested in?</h1>
                <p className="muted">You can add more later.</p>
                <CollegeSearch onPick={togglePicked} picked={picked} savedSlugs={savedSlugs} />
                <span className="field-label">Popular schools</span>
                <div className="onboarding-chips">
                  {popular.map((college) => {
                    const chosen = picked.some((row) => row.slug === college.slug) || savedSlugs.includes(college.slug);
                    return (
                      <button
                        aria-pressed={chosen}
                        className={`onboarding-chip ${chosen ? "chosen" : ""}`}
                        disabled={savedSlugs.includes(college.slug)}
                        key={college.slug}
                        onClick={() => togglePicked(college)}
                        type="button"
                      >
                        {college.name} {chosen ? <Check size={14} /> : <Plus size={14} />}
                      </button>
                    );
                  })}
                </div>
                {picked.length > 0 ? <p className="muted">Adding: {picked.map((row) => row.name).join(", ")}</p> : null}
                <div className="onboarding-actions">
                  <button className="cozy-button ghost" onClick={() => go(2)} type="button">
                    Skip for now
                  </button>
                  <button className="cozy-button large" onClick={() => go(2)} type="button">
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h1>What do you want to focus on?</h1>
                <p className="muted">Choose as many as you&apos;d like.</p>
                <div className="onboarding-focus">
                  {FOCUS.map(({ id, icon: Icon }) => {
                    const chosen = form.focus.includes(id);
                    return (
                      <motion.button
                        aria-pressed={chosen}
                        className={`onboarding-focus-tile ${chosen ? "chosen" : ""}`}
                        key={id}
                        onClick={() => setForm({ ...form, focus: chosen ? form.focus.filter((item) => item !== id) : [...form.focus, id] })}
                        type="button"
                        whileTap={{ scale: 0.96 }}
                      >
                        {chosen ? <span className="onboarding-check"><Check size={12} /></span> : null}
                        <Icon size={22} strokeWidth={1.6} />
                        <span>{id}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="onboarding-actions">
                  <button className="cozy-button ghost" onClick={() => go(3)} type="button">
                    Skip
                  </button>
                  <button className="cozy-button large" onClick={() => go(3)} type="button">
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h1>What are you curious about?</h1>
                <p className="muted">Optional. These seed your Idea Garden and college research, and you can change them anytime.</p>
                <textarea
                  className="field field-textarea"
                  maxLength={500}
                  onChange={(event) => setForm({ ...form, interestsText: event.target.value })}
                  placeholder="e.g. neuroscience, ceramics, debate, undergraduate research"
                  rows={4}
                  value={form.interestsText}
                />
                <span className="muted onboarding-hint">Separate interests with commas (up to 8).</span>
                <div className="onboarding-actions">
                  <button className="cozy-button ghost" onClick={() => go(4)} type="button">
                    Skip
                  </button>
                  <button className="cozy-button large" onClick={() => go(4)} type="button">
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <div className="onboarding-finish">
                <Image alt="" className="onboarding-signpost" height={ART.signpost.height} src={ART.signpost.src} width={ART.signpost.width} />
                <h1>You&apos;re all set! ✨</h1>
                <p className="muted">Let&apos;s make your college journey a little clearer, calmer, and more you.</p>
                {error ? <div className="essay-error-banner">{error}</div> : null}
                <div className="onboarding-actions center">
                  <button className="cozy-button ghost" disabled={pending} onClick={() => go(3)} type="button">
                    Back
                  </button>
                  <button className="cozy-button large" disabled={pending} onClick={finish} type="button">
                    {pending ? "Setting things up…" : "Go to my dashboard"} <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            ) : null}
          </motion.section>
        </AnimatePresence>

        <Image alt="" className="onboarding-books" height={ART.books.height} src={ART.books.src} width={ART.books.width} />
        <Image alt="" className="onboarding-flowers" height={ART.flowers.height} src={ART.flowers.src} width={ART.flowers.width} />
      </div>
    </main>
  );
}

function CollegeSearch({
  picked,
  savedSlugs,
  onPick,
}: {
  picked: Array<{ slug: string; name: string }>;
  savedSlugs: string[];
  onPick: (college: { slug: string; name: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ slug: string; name: string; city: string | null; state: string | null }>>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(`/api/colleges/search?q=${encodeURIComponent(query)}&level=`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const body = (await response.json()) as { results: Array<{ slug: string; name: string; city: string | null; state: string | null }> };
        setResults(body.results.slice(0, 6));
        setStatus("idle");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("error");
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="onboarding-search">
      <div className="onboarding-search-box">
        <Search className="muted" size={16} />
        <input aria-label="Search for a college" onChange={(event) => setQuery(event.target.value)} placeholder="Search for a college…" type="search" value={query} />
      </div>
      {results.length > 0 || status !== "idle" ? (
        <div className="onboarding-search-results">
          {status === "loading" ? <span className="muted">Searching…</span> : null}
          {status === "error" ? <span className="muted">Search isn&apos;t available right now.</span> : null}
          {results.map((college) => {
            const chosen = picked.some((row) => row.slug === college.slug) || savedSlugs.includes(college.slug);
            return (
              <button className={`onboarding-result ${chosen ? "chosen" : ""}`} disabled={savedSlugs.includes(college.slug)} key={college.slug} onClick={() => onPick({ slug: college.slug, name: college.name })} type="button">
                <span>
                  <strong>{college.name}</strong>
                  <span className="muted">{[college.city, college.state].filter(Boolean).join(", ")}</span>
                </span>
                {chosen ? <Check size={16} /> : <Plus size={16} />}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
