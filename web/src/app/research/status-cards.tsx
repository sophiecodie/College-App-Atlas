"use client";

import { useState, useTransition } from "react";

import { updateResearchEntry } from "@/app/workspace-actions";

type Props = {
  collegeSlug: string;
  location: string;
  priority: string;
  reach: string;
  visit: string;
};

const FIELDS = [
  { key: "priority_level", label: "Priority", options: ["--", "High", "Medium", "Low"] },
  { key: "reach_level", label: "Reach Level", options: ["--", "High Reach", "Reach", "Target", "Safety"] },
  { key: "visit_status", label: "Visit Status", options: ["Visited", "Planned", "No Visit"] },
] as const;

/** The four NiceGUI research status cards; each change saves to the existing research notes. */
export function ResearchStatusCards({ collegeSlug, location, priority, reach, visit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({
    location,
    priority_level: priority,
    reach_level: reach,
    visit_status: visit,
  });
  const [saved, setSaved] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function save(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    const formData = new FormData();
    formData.set("collegeSlug", collegeSlug);
    formData.set(key, value);
    startTransition(async () => {
      await updateResearchEntry(formData);
      setSaved(key);
      setTimeout(() => setSaved((current) => (current === key ? null : current)), 1500);
    });
  }

  return (
    <div className="research-status-grid">
      <label className="research-status-card">
        <span className="research-status-label">Location {saved === "location" ? <em>saved</em> : null}</span>
        <input
          className="field"
          onBlur={(event) => event.target.value !== location && save("location", event.target.value)}
          onChange={(event) => setValues((current) => ({ ...current, location: event.target.value }))}
          value={values.location}
        />
      </label>
      {FIELDS.map((field) => (
        <label className="research-status-card" key={field.key}>
          <span className="research-status-label">
            {field.label} {saved === field.key ? <em>saved</em> : null}
          </span>
          <select className="field" onChange={(event) => save(field.key, event.target.value)} value={values[field.key]}>
            {field.options.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
