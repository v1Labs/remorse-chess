import { START_FEN, squareName } from "@/versions/v9/lib/chess/engine";
import type { Step } from "./types";

const CARO_KANN = ["e4", "c6", "d4", "d5", "Nf3"];

export const STEPS: Step[] = [
  {
    id: "remorse-chess",
    title: "Remorse Chess",
    heading: "Remorse Chess",
    setup: { fen: START_FEN },
    cry: true,
    async script(ctx) {
      await ctx.say("What if chess pieces felt **guilt** after capturing?");
      await ctx.move("e4");
      await ctx.move("d5");
      await ctx.say("White's pawn has an easy capture…");
      await ctx.move("exd5");
      await ctx.wait(900);
      await ctx.say(
        "…but now it can't shake what it did. In **Remorse Chess**, a piece that captures becomes **guilt-ridden** and won't capture again until it's forgiven.",
      );
      await ctx.say("Learn how guilt works and how bishops lift it, then play a game.");
    },
  },
  {
    id: "chess-rules",
    title: "Chess rules",
    heading: "Built on standard chess",
    setup: { fen: START_FEN },
    async script(ctx) {
      await ctx.say(
        "Remorse Chess keeps every standard [chess rule](https://en.wikipedia.org/wiki/Rules_of_chess). Here's a familiar opening, the **Caro-Kann**.",
      );
      await ctx.move("e4");
      await ctx.move("c6");
      await ctx.move("d4");
      await ctx.move("d5");
      await ctx.move("Nf3");
      await ctx.say("Nothing new yet. That changes with the first capture.");
    },
  },
  {
    id: "guilt",
    title: "Guilt",
    heading: "Captures cause guilt",
    setup: { moves: CARO_KANN },
    async script(ctx) {
      await ctx.say("Black captures: 3… dxe4.");
      await ctx.move("dxe4");
      await ctx.wait(500);
      await ctx.say(
        "The pawn is now **guilt-ridden**, marked by a red token. It can still move, block, and be captured, but it **can't capture**.",
      );
    },
  },
  {
    id: "pacifism",
    title: "Pacifism",
    heading: "Guilty pieces can't capture",
    setup: { moves: [...CARO_KANN, "dxe4"] },
    async script(ctx) {
      await ctx.move("Nc3");
      await ctx.say("White plays 4. Nc3.");
      ctx.arrow("e4", "f3", "blocked");
      await ctx.bump("e4", "f3");
      await ctx.say("Normally the pawn could take the knight on f3. Guilt-ridden, it can't.");
      await ctx.task({
        prompt: "**Your turn (Black):** try capturing the knight on f3 with the e4 pawn.",
        side: "b",
        check(a) {
          if (a.kind === "illegal" && a.reason === "guilty" && squareName(a.from) === "e4")
            return { ok: true, message: "Blocked! Captures lost to guilt are marked ✕." };
          return { ok: false, message: "Select the pawn on e4, then the knight on f3." };
        },
      });
      ctx.clearMarks();
      await ctx.say(
        "Guilty pieces can't give **check** either. The exception is the capture itself: the opponent must answer that check.",
      );
    },
  },
  {
    id: "absolution",
    title: "Absolution",
    heading: "Bishops grant absolution",
    setup: { moves: [...CARO_KANN, "dxe4", "Nc3"] },
    async script(ctx) {
      await ctx.say("A bishop that **moves next to** a guilty piece of its color absolves it immediately.");
      ctx.zone("e4");
      await ctx.wait(500);
      await ctx.move("Bf5");
      await ctx.wait(700);
      ctx.clearMarks();
      await ctx.say("4… Bf5 absolves the pawn. It costs the bishop's move but frees every guilty neighbor at once.");
      await ctx.load({ fen: "6k1/pp3ppp/8/4N3/8/8/PP3PPP/2B3K1 w - - 0 1", guilty: ["e5"] });
      ctx.zone("e5");
      await ctx.task({
        prompt: "**Your turn (White):** absolve the guilty knight on e5 with your bishop.",
        side: "w",
        solution: "Bf4",
        solutionMessage: "Bf4 lands beside the knight and absolves it.",
        check(a) {
          if (a.kind === "move" && a.events.absolvedIds.length)
            return { ok: true, message: "Absolved! The knight can capture again." };
          if (a.kind === "move")
            return { ok: false, message: "Land the bishop on a highlighted square." };
          return null;
        },
      });
      ctx.clearMarks();
    },
  },
  {
    id: "self-cleanse",
    title: "Self-cleanse",
    heading: "Bishops forgive themselves",
    setup: { fen: "6k1/pp3ppp/8/8/6n1/8/PP2BPPP/6K1 w - - 0 1" },
    async script(ctx) {
      await ctx.say("A **bishop that captures** cleanses its own guilt after one turn.");
      await ctx.move("Bxg4");
      await ctx.wait(600);
      await ctx.say("The rotating ring means the guilt is temporary.");
      await ctx.move("a6");
      await ctx.task({
        prompt: "**Your turn (White):** make any move.",
        side: "w",
        solution: "h3",
        solutionMessage: "After h3, the bishop is clean.",
        check(a) {
          if (a.kind === "move") return { ok: true, message: "Clean again, one turn later." };
          return null;
        },
      });
      await ctx.say("A guilty bishop can still absolve its neighbors.");
    },
  },
  {
    id: "proximity",
    title: "Proximity",
    heading: "Stay close to a bishop",
    setup: { fen: "6k1/pp3ppp/8/5N2/8/3B4/PP3PPP/6K1 w - - 0 1", guilty: ["f5"] },
    async script(ctx) {
      await ctx.say(
        "A guilty piece can also go to a bishop. If it ends its move **next to a friendly bishop**, its guilt clears after your next turn, as long as they stay together.",
      );
      ctx.zone("d3");
      await ctx.task({
        prompt: "**Your turn (White):** move the guilty knight next to the bishop.",
        side: "w",
        solution: "Ne3",
        solutionMessage: "Ne3 puts the knight beside the bishop.",
        check(a) {
          if (a.kind !== "move") return null;
          if (a.events.pendingIds.length)
            return { ok: true, message: "The ring shows its guilt is on the way out." };
          if (a.events.absolvedIds.length)
            return { ok: false, message: "That works too, but this time bring the knight to the bishop." };
          return { ok: false, message: "End the knight's move on a highlighted square." };
        },
      });
      ctx.clearMarks();
      await ctx.move("a6");
      await ctx.move("h3");
      await ctx.wait(500);
      await ctx.say("One turn later, it's clean. Capturing next to a bishop works the same way.");
    },
  },
  {
    id: "no-bishops",
    title: "No bishops",
    heading: "No bishops, no forgiveness",
    setup: { fen: "7k/3PR1pp/8/8/8/8/5PPP/6K1 w - - 0 1", guilty: ["e7"] },
    async script(ctx) {
      await ctx.say("Lost both bishops? Then guilt is permanent, **unless a pawn promotes to a bishop**.");
      ctx.zone("e7");
      await ctx.task({
        prompt: "**Your turn (White):** promote the d7 pawn to a bishop to absolve the rook.",
        side: "w",
        solution: "d8=B",
        solutionMessage: "d8=B: the new bishop lands beside the rook and absolves it.",
        check(a) {
          if (a.kind !== "move") return null;
          if (a.events.absolvedIds.length)
            return { ok: true, message: "A new bishop, and an absolved rook!" };
          if (a.move.promotion)
            return { ok: false, message: "Only a bishop can absolve. Promote to a bishop." };
          return { ok: false, message: "Move the d7 pawn to d8 and pick the bishop." };
        },
      });
      ctx.clearMarks();
      await ctx.say("The rook now threatens Re8 checkmate. Sometimes a bishop is the best promotion.");
    },
  },
  {
    id: "play",
    title: "Try it",
    heading: "Play Remorse Chess",
    setup: { fen: START_FEN },
    play: true,
  },
];
