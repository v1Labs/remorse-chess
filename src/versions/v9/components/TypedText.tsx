"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

interface Segment {
  text: string;
  bold?: boolean;
  href?: string;
}

/** Parse the tiny markup used in narration: **bold** and [label](url). */
export function parseRich(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ text: m[1], bold: true });
    else out.push({ text: m[2], href: m[3] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

function renderSegments(segments: Segment[], limit: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  let left = limit;
  segments.forEach((seg, i) => {
    if (left <= 0) return;
    const t = seg.text.slice(0, left);
    left -= t.length;
    if (seg.bold) nodes.push(<strong key={i} className="font-semibold text-foreground">{t}</strong>);
    else if (seg.href)
      nodes.push(
        <a key={i} href={seg.href} target="_blank" rel="noreferrer" className="font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
          {t}
        </a>,
      );
    else nodes.push(t);
  });
  return nodes;
}

/**
 * Types out rich text over `duration` ms. Screen readers get the full text immediately;
 * the animated copy is hidden from assistive tech.
 */
export function TypedText({ text, duration }: { text: string; duration: number }) {
  const segments = useMemo(() => parseRich(text), [text]);
  const total = segments.reduce((n, s) => n + s.text.length, 0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (duration <= 0) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const c = Math.min(total, Math.floor(((t - t0) / duration) * total));
      setCount(c);
      if (c < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, total]);

  const shown = duration <= 0 ? total : count;
  const typing = shown < total;
  if (!typing) return <>{renderSegments(segments, total)}</>;

  return (
    <>
      <span aria-hidden className={typing ? "caret" : undefined}>
        {renderSegments(segments, shown)}
      </span>
      <span className="sr-only">{renderSegments(segments, total)}</span>
    </>
  );
}

/** Static rich text (no typing). */
export function RichText({ text }: { text: string }) {
  return <>{renderSegments(parseRich(text), Infinity)}</>;
}
