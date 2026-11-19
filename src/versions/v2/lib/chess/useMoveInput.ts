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

  function onSquare(sq: number) {
    if (!enabled || promotion) return;
    const piece = game.board[sq];
    const own = piece && piece.color === game.turn;
    if (selected === null) {
      if (own) setSel({ game, sq });
      return;
    }
    if (sq === selected) {
      setSel(null);
      return;
    }
    const moves = legal.filter((m) => m.from === selected && m.to === sq);
    if (moves.length === 0) {
      if (own) {
        setSel({ game, sq });
        return;
      }
      const reason = explainIllegal(game, selected, sq);
      if (reason !== "invalid") onIllegal?.(selected, sq, reason);
      setSel(null);
      return;
    }
    if (moves.some((m) => m.promotion)) {
      setPromo({ game, from: selected, to: sq });
      return;
    }
    setSel(null);
    onMove(moves[0]);
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
    choosePromotion,
    clear: () => {
      setSel(null);
      setPromo(null);
    },
  };
}
