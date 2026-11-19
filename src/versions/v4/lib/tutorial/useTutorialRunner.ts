"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type GameState,
  makeMove,
  moveFromSan,
  moveLabel,
  neighbors,
  parseSquare,
  positionKey,
  toSan,
} from "@/versions/v4/lib/chess/engine";
import {
  type BoardDecor,
  type Paragraph,
  buildSetup,
  emptyDecor,
  FX_MS,
  fxForMove,
  nextFxId,
} from "./stage";
import type { Attempt, ScriptCtx, Step, TaskSpec } from "./types";

export const TYPE_MS_PER_CHAR = 19;
export const MOVE_MS = 450;
/** Time for the board's fade-out / fade-in swap (matches the Board animation). */
export const BOARD_SWAP_MS = 550;

export interface TutorialStage {
  game: GameState;
  /** Changes whenever the board jumps to an unrelated position (triggers a fade). */
  boardKey: number;
  decor: BoardDecor;
  lastSan: string | null;
  paragraphs: Paragraph[];
  task: TaskSpec | null;
  feedback: { message: string; key: number } | null;
  /** The script finished; the learner can move on. */
  done: boolean;
  /** Animations are being skipped (by request or reduced-motion preference). */
  instant: boolean;
}

class Cancelled extends Error {}

/** Controls one run of a step's script: sleeping, skipping and cancellation. */
function createToken(instant: boolean) {
  const waiters = new Set<(cancel: boolean) => void>();
  const token = {
    cancelled: false,
    instant,
    sleep(ms: number): Promise<void> {
      if (token.cancelled) return Promise.reject(new Cancelled());
      if (token.instant || ms <= 0) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const finish = (cancel: boolean) => {
          clearTimeout(timer);
          waiters.delete(finish);
          if (cancel) reject(new Cancelled());
          else resolve();
        };
        const timer = setTimeout(() => finish(false), ms);
        waiters.add(finish);
      });
    },
    /** Wait for an external event (e.g. the learner solving a task). Rejects on cancel. */
    until(register: (resolve: () => void) => void): Promise<void> {
      if (token.cancelled) return Promise.reject(new Cancelled());
      return new Promise((resolve, reject) => {
        const onCancel = (cancel: boolean) => {
          if (cancel) reject(new Cancelled());
        };
        waiters.add(onCancel);
        register(() => {
          waiters.delete(onCancel);
          resolve();
        });
      });
    },
    skip() {
      token.instant = true;
      for (const w of [...waiters]) w(false);
    },
    cancel() {
      token.cancelled = true;
      for (const w of [...waiters]) w(true);
    },
  };
  return token;
}
type Token = ReturnType<typeof createToken>;

const plainLength = (text: string) =>
  text.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").length;

