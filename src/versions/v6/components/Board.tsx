"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
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
} from "@/versions/v6/lib/chess/engine";
import type { MoveInput } from "@/versions/v6/lib/chess/useMoveInput";
import type { BoardDecor } from "@/versions/v6/lib/tutorial/stage";
import { GuiltToken } from "./GuiltToken";

interface BoardProps {
  game: GameState;
  /** Changing this swaps in an unrelated position: old pieces fade out, new ones fade in. */
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

interface Drag {
  from: number;
  piece: Piece;
  startX: number;
  startY: number;
  left: number;
  top: number;
  size: number;
}

interface DragView {
  piece: Piece;
  from: number;
  x: number;
  y: number;
  size: number;
  over: number | null;
}

/** Outgoing pieces are removed from the DOM after this long, even if no animation runs. */
const EXIT_CLEANUP_MS = 400;
/** Length of the token release animation, including its delay. */
const RELEASE_MS = 1050;

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
  // Track the previous position: captured pieces fade out underneath the capturing piece,
  // when the board key changes the old pieces fade out while the new ones fade in, and
  // pieces whose guilt was just lifted play the token's release animation.
  const [pendingSnap, setPendingSnap] = useState<string | null>(null);
  const [prev, setPrev] = useState<{
    game: GameState;
    key: number;
    ghosts: Ghost[];
    exiting: Ghost[];
    fadeIn: boolean;
    snapId: string | null;
    releasing: { id: string; stamp: number }[];
    stamp: number;
  }>({ game, key: boardKey, ghosts: [], exiting: [], fadeIn: animate, snapId: null, releasing: [], stamp: 0 });
  if (prev.game !== game || prev.key !== boardKey) {
    let ghosts: Ghost[] = [];
    const exiting: Ghost[] = [];
    const swapped = prev.key !== boardKey;
    if (animate && !swapped) {
      const ids = new Set(game.board.filter(Boolean).map((p) => p!.id));
      prev.game.board.forEach((p, square) => {
        if (p && !ids.has(p.id)) ghosts.push({ piece: p, square });
      });
      if (ghosts.length > 1) ghosts = [];
    }
    if (animate && swapped) {
      prev.game.board.forEach((p, square) => {
        if (p) exiting.push({ piece: p, square });
      });
    }
    const stamp = prev.stamp + 1;
    const released: { id: string; stamp: number }[] = [];
    if (animate && !swapped) {
      const wasGuilty = new Set(prev.game.board.filter((p) => p?.guilt).map((p) => p!.id));
      for (const p of game.board) if (p && !p.guilt && wasGuilty.has(p.id)) released.push({ id: p.id, stamp });
    }
    setPrev({
      game,
      key: boardKey,
      ghosts,
      exiting,
      fadeIn: swapped ? animate : prev.fadeIn,
      snapId: swapped ? null : pendingSnap,
      releasing: swapped ? [] : [...prev.releasing.filter((r) => !released.some((x) => x.id === r.id)), ...released],
      stamp,
    });
    if (pendingSnap) setPendingSnap(null);
  }

  // Remove outgoing pieces once their fade is done. This doesn't depend on the CSS animation
  // running, so stale pieces can never linger into the next step.
  const exitingCount = prev.exiting.length;
  useEffect(() => {
    if (!exitingCount) return;
    const t = setTimeout(() => setPrev((p) => ({ ...p, exiting: [] })), EXIT_CLEANUP_MS);
    return () => clearTimeout(t);
  }, [exitingCount, boardKey]);

  // Drop finished release animations.
  const lastRelease = prev.releasing.reduce((m, r) => Math.max(m, r.stamp), 0);
  useEffect(() => {
    if (!lastRelease) return;
    const t = setTimeout(
      () => setPrev((p) => ({ ...p, releasing: p.releasing.filter((r) => r.stamp > lastRelease) })),
      RELEASE_MS,
    );
    return () => clearTimeout(t);
  }, [lastRelease]);

  // Drag and drop. Pointer data lives in a ref; the floating piece renders from state.
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [dragView, setDragView] = useState<DragView | null>(null);

