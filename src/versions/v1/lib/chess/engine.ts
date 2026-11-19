/**
 * Remorse Chess rules engine.
 *
 * Standard chess, plus guilt:
 * - A piece that captures becomes guilt-ridden and cannot capture again until absolved.
 * - Guilt-ridden pieces cannot give check (they cannot capture the king), except that the
 *   capturing move itself counts as check for the opponent's very next move.
 * - A bishop moving to a square adjacent to guilty friendly pieces absolves all of them.
 * - A bishop that captures cleanses itself at the end of its owner's next move.
 * - A (non-bishop) piece capturing on a square adjacent to a friendly bishop is cleansed at the
 *   end of its owner's next move, provided it is still adjacent to that bishop.
 *
 * Squares are indexed 0..63 with index = rank * 8 + file, where rank 0 is White's back rank.
 */

export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export interface Guilt {
  /** How this guilt will clear on its own, if at all. */
  pending: "self" | "proximity" | null;
  /** For proximity cleansing: the bishop that must stay adjacent. */
  bishopId: string | null;
  /** Ply at whose end the pending cleanse resolves. */
  resolvesAtPly: number;
  /** The piece still counts as giving check while the ply being played is <= this. */
  checkUntilPly: number;
}

export interface Piece {
  id: string;
  color: Color;
  type: PieceType;
  guilt: Guilt | null;
}

export interface GameState {
  board: (Piece | null)[];
  turn: Color;
  /** Number of plies played so far (also the index of the ply about to be played). */
  ply: number;
  castling: string;
  ep: number | null;
  halfmove: number;
}

export interface Move {
  from: number;
  to: number;
  capture: boolean;
  promotion?: PieceType;
  ep?: boolean;
  castle?: "K" | "Q";
}

export interface MoveEvents {
  moverId: string;
  capturedId: string | null;
  guilt: "plain" | "self" | "proximity" | null;
  absolvedIds: string[];
  cleansedIds: string[];
  lapsedIds: string[];
}

export type IllegalReason = "guilty" | "check" | "invalid";

export type Status = "playing" | "checkmate" | "stalemate" | "draw";

const FILES = "abcdefgh";

export const fileOf = (s: number) => s & 7;
export const rankOf = (s: number) => s >> 3;
export const sq = (file: number, rank: number) => rank * 8 + file;
export const onBoard = (file: number, rank: number) =>
  file >= 0 && file < 8 && rank >= 0 && rank < 8;
export const squareName = (s: number) => FILES[fileOf(s)] + (rankOf(s) + 1);
export function parseSquare(name: string): number {
  const f = FILES.indexOf(name[0]);
  const r = Number(name[1]) - 1;
  if (f < 0 || !(r >= 0 && r < 8)) throw new Error(`Bad square ${name}`);
  return sq(f, r);
}
export const other = (c: Color): Color => (c === "w" ? "b" : "w");
export function adjacent(a: number, b: number): boolean {
  if (a === b) return false;
  return (
    Math.abs(fileOf(a) - fileOf(b)) <= 1 && Math.abs(rankOf(a) - rankOf(b)) <= 1
  );
}
export function neighbors(s: number): number[] {
  const out: number[] = [];
  for (let df = -1; df <= 1; df++)
    for (let dr = -1; dr <= 1; dr++) {
      if (!df && !dr) continue;
      const f = fileOf(s) + df;
      const r = rankOf(s) + dr;
      if (onBoard(f, r)) out.push(sq(f, r));
    }
  return out;
}

const KNIGHT = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Can this piece capture (and therefore threaten the king) on the given ply? */
export function canAttack(p: Piece, ply: number): boolean {
  return !p.guilt || ply <= p.guilt.checkUntilPly;
}

export const isGuilty = (p: Piece | null | undefined) => !!p?.guilt;

