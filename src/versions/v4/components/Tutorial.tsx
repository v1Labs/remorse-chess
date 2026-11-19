"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { type IllegalReason, type Move, makeMove, toSan } from "@/versions/v4/lib/chess/engine";
import { useMoveInput } from "@/versions/v4/lib/chess/useMoveInput";
import { usePlayGame } from "@/versions/v4/lib/chess/usePlayGame";
import { STEPS } from "@/versions/v4/lib/tutorial/steps";
import { useTutorialRunner } from "@/versions/v4/lib/tutorial/useTutorialRunner";
import { Board } from "./Board";
import { LessonPanel } from "./LessonPanel";
import { PlayPanel } from "./PlayPanel";
import { StepNav } from "./StepNav";
import { VersionBadge } from "@/versions/VersionBadge";
import { HeartCrack } from "lucide-react";
import { GuiltSwatch } from "./GuiltToken";

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function Tutorial() {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const index = Math.max(0, STEPS.findIndex((s) => `#${s.id}` === hash));
  const step = STEPS[index];
  const isPlay = !!step.play;

  const { stage, attempt, showSolution, skip, replay, runId } = useTutorialRunner(step, reducedMotion);
  const play = usePlayGame();
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  const taskActive = !isPlay && !!stage.task && stage.game.turn === stage.task.side;
  const lessonInput = useMoveInput(
    stage.game,
    taskActive,
    (m: Move) => {
      const before = stage.game;
      const { state, events } = makeMove(before, m);
      attempt({ kind: "move", move: m, san: toSan(before, m), events, before, after: state });
    },
    (from: number, to: number, reason: IllegalReason) =>
      attempt({ kind: "illegal", from, to, reason, before: stage.game }),
  );
  const playInput = useMoveInput(play.game, isPlay && play.canMove, play.humanMove, play.illegal);

  function goTo(i: number) {
    setMenuOpen(false);
    if (i === index) {
      replay();
      return;
    }
    window.location.hash = STEPS[i].id;
    if (window.matchMedia("(max-width: 1023px)").matches) window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }

  function next() {
    setCompleted((c) => new Set(c).add(step.id));
    goTo(index + 1);
  }

  // Flyout: close on Escape, move focus into it when opened.
  useEffect(() => {
    if (!menuOpen) return;
    drawer.current?.querySelector<HTMLElement>("[aria-current=step]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const board = isPlay ? (
    <Board
      game={play.game}
      boardKey={1000 + play.gameKey}
      decor={play.decor}
      animate={!reducedMotion}
      input={playInput}
      label="Chess board, your game. Use arrow keys to move between squares and Enter to select."
    />
  ) : (
    <Board
      game={stage.game}
      boardKey={stage.boardKey}
      decor={stage.decor}
      animate={!stage.instant}
      input={taskActive ? lessonInput : null}
      label={
        taskActive
          ? "Chess board, your turn. Use arrow keys to move between squares and Enter to select."
          : "Chess board demonstration"
      }
    />
  );

  const caption = isPlay
    ? play.plies[play.plies.length - 1].label
    : stage.lastSan;

  const footer = (
    <div className="flex items-center gap-2">
      {index > 0 && (
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-black/5 hover:text-foreground"
        >
          ← Back
        </button>
      )}
      {!isPlay && (
        <button
          type="button"
          onClick={replay}
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-black/5 hover:text-foreground"
        >
          ↻ Replay
        </button>
      )}
      <div className="ml-auto">
        {isPlay ? (
          <button
            type="button"
            onClick={() => goTo(0)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-black/5 hover:text-foreground"
          >
            Restart tutorial
          </button>
        ) : stage.done ? (
          <button
            key={`next-${runId}`}
            type="button"
            onClick={next}
            className="rise-in rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {STEPS[index + 1]?.play ? "Play a game →" : "Next →"}
          </button>
        ) : !stage.task && !stage.instant ? (
          <button
            type="button"
            onClick={skip}
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted hover:bg-black/5 hover:text-foreground"
          >
            Skip animation ⏭
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:h-dvh lg:grid-cols-[250px_minmax(0,1fr)_minmax(340px,410px)] lg:overflow-hidden">
      {/* Desktop table of contents */}
      <aside className="hidden border-r border-line bg-surface/60 px-5 py-7 lg:block lg:overflow-y-auto">
        <Brand />
        <div className="mt-8">
          <StepNav steps={STEPS} current={index} completed={completed} onSelect={goTo} />
        </div>
      </aside>

      {/* Mobile header + flyout */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          ref={menuButton}
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls="step-drawer"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface transition-colors hover:bg-black/[0.05]"
        >
          <span className="sr-only">Open steps menu</span>
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <Brand compact />
        <span className="ml-auto text-sm text-muted">
          {index + 1} / {STEPS.length}
        </span>
      </header>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity lg:hidden ${menuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden
      />
      <div
        id="step-drawer"
        ref={drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Tutorial steps"
        inert={!menuOpen}
        className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] overflow-y-auto bg-surface px-5 py-6 shadow-2xl transition-transform duration-300 lg:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <Brand />
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              menuButton.current?.focus();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-black/5"
          >
            <span className="sr-only">Close steps menu</span>
            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <StepNav steps={STEPS} current={index} completed={completed} onSelect={goTo} />
      </div>

      {/* Gameplay */}
      <main className="flex flex-col items-center px-4 pb-4 pt-5 sm:px-8 lg:overflow-y-auto lg:py-8">
        <div className="w-full max-w-[min(100%,58dvh)] lg:max-w-[min(100%,calc(100dvh-12rem),720px)]">
          <div key={step.id} className="rise-in mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Step {index + 1} of {STEPS.length}
            </p>
            <h1 className="mt-1 font-heading text-[1.75rem] font-bold leading-tight tracking-tight sm:text-[2.6rem]">{step.heading}</h1>
          </div>
          {board}
          <div className="mt-3 flex min-h-6 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-muted">
            <span className="font-mono text-foreground/80" aria-live="polite">
              {caption ?? ""}
            </span>
            <Legend />
          </div>
        </div>
      </main>

      {/* Content */}
      <section
        aria-label="Lesson"
        className="flex flex-col border-line bg-surface lg:overflow-hidden lg:border-l"
      >
        <div className="flex-1 px-5 py-6 sm:px-8 lg:overflow-y-auto lg:py-8">
          <div key={`${step.id}-${runId}`} className="content-wipe">
            <h2 className="mb-4 font-heading text-xl font-bold tracking-tight">
              {isPlay ? "Your game" : step.title}
            </h2>
            {isPlay ? <PlayPanel play={play} /> : <LessonPanel stage={stage} onShowSolution={showSolution} />}
          </div>
        </div>
        <div className="sticky bottom-0 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
          {footer}
        </div>
      </section>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "flex items-center gap-2" : "space-y-2"}>
      <a href="#remorse-chess" className="flex items-center gap-2 font-heading font-bold uppercase tracking-[0.08em]">
        <HeartCrack aria-hidden className={`${compact ? "h-5 w-5" : "h-6 w-6"} shrink-0 text-accent`} strokeWidth={2.25} />
        <span className={compact ? "text-base" : "text-lg"}>Remorse Chess</span>
      </a>
      <VersionBadge current="v4" />
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" aria-label="Board legend">
      <li className="flex items-center gap-1.5">
        <GuiltSwatch /> guilt-ridden
      </li>
      <li className="flex items-center gap-1.5">
        <GuiltSwatch pending /> cleansing soon
      </li>
      <li className="flex items-center gap-1">
        <span aria-hidden className="font-bold text-accent">✕</span> blocked capture
      </li>
    </ul>
  );
}
