"use client";

import type { TutorialStage } from "@/versions/v2/lib/tutorial/useTutorialRunner";
import { RichText, TypedText } from "./TypedText";

interface LessonPanelProps {
  stage: TutorialStage;
  onShowSolution(): void;
}

/** The narration for a tutorial step: typed paragraphs, the active task and feedback. */
export function LessonPanel({ stage, onShowSolution }: LessonPanelProps) {
  const { paragraphs, task, feedback } = stage;
  return (
    <div className="space-y-4 text-[17px] leading-relaxed text-foreground/85" aria-live="polite">
      {paragraphs.map((p) => {
        if (p.tone === "task")
          return (
            <div key={p.id} className="rise-in rounded-xl border border-sky-700/20 bg-sky-50 px-4 py-3 text-[16px] text-sky-950">
              <TypedText text={p.text} duration={p.duration} />
            </div>
          );
        if (p.tone === "success")
          return (
            <div key={p.id} className="rise-in flex gap-2.5 rounded-xl border border-emerald-700/20 bg-emerald-50 px-4 py-3 text-[16px] text-emerald-950">
              <span aria-hidden className="mt-0.5">✓</span>
              <span>
                <TypedText text={p.text} duration={p.duration} />
              </span>
            </div>
          );
        return (
          <p key={p.id}>
            <TypedText text={p.text} duration={p.duration} />
          </p>
        );
      })}
      {task && (
        <div className="rise-in space-y-3">
          {feedback && (
            <p key={feedback.key} role="status" className="rise-in rounded-xl border border-amber-600/25 bg-amber-50 px-4 py-3 text-[15px] text-amber-950">
              <RichText text={feedback.message} />
            </p>
          )}
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-600" />
              </span>
              Waiting for your move on the board
            </span>
            {task.solution && (
              <button
                type="button"
                onClick={onShowSolution}
                className="ml-auto rounded-md px-2 py-1 font-medium text-sky-800 underline decoration-sky-800/30 underline-offset-2 hover:decoration-sky-800"
              >
                Show me
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