// ---------------------------------------------------------------------------
// FEN

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function fromFen(fen: string, guiltySquares: string[] = []): GameState {
  const [placement, turn = "w", castling = "-", ep = "-", half = "0", full = "1"] =
    fen.trim().split(/\s+/);
  const board: (Piece | null)[] = new Array(64).fill(null);
  const counters: Record<string, number> = {};
  const rows = placement.split("/");
  rows.forEach((row, i) => {
    const rank = 7 - i;
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        file += Number(ch);
        continue;
      }
      const color: Color = ch === ch.toUpperCase() ? "w" : "b";
      const type = ch.toLowerCase() as PieceType;
      const key = color + type;
      counters[key] = (counters[key] ?? 0) + 1;
      board[sq(file, rank)] = {
        id: `${key}${counters[key]}`,
        color,
        type,
        guilt: null,
      };
      file++;
    }
  });
  for (const name of guiltySquares) {
    const s = parseSquare(name);
    const p = board[s];
    if (p) board[s] = { ...p, guilt: plainGuilt() };
  }
  const t = turn as Color;
  return {
    board,
    turn: t,
    ply: (Number(full) - 1) * 2 + (t === "b" ? 1 : 0),
    castling: castling === "-" ? "" : castling,
    ep: ep === "-" ? null : parseSquare(ep),
    halfmove: Number(half),
  };
}

function plainGuilt(): Guilt {
  return { pending: null, bishopId: null, resolvesAtPly: -1, checkUntilPly: -1 };
}

/** A compact key describing the position, including guilt. Used to compare positions. */
export function positionKey(s: GameState): string {
  return (
    s.board
      .map((p) =>
        p ? `${p.color}${p.type}${p.guilt ? (p.guilt.pending ?? "g") : ""}` : "-",
      )
      .join(",") +
    `|${s.turn}|${s.castling}|${s.ep ?? "-"}`
  );
}

// ---------------------------------------------------------------------------
// Attacks

export function isAttacked(
  board: (Piece | null)[],
  target: number,
  by: Color,
  ply: number,
): boolean {
  const tf = fileOf(target);
  const tr = rankOf(target);
  const hit = (p: Piece | null, types: PieceType[]) =>
    !!p && p.color === by && types.includes(p.type) && canAttack(p, ply);

  // Pawns: a white pawn attacks diagonally upward, so it sits one rank below.
  const pr = by === "w" ? tr - 1 : tr + 1;
  for (const df of [-1, 1]) {
    if (onBoard(tf + df, pr) && hit(board[sq(tf + df, pr)], ["p"])) return true;
  }
  for (const [df, dr] of KNIGHT) {
    if (onBoard(tf + df, tr + dr) && hit(board[sq(tf + df, tr + dr)], ["n"]))
      return true;
  }
  for (const [df, dr] of KING) {
    if (onBoard(tf + df, tr + dr) && hit(board[sq(tf + df, tr + dr)], ["k"]))
      return true;
  }
  const ray = (dirs: number[][], types: PieceType[]) => {
    for (const [df, dr] of dirs) {
      let f = tf + df;
      let r = tr + dr;
      while (onBoard(f, r)) {
        const p = board[sq(f, r)];
        if (p) {
          if (hit(p, types)) return true;
          break;
        }
        f += df;
        r += dr;
      }
    }
    return false;
  };
  return ray(ROOK_DIRS, ["r", "q"]) || ray(BISHOP_DIRS, ["b", "q"]);
}

export function kingSquare(board: (Piece | null)[], color: Color): number {
  return board.findIndex((p) => p?.color === color && p.type === "k");
}

export function inCheck(s: GameState): boolean {
  const k = kingSquare(s.board, s.turn);
  return k >= 0 && isAttacked(s.board, k, other(s.turn), s.ply);
}

// ---------------------------------------------------------------------------
// Move generation

const PROMOS: PieceType[] = ["q", "r", "b", "n"];

