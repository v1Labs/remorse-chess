"use client";

import { useMemo, useState } from "react";
import {
  type GameState,
  type IllegalReason,
  type Move,
  type PieceType,
  blockedCaptures,
  explainIllegal,
  legalMoves,
} from "./engine";

export interface MoveInput {
  selected: number | null;
  targets: Move[];
  blocked: number[];
  promotion: { from: number; to: number } | null;
  onSquare(sq: number): void;
  /** Select a piece without toggling (used when a drag starts). */
  select(sq: number): void;
  /** Drop a dragged piece from `from` onto `to`. */
  drop(from: number, to: number): void;
  choosePromotion(type: PieceType | null): void;
  clear(): void;
}

/**
 * Click-to-move input. Reports legal moves through `onMove` and rule-blocked attempts
 * (guilt or king safety) through `onIllegal`.
 */
export function useMoveInput(
  game: GameState,
  enabled: boolean,
  onMove: (m: Move) => void,
  onIllegal?: (from: number, to: number, reason: IllegalReason) => void,
): MoveInput {
  const [sel, setSel] = useState<{ game: GameState; sq: number } | null>(null);
  const [promo, setPromo] = useState<{ game: GameState; from: number; to: number } | null>(null);

  // Selection only applies to the position it was made in.
  const selected = enabled && sel?.game === game ? sel.sq : null;
  const promotion = enabled && promo?.game === game ? { from: promo.from, to: promo.to } : null;

  const legal = useMemo(() => (enabled ? legalMoves(game) : []), [game, enabled]);
  const targets = useMemo(
    () => (selected === null ? [] : legal.filter((m) => m.from === selected)),
    [legal, selected],
  );
  const blocked = useMemo(
    () => (selected === null ? [] : blockedCaptures(game, selected)),
    [game, selected],
  );

  /** Try to move the piece on `from` to `sq`, reporting rule-blocked attempts. */
  function tryMove(from: number, sq: number) {
    const moves = legal.filter((m) => m.from === from && m.to === sq);
    if (moves.length === 0) {
      const reason = explainIllegal(game, from, sq);
      if (reason !== "invalid") onIllegal?.(from, sq, reason);
      setSel(null);
      return;
    }
    if (moves.some((m) => m.promotion)) {
      setSel({ game, sq: from });
      setPromo({ game, from, to: sq });
      return;
    }
    setSel(null);
    onMove(moves[0]);
  }

  const isOwn = (sq: number) => game.board[sq]?.color === game.turn;

  function onSquare(sq: number) {
    if (!enabled || promotion) return;
    if (selected === null) {
      if (isOwn(sq)) setSel({ game, sq });
      return;
    }
    if (sq === selected) {
      setSel(null);
      return;
    }
    if (isOwn(sq) && !legal.some((m) => m.from === selected && m.to === sq)) {
      setSel({ game, sq });
      return;
    }
    tryMove(selected, sq);
  }

  function select(sq: number) {
    if (enabled && !promotion && isOwn(sq)) setSel({ game, sq });
  }

  function drop(from: number, to: number) {
    if (!enabled || promotion || from === to) return;
    if (isOwn(to)) {
      setSel({ game, sq: from });
      return;
    }
    tryMove(from, to);
  }

  function choosePromotion(type: PieceType | null) {
    if (!promotion) return;
    const m = legal.find(
      (x) => x.from === promotion.from && x.to === promotion.to && x.promotion === type,
    );
    setPromo(null);
    setSel(null);
    if (m) onMove(m);
  }

  return {
    selected,
    targets,
    blocked,
    promotion,
    onSquare,
    select,
    drop,
    choosePromotion,
    clear: () => {
      setSel(null);
      setPromo(null);
    },
  };
}
