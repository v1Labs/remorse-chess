import { LATEST, VERSIONS } from "./registry";

/** Shows which version is being viewed and links to the latest when viewing an older one. */
export function VersionBadge({ current }: { current: string }) {
  const info = VERSIONS.find((v) => v.id === current);
  const isLatest = current === LATEST.id;
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium">
      <span
        title={info?.summary}
        className="rounded-full border border-line bg-background px-2 py-0.5 font-mono text-muted"
      >
        {current}
        {isLatest && <span className="sr-only"> (latest version)</span>}
      </span>
      {!isLatest && (
        <a href={LATEST.path} className="text-accent underline underline-offset-2">
          Latest: {LATEST.id} →
        </a>
      )}
    </span>
  );
}
