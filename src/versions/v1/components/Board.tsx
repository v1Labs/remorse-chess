"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  type GameState,
  type Piece,
  type PieceType,
  fileOf,
  inCheck,
  kingSquare,
  PIECE_NAMES,
  rankOf,
  squareName,
} from "@/versions/v1/lib/chess/engine";
import type { MoveInput } from "@/versions/v1/lib/chess/useMoveInput";
import type { BoardDecor } from "@/versions/v1/lib/tutorial/stage";

interface BoardProps {
  game: GameState;
  /** Changing this fades the board in (used when jumping to an unrelated position). */
  boardKey: number;
  decor: BoardDecor;
  animate: boolean;
  /** Present when the learner may move pieces. */
  input?: MoveInput | null;
  label: string;
}

interface Ghost {
  piece: Piece;
  square: number;
}

const pieceSrc = (p: { color: string; type: string }) =>
  `/pieces/Chess_${p.type}${p.color === "w" ? "l" : "d"}t45.svg`;

const pos = (sq: number): CSSProperties => ({
  transform: `translate(${fileOf(sq) * 100}%, ${(7 - rankOf(sq)) * 100}%)`,
});

function describe(p: Piece | null): string {
  if (!p) return "empty";
  const guilt = p.guilt ? (p.guilt.pending ? ", guilt-ridden, cleansing soon" : ", guilt-ridden") : "";
  return `${p.color === "w" ? "white" : "black"} ${PIECE_NAMES[p.type]}${guilt}`;
}

