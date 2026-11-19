"use client";

import { useCallback, useRef, useState } from "react";
import { chooseMove } from "./ai";
import {
  type Color,
  type GameState,
  type IllegalReason,
  type Move,
  type MoveEvents,
  fromFen,
  getStatus,
  makeMove,
  moveLabel,
  START_FEN,
  toSan,
} from "./engine";
import { type BoardDecor, emptyDecor, FX_MS, fxForMove } from "@/versions/v5/lib/tutorial/stage";

export type Opponent = "cpu" | "local";

interface Ply {
  state: GameState;
  label: string | null;
  events: MoveEvents | null;
  lastMove: { from: number; to: number } | null;
}

const CPU_COLOR: Color = "b";

function describeEvents(e: MoveEvents, label: string, mover: string): string | null {
  const parts: string[] = [];
  if (e.guilt === "self") parts.push(`${mover}'s bishop is guilt-ridden and will cleanse itself after its next turn.`);
  else if (e.guilt === "proximity") parts.push(`${label}: captured beside a bishop. Guilt clears next turn if they stay together.`);
  else if (e.guilt) parts.push(`${label}: the capturing piece is now guilt-ridden.`);
  else if (e.pendingIds.length) parts.push(`${label}: a guilty piece is beside a bishop. Its guilt clears next turn if they stay together.`);
  if (e.absolvedIds.length) parts.push(`A bishop absolved ${e.absolvedIds.length === 1 ? "a guilty piece" : `${e.absolvedIds.length} guilty pieces`}.`);
  if (e.cleansedIds.length) parts.push(`${e.cleansedIds.length === 1 ? "A piece's" : "Pieces'"} guilt cleared on its own.`);
  if (e.lapsedIds.length) parts.push("A piece was separated from its bishop and stays guilty.");
  return parts.length ? parts.join(" ") : null;
}

export function usePlayGame() {
  const [opponent, setOpponentState] = useState<Opponent>("cpu");
  const [plies, setPlies] = useState<Ply[]>(() => [
    { state: fromFen(START_FEN), label: null, events: null, lastMove: null },
  ]);
  const [fx, setFx] = useState<BoardDecor["fx"]>([]);
  const [thinking, setThinking] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "info" | "warn"; key: number } | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pliesRef = useRef(plies);

  const current = plies[plies.length - 1];
  const status = getStatus(current.state);

  const commit = useCallback((next: Ply[]) => {
    pliesRef.current = next;
    setPlies(next);
  }, []);

  const apply = useCallback(
    (m: Move) => {
      const before = pliesRef.current[pliesRef.current.length - 1].state;
      const label = moveLabel(before, toSan(before, m));
      const { state, events } = makeMove(before, m);
      const next = [...pliesRef.current, { state, label, events, lastMove: { from: m.from, to: m.to } }];
      commit(next);
      const effects = fxForMove(events, state, m.to);
      if (effects.length) {
        setFx((f) => [...f, ...effects]);
        const ids = effects.map((e) => e.id);
        setTimeout(() => setFx((f) => f.filter((x) => !ids.includes(x.id))), FX_MS);
      }
      const who = before.turn === "w" ? "White" : "Black";
      const text = describeEvents(events, label, who);
      setNotice(text ? { text, tone: "info", key: Date.now() } : null);
      return state;
    },
    [commit],
  );

  const cancelCpu = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setThinking(false);
  };

  const scheduleCpu = useCallback(
    (state: GameState) => {
      if (state.turn !== CPU_COLOR || getStatus(state) !== "playing") return;
      setThinking(true);
      timer.current = setTimeout(() => {
        timer.current = null;
        const m = chooseMove(state);
        setThinking(false);
        if (m) apply(m);
      }, 550);
    },
    [apply],
  );

  const humanMove = useCallback(
    (m: Move) => {
      const state = apply(m);
      if (opponent === "cpu") scheduleCpu(state);
    },
    [apply, opponent, scheduleCpu],
  );

  const illegal = useCallback((_from: number, _to: number, reason: IllegalReason) => {
    setNotice({
      text:
        reason === "guilty"
          ? "That piece is guilt-ridden, so it can't capture. Move a bishop next to it to absolve it."
          : "That move would leave your king in check.",
      tone: "warn",
      key: Date.now(),
    });
  }, []);

  const newGame = () => {
    cancelCpu();
    commit([{ state: fromFen(START_FEN), label: null, events: null, lastMove: null }]);
    setFx([]);
    setNotice(null);
    setGameKey((k) => k + 1);
  };

  const undo = () => {
    cancelCpu();
    let next = pliesRef.current.slice(0, -1);
    // Against the CPU, step back to the learner's own turn.
    if (opponent === "cpu" && next.length > 1 && next[next.length - 1].state.turn === CPU_COLOR)
      next = next.slice(0, -1);
    if (!next.length) return;
    commit(next);
    setFx([]);
    setNotice(null);
  };

  const setOpponent = (o: Opponent) => {
    setOpponentState(o);
    if (o === "local") cancelCpu();
    else scheduleCpu(pliesRef.current[pliesRef.current.length - 1].state);
  };

  const humanTurn = opponent === "local" || current.state.turn !== CPU_COLOR;

  const decor: BoardDecor = { ...emptyDecor(), lastMove: current.lastMove, fx };

  return {
    game: current.state,
    gameKey,
    decor,
    status,
    plies,
    opponent,
    setOpponent,
    thinking,
    notice,
    canMove: status === "playing" && humanTurn && !thinking,
    canUndo: plies.length > 1,
    humanMove,
    illegal,
    newGame,
    undo,
  };
}
