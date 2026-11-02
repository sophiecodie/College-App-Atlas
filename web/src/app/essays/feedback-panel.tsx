"use client";

import type { EssayFeedback } from "@/lib/studio/writing";

type Props = {
  aiConfigured: boolean;
  feedback: EssayFeedback | null;
  loading: boolean;
  error: string | null;
  onRequest: () => void;
};

export function FeedbackPanel({ aiConfigured, feedback, loading, error, onRequest }: Props) {
  return (
    <div className="stack feedback-panel">
      <p className="muted">
        Feedback points out strengths, gaps, and questions. It never rewrites your sentences. Drafts are sent to the AI
        provider only when you press the button, and aren&apos;t stored by it for training.
      </p>
      <button className="button" disabled={!aiConfigured || loading} onClick={onRequest} type="button">
        {loading ? "Reading your draft…" : feedback ? "Get fresh feedback" : "Get feedback"}
      </button>
      {!aiConfigured ? <p className="ai-disabled-note">AI feedback is off until an AI provider key is configured on the server.</p> : null}
      {error ? (
        <div className="essay-error-banner">
          {error}{" "}
          <button className="subtle-link" onClick={onRequest} type="button">
            Retry
          </button>
        </div>
      ) : null}
      {feedback ? (
        <div className="stack">
          <p>{feedback.overview}</p>
          {feedback.strengths.length > 0 ? (
            <div>
              <strong>What&apos;s working</strong>
              <ul>
                {feedback.strengths.map((row) => (
                  <li key={row.quote + row.observation}>
                    {row.quote ? <q>{row.quote}</q> : null} {row.observation}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {feedback.specificityGaps.length > 0 ? (
            <div>
              <strong>Where a concrete detail would help</strong>
              <ul>
                {feedback.specificityGaps.map((row) => (
                  <li key={row.quote + row.suggestion}>
                    {row.quote ? <q>{row.quote}</q> : null} {row.suggestion}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <strong>Questions to think about</strong>
            <ul>
              {feedback.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
          {feedback.structureNotes.length > 0 ? (
            <div>
              <strong>Structure</strong>
              <ul>
                {feedback.structureNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {feedback.promptFit ? (
            <p>
              <strong>Prompt fit: </strong>
              {feedback.promptFit}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
