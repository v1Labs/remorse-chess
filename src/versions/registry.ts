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
  {
    id: "v2",
    path: "/v2",
    date: "2026-11-19",
    summary:
      "Outfit/Inter typography, red heart-crack guilt tokens, new logo, tighter copy and slower typing, and guilty pieces cleansed by moving next to a bishop.",
  },
  {
    id: "v3",
    path: "/v3",
    date: "2026-11-19",
    summary:
      "Unified #c92552 accent, outlined guilt tokens with a centered heart-crack, cascading board transitions, and drag-and-drop moves.",
  },
  {
    id: "v4",
    path: "/v4",
    date: "2026-11-19",
    summary:
      "Guilt tokens always behind pieces with a bouncier entrance and larger heart-crack, simple piece fades between positions, and clearer button hover states.",
  },
  {
    id: "v5",
    path: "/v5",
    date: "2026-11-19",
    summary:
      "Small solid guilt token in front of the piece, with a coin-flip to sparkles when guilt is lifted.",
  },
  {
    id: "v6",
    path: "/v6",
    date: "2026-11-19",
    summary: "Smaller guilt token without the white edge, and a quicker release animation.",
  },
  {
    id: "v7",
    path: "/v7",
    date: "2026-11-19",
    summary: "Cleansing pieces show the guilt token with the rotating dashed ring around it.",
  },
  {
    id: "v8",
    path: "/v8",
    date: "2026-11-19",
    summary: "Cleansing pieces show a red heart-crack inside the rotating dashed ring, with no red background.",
  },
];

export const LATEST = VERSIONS[VERSIONS.length - 1];