export function useTutorialRunner(step: Step, reducedMotion: boolean) {
  const [stage, setStage] = useState<TutorialStage>(() => ({
    game: buildSetup(step.setup),
    boardKey: 0,
    decor: emptyDecor(),
    lastSan: null,
    paragraphs: [],
    task: null,
    feedback: null,
    done: false,
    instant: reducedMotion,
  }));
  const stageRef = useRef(stage);
  const tokenRef = useRef<Token | null>(null);
  const resolveTaskRef = useRef<(() => void) | null>(null);
  const reducedRef = useRef(reducedMotion);
  const stepRef = useRef(step);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    reducedRef.current = reducedMotion;
  }, [reducedMotion]);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const update = useCallback((fn: (s: TutorialStage) => TutorialStage) => {
    stageRef.current = fn(stageRef.current);
    setStage(stageRef.current);
  }, []);

  const scheduleFxCleanup = useCallback(
    (ids: number[]) => {
      if (!ids.length) return;
      setTimeout(() => {
        update((s) => ({
          ...s,
          decor: { ...s.decor, fx: s.decor.fx.filter((f) => !ids.includes(f.id)) },
        }));
      }, FX_MS);
    },
    [update],
  );

  /** Play a move on the stage board with its effects. */
  const playMove = useCallback(
    (san: string) => {
      const before = stageRef.current.game;
      const move = moveFromSan(before, san);
      const label = moveLabel(before, toSan(before, move));
      const { state, events } = makeMove(before, move);
      const fx = fxForMove(events, state, move.to, !!stepRef.current.cry);
      update((s) => ({
        ...s,
        game: state,
        lastSan: label,
        decor: { ...s.decor, lastMove: { from: move.from, to: move.to }, fx: [...s.decor.fx, ...fx] },
      }));
      scheduleFxCleanup(fx.map((f) => f.id));
    },
    [update, scheduleFxCleanup],
  );

  const addParagraph = useCallback(
    (text: string, tone: Paragraph["tone"], instant: boolean) => {
      const duration = instant ? 0 : plainLength(text) * TYPE_MS_PER_CHAR;
      update((s) => ({
        ...s,
        paragraphs: [...s.paragraphs, { id: s.paragraphs.length + 1, text, duration, tone }],
      }));
      return duration;
    },
    [update],
  );

  useEffect(() => {
    const token = createToken(reducedRef.current);
    tokenRef.current = token;

    const ctx: ScriptCtx = {
      async say(text) {
        const d = addParagraph(text, "body", token.instant);
        await token.sleep(d + 350);
      },
      async move(san) {
        if (token.cancelled) throw new Cancelled();
        playMove(san);
        await token.sleep(MOVE_MS + 450);
      },
      wait: (ms) => token.sleep(ms),
      async load(setup) {
        if (token.cancelled) throw new Cancelled();
        update((s) => ({
          ...s,
          game: buildSetup(setup),
          boardKey: s.boardKey + 1,
          lastSan: null,
          decor: emptyDecor(),
        }));
        await token.sleep(BOARD_SWAP_MS);
      },
      arrow(from, to, kind = "hint") {
        update((s) => ({
          ...s,
          decor: {
            ...s.decor,
            arrows: [...s.decor.arrows, { from: parseSquare(from), to: parseSquare(to), kind }],
          },
        }));
      },
      zone(around) {
        update((s) => ({ ...s, decor: { ...s.decor, zones: neighbors(parseSquare(around)) } }));
      },
      clearMarks() {
        update((s) => ({ ...s, decor: { ...s.decor, arrows: [], zones: [] } }));
      },
      async bump(from, to) {
        const f = parseSquare(from);
        const t = parseSquare(to);
        const piece = stageRef.current.game.board[f];
        if (!piece) return;
        const fx = { id: nextFxId(), kind: "blocked" as const, square: t };
        update((s) => ({
          ...s,
          decor: {
            ...s.decor,
            nudge: { pieceId: piece.id, dx: (t & 7) - (f & 7), dy: (f >> 3) - (t >> 3), key: fx.id },
            fx: [...s.decor.fx, fx],
          },
        }));
        scheduleFxCleanup([fx.id]);
        await token.sleep(1000);
        update((s) => ({ ...s, decor: { ...s.decor, nudge: null } }));
      },
      async task(spec) {
        const d = addParagraph(spec.prompt, "task", token.instant);
        update((s) => ({ ...s, task: spec, feedback: null }));
        await token.sleep(d);
        await token.until((resolve) => {
          resolveTaskRef.current = resolve;
        });
        resolveTaskRef.current = null;
        update((s) => ({ ...s, task: null, feedback: null }));
        await token.sleep(MOVE_MS + 500);
      },
    };

    (async () => {
      // Yield first so state updates happen outside the effect body.
      await Promise.resolve();
      const target = buildSetup(step.setup);
      const keep = positionKey(target) === positionKey(stageRef.current.game);
      update((s) => ({
        ...s,
        game: keep ? s.game : target,
        boardKey: keep ? s.boardKey : s.boardKey + 1,
        lastSan: keep ? s.lastSan : null,
        decor: keep ? { ...emptyDecor(), lastMove: s.decor.lastMove } : emptyDecor(),
        paragraphs: [],
        task: null,
        feedback: null,
        done: false,
        instant: token.instant,
      }));
      if (!keep) await token.sleep(BOARD_SWAP_MS - 100);
      await token.sleep(450); // let the content wipe land
      if (step.script) await step.script(ctx);
      update((s) => ({ ...s, done: true }));
    })().catch((err) => {
      if (!(err instanceof Cancelled)) throw err;
    });

    return () => token.cancel();
  }, [step, runId, update, addParagraph, playMove, scheduleFxCleanup]);

  /** The learner did something on the board while a task was active. */
  const attempt = useCallback(
    (a: Attempt) => {
      const spec = stageRef.current.task;
      if (!spec || !resolveTaskRef.current) return;
      const result = spec.check(a);
      if (!result) return;
      if (!result.ok) {
        update((s) => ({ ...s, feedback: { message: result.message, key: Date.now() } }));
        return;
      }
      if (a.kind === "move") playMove(a.san);
      addParagraph(result.message, "success", !!tokenRef.current?.instant);
      update((s) => ({ ...s, task: null, feedback: null }));
      resolveTaskRef.current();
    },
    [update, playMove, addParagraph],
  );

  const showSolution = useCallback(() => {
    const spec = stageRef.current.task;
    if (!spec?.solution || !resolveTaskRef.current) return;
    playMove(spec.solution);
    addParagraph(spec.solutionMessage ?? "Here's one way to do it.", "success", !!tokenRef.current?.instant);
    update((s) => ({ ...s, task: null, feedback: null }));
    resolveTaskRef.current();
  }, [playMove, addParagraph, update]);

  const skip = useCallback(() => {
    tokenRef.current?.skip();
    update((s) => ({
      ...s,
      instant: true,
      paragraphs: s.paragraphs.map((p) => ({ ...p, duration: 0 })),
    }));
  }, [update]);

  const replay = useCallback(() => setRunId((n) => n + 1), []);

  return { stage, attempt, showSolution, skip, replay, runId };
}
