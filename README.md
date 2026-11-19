# Remorse Chess: an interactive tutorial

An interactive tutorial that teaches **Remorse Chess**, a chess variant where capturing a piece makes the capturer guilt-ridden and unable to capture again until a bishop absolves it.

The tutorial has 9 steps. Each step plays a scripted demo on a live board while the lesson text types out alongside it. Most steps then hand the board to the learner for a short task with feedback. The last step is a full game against a simple CPU or a second player on the same screen.

## Running locally

Requires Node.js 22 LTS or newer.

```bash
npm ci
npm run dev        # http://localhost:3000
```

Checks and production build:

```bash
npm run lint
npm run build
npm start
```

Jump straight to a step with its URL hash, e.g. `/#absolution` or `/#play`.

## Versions

The tutorial is developed in iterations. `/` always serves the latest version, and each version stays available at its own route (`/v1`, `/v2`, …). See [VERSIONS.md](VERSIONS.md) for the change log and the release process.

## The rules as implemented

Remorse Chess uses all standard chess rules, plus:

- **Guilt.** A piece that captures becomes guilt-ridden (😢 token). It can still move, block and be captured, but cannot capture. En passant counts as a capture.
- **No check from guilty pieces.** A guilty piece can't capture the king, so it doesn't give check. The exception is the capture itself: if a capturing move gives check (or mate), the opponent must answer it on their next move.
- **Absolution.** A bishop that *moves* to a square adjacent to guilty friendly pieces absolves all of them. A bishop arriving by promotion counts too.
- **Self-cleanse.** A bishop that captures becomes guilty and is cleansed at the end of its owner's next move.
- **Proximity (v2).** A guilty piece that ends its owner's move next to a friendly bishop (including by capturing there) is cleansed at the end of its owner's next move, if it is still next to a friendly bishop. If it is separated from every bishop first, it stays guilty. In v1 this applied only to captures made next to a bishop.
- **No bishops.** With no bishops, guilt is permanent until a pawn promotes to a bishop.
- Deterministic variant: no dice.

## How it's built

Paths below are relative to a version folder, e.g. `src/versions/v2/`.


- **Next.js 16 (App Router) + React 19 + Tailwind CSS 4**, from the provided starter. The app is a single client component tree. The step lives in the URL hash (`useSyncExternalStore`), so back/forward and deep links work.
- **`lib/chess/engine.ts`**: a small chess engine written for this project. I didn't use chess.js because guilt changes core rules such as check detection, king safety and checkmate, and patching those from outside would be fragile. It is verified against standard perft counts (start position to depth 4, Kiwipete, position 3) plus scenario tests for every guilt rule.
- **`lib/chess/ai.ts`**: the CPU opponent, a 3-ply alpha-beta search. Its evaluation discounts guilty pieces and gives bishops a small bonus for their power to absolve.
- **`lib/tutorial/steps.ts`**: each step is an `async` script (`say`, `move`, `zone`, `arrow`, `bump`, `task`, …). That keeps the narration and board animation in sync by construction, and makes steps easy to edit.
- **`useTutorialRunner`**: runs a script with cancellation (jumping steps mid-animation), *Skip animation*, *Replay*, and tasks that pause the script until the learner solves them (or presses *Show me*).
- **Board**: pieces keep stable IDs, so moves are CSS transitions. Captured pieces fade out underneath the capturing piece.

### Interaction & feedback

- **Pacifism:** try to capture with the guilty pawn. The capture is shown as blocked (✕) and the tutorial explains why.
- **Absolution:** find the bishop move that absolves a guilty knight. The bishop's reach is highlighted.
- **Self-cleanse:** make any move and watch the bishop forgive itself.
- **Proximity:** move a guilty knight next to a bishop and watch it get cleansed a turn later. Wrong moves are explained and not played.
- **No bishops:** promote to a bishop (the promotion picker is part of the lesson).
- **Try it:** a full game vs CPU or with two players, with move list, undo, rule recap and plain-language notices about guilt events.

### Accessibility

- Narration is typed visually, but screen readers get each paragraph whole through a polite live region.
- When the learner can move, board squares are buttons with descriptive labels (piece, guilt state, legal or blocked). Arrow keys move between squares (roving tabindex) and Enter selects.
- `prefers-reduced-motion` skips animations and typing.
- The mobile flyout has Escape to close and moves focus into the menu.

## Tools used

- **Claude Code (Claude Opus)** as a pair programmer. It asked clarifying questions about ambiguous rules, then wrote the engine, step scripts and UI with me. I reviewed and tested in the browser.
- Piece images: [Cburnett chess pieces](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces) from Wikimedia Commons, licensed **CC BY-SA 3.0**.
- Fonts: Geist and Fraunces via `next/font`.

Approximate time spent: _fill in_.

## Tradeoffs, limitations, next steps

- **Moving pieces.** v1–v2 are click-to-move only. v3 adds drag and drop, alongside click and keyboard input.
- **CPU strength.** A shallow search is quick and plays plausibly, but it's weak and doesn't plan absolutions on purpose.
- **Draw rules.** Checkmate, stalemate, the 50-move rule and bare kings are detected. Threefold repetition is not.
- **Steps 6–8 use small custom positions** instead of continuing the Caro-Kann game, so each rule is shown in isolation.
- **Progress** (checkmarks in the table of contents) is kept in memory only, not saved across reloads.
- With more time I would add: a "what changed" replay for CPU moves, saved progress, a short quiz before free play, and a dark theme.
