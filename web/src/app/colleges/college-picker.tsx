"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { addCollegeToDashboard } from "@/app/app/actions";
import type { CollegeSearchResult } from "@/lib/catalog/search";

const LEVELS: Array<[string, string]> = [
  ["four_year", "4-year"],
  ["two_year", "2-year"],
  ["", "All levels"],
];
const CONTROLS: Array<[string, string]> = [
  ["", "Public & private"],
  ["public", "Public"],
  ["private_nonprofit", "Private nonprofit"],
  ["private_for_profit", "Private for-profit"],
];

type Props = {
  states: string[];
  roundOptions: string[];
};

/** Searchable, scrollable select over the shared college directory. */
export function CollegePicker({ states, roundOptions }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [level, setLevel] = useState("four_year");
  const [control, setControl] = useState("");
  const [round, setRound] = useState(roundOptions[0] ?? "Regular Decision");
  const [results, setResults] = useState<CollegeSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [adding, setAdding] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      const params = new URLSearchParams({ q: query, state, level, control, page: String(page) });
      try {
        const response = await fetch(`/api/colleges/search?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { results: CollegeSearchResult[]; total: number };
        setResults((current) => (page === 1 ? body.results : [...current, ...body.results]));
        setTotal(body.total);
        setStatus("idle");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("error");
      }
    }, page === 1 ? 220 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, state, level, control, page, attempt]);

  function resetAnd(update: () => void) {
    update();
    setPage(1);
    listRef.current?.scrollTo({ top: 0 });
  }

  function onScroll(event: React.UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    if (status === "idle" && results.length < total && el.scrollTop + el.clientHeight > el.scrollHeight - 60) {
      setPage((value) => value + 1);
    }
  }

  function add(college: CollegeSearchResult) {
    setAdding(college.slug);
    const formData = new FormData();
    formData.set("collegeSlug", college.slug);
    formData.set("selectedApplicationType", round);
    startTransition(async () => {
      await addCollegeToDashboard(formData);
      setResults((current) => current.map((row) => (row.slug === college.slug ? { ...row, inList: true } : row)));
      setAdding(null);
      router.refresh();
    });
  }

  return (
    <div className="college-picker">
      <div className="college-picker-controls">
        <input
          aria-label="Search colleges"
          className="field college-picker-input"
          onChange={(event) => resetAnd(() => setQuery(event.target.value))}
          placeholder="Search 5,700+ colleges by name, nickname, or city"
          type="search"
          value={query}
        />
        <select aria-label="State" className="field" onChange={(e) => resetAnd(() => setState(e.target.value))} value={state}>
          <option value="">All states</option>
          {states.map((code) => (
            <option key={code}>{code}</option>
          ))}
        </select>
        <select aria-label="Level" className="field" onChange={(e) => resetAnd(() => setLevel(e.target.value))} value={level}>
          {LEVELS.map(([value, label]) => (
            <option key={label} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select aria-label="Public or private" className="field" onChange={(e) => resetAnd(() => setControl(e.target.value))} value={control}>
          {CONTROLS.map(([value, label]) => (
            <option key={label} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select aria-label="Round for new colleges" className="field" onChange={(e) => setRound(e.target.value)} value={round}>
          {roundOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div aria-label="College results" className="college-picker-list" onScroll={onScroll} ref={listRef} role="listbox">
        {results.map((college) => (
          <div className="college-picker-row" key={college.id} role="option" aria-selected={college.inList}>
            <div className="college-picker-main">
              <strong>{college.name}</strong>
              <span className="muted">
                {[college.city, college.state].filter(Boolean).join(", ") || "Location not reported"}
                {college.admissionRate !== null ? ` · ${(Number(college.admissionRate) * 100).toFixed(1)}% admit` : ""}
                {college.undergradEnrollment !== null ? ` · ${college.undergradEnrollment.toLocaleString()} undergrads` : ""}
              </span>
            </div>
            {college.inList ? (
              <a className="chip" href={`/colleges/${college.slug}`}>
                In list · open
              </a>
            ) : (
              <button className="plus-square" disabled={adding === college.slug} onClick={() => add(college)} title={`Add ${college.name}`} type="button">
                {adding === college.slug ? "…" : "+"}
              </button>
            )}
          </div>
        ))}
        {status === "loading" ? <div className="college-picker-status muted">Searching…</div> : null}
        {status === "error" ? (
          <div className="college-picker-status">
            Search failed.{" "}
            <button className="subtle-link" onClick={() => setAttempt((value) => value + 1)} type="button">
              Try again
            </button>
          </div>
        ) : null}
        {status === "idle" && results.length === 0 ? (
          <div className="college-picker-status muted">No colleges match. Try a nickname like “UCLA” or clear a filter.</div>
        ) : null}
      </div>
      <div className="college-picker-footer muted">
        {total.toLocaleString()} matches · Directory from NCES IPEDS and College Scorecard
      </div>
    </div>
  );
}
