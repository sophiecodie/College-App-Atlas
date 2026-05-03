"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateResearchEntry } from "@/app/workspace-actions";
import { priorityDotClass, reachDotClass } from "@/lib/research";

type ResearchWorkspaceFormProps = {
  collegeName: string;
  collegeSlug: string;
  collegeStatus: string;
  selectedApplicationType: string;
  entry: {
    location: string;
    reach_level: string;
    visit_status: string;
    priority_level: string;
    general_notes: string;
    academic_programs: string;
    campus_culture: string;
    why_us_material: string;
    personal_reflections: string;
  };
};

type ResearchFormState = ResearchWorkspaceFormProps["entry"];

export function ResearchWorkspaceForm({
  collegeName,
  collegeSlug,
  collegeStatus,
  selectedApplicationType,
  entry,
}: ResearchWorkspaceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<ResearchFormState>(entry);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "typing" | "error">("saved");
  const timeoutRef = useRef<number | null>(null);
  const serializedEntry = useMemo(() => JSON.stringify(entry), [entry]);

  useEffect(() => {
    setFormState(entry);
    setSaveState("saved");
  }, [collegeSlug, serializedEntry, entry]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function buildFormData(nextState: ResearchFormState) {
    const formData = new FormData();
    formData.set("collegeSlug", collegeSlug);
    formData.set("location", nextState.location);
    formData.set("reach_level", nextState.reach_level);
    formData.set("visit_status", nextState.visit_status);
    formData.set("priority_level", nextState.priority_level);
    formData.set("general_notes", nextState.general_notes);
    formData.set("academic_programs", nextState.academic_programs);
    formData.set("campus_culture", nextState.campus_culture);
    formData.set("why_us_material", nextState.why_us_material);
    formData.set("personal_reflections", nextState.personal_reflections);
    return formData;
  }

  function runSave(nextState: ResearchFormState) {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setSaveState("saving");

    startTransition(async () => {
      try {
        await updateResearchEntry(buildFormData(nextState));
        setSaveState("saved");
        router.refresh();
      } catch {
        setSaveState("error");
      }
    });
  }

  function scheduleSave(nextState: ResearchFormState) {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    setSaveState("typing");
    timeoutRef.current = window.setTimeout(() => {
      runSave(nextState);
    }, 650);
  }

  function updateField<K extends keyof ResearchFormState>(
    field: K,
    value: ResearchFormState[K],
    options?: { immediate?: boolean },
  ) {
    const nextState = {
      ...formState,
      [field]: value,
    };

    setFormState(nextState);

    if (options?.immediate) {
      runSave(nextState);
      return;
    }

    scheduleSave(nextState);
  }

  const statusLabel =
    saveState === "error"
      ? "Autosave failed. Try again."
      : saveState === "saving" || isPending
        ? "Saving..."
        : saveState === "typing"
          ? "Autosaving..."
          : "All changes saved";

  return (
    <form
      className="research-workspace-form"
      onSubmit={(event) => {
        event.preventDefault();
        runSave(formState);
      }}
    >
      <div className="research-detail-summary-grid">
        <div className="meta-card">
          <span className="muted">Location</span>
          <strong>{formState.location || "TBD"}</strong>
        </div>
        <div className="meta-card">
          <span className="muted">Visit status</span>
          <strong>{formState.visit_status}</strong>
        </div>
        <div className="meta-card">
          <span className="research-dot-label">
            <span className={`research-dot ${reachDotClass(formState.reach_level)}`} />
            Reach level
          </span>
          <strong>{formState.reach_level === "--" ? "Unset" : formState.reach_level}</strong>
        </div>
        <div className="meta-card">
          <span className="research-dot-label">
            <span className={`research-dot ${priorityDotClass(formState.priority_level)}`} />
            Priority
          </span>
          <strong>{formState.priority_level === "--" ? "Unset" : formState.priority_level}</strong>
        </div>
        <div className="meta-card">
          <span className="muted">Application type</span>
          <strong>{selectedApplicationType}</strong>
        </div>
        <div className="meta-card">
          <span className="muted">Status</span>
          <strong>{collegeStatus}</strong>
        </div>
      </div>

      <div className="research-field-grid research-field-grid-wide">
        <div>
          <label className="field-label" htmlFor={`${collegeSlug}-location`}>
            Location
          </label>
          <input
            className="field"
            id={`${collegeSlug}-location`}
            name="location"
            onChange={(event) => updateField("location", event.target.value)}
            placeholder="Location"
            value={formState.location}
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`${collegeSlug}-reach`}>
            Reach level
          </label>
          <select
            className="field"
            id={`${collegeSlug}-reach`}
            name="reach_level"
            onChange={(event) => updateField("reach_level", event.target.value, { immediate: true })}
            value={formState.reach_level}
          >
            <option value="--">Reach level</option>
            <option value="High Reach">High Reach</option>
            <option value="Reach">Reach</option>
            <option value="Target">Target</option>
            <option value="Safety">Safety</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor={`${collegeSlug}-priority`}>
            Priority
          </label>
          <select
            className="field"
            id={`${collegeSlug}-priority`}
            name="priority_level"
            onChange={(event) => updateField("priority_level", event.target.value, { immediate: true })}
            value={formState.priority_level}
          >
            <option value="--">Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor={`${collegeSlug}-visit`}>
            Visit status
          </label>
          <select
            className="field"
            id={`${collegeSlug}-visit`}
            name="visit_status"
            onChange={(event) => updateField("visit_status", event.target.value, { immediate: true })}
            value={formState.visit_status}
          >
            <option value="Visited">Visited</option>
            <option value="Planned">Planned</option>
            <option value="No Visit">No Visit</option>
          </select>
        </div>
      </div>

      <div className="research-notes-stack">
        <div className="research-writing-card">
          <label className="field-label" htmlFor={`${collegeSlug}-general-notes`}>
            General notes
          </label>
          <textarea
            className="field field-textarea research-detail-textarea"
            id={`${collegeSlug}-general-notes`}
            name="general_notes"
            onChange={(event) => updateField("general_notes", event.target.value)}
            placeholder="Quick summary, facts, questions, deadlines, and standout themes"
            rows={6}
            value={formState.general_notes}
          />
        </div>

        <div className="research-detail-grid">
          <div className="research-writing-card">
            <label className="field-label" htmlFor={`${collegeSlug}-programs`}>
              Academic programs
            </label>
            <textarea
              className="field field-textarea research-detail-textarea"
              id={`${collegeSlug}-programs`}
              name="academic_programs"
              onChange={(event) => updateField("academic_programs", event.target.value)}
              placeholder="Programs, departments, professors, labs, concentrations"
              rows={7}
              value={formState.academic_programs}
            />
          </div>
          <div className="research-writing-card">
            <label className="field-label" htmlFor={`${collegeSlug}-culture`}>
              Campus culture
            </label>
            <textarea
              className="field field-textarea research-detail-textarea"
              id={`${collegeSlug}-culture`}
              name="campus_culture"
              onChange={(event) => updateField("campus_culture", event.target.value)}
              placeholder="Vibe, student life, traditions, pace, social energy"
              rows={7}
              value={formState.campus_culture}
            />
          </div>
        </div>

        <div className="research-detail-grid">
          <div className="research-writing-card">
            <label className="field-label" htmlFor={`${collegeSlug}-why-us`}>
              Why us material
            </label>
            <textarea
              className="field field-textarea research-detail-textarea"
              id={`${collegeSlug}-why-us`}
              name="why_us_material"
              onChange={(event) => updateField("why_us_material", event.target.value)}
              placeholder="School-specific details that could later support supplements"
              rows={8}
              value={formState.why_us_material}
            />
          </div>
          <div className="research-writing-card">
            <label className="field-label" htmlFor={`${collegeSlug}-reflections`}>
              Personal reflections
            </label>
            <textarea
              className="field field-textarea research-detail-textarea"
              id={`${collegeSlug}-reflections`}
              name="personal_reflections"
              onChange={(event) => updateField("personal_reflections", event.target.value)}
              placeholder="How it feels, what excites you, what gives you pause, and why it fits"
              rows={8}
              value={formState.personal_reflections}
            />
          </div>
        </div>
      </div>

      <div className="research-card-footer">
        <div className="research-autosave-status">
          <strong>{collegeName}</strong>
          <span className="muted">{statusLabel}</span>
        </div>
        <button
          className="button button-secondary"
          disabled={isPending}
          onClick={() => runSave(formState)}
          type="button"
        >
          Save now
        </button>
      </div>
    </form>
  );
}