export function Board({ game, boardKey, decor, animate, input, label }: BoardProps) {
  // Track captured pieces so they can fade out underneath the capturing piece.
  const [prev, setPrev] = useState<{ game: GameState; key: number; ghosts: Ghost[] }>({
    game,
    key: boardKey,
    ghosts: [],
  });
  if (prev.game !== game) {
    let ghosts: Ghost[] = [];
    if (prev.key === boardKey && animate) {
      const ids = new Set(game.board.filter(Boolean).map((p) => p!.id));
      prev.game.board.forEach((p, square) => {
        if (p && !ids.has(p.id)) ghosts.push({ piece: p, square });
      });
      if (ghosts.length > 1) ghosts = [];
    }
    setPrev({ game, key: boardKey, ghosts });
  }

  const [focusSq, setFocusSq] = useState(12);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const interactive = !!input;
  const targetSet = new Map(input?.targets.map((m) => [m.to, m.capture]) ?? []);
  const blockedSet = new Set(input?.blocked ?? []);
  const zoneSet = new Set(decor.zones);
  const checkSq = inCheck(game) ? kingSquare(game.board, game.turn) : -1;

  function onKeyDown(e: KeyboardEvent) {
    const delta: Record<string, [number, number]> = {
      ArrowUp: [0, 1],
      ArrowDown: [0, -1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    const f = Math.min(7, Math.max(0, fileOf(focusSq) + d[0]));
    const r = Math.min(7, Math.max(0, rankOf(focusSq) + d[1]));
    const next = r * 8 + f;
    setFocusSq(next);
    buttons.current[next]?.focus();
  }

  const squares = [];
  for (let row = 0; row < 8; row++) {
    for (let file = 0; file < 8; file++) {
      const rank = 7 - row;
      const s = rank * 8 + file;
      const dark = (file + rank) % 2 === 0;
      const piece = game.board[s];
      const isLast = decor.lastMove && (decor.lastMove.from === s || decor.lastMove.to === s);
      const isTarget = targetSet.has(s);
      const classes = [
        "relative flex items-center justify-center select-none",
        dark ? "bg-[var(--sq-dark)]" : "bg-[var(--sq-light)]",
      ];
      const overlays = (
        <>
          {isLast && <span className="absolute inset-0 bg-[var(--sq-last)]" />}
          {zoneSet.has(s) && <span className="zone absolute inset-0" />}
          {checkSq === s && <span className="absolute inset-0 bg-[radial-gradient(circle,rgba(220,38,38,0.65)_0%,rgba(220,38,38,0)_70%)]" />}
          {input?.selected === s && <span className="absolute inset-0 bg-[var(--sq-select)]" />}
          {isTarget &&
            (targetSet.get(s) ? (
              <span className="absolute inset-[4%] rounded-full border-[0.35em] border-black/25" />
            ) : (
              <span className="absolute h-[30%] w-[30%] rounded-full bg-black/25" />
            ))}
          {file === 0 && (
            <span className={`absolute left-[4%] top-[2%] text-[0.62em] font-semibold ${dark ? "text-[var(--sq-light)]" : "text-[var(--sq-dark)]"}`}>
              {rank + 1}
            </span>
          )}
          {rank === 0 && (
            <span className={`absolute bottom-[1%] right-[5%] text-[0.62em] font-semibold ${dark ? "text-[var(--sq-light)]" : "text-[var(--sq-dark)]"}`}>
              {"abcdefgh"[file]}
            </span>
          )}
        </>
      );
      const name = `${squareName(s)}, ${describe(piece)}${input?.selected === s ? ", selected" : ""}${
        isTarget ? (targetSet.get(s) ? ", capture available" : ", move available") : ""
      }${blockedSet.has(s) ? ", capture blocked by guilt" : ""}`;
      squares.push(
        interactive ? (
          <button
            key={s}
            ref={(el) => {
              buttons.current[s] = el;
            }}
            type="button"
            tabIndex={s === focusSq ? 0 : -1}
            aria-label={name}
            onFocus={() => setFocusSq(s)}
            onClick={() => input!.onSquare(s)}
            className={`${classes.join(" ")} cursor-pointer focus-visible:z-10 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-sky-500`}
          >
            {overlays}
          </button>
        ) : (
          <div key={s} className={classes.join(" ")}>
            {overlays}
          </div>
        ),
      );
    }
  }

  const pieces = game.board
    .map((p, s) => (p ? { p, s } : null))
    .filter((x): x is { p: Piece; s: number } => !!x)
    .sort((a, b) => a.p.id.localeCompare(b.p.id));

  return (
    <div
      className="board relative aspect-square w-full overflow-hidden rounded-md shadow-[0_10px_40px_-12px_rgba(41,30,25,0.45)] ring-1 ring-black/10"
      style={{ containerType: "inline-size" }}
    >
      <div key={boardKey} className={`absolute inset-0 [font-size:clamp(8px,2.2cqw,17px)] ${animate ? "board-fade" : ""}`}>
        <div
          role={interactive ? "group" : "img"}
          aria-label={label}
          onKeyDown={interactive ? onKeyDown : undefined}
          className="absolute inset-0 grid grid-cols-8 grid-rows-8"
        >
          {squares}
        </div>

        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {prev.ghosts.map((g) => (
            <div key={`ghost-${g.piece.id}`} className="ghost absolute h-1/8 w-1/8" style={pos(g.square)}>
              <PieceImage piece={g.piece} />
            </div>
          ))}
          {pieces.map(({ p, s }) => {
            const nudge = decor.nudge?.pieceId === p.id ? decor.nudge : null;
            return (
              <div
                key={p.id}
                className={`absolute h-1/8 w-1/8 ${animate ? "transition-transform duration-[450ms] ease-[cubic-bezier(.3,.7,.3,1)]" : ""}`}
                style={pos(s)}
              >
                <div
                  key={nudge?.key ?? "still"}
                  className={`h-full w-full ${nudge ? "nudge" : ""}`}
                  style={nudge ? ({ "--dx": `${nudge.dx * 38}%`, "--dy": `${nudge.dy * 38}%` } as CSSProperties) : undefined}
                >
                  <PieceImage piece={p} />
                  {p.guilt && <GuiltToken pending={!!p.guilt.pending} />}
                </div>
              </div>
            );
          })}
          {[...blockedSet].map((b) => (
            <div key={`blocked-${b}`} className="absolute flex h-1/8 w-1/8 items-center justify-center" style={pos(b)}>
              <span className="rise-in flex h-[46%] w-[46%] items-center justify-center rounded-full bg-rose-600 text-[1.1em] font-bold leading-none text-white shadow-md ring-2 ring-white">
                ✕
              </span>
            </div>
          ))}
          {decor.fx.map((f) => (
            <div key={f.id} className="absolute h-1/8 w-1/8" style={pos(f.square)}>
              {f.kind === "cry" && <span className="fx-cry absolute inset-0 flex items-center justify-center text-[2.4em]">😢</span>}
              {f.kind === "sparkle" && <span className="fx-sparkle absolute inset-0 flex items-center justify-center text-[2.4em]">✨</span>}
              {f.kind === "blocked" && (
                <span className="fx-blocked absolute inset-0 flex items-center justify-center text-[2.6em] font-bold text-rose-600">✕</span>
              )}
            </div>
          ))}
          {decor.arrows.length > 0 && (
            <svg viewBox="0 0 8 8" className="absolute inset-0 h-full w-full">
              <defs>
                <marker id="arrow-hint" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="rgba(14,116,144,0.85)" />
                </marker>
                <marker id="arrow-blocked" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="rgba(225,29,72,0.85)" />
                </marker>
              </defs>
              {decor.arrows.map((a, i) => {
                const x1 = fileOf(a.from) + 0.5;
                const y1 = 7 - rankOf(a.from) + 0.5;
                const x2 = fileOf(a.to) + 0.5;
                const y2 = 7 - rankOf(a.to) + 0.5;
                const len = Math.hypot(x2 - x1, y2 - y1);
                const k = (len - 0.35) / len;
                return (
                  <line
                    key={i}
                    className="arrow-draw"
                    x1={x1}
                    y1={y1}
                    x2={x1 + (x2 - x1) * k}
                    y2={y1 + (y2 - y1) * k}
                    stroke={a.kind === "blocked" ? "rgba(225,29,72,0.85)" : "rgba(14,116,144,0.85)"}
                    strokeWidth={0.16}
                    strokeLinecap="round"
                    strokeDasharray={a.kind === "blocked" ? "0.25 0.18" : undefined}
                    markerEnd={`url(#arrow-${a.kind})`}
                  />
                );
              })}
            </svg>
          )}
        </div>

        {input?.promotion && (
          <PromotionPicker
            color={game.turn}
            file={fileOf(input.promotion.to)}
            onPick={input.choosePromotion}
          />
        )}
      </div>
    </div>
  );
}

function PieceImage({ piece }: { piece: { color: string; type: string } }) {
  return (
    <div
      className="h-full w-full bg-contain bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${pieceSrc(piece)})` }}
    />
  );
}

function GuiltToken({ pending }: { pending: boolean }) {
  return (
    <span className="token-pop absolute right-[2%] top-[2%] flex h-[42%] w-[42%] items-center justify-center">
      {pending && <span className="token-ring absolute inset-[-12%] rounded-full border-2 border-dashed border-amber-500" />}
      <span className="flex h-full w-full items-center justify-center rounded-full bg-white/95 text-[1.05em] leading-none shadow ring-1 ring-rose-300">
        😢
      </span>
    </span>
  );
}

function PromotionPicker({
  color,
  file,
  onPick,
}: {
  color: "w" | "b";
  file: number;
  onPick: (t: PieceType | null) => void;
}) {
  const types: PieceType[] = ["q", "r", "b", "n"];
  return (
    <div className="absolute inset-0 z-20 bg-black/40" onClick={() => onPick(null)}>
      <div
        role="dialog"
        aria-label="Choose a promotion piece"
        className={`absolute flex w-1/8 flex-col overflow-hidden rounded-md bg-white shadow-xl ${color === "w" ? "top-0" : "bottom-0 flex-col-reverse"}`}
        style={{ left: `${file * 12.5}%` }}
        onClick={(e) => e.stopPropagation()}
      >
        {types.map((t) => (
          <button
            key={t}
            type="button"
            autoFocus={t === "q"}
            aria-label={`Promote to ${PIECE_NAMES[t]}`}
            onClick={() => onPick(t)}
            className="aspect-square w-full p-[8%] hover:bg-amber-100 focus-visible:bg-amber-100 focus-visible:outline-none"
          >
            <PieceImage piece={{ color, type: t }} />
          </button>
        ))}
      </div>
    </div>
  );
}