  function squareAt(clientX: number, clientY: number): number | null {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const f = Math.floor(((clientX - rect.left) / rect.width) * 8);
    const r = 7 - Math.floor(((clientY - rect.top) / rect.height) * 8);
    return f >= 0 && f < 8 && r >= 0 && r < 8 ? r * 8 + f : null;
  }

  function onPointerDown(e: ReactPointerEvent, sq: number) {
    suppressClick.current = false;
    if (!input || input.promotion || e.button !== 0 || !e.isPrimary) return;
    const piece = game.board[sq];
    const rect = boardRef.current?.getBoundingClientRect();
    if (!piece || piece.color !== game.turn || !rect) return;
    dragRef.current = {
      from: sq,
      piece,
      startX: e.clientX,
      startY: e.clientY,
      left: rect.left,
      top: rect.top,
      size: rect.width / 8,
    };
    let active = false;
    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (!active && Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY) < 6) return;
      if (!active) {
        active = true;
        input.select(d.from);
      }
      setDragView({
        piece: d.piece,
        from: d.from,
        x: ev.clientX - d.left,
        y: ev.clientY - d.top,
        size: d.size,
        over: squareAt(ev.clientX, ev.clientY),
      });
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      const d = dragRef.current;
      dragRef.current = null;
      setDragView(null);
      if (!d || !active || ev.type === "pointercancel") return;
      const to = squareAt(ev.clientX, ev.clientY);
      if (to === d.from) {
        // Released where it started: keep it selected and swallow the click that follows.
        suppressClick.current = true;
        return;
      }
      if (to === null) return;
      setPendingSnap(d.piece.id);
      input.drop(d.from, to);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
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
          {checkSq === s && <span className="absolute inset-0 bg-[radial-gradient(circle,rgba(201,37,82,0.6)_0%,rgba(201,37,82,0)_70%)]" />}
          {input?.selected === s && <span className="absolute inset-0 bg-[var(--sq-select)]" />}
          {dragView?.over === s && dragView.over !== dragView.from && (
            <span className="absolute inset-0 shadow-[inset_0_0_0_0.3em_rgba(255,255,255,0.75)]" />
          )}
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
            onPointerDown={(e) => onPointerDown(e, s)}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              input!.onSquare(s);
            }}
            style={piece && piece.color === game.turn ? { touchAction: "none" } : undefined}
            className={`${classes.join(" ")} ${piece && piece.color === game.turn ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} focus-visible:z-10 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-sky-500`}
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
      ref={boardRef}
      className="board relative aspect-square w-full overflow-hidden rounded-md shadow-[0_10px_40px_-12px_rgba(41,30,25,0.45)] ring-1 ring-black/10"
      style={{ containerType: "inline-size" }}
    >
      <div className="absolute inset-0 [font-size:clamp(8px,2.2cqw,17px)]">
        <div
          role={interactive ? "group" : "img"}
          aria-label={label}
          onKeyDown={interactive ? onKeyDown : undefined}
          className="absolute inset-0 grid grid-cols-8 grid-rows-8"
        >
          {squares}
        </div>

        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {prev.exiting.map((g) => (
            <div key={`exit-${prev.key}-${g.piece.id}`} className="absolute h-1/8 w-1/8" style={pos(g.square)}>
              <div className="piece-fade-out relative h-full w-full">
                <PieceImage piece={g.piece} />
                {g.piece.guilt && <GuiltToken pending={!!g.piece.guilt.pending} />}
              </div>
            </div>
          ))}
          {prev.ghosts.map((g) => (
            <div key={`ghost-${g.piece.id}`} className="ghost absolute h-1/8 w-1/8" style={pos(g.square)}>
              <PieceImage piece={g.piece} />
            </div>
          ))}
          {pieces.map(({ p, s }) => {
            const nudge = decor.nudge?.pieceId === p.id ? decor.nudge : null;
            const slide = animate && prev.snapId !== p.id;
            const dragging = dragView?.piece.id === p.id;
            return (
              <div
                key={`${prev.key}-${p.id}`}
                className={`absolute h-1/8 w-1/8 ${slide ? "transition-transform duration-[450ms] ease-[cubic-bezier(.3,.7,.3,1)]" : ""}`}
                style={pos(s)}
              >
                <div className={`relative h-full w-full ${prev.fadeIn ? "piece-fade-in" : ""} ${dragging ? "opacity-30" : ""}`}>
                  <div
                    key={nudge?.key ?? "still"}
                    className={`relative h-full w-full ${nudge ? "nudge" : ""}`}
                    style={nudge ? ({ "--dx": `${nudge.dx * 38}%`, "--dy": `${nudge.dy * 38}%` } as CSSProperties) : undefined}
                  >
                    <PieceImage piece={p} />
                  </div>
                </div>
              </div>
            );
          })}
          {/* Guilt tokens: a layer above the pieces; each token sits in its piece's top-right corner. */}
          {pieces.map(({ p, s }) => {
            const releasing = !p.guilt && prev.releasing.some((r) => r.id === p.id);
            if (!p.guilt && !releasing) return null;
            const nudge = decor.nudge?.pieceId === p.id ? decor.nudge : null;
            const slide = animate && prev.snapId !== p.id;
            return (
              <div
                key={`token-${prev.key}-${p.id}`}
                className={`absolute h-1/8 w-1/8 ${slide ? "transition-transform duration-[450ms] ease-[cubic-bezier(.3,.7,.3,1)]" : ""}`}
                style={pos(s)}
              >
                <div
                  className={`relative h-full w-full ${prev.fadeIn ? "piece-fade-in" : ""} ${dragView?.piece.id === p.id ? "opacity-30" : ""}`}
                >
                  <div
                    key={nudge?.key ?? "still"}
                    className={`relative h-full w-full ${nudge ? "nudge" : ""}`}
                    style={nudge ? ({ "--dx": `${nudge.dx * 38}%`, "--dy": `${nudge.dy * 38}%` } as CSSProperties) : undefined}
                  >
                    <GuiltToken pending={!!p.guilt?.pending} releasing={releasing} />
                  </div>
                </div>
              </div>
            );
          })}
          {[...blockedSet].map((b) => (
            <div key={`blocked-${b}`} className="absolute flex h-1/8 w-1/8 items-center justify-center" style={pos(b)}>
              <span className="rise-in flex h-[46%] w-[46%] items-center justify-center rounded-full bg-accent text-[1.1em] font-bold leading-none text-white shadow-md ring-2 ring-white">
                ✕
              </span>
            </div>
          ))}
          {decor.fx.map((f) => (
            <div key={f.id} className="absolute h-1/8 w-1/8" style={pos(f.square)}>
              {f.kind === "cry" && <span className="fx-cry absolute inset-0 flex items-center justify-center text-[2.4em]">😢</span>}
              {f.kind === "sparkle" && <span className="fx-sparkle absolute inset-0 flex items-center justify-center text-[2.4em]">✨</span>}
              {f.kind === "blocked" && (
                <span className="fx-blocked absolute inset-0 flex items-center justify-center text-[2.6em] font-bold text-accent">✕</span>
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
                  <path d="M0,0 L10,5 L0,10 z" fill="rgba(201,37,82,0.9)" />
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
                    stroke={a.kind === "blocked" ? "rgba(201,37,82,0.9)" : "rgba(14,116,144,0.85)"}
                    strokeWidth={0.16}
                    strokeLinecap="round"
                    strokeDasharray={a.kind === "blocked" ? "0.25 0.18" : undefined}
                    markerEnd={`url(#arrow-${a.kind})`}
                  />
                );
              })}
            </svg>
          )}
          {dragView && (
            <div
              className="absolute z-30"
              style={{
                width: dragView.size,
                height: dragView.size,
                left: dragView.x - dragView.size / 2,
                top: dragView.y - dragView.size / 2,
              }}
            >
              <div className="relative h-full w-full scale-110 drop-shadow-[0_6px_8px_rgba(0,0,0,0.35)]">
                <PieceImage piece={dragView.piece} />
                {dragView.piece.guilt && <GuiltToken pending={!!dragView.piece.guilt.pending} />}
              </div>
            </div>
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
