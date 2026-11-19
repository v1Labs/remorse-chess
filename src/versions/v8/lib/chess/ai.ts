import {
  type GameState,
  type Move,
  type PieceType,
  inCheck,
  legalMoves,
  makeMove,
  rankOf,
  fileOf,
} from "./engine";

const VALUE: Record<PieceType, number> = { p: 100, n: 310, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100_000;

/**
 * Static evaluation from the perspective of the side to move.
 * Guilt makes a piece less useful (it can't capture), and bishops are worth a bit more
 * because they are the only source of absolution.
 */
function evaluate(s: GameState): number {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = s.board[i];
    if (!p) continue;
    let v = VALUE[p.type];
    if (p.guilt) v *= p.guilt.pending ? 0.92 : 0.8;
    if (p.type === "b") v += 25;
    // Mild positional nudges: advance pawns, centralize minor pieces.
    const r = p.color === "w" ? rankOf(i) : 7 - rankOf(i);
    const centre = 3.5 - Math.max(Math.abs(3.5 - fileOf(i)), Math.abs(3.5 - rankOf(i)));
    if (p.type === "p") v += r * 6;
    if (p.type === "n" || p.type === "b") v += centre * 8;
    score += p.color === s.turn ? v : -v;
  }
  return score;
}

function order(moves: Move[]): Move[] {
  return moves.sort((a, b) => Number(b.capture) - Number(a.capture));
}

function negamax(s: GameState, depth: number, alpha: number, beta: number): number {
  const moves = legalMoves(s);
  if (moves.length === 0) return inCheck(s) ? -MATE - depth : 0;
  if (depth === 0) return evaluate(s);
  let best = -Infinity;
  for (const m of order(moves)) {
    const score = -negamax(makeMove(s, m).state, depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Pick a move for the side to move. Small random jitter keeps games from repeating. */
export function chooseMove(s: GameState, depth = 3): Move | null {
  const moves = order(legalMoves(s));
  if (!moves.length) return null;
  let best: Move = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  for (const m of moves) {
    const score =
      -negamax(makeMove(s, m).state, depth - 1, -Infinity, -alpha) + Math.random() * 12;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
    if (score > alpha) alpha = score;
  }
  return best;
}