/** Pseudo-legal moves for the piece on `from`. With ignoreGuilt, a guilty piece's captures are included. */
export function pseudoMoves(s: GameState, from: number, ignoreGuilt = false): Move[] {
  const p = s.board[from];
  if (!p) return [];
  const moves: Move[] = [];
  const canCap = ignoreGuilt || !p.guilt;
  const f0 = fileOf(from);
  const r0 = rankOf(from);
  const enemyAt = (t: number) => {
    const q = s.board[t];
    return !!q && q.color !== p.color && q.type !== "k";
  };

  if (p.type === "p") {
    const dir = p.color === "w" ? 1 : -1;
    const lastRank = p.color === "w" ? 7 : 0;
    const startRank = p.color === "w" ? 1 : 6;
    const push = (to: number, capture: boolean, ep = false) => {
      if (rankOf(to) === lastRank) {
        for (const promotion of PROMOS) moves.push({ from, to, capture, promotion });
      } else moves.push({ from, to, capture, ep: ep || undefined });
    };
    const one = sq(f0, r0 + dir);
    if (onBoard(f0, r0 + dir) && !s.board[one]) {
      push(one, false);
      const two = sq(f0, r0 + 2 * dir);
      if (r0 === startRank && !s.board[two]) push(two, false);
    }
    if (canCap) {
      for (const df of [-1, 1]) {
        if (!onBoard(f0 + df, r0 + dir)) continue;
        const t = sq(f0 + df, r0 + dir);
        if (enemyAt(t)) push(t, true);
        else if (s.ep === t) push(t, true, true);
      }
    }
    return moves;
  }

  const step = (offsets: number[][]) => {
    for (const [df, dr] of offsets) {
      if (!onBoard(f0 + df, r0 + dr)) continue;
      const t = sq(f0 + df, r0 + dr);
      const q = s.board[t];
      if (!q) moves.push({ from, to: t, capture: false });
      else if (canCap && enemyAt(t)) moves.push({ from, to: t, capture: true });
    }
  };
  const slide = (dirs: number[][]) => {
    for (const [df, dr] of dirs) {
      let f = f0 + df;
      let r = r0 + dr;
      while (onBoard(f, r)) {
        const t = sq(f, r);
        const q = s.board[t];
        if (!q) moves.push({ from, to: t, capture: false });
        else {
          if (canCap && enemyAt(t)) moves.push({ from, to: t, capture: true });
          break;
        }
        f += df;
        r += dr;
      }
    }
  };

  switch (p.type) {
    case "n":
      step(KNIGHT);
      break;
    case "b":
      slide(BISHOP_DIRS);
      break;
    case "r":
      slide(ROOK_DIRS);
      break;
    case "q":
      slide(ROOK_DIRS);
      slide(BISHOP_DIRS);
      break;
    case "k": {
      step(KING);
      const home = p.color === "w" ? 0 : 7;
      const opp = other(p.color);
      if (from === sq(4, home) && !inCheck(s)) {
        const kRight = p.color === "w" ? "K" : "k";
        const qRight = p.color === "w" ? "Q" : "q";
        const empty = (f: number) => !s.board[sq(f, home)];
        const safe = (f: number) => !isAttacked(s.board, sq(f, home), opp, s.ply);
        const rookAt = (f: number) => {
          const r = s.board[sq(f, home)];
          return r?.type === "r" && r.color === p.color;
        };
        if (s.castling.includes(kRight) && rookAt(7) && empty(5) && empty(6) && safe(5))
          moves.push({ from, to: sq(6, home), capture: false, castle: "K" });
        if (
          s.castling.includes(qRight) && rookAt(0) && empty(3) && empty(2) && empty(1) && safe(3)
        )
          moves.push({ from, to: sq(2, home), capture: false, castle: "Q" });
      }
      break;
    }
  }
  return moves;
}

/** Apply a move to the board only (no guilt bookkeeping). */
function applyToBoard(board: (Piece | null)[], m: Move, mover: Piece): (Piece | null)[] {
  const b = board.slice();
  b[m.from] = null;
  if (m.ep) {
    const dir = mover.color === "w" ? 1 : -1;
    b[m.to - 8 * dir] = null;
  }
  if (m.castle) {
    const home = rankOf(m.from);
    const [rf, rt] = m.castle === "K" ? [7, 5] : [0, 3];
    b[sq(rt, home)] = b[sq(rf, home)];
    b[sq(rf, home)] = null;
  }
  b[m.to] = m.promotion ? { ...mover, type: m.promotion } : mover;
  return b;
}

