import { HeartCrack, Sparkles } from "lucide-react";

/**
 * The guilt marker: a small solid token in the piece's top-right corner, in front of the piece.
 * - pending: guilt is about to clear, shown as a rotating dashed ring.
 * - releasing: guilt was just lifted. The token flips edge-on, swaps the heart-crack for
 *   sparkles, finishes the turn facing forward, and fades out while scaling up.
 */
export function GuiltToken({ pending, releasing = false }: { pending: boolean; releasing?: boolean }) {
  return (
    <span aria-hidden className="guilt-token">
      {releasing ? (
        <span className="guilt-disc guilt-release">
          <HeartCrack className="guilt-icon release-out" strokeWidth={2.75} />
          <Sparkles className="guilt-icon release-in" strokeWidth={2.5} />
        </span>
      ) : pending ? (
        <span className="guilt-ring" />
      ) : (
        <span className="guilt-disc">
          <HeartCrack className="guilt-icon" strokeWidth={2.75} />
        </span>
      )}
    </span>
  );
}

/** Small inline version for legends and the rules recap. */
export function GuiltSwatch({ pending = false }: { pending?: boolean }) {
  return (
    <span aria-hidden className="relative inline-block h-4 w-4 shrink-0 align-[-0.2em]">
      {pending ? (
        <span className="guilt-ring guilt-ring-static" />
      ) : (
        <span className="guilt-disc guilt-disc-static">
          <HeartCrack className="absolute inset-[20%] h-[60%] w-[60%] text-white" strokeWidth={3} />
        </span>
      )}
    </span>
  );
}
