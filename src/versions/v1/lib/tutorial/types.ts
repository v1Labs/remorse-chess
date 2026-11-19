import type { Color, GameState, IllegalReason, Move, MoveEvents } from "@/versions/v1/lib/chess/engine";

/** A board position, either from a FEN or by playing SAN moves from the start position. */
export interface Setup {
  fen?: string;
  moves?: string[];
  guilty?: string[];
}

export type Attempt =
  | {
      kind: "move";
      move: Move;
      san: string;
      events: MoveEvents;
      before: GameState;
      after: GameState;
    }
  | { kind: "illegal"; from: number; to: number; reason: IllegalReason; before: GameState };

export interface TaskResult {
  ok: boolean;
  message: string;
}

export interface TaskSpec {
  /** Instruction shown to the learner. Supports the same light markup as narration. */
  prompt: string;
  /** Which side the learner plays. */
  side: Color;
  /** Judge an attempt. Return null to silently ignore it. */
  check(attempt: Attempt): TaskResult | null;
  /** SAN of a move that solves the task; enables a "Show me" button. */
  solution?: string;
  /** Message shown after "Show me" plays the solution. */
  solutionMessage?: string;
}

export type ArrowKind = "hint" | "blocked";

export interface ScriptCtx {
  /** Type a paragraph of narration and wait for it to finish. */
  say(text: string): Promise<void>;
  /** Animate a move on the board (SAN). */
  move(san: string): Promise<void>;
  wait(ms: number): Promise<void>;
  /** Switch the board to a new position. */
  load(setup: Setup): Promise<void>;
  arrow(from: string, to: string, kind?: ArrowKind): void;
  /** Highlight the squares around a square (e.g. a bishop's reach of absolution). */
  zone(around: string): void;
  clearMarks(): void;
  /** Show a piece trying, and failing, to move to a square. */
  bump(from: string, to: string): Promise<void>;
  /** Hand the board to the learner until they complete the task. */
  task(spec: TaskSpec): Promise<void>;
}

export interface Step {
  id: string;
  /** Short label for the table of contents. */
  title: string;
  /** Heading shown above the board. */
  heading: string;
  setup: Setup;
  script?: (ctx: ScriptCtx) => Promise<void>;
  /** The final free-play step. */
  play?: boolean;
}
