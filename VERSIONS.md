# Versions

The tutorial is built in iterations so the review process is visible. Each version is a frozen, self-contained snapshot with its own route, root layout and stylesheet. `/` always shows the latest.

| Version | Route | Date | Summary |
| ------- | ----- | ---- | ------- |
| v1 | [`/v1`](http://localhost:3000/v1) | 2026-11-19 | First build from the brief: 9 steps, scripted board demos synced to typed narration, interactive tasks, and free play vs CPU or a second player. |

## How versioning works

```
src/
  app/
    (latest)/layout.tsx   → root layout for "/" (uses the latest version's RootLayout)
    (latest)/page.tsx     → "/" renders the latest version's Tutorial
    (v1)/layout.tsx       → root layout for v1
    (v1)/v1/page.tsx      → "/v1"
    global-not-found.tsx  → standalone 404 page (there is no single root layout)
  versions/
    registry.ts           → list of versions; the last entry is "latest"
    latest.ts             → re-exports the latest version's Tutorial and RootLayout
    VersionBadge.tsx      → shared badge: current version, link to latest
    v1/
      RootLayout.tsx      → <html>/<body>, fonts, imports ./styles.css
      styles.css          → v1's Tailwind entry, design tokens and keyframes
      components/, lib/   → v1's UI, engine, CPU and step scripts
```

- **Every version has its own stylesheet.** `src/versions/vN/styles.css` is imported only by that version's `RootLayout`. Tailwind is limited to scanning that version's folder (`@import "tailwindcss" source(none); @source "./";`), so each stylesheet contains only its own version's classes, tokens and keyframes. Changing v2's styles can't affect v1.
- **Every version has its own root layout.** Each version route sits in its own route group with its own root layout. Next.js only removes a page's global CSS on a full page load, and moving between root layouts always triggers one, so styles from one version never leak into another.
- **Snapshots are self-contained.** Each `src/versions/vN/` folder imports only from itself (`@/versions/vN/...`). The only shared pieces are `public/pieces/`, `registry.ts`, `VersionBadge.tsx` and `global-not-found.tsx`.
- **New versions start from a copy of the previous one, styles included.** Nothing is inherited at runtime, and stylesheets are never combined.
- **Once a version is published, its folder doesn't change.** The only exception is a fix needed to keep it running.

## Releasing a new version

Example for v2:

1. **Write the change list.** Add a `### v2` section to the change log below with the requested changes before starting work.
2. **Copy the latest snapshot**, including its stylesheet and root layout:
   ```bash
   cp -R src/versions/v1 src/versions/v2
   grep -rl '@/versions/v1/' src/versions/v2 | xargs sed -i '' 's#@/versions/v1/#@/versions/v2/#g'
   sed -i '' 's/current="v1"/current="v2"/' src/versions/v2/components/Tutorial.tsx
   sed -i '' 's/^ \* v1 stylesheet/ * v2 stylesheet/' src/versions/v2/styles.css
   ```
3. **Add the route:** copy `src/app/(v1)` to `src/app/(v2)`, rename the inner `v1/` folder to `v2/`, and point both files at `@/versions/v2/...`. Update the layout's metadata title.
4. **Register it:** append v2 to `src/versions/registry.ts` and point both exports in `src/versions/latest.ts` at `./v2/...`.
5. **Make the changes** in `src/versions/v2/` only, styles included.
6. **Verify:** `npm run lint && npm run build`, then check `/`, `/v2` and every older route at desktop and mobile widths. Older versions should look exactly as before.
7. **Record what shipped:** update the table above and fill in the version's section with what changed and any deviations from the request.

## Change log

### v1

Built from the original brief. See the README for the rules as implemented, the architecture and known limitations.

<!-- ### v2
**Requested:**
- …

**Shipped:**
- …
-->
