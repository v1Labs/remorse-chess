"use client";

import type { usePlayGame } from "@/versions/v8/lib/chess/usePlayGame";
import { inCheck } from "@/versions/v8/lib/chess/engine";
import { GuiltSwatch } from "./GuiltToken";

type Play = ReturnType<typeof usePlayGame>;

const RULES = [
  ["guilt", "A piece that captures becomes **guilt-ridden**: it can't capture or give check."],
  ["✨", "Move a bishop **next to** guilty friendly pieces to absolve them all at once."],
  ["⏳", "A bishop that captures cleanses itself after your next turn."],
  ["🤝", "A guilty piece that ends its move **beside a friendly bishop** is cleansed after your next turn, if they stay together."],
  ["♗", "No bishops? Promote a pawn to a bishop to forgive again."],
];

function bold(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((t, i) => (i % 2 ? <strong key={i} className="font-semibold text-foreground">{t}</strong> : t));
}

export function PlayPanel({ play }: { play: Play }) {
  const turn = play.game.turn === "w" ? "White" : "Black";
  const check = inCheck(play.game);
  let headline: string;
  if (play.status === "checkmate") headline = `Checkmate. ${turn === "White" ? "Black" : "White"} wins!`;
  else if (play.status === "stalemate") headline = "Stalemate. It's a draw.";
  else if (play.status === "draw") headline = "Draw.";
  else if (play.thinking) headline = "The CPU is thinking…";
  else if (play.opponent === "cpu") headline = turn === "White" ? "Your move (White)" : "CPU to move";
  else headline = `${turn} to move`;

  const moves = play.plies.slice(1);
  const rows: { n: number; w?: string; b?: string }[] = [];
  for (const p of moves) {
    const label = p.label!;
    const [num, san] = label.split(/\.+\s/);
    const n = Number(num);
    if (label.includes("...")) {
      const row = rows.find((r) => r.n === n);
      if (row) row.b = san;
      else rows.push({ n, b: san });
    } else rows.push({ n, w: san });
  }

  return (
    <div className="space-y-6">
      <p className="text-[17px] leading-relaxed text-foreground/85">
        You know the rules. Now play a full game of Remorse Chess, against the CPU or with a friend on the same screen.
      </p>

      <div className="space-y-3">
        <div role="radiogroup" aria-label="Opponent" className="inline-flex rounded-lg border border-line bg-background p-1 text-sm">
          {(
            [
              ["cpu", "vs CPU"],
              ["local", "Two players"],
            ] as const
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={play.opponent === value}
              onClick={() => play.setOpponent(value)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                play.opponent === value ? "bg-surface text-foreground shadow-sm ring-1 ring-black/5" : "text-muted hover:text-foreground"
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-line bg-background/60 p-4" aria-live="polite">
          <p className="flex items-center gap-2 font-semibold">
            <span
              aria-hidden
              className={`inline-block h-3 w-3 rounded-full ring-1 ring-black/30 ${play.game.turn === "w" ? "bg-white" : "bg-neutral-900"}`}
            />
            {headline}
            {check && play.status === "playing" && <span className="rounded bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent-strong">Check</span>}
          </p>
          {play.notice && (
            <p key={play.notice.key} className={`rise-in mt-2 text-[15px] ${play.notice.tone === "warn" ? "text-amber-900" : "text-muted"}`}>
              {play.notice.text}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={play.newGame}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:bg-background"
          >
            New game
          </button>
          <button
            type="button"
            onClick={play.undo}
            disabled={!play.canUndo}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:bg-background disabled:opacity-40"
          >
            Undo
          </button>
        </div>
      </div>

      <section aria-labelledby="recap">
        <h3 id="recap" className="mb-2 font-heading text-sm font-bold uppercase tracking-wider text-muted">
          Rules recap
        </h3>
        <ul className="space-y-2 text-[15px] leading-snug text-foreground/80">
          {RULES.map(([icon, text]) => (
            <li key={icon} className="flex gap-2.5">
              <span aria-hidden className="flex w-5 shrink-0 justify-center">
                {icon === "guilt" ? <GuiltSwatch /> : icon}
              </span>
              <span>{bold(text)}</span>
            </li>
          ))}
        </ul>
      </section>

      {rows.length > 0 && (
        <section aria-labelledby="moves">
          <h3 id="moves" className="mb-2 font-heading text-sm font-bold uppercase tracking-wider text-muted">
            Moves
          </h3>
          <ol className="grid max-h-48 grid-cols-[2.5rem_1fr_1fr] gap-x-2 gap-y-0.5 overflow-y-auto font-mono text-sm">
            {rows.map((r) => (
              <li key={r.n} className="contents">
                <span className="text-muted">{r.n}.</span>
                <span>{r.w ?? "…"}</span>
                <span>{r.b ?? ""}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
