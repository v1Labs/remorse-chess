import { HeartCrack } from "lucide-react";

/**
 * The guilt marker: an outlined disc behind the piece with a large heart-crack that peeks out
 * around it.
 * A rotating dashed ring shows that the guilt is about to clear.
 */
export function GuiltToken({ pending }: { pending: boolean }) {
  return (
    <span aria-hidden className="absolute inset-0">
      {pending && <span className="guilt-ring" />}
      <span className="guilt-disc">
        <HeartCrack className="guilt-icon" strokeWidth={2.25} />
      </span>
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
          <HeartCrack className="absolute inset-[20%] h-[60%] w-[60%] text-accent" strokeWidth={3} />
        </span>
      )}
    </span>
  );
}
