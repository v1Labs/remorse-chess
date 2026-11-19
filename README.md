# Remorse Chess: an interactive tutorial

An interactive tutorial that teaches **Remorse Chess**, a chess variant where capturing a piece makes the capturer guilt-ridden and unable to capture again until a bishop absolves it.

The tutorial has 9 steps. Each one plays a scripted demo on a live board while the lesson text types out alongside it. Most steps then hand the board to the learner for a short task with feedback. The last step is a full game against a simple CPU or a second player on the same screen.

## Running locally

Requires Node.js 22 LTS or newer.

```bash
npm ci
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm test             # rules-engine tests (perft + every Remorse Chess rule)
npm run lint
npm run build && npm start
npm run dev:clean    # dev server with Turbopack's persistent cache cleared (see Known issues)
```

Jump to a step with its URL hash, e.g. `/#absolution` or `/#play`.

## Versions

The tutorial was built in short iterations from written change requests. `/` serves the latest version (**v9**), and every earlier version is still available at its own route (`/v1` … `/v9`). Each version is a frozen copy with its own root layout and stylesheet, so later changes never affect earlier ones. [VERSIONS.md](VERSIONS.md) has the change log (what was asked, what shipped, interpretations) and the release process.

Highlights: v1 was the first build from the brief. v2 changed a rule and the typography. v3 added drag and drop. v4–v9 refined board transitions, buttons and the guilt marker.

## The rules as implemented

Remorse Chess uses all standard chess rules, plus:

- **Guilt.** A piece that captures becomes guilt-ridden, shown by a red heart-crack token. It can still move, block and be captured, but cannot capture. En passant counts as a capture.
- **No check from guilty pieces.** A guilty piece can't capture the king, so it doesn't give check. The exception is the capture itself: if a capturing move gives check (or mate), the opponent must answer it on their next move.
- **Absolution.** A bishop that *moves* to a square next to guilty friendly pieces absolves all of them immediately. A bishop arriving by promotion counts too.
- **Self-cleanse.** A bishop that captures becomes guilty and is cleansed at the end of its owner's next move.
- **Proximity.** A guilty piece that ends its owner's move next to a friendly bishop (including by capturing there) starts cleansing, shown by a rotating dashed ring. It is cleansed at the end of its owner's next move if it's still next to a friendly bishop. If it's separated from every bishop first, it stays guilty.
- **No bishops.** With no bishops, guilt is permanent until a pawn promotes to a bishop.
- Deterministic variant: no dice.

## How it's built

Paths are relative to `src/versions/v9/`.

- **Next.js 16 (App Router) + React 19 + Tailwind CSS 4**, from the provided starter. The tutorial is one client component tree. The current step lives in the URL hash (`useSyncExternalStore`), so back/forward and deep links work.
- **`lib/chess/engine.ts`**: a small chess engine written for this project. I didn't use chess.js because guilt changes core rules (check detection, king safety, checkmate), and patching those from outside would be fragile. `npm test` checks move generation against standard perft counts and covers every guilt rule.
- **`lib/chess/ai.ts`**: the CPU opponent, a 3-ply alpha-beta search. Its evaluation discounts guilty pieces and gives bishops a small bonus for their power to absolve.
- **`lib/tutorial/steps.ts`**: each step is an `async` script (`say`, `move`, `zone`, `arrow`, `bump`, `task`, …). That keeps narration and board animation in sync by construction, and makes steps easy to edit.
- **`lib/tutorial/useTutorialRunner.ts`**: runs a script with cancellation (jumping steps mid-animation), *Skip animation*, *Replay*, and tasks that pause the script until the learner solves them (or presses *Show me*).
- **`components/Board.tsx`**:
  - Pieces keep stable IDs, so moves are CSS transitions.
  - Captured pieces fade out underneath the capturing piece.
  - When the position changes, pieces fade out and in. Outgoing pieces are removed on a timer, so none can linger into the next step.
  - Guilt tokens flip to sparkles when guilt is lifted.
  - Moves work by drag and drop (pointer events), click, or keyboard.

### Interaction and feedback

- **Pacifism:** try to capture with the guilty pawn. The capture is shown as blocked (✕) and the tutorial explains why.
- **Absolution:** find the bishop move that absolves a guilty knight. The bishop's reach is highlighted.
- **Self-cleanse:** make any move and watch the bishop forgive itself.
- **Proximity:** move a guilty knight next to a bishop and watch it get cleansed a turn later. Wrong moves are explained and not played.
- **No bishops:** promote to a bishop (the promotion picker is part of the lesson).
- **Try it:** a full game vs CPU or two players, with move list, undo, rule recap and plain-language notices about guilt events.
- Every task has a **Show me** fallback, so nobody gets stuck.

### Accessibility

- Narration is typed visually, but screen readers get each paragraph whole through a polite live region.
- When the learner can move, board squares are buttons with descriptive labels (piece, guilt state, legal or blocked moves). Arrow keys move between squares (roving tabindex) and Enter selects, so the board doesn't depend on drag and drop.
- `prefers-reduced-motion` skips animations and typing.
- The mobile flyout menu closes with Escape and moves focus into the menu.
- The accent red `#c92552` is 5.43:1 on white and 4.87:1 on the page background: WCAG AA, not AAA.

## Tools used

- **Claude Code (Claude Opus)** as a pair programmer. It asked clarifying questions about ambiguous rules, wrote the engine, step scripts and UI, and applied each version's change list. I directed the design, wrote the change requests, and reviewed each version in the browser.
- **lucide-react** for the heart-crack and sparkles icons.
- Piece images: [Cburnett chess pieces](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces) from Wikimedia Commons, licensed **CC BY-SA 3.0**.
- Fonts: Outfit (headings), Inter (text) and Geist Mono (move notation) via `next/font`.

Approximate time spent: _fill in_.

## Tradeoffs

- **Versions as full copies.** Each version duplicates its components, engine and stylesheet instead of sharing code. That's a lot of duplication (9 copies of the engine), but it makes every iteration reviewable side by side and impossible to break by later work. For a real product I'd keep one codebase and use git tags or preview deployments instead.
- **Own engine instead of chess.js.** It took more time up front, but it was the only clean way to make guilt affect check and checkmate, and it made the v2 rule change a small, tested edit.
- **Scripted steps over a declarative step format.** Async scripts are less inspectable than data, but they made syncing text, moves and tasks simple.
- **Steps 6–8 use small custom positions** instead of continuing the Caro-Kann game, so each rule is shown in isolation.

## Known issues and limitations

- **Small screens:** the layout stacks the board above the lesson, but the lesson text and task prompts start below the board, so phone users have to scroll to read them. Touch drag and drop hasn't been tested on a real device.
- **CPU strength:** the CPU is weak and doesn't deliberately plan absolutions.
- **Draw rules:** checkmate, stalemate, the 50-move rule and bare kings are detected. Threefold repetition is not.
- **Progress:** the table-of-contents checkmarks are kept in memory only and reset on reload.
- **Dev server cache:** Turbopack's persistent dev cache sometimes kept serving a stale build of a newly copied version's stylesheet, even across restarts. `npm run dev:clean` clears it. Production builds aren't affected.

## With more time

- Keep the lesson visible on phones (a compact board or a sticky lesson drawer) and test touch drag on devices.
- A short quiz before free play, saved progress, and a "what changed" replay for CPU moves.
- A dark theme.
