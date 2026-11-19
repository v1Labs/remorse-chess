"use client";

import type { Step } from "@/versions/v1/lib/tutorial/types";

interface StepNavProps {
  steps: Step[];
  current: number;
  completed: Set<string>;
  onSelect(index: number): void;
}

export function StepNav({ steps, current, completed, onSelect }: StepNavProps) {
  return (
    <nav aria-label="Tutorial steps">
      <ol className="relative space-y-1">
        <span aria-hidden className="absolute bottom-4 left-[15px] top-4 w-px bg-line" />
        {steps.map((step, i) => {
          const active = i === current;
          const done = completed.has(step.id) && !active;
          return (
            <li key={step.id} className="relative">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg py-2 pl-0 pr-3 text-left text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                  active ? "font-semibold text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                <span
                  className={`relative z-10 flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                    active
                      ? "border-accent bg-accent text-white shadow-[0_0_0_4px_rgba(159,18,57,0.12)]"
                      : done
                        ? "border-emerald-600/40 bg-emerald-50 text-emerald-700"
                        : "border-line bg-surface text-muted group-hover:border-foreground/30"
                  }`}
                >
                  {done ? (
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
                      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span>
                  {step.title}
                  {done && <span className="sr-only"> (completed)</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
