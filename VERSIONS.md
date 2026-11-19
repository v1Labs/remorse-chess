# Versions

The tutorial is built in iterations so the review process is visible. Each version is a frozen, self-contained snapshot with its own route, root layout and stylesheet. `/` always shows the latest.

| Version | Route | Date | Summary |
| ------- | ----- | ---- | ------- |
| v1 | [`/v1`](http://localhost:3000/v1) | 2026-11-19 | First build from the brief: 9 steps, scripted board demos synced to typed narration, interactive tasks, and free play vs CPU or a second player. |
| v2 | [`/v2`](http://localhost:3000/v2) | 2026-11-19 | Outfit/Inter typography, red heart-crack guilt tokens, new logo, tighter copy and slower typing, and guilty pieces cleansed by moving next to a bishop. |
| v3 | [`/v3`](http://localhost:3000/v3) | 2026-11-19 | Unified #c92552 accent, outlined guilt tokens with a centered heart-crack, cascading board transitions, and drag-and-drop moves. |
| v4 | [`/v4`](http://localhost:3000/v4) | 2026-11-19 | Guilt tokens always behind pieces with a bouncier entrance and larger heart-crack, simple piece fades between positions, and clearer button hover states. |
| v5 | [`/v5`](http://localhost:3000/v5) | 2026-11-19 | Small solid guilt token in front of the piece, with a coin-flip to sparkles when guilt is lifted. |
| v6 | [`/v6`](http://localhost:3000/v6) | 2026-11-19 | Smaller guilt token without the white edge, and a quicker release animation. |
| v7 | [`/v7`](http://localhost:3000/v7) | 2026-11-19 | Cleansing pieces show the guilt token with the rotating dashed ring around it. |
| v8 | [`/v8`](http://localhost:3000/v8) | 2026-11-19 | Cleansing pieces show a red heart-crack inside the rotating dashed ring, with no red background. |

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
   sed -i '' 's/v1/v2/g' src/versions/v2/styles.css src/versions/v2/RootLayout.tsx
   ```
3. **Add the route:** copy `src/app/(v1)` to `src/app/(v2)`, rename the inner `v1/` folder to `v2/`, and point both files at `@/versions/v2/...`. Update the layout's metadata title.
4. **Register it:** append v2 to `src/versions/registry.ts` and point both exports in `src/versions/latest.ts` at `./v2/...`.
5. **Make the changes** in `src/versions/v2/` only, styles included.
6. **Verify:** restart the dev server with `npm run dev:clean` after creating the new version. Turbopack's persistent dev cache (`.next/dev/cache`) can keep serving a stale build of a copied stylesheet, even across plain restarts. Then run `npm run lint && npm run build` and check `/`, `/v2` and every older route at desktop and mobile widths. Older versions should look exactly as before.
7. **Record what shipped:** update the table above and fill in the version's section with what changed and any deviations from the request.

## Change log

### v1

Built from the original brief. See the README for the rules as implemented, the architecture and known limitations.

### v2

**Requested:**

1. **Typography hierarchy.** Bold Outfit for headings, regular Inter for body text. Expect targeted adjustments later.
2. **Rule change: moving next to a bishop.** Any guilt-ridden piece is cleansed on the next turn if it ends up adjacent to a friendly bishop. Today only a bishop moving next to it, or a capture beside a bishop, does this.
3. **Guilt token redesign.** The 😢 emoji was meant to illustrate the intro, not to be the marker. Use a circular red token behind the piece instead. Keep the rotating dashed treatment for a token about to be removed, and the sparkle animation on removal.
4. **Logo.** Drop the emoji. Use the Lucide `heart-crack` icon with uppercase bold Outfit text.
5. **Heart-crack on the token.** Add the heart-crack icon to the guilt token. This may mean changing the token's appear animation, or dropping the icon if it doesn't work.
6. **Copy and pacing.** Lesson copy is slightly verbose and typing slightly fast. Shorten the copy and slow the typing a little.

**Shipped:**

1. **Typography.** Outfit (600/700) for headings and Inter for body text, replacing Geist and Fraunces. Geist Mono stays for move notation. Hierarchy: accent eyebrow, then a bold Outfit page heading, then a bold Outfit lesson title, then Inter body text.
   - _Interpretation:_ the request said "Inter is probably too trendy" but chose Inter for body text. I read this as replacing Geist.
2. **Rule change.** Any guilt-ridden piece that ends its owner's move next to a friendly bishop starts cleansing (dashed ring). It's cleansed at the end of the owner's next move if it's still next to *any* friendly bishop. If it is separated from every bishop first, by either side, the ring disappears and the piece stays guilty. A bishop moving next to a guilty piece still absolves it immediately.
   - The old "capture beside a bishop" rule is now just one case of this.
   - The Proximity step was rewritten: the learner moves a guilty knight next to a bishop and watches it get cleansed.
   - The engine has 7 new scenario tests, and perft still matches.
3. **Guilt token.** A red radial-gradient disc behind the piece, scaling in once the move lands. "Cleansing soon" is a rotating dashed amber-to-rose gradient ring. Sparkles on removal are unchanged.
   - The 😢 emoji now appears only in the intro step, as an illustration of the capture.
4. **Logo.** Lucide `heart-crack` with uppercase bold Outfit "REMORSE CHESS" (`lucide-react` added).
5. **Heart-crack on the token.** White icon at the token's top-right, where pieces are narrowest. It animates in with a small "crack" wiggle after the disc appears. At the bottom-right it was hidden by piece bases. The legend and rules recap use a matching swatch.
6. **Copy and pacing.** Lesson copy is roughly a third shorter. Typing slowed from 14 to 19 ms per character.

### v3

**Requested:**

1. **One red.** Several shades of red clash. Use `#c92552` as the base. It passes contrast checks except WCAG AAA, which is fine for a demo but should be noted.
2. **Token outline.** Give the token a darker border and lighter fill so it doesn't read as a fuzzy red circle: a `#c92552` stroke and a lighter gradient fill. The heart-crack icon should be about 80% of the circle's radius, centered, and the same color as the stroke.
3. **Board transitions.** Replace the clunky board fade with this: the board stays put, the old pieces slide off to the left while fading out, and the new pieces drop into place in a quick cascade.
4. **Drag and drop** for moving pieces. This takes effort to get right, so it may be reverted.

**Shipped:**

1. **One red.** `--accent` is now `#c92552`, with `--accent-strong` (hover) and `--accent-soft` (badge background) mixed from it.
   - Every other red now uses it, replacing several Tailwind rose shades and hard-coded reds: blocked-capture markers, arrows, check glow, step indicator, Next button, legend, Check badge and token.
   - Contrast: 5.43:1 on white, 5.34:1 on the panel and 4.87:1 on the page background. This passes WCAG AA (4.5:1) but not AAA (7:1).
2. **Token.** `#c92552` outline (about 0.14em, at least 1.5px) with a light radial gradient fill mixed from the accent. The heart-crack is centered at 40% of the disc's diameter (80% of its radius), in the stroke color.
   - _Known issue:_ centered behind the piece, the icon is almost completely hidden by most pieces (verified on a pawn). Candidates for v4: move it back to the edge, draw it on top of the piece, or drop it.
3. **Board transitions.** The board itself no longer fades. When the position changes, old pieces slide about 1.4 squares left while fading, staggered by file. New pieces then drop in top-left to bottom-right, each fading in from slightly above (220 ms start, 14 ms stagger). Scripted pauses after a position change were lengthened to match.
4. **Drag and drop.** Pointer events on the board; works with mouse and touch.
   - **Dragging:** a piece follows the cursor after 6 px of movement, its legal targets show, and the square under the pointer is outlined.
   - **Dropping:** a legal drop snaps into place with no slide animation. Illegal drops get the same feedback as clicks, such as guilt explanations. Releasing over the piece's own square keeps it selected; releasing off the board cancels.
   - **Unchanged:** click-to-move and keyboard input work as before.
   - **Touch:** scrolling is disabled only on squares holding the side-to-move's pieces, so the page still scrolls from other squares.
   - _Not yet tested:_ touch devices, and promotion by drag.

### v4

**Requested:**

1. **Guilt marker.**
   - Never layer it in front of a piece.
   - Animate it in from 0% to 100% scale with a subtle bounce.
   - Give it a thicker stroke and a fill of `#c92552` at 10% opacity.
   - The heart-crack is too hidden: make it larger relative to the marker so it peeks out.
2. **Board transitions.** The slide-off and drop-in feel broken. Keep the board fixed and simply fade pieces out and in. Make sure pieces are properly cleared between steps: pieces have been seen persisting from one step into the next.
3. **Buttons.** Every button should change the cursor and have a hover state. The right-column buttons have hover states but keep the default cursor. Table-of-contents items should get a slightly darker background on hover.

**Shipped:**

1. **Guilt marker.**
   - Tokens now render in their own layer underneath every piece. They follow the same slide, nudge and fade as their piece, so a token can never be drawn over a piece, even while pieces cross during a move.
   - The marker scales in from 0 to 100% with a subtle bounce.
   - Thicker `#c92552` outline (about 0.24em, at least 2.5px) and a fill of `#c92552` at 10% opacity.
   - The heart-crack is now 84% of the disc and centered, so its lobes peek out around the piece.
   - _To review:_ at small sizes the outline plus heart can read a little like a target.
2. **Board transitions.**
   - The slide-off and cascade are gone. On a position change, old pieces fade out (200 ms) and new ones fade in (260 ms, after 180 ms). The board itself never fades.
   - **Persisting pieces:** I couldn't reproduce this in a production build, even with rapid step-jumping (scripted checks found no stray pieces after things settled). The likely cause is that, in v3, outgoing pieces were only hidden by a CSS animation and stayed in the DOM until the next position change. If that animation didn't run (for example on the dev server, which had served stale CSS), they stayed visible. Outgoing pieces are now removed from the DOM on a timer, whether or not the animation runs.
3. **Buttons.**
   - Every enabled button gets the pointer cursor, through a base style in the v4 stylesheet (Tailwind v4 resets buttons to the default cursor); disabled buttons show `not-allowed`.
   - Table-of-contents items get a subtle darker background on hover.
   - The mobile menu button gained a hover state.

### v5

**Requested:**

1. **Token.** The marker still feels odd behind the pieces. Use a smaller, solid red token with a white heart-crack icon in the top-right foreground, similar in size and placement to v1.
2. **Removal animation.** When guilt is removed, flip the marker: rotate 90°, swap the icon to Lucide `sparkles`, then rotate another 270° so it ends forward-facing. The color fades and the marker scales up to about 1.3 as it disappears.

**Shipped:**

1. **Token.**
   - Solid `#c92552` disc with a thin white edge and a white heart-crack, 40% of a square, in the top-right corner. Same size and placement as v1.
   - The token layer moved back above the pieces.
   - It still scales in with v4's subtle bounce.
   - Pending tokens show only the rotating dashed ring. This carries over an uncommitted edit found in v4's `GuiltToken.tsx`, which was left out of the commits.
2. **Removal animation.**
   - When a piece's guilt is lifted (absolution or cleansing), its token flips like a coin: 0→90° around the vertical axis, where the heart-crack swaps for Lucide `sparkles`, then on to 360° so it faces forward again.
   - The red fill fades and the sparkles shift from white to the accent color. The token scales to 1.3 and fades out over the last 30%, so the forward-facing sparkles stay visible before they go.
   - The animation runs 1.15 s, starting 300 ms after the move so it follows the absolving move.
   - Releasing tokens are tracked per piece, follow the piece if it moves, and are cleared on a timer.
   - _Interpretation:_ the request said the z-axis, but a z-axis turn spins the token flat on the board and shows the icon swap. A y-axis (coin) flip hides the swap at 90° as intended.
   - The ✨ emoji effect for absolution and cleansing was removed in favor of this animation.

### v6

**Requested:** make the token slightly smaller, remove its white stroke, and speed up the release animation a bit.

**Shipped:**

- The token is 32% of a square, down from 40%, still in the top-right corner. The white edge is removed; a soft shadow remains.
- The release flip runs in 750 ms, down from 1150 ms, and starts 200 ms after the move instead of 300 ms. Its shape is unchanged: edge-on swap at 20%, forward-facing at 70%, faded out by 100%.

### v7

**Requested:** while a piece is cleansing, show the guilt token with the rotating dashed circle around it.

**Shipped:**

- Pending (cleansing) pieces now show the full guilt token. The rotating dashed amber-to-accent ring sits just outside it, with a small gap. Previously the ring replaced the token.
- The ring extends slightly past the token, so on the h-file or 8th rank its outer edge can be clipped by the board edge.
- The legend's "cleansing soon" swatch shows a small token inside the ring to match.

### v8

**Requested:** while a piece is cleansing, show only a red broken-heart icon inside the rotating dashed circle, instead of the red token with a white icon.

**Shipped:**

- Cleansing pieces show the rotating dashed ring with a red (`#c92552`) heart-crack inside it, and no background. Only the ring rotates. The heart pops in with the token's bounce when cleansing starts.
- When a cleansing piece's guilt clears, the release flip keeps the no-background look: a red heart flips to red sparkles, with no red disc. Pieces absolved straight from the solid-token state, such as by a bishop arriving, still flip from the solid red token.
- The legend's "cleansing soon" swatch matches.
