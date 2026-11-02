"use client";

import { useRouter } from "next/navigation";

import { RESEARCH_SORT_OPTIONS, type SortMode } from "@/lib/research";

/** Re-sorts the research database as soon as an option is picked (as in NiceGUI). */
export function ResearchSortSelect({ value }: { value: SortMode }) {
  const router = useRouter();
  return (
    <label className="research-sort-form">
      <span className="field-label">Sort by</span>
      <select className="field compact-field" onChange={(event) => router.push(`/research?sort=${event.target.value}`)} value={value}>
        {RESEARCH_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