function leavesKingSafe(s: GameState, m: Move): boolean {
  const mover = s.board[m.from]!;
  const b = applyToBoard(s.board, m, mover);
  const k = kingSquare(b, mover.color);
  return k < 0 || !isAttacked(b, k, other(mover.color), s.ply);
}

export function legalMoves(s: GameState): Move[] {
  const out: Move[] = [];
  for (let i = 0; i < 64; i++) {
    const p = s.board[i];
    if (!p || p.color !== s.turn) continue;
    for (const m of pseudoMoves(s, i)) if (leavesKingSafe(s, m)) out.push(m);
  }
  return out;
}

export function legalMovesFrom(s: GameState, from: number): Move[] {
  const p = s.board[from];
  if (!p || p.color !== s.turn) return [];
  return pseudoMoves(s, from).filter((m) => leavesKingSafe(s, m));
}

/** Captures this guilty piece would have, were it not guilt-ridden. */
export function blockedCaptures(s: GameState, from: number): number[] {
  const p = s.board[from];
  if (!p || !p.guilt || p.color !== s.turn) return [];
  const seen = new Set<number>();
  for (const m of pseudoMoves(s, from, true)) {
    if (m.capture && leavesKingSafe(s, m)) seen.add(m.to);
  }
  return [...seen];
}

export function explainIllegal(s: GameState, from: number, to: number): IllegalReason {
  const p = s.board[from];
  if (!p || p.color !== s.turn) return "invalid";
  if (p.guilt && blockedCaptures(s, from).includes(to)) return "guilty";
  if (pseudoMoves(s, from).some((m) => m.to === to)) return "check";
  return "invalid";
}

// ---------------------------------------------------------------------------
// Making moves

export function makeMove(s: GameState, m: Move): { state: GameState; events: MoveEvents } {
  const n = s.ply;
  const original = s.board[m.from]!;
  const capturedSq = m.ep ? m.to - 8 * (original.color === "w" ? 1 : -1) : m.to;
  const captured = m.capture ? s.board[capturedSq] : null;
  const events: MoveEvents = {
    moverId: original.id,
    capturedId: captured?.id ?? null,
    guilt: null,
    absolvedIds: [],
    cleansedIds: [],
    lapsedIds: [],
  };

  let mover: Piece = { ...original };
  if (m.capture) {
    if (original.type === "b") {
      mover.guilt = { pending: "self", bishopId: null, resolvesAtPly: n + 2, checkUntilPly: n + 1 };
      events.guilt = "self";
    } else {
      const bishop = neighbors(m.to)
        .map((t) => s.board[t])
        .find((q) => q && q.id !== original.id && q.color === original.color && q.type === "b");
      if (bishop) {
        mover.guilt = {
          pending: "proximity",
          bishopId: bishop.id,
          resolvesAtPly: n + 2,
          checkUntilPly: n + 1,
        };
        events.guilt = "proximity";
      } else {
        mover.guilt = { ...plainGuilt(), checkUntilPly: n + 1 };
        events.guilt = "plain";
      }
    }
  }
  const board = applyToBoard(s.board, m, mover);
  mover = board[m.to]!;

  // A bishop arriving (by moving or promoting) absolves every guilty friendly neighbor.
  if (mover.type === "b") {
    for (const t of neighbors(m.to)) {
      const q = board[t];
      if (q && q.color === mover.color && q.guilt) {
        board[t] = { ...q, guilt: null };
        events.absolvedIds.push(q.id);
      }
    }
  }

  // Resolve pending cleanses that were waiting for this move.
  for (let i = 0; i < 64; i++) {
    const q = board[i];
    if (!q || q.color !== original.color || !q.guilt?.pending) continue;
    if (q.guilt.resolvesAtPly !== n) continue;
    if (q.guilt.pending === "self") {
      board[i] = { ...q, guilt: null };
      events.cleansedIds.push(q.id);
    } else {
      const bIdx = board.findIndex((x) => x?.id === q.guilt!.bishopId);
      if (bIdx >= 0 && adjacent(bIdx, i)) {
        board[i] = { ...q, guilt: null };
        events.cleansedIds.push(q.id);
      } else {
        board[i] = { ...q, guilt: { ...q.guilt, pending: null, bishopId: null } };
        events.lapsedIds.push(q.id);
      }
    }
  }

  // Castling rights.
  let castling = s.castling;
  const strip = (chars: string) => {
    for (const c of chars) castling = castling.replace(c, "");
  };
  if (original.type === "k") strip(original.color === "w" ? "KQ" : "kq");
  const corners: Record<number, string> = { 0: "Q", 7: "K", 56: "q", 63: "k" };
  if (corners[m.from]) strip(corners[m.from]);
  if (corners[m.to]) strip(corners[m.to]);

  const dir = original.color === "w" ? 1 : -1;
  const ep =
    original.type === "p" && Math.abs(m.to - m.from) === 16 ? m.from + 8 * dir : null;

  return {
    state: {
      board,
      turn: other(s.turn),
      ply: n + 1,
      castling,
      ep,
      halfmove: original.type === "p" || m.capture ? 0 : s.halfmove + 1,
    },
    events,
  };
}

