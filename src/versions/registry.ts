/**
 * Every published version of the tutorial. Append a new entry for each iteration;
 * the last entry is the latest and is what `/` serves (see `./latest.ts`).
 */
export interface VersionInfo {
  id: string;
  path: string;
  date: string;
  summary: string;
}

export const VERSIONS: VersionInfo[] = [
  {
    id: "v1",
    path: "/v1",
    date: "2026-11-19",
    summary:
      "First build from the brief: 9 steps, scripted board demos synced to typed narration, interactive tasks, and free play vs CPU or a second player.",
  },
];

export const LATEST = VERSIONS[VERSIONS.length - 1];
