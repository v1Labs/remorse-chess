import {
  type GameState,
  type MoveEvents,
  fromFen,
  makeMove,
  moveFromSan,
  START_FEN,
} from "@/versions/v9/lib/chess/engine";
import type { ArrowKind, Setup } from "./types";

export interface Paragraph {
  id: number;
  text: string;
  /** Typing duration in ms. 0 renders instantly. */
  duration: number;
  tone: "body" | "task" | "success";
}

export interface Arrow {
  from: number;
  to: number;
  kind: ArrowKind;
}

export interface Fx {
  id: number;
  kind: "cry" | "sparkle" | "blocked";
  square: number;
}

export interface Nudge {
  pieceId: string;
  dx: number;
  dy: number;
  key: number;
}

/** Everything the board needs to draw beyond the position itself. */
export interface BoardDecor {
  lastMove: { from: number; to: number } | null;
  arrows: Arrow[];
  zones: number[];
  fx: Fx[];
  nudge: Nudge | null;
}

export const emptyDecor = (): BoardDecor => ({
  lastMove: null,
  arrows: [],
  zones: [],
  fx: [],
  nudge: null,
});

let fxCounter = 0;
export const nextFxId = () => ++fxCounter;

/**
 * Visual effects that accompany a move: an illustrative crying emoji on captures when `cry`
 * is set (the intro step only). Forgiveness is shown by the token's own release animation.
 */
export function fxForMove(events: MoveEvents, after: GameState, to: number, cry = false): Fx[] {
  const fx: Fx[] = [];
  if (cry && events.guilt) fx.push({ id: nextFxId(), kind: "cry", square: to });
  return fx;
}

export function buildSetup(setup: Setup): GameState {
  let s = fromFen(setup.fen ?? START_FEN, setup.guilty);
  for (const san of setup.moves ?? []) s = makeMove(s, moveFromSan(s, san)).state;
  return s;
}

export const FX_MS = 1600;