// ---------------------------------------------------------------------------
// Status & notation

export function getStatus(s: GameState): Status {
  if (legalMoves(s).length === 0) return inCheck(s) ? "checkmate" : "stalemate";
  if (s.halfmove >= 100) return "draw";
  const others = s.board.filter((p) => p && p.type !== "k");
  if (others.length === 0) return "draw";
  return "playing";
}

const LETTER: Record<PieceType, string> = { p: "", n: "N", b: "B", r: "R", q: "Q", k: "K" };

export function toSan(s: GameState, m: Move): string {
  const p = s.board[m.from]!;
  let san: string;
  if (m.castle) san = m.castle === "K" ? "O-O" : "O-O-O";
  else if (p.type === "p") {
    san = m.capture ? `${FILES[fileOf(m.from)]}x${squareName(m.to)}` : squareName(m.to);
    if (m.promotion) san += `=${LETTER[m.promotion]}`;
  } else {
    const rivals = legalMoves(s).filter(
      (o) => o.to === m.to && o.from !== m.from && s.board[o.from]?.type === p.type,
    );
    let dis = "";
    if (rivals.length) {
      const sameFile = rivals.some((o) => fileOf(o.from) === fileOf(m.from));
      const sameRank = rivals.some((o) => rankOf(o.from) === rankOf(m.from));
      if (!sameFile) dis = FILES[fileOf(m.from)];
      else if (!sameRank) dis = String(rankOf(m.from) + 1);
      else dis = squareName(m.from);
    }
    san = `${LETTER[p.type]}${dis}${m.capture ? "x" : ""}${squareName(m.to)}`;
  }
  const after = makeMove(s, m).state;
  if (inCheck(after)) san += legalMoves(after).length === 0 ? "#" : "+";
  return san;
}

const cleanSan = (san: string) => san.replace(/[+#!?]/g, "").replace(/^0-0(-0)?$/, (x) => x.replace(/0/g, "O"));

export function moveFromSan(s: GameState, san: string): Move {
  const want = cleanSan(san);
  const m = legalMoves(s).find((mv) => cleanSan(toSan(s, mv)) === want);
  if (!m) throw new Error(`Illegal move ${san}`);
  return m;
}

/** Display string like "3... dxe4" for the move about to be played. */
export function moveLabel(s: GameState, san: string): string {
  const num = Math.floor(s.ply / 2) + 1;
  return s.turn === "w" ? `${num}. ${san}` : `${num}... ${san}`;
}

export const PIECE_NAMES: Record<PieceType, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
