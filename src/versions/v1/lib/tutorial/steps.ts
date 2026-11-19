import { START_FEN, squareName } from "@/versions/v1/lib/chess/engine";
import type { Step } from "./types";

const CARO_KANN = ["e4", "c6", "d4", "d5", "Nf3"];

export const STEPS: Step[] = [
  {
    id: "remorse-chess",
    title: "Remorse Chess",
    heading: "Remorse Chess",
    setup: { fen: START_FEN },
    async script(ctx) {
      await ctx.say("What if chess pieces could feel **guilt** when they capture an enemy piece?");
      await ctx.move("e4");
      await ctx.move("d5");
      await ctx.say("White's pawn has a target. In regular chess, taking it is an easy decision…");
      await ctx.move("exd5");
      await ctx.wait(900);
      await ctx.say(
        "…but this pawn can't shake what it just did. That's the premise of **Remorse Chess**: every capture leaves the capturing piece **guilt-ridden**, and a guilt-ridden piece won't capture again until it has been forgiven.",
      );
      await ctx.say(
        "In the next few steps you'll learn how guilt works and how bishops lift it. Then you'll play a full game.",
      );
    },
  },
  {
    id: "chess-rules",
    title: "Chess rules",
    heading: "Built on standard chess",
    setup: { fen: START_FEN },
    async script(ctx) {
      await ctx.say(
        "Remorse Chess keeps every rule of standard chess: how the pieces move, check and checkmate, castling, en passant, and promotion. Need a refresher? Read the [rules of chess](https://en.wikipedia.org/wiki/Rules_of_chess).",
      );
      await ctx.say("Here's a familiar opening, the **Caro-Kann Defense**.");
      await ctx.move("e4");
      await ctx.move("c6");
      await ctx.move("d4");
      await ctx.move("d5");
      await ctx.move("Nf3");
      await ctx.say(
        "After 1. e4 c6 2. d4 d5 3. Nf3, Black's pawn on d5 is challenging White's pawn on e4. So far this is ordinary chess. Things change the moment someone captures.",
      );
    },
  },
  {
    id: "guilt",
    title: "Guilt",
    heading: "Captures cause guilt",
    setup: { moves: CARO_KANN },
    async script(ctx) {
      await ctx.say("Black takes the pawn: 3… dxe4.");
      await ctx.move("dxe4");
      await ctx.wait(700);
      await ctx.say(
        "The capturing pawn is now **guilt-ridden** and carries a 😢 token. A guilt-ridden piece can still move, block attacks, and be captured. It just **can't capture**.",
      );
      await ctx.say("Guilt belongs to the piece, not the square. Wherever the pawn goes, the guilt goes too.");
    },
  },
  {
    id: "pacifism",
    title: "Pacifism",
    heading: "Guilty pieces can't capture",
    setup: { moves: [...CARO_KANN, "dxe4"] },
    async script(ctx) {
      await ctx.move("Nc3");
      await ctx.say("White plays 4. Nc3 and attacks the pawn on e4.");
      ctx.arrow("e4", "f3", "blocked");
      await ctx.bump("e4", "f3");
      await ctx.say(
        "In regular chess, Black's pawn could just take the knight on f3. But this pawn is guilt-ridden, so the capture is off the table.",
      );
      await ctx.task({
        prompt: "**Your turn (Black):** try to capture the knight on f3 with the pawn on e4. Select the pawn, then the knight.",
        side: "b",
        check(a) {
          if (a.kind === "illegal" && a.reason === "guilty" && squareName(a.from) === "e4")
            return {
              ok: true,
              message:
                "Blocked! A guilty piece's lost captures are marked with ✕. The pawn can still step forward, but it won't take anything.",
            };
          return {
            ok: false,
            message: "Try the capture itself: select the pawn on e4, then the knight on f3.",
          };
        },
      });
      ctx.clearMarks();
      await ctx.say(
        "Since a guilty piece can't capture, it **can't give check** either. The one exception is the capture itself: if a capture puts the enemy king in check, the opponent must answer that check on their next move.",
      );
      await ctx.say("Black's pawn is stuck unless someone can clear its conscience.");
    },
  },
  {
    id: "absolution",
    title: "Absolution",
    heading: "Bishops grant absolution",
    setup: { moves: [...CARO_KANN, "dxe4", "Nc3"] },
    async script(ctx) {
      await ctx.say(
        "Bishops can absolve guilt. When a bishop **moves to a square next to** a guilt-ridden piece of its own color, that piece is forgiven and can capture again.",
      );
      ctx.zone("e4");
      await ctx.wait(500);
      await ctx.move("Bf5");
      await ctx.wait(700);
      ctx.clearMarks();
      await ctx.say(
        "4… Bf5 lands next to the pawn on e4, and its guilt is lifted. Absolution costs the bishop's whole move, so you trade a tempo for a piece that can capture again. Every guilty neighbor is absolved at once.",
      );
      await ctx.load({ fen: "6k1/pp3ppp/8/4N3/8/8/PP3PPP/2B3K1 w - - 0 1", guilty: ["e5"] });
      await ctx.say("Now you try. White's knight on e5 is guilt-ridden.");
      ctx.zone("e5");
      await ctx.task({
        prompt: "**Your turn (White):** move a bishop next to the knight to absolve it.",
        side: "w",
        solution: "Bf4",
        solutionMessage: "Bf4 lands beside the knight and absolves it.",
        check(a) {
          if (a.kind === "move" && a.events.absolvedIds.length)
            return { ok: true, message: "Absolved! The knight can capture again." };
          if (a.kind === "move")
            return {
              ok: false,
              message: "That doesn't put a bishop beside the knight. The squares next to e5 are highlighted.",
            };
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
      await ctx.say(
        "Bishops absolve their neighbors, but a bishop can never stand next to itself. So when a **bishop** captures, it handles its own guilt.",
      );
      await ctx.move("Bxg4");
      await ctx.wait(700);
      await ctx.say(
        "The bishop is guilt-ridden, but the spinning ring around its token means the guilt is temporary. It clears on its own after one more turn.",
      );
      await ctx.move("a6");
      await ctx.task({
        prompt: "**Your turn (White):** make any move and watch the bishop clear its conscience.",
        side: "w",
        solution: "h3",
        solutionMessage: "After h3, White's turn is over, and the bishop's guilt with it.",
        check(a) {
          if (a.kind === "move")
            return { ok: true, message: "Clean again. The bishop's guilt lasted just one of your turns." };
          return null;
        },
      });
      await ctx.say("A guilty bishop can still absolve its neighbors while it waits.");
    },
  },
  {
    id: "proximity",
    title: "Proximity",
    heading: "Capture beside a bishop",
    setup: { fen: "6k1/pp3ppp/8/8/4p3/2NB4/PP3PPP/6K1 w - - 0 1" },
    async script(ctx) {
      await ctx.say(
        "If a piece captures on a square that's **already next to a friendly bishop**, its guilt clears after one more turn, as long as the two stay side by side.",
      );
      ctx.zone("d3");
      await ctx.wait(400);
      await ctx.move("Nxe4");
      await ctx.wait(700);
      ctx.clearMarks();
      await ctx.move("a6");
      await ctx.say(
        "The knight captured on e4, right beside the bishop on d3. Its token has the same ring as a self-cleansing bishop.",
      );
      await ctx.task({
        prompt: "**Your turn (White):** make a move that keeps the knight and bishop together, so the guilt clears.",
        side: "w",
        solution: "h3",
        solutionMessage: "h3 keeps them together, and the knight is cleansed.",
        check(a) {
          if (a.kind !== "move") return null;
          if (a.events.cleansedIds.length || a.events.absolvedIds.length)
            return { ok: true, message: "Cleansed! The knight stayed beside its bishop, so its guilt lifted." };
          return {
            ok: false,
            message: "The knight and bishop drift apart after that move, so the knight would stay guilty. Try keeping them together.",
          };
        },
      });
    },
  },
  {
    id: "no-bishops",
    title: "No bishops",
    heading: "No bishops, no forgiveness",
    setup: { fen: "7k/3PR1pp/8/8/8/8/5PPP/6K1 w - - 0 1", guilty: ["e7"] },
    async script(ctx) {
      await ctx.say(
        "All forgiveness flows through bishops. If you've lost both of yours, guilty pieces stay guilty, **unless a pawn promotes to a bishop**.",
      );
      await ctx.say(
        "White's rook on e7 is guilt-ridden and White has no bishops. But the pawn on d7 is one step from promotion, and d8 is right next to the rook.",
      );
      ctx.zone("e7");
      await ctx.task({
        prompt: "**Your turn (White):** promote the d7 pawn to a bishop to absolve the rook.",
        side: "w",
        solution: "d8=B",
        solutionMessage: "d8=B: the new bishop arrives beside the rook and absolves it.",
        check(a) {
          if (a.kind !== "move") return null;
          if (a.events.absolvedIds.length)
            return { ok: true, message: "A new bishop, and an absolved rook!" };
          if (a.move.promotion)
            return {
              ok: false,
              message: "That piece is strong, but only a bishop can absolve. Promote to a bishop instead.",
            };
          return { ok: false, message: "Promote the pawn on d7: move it to d8 and pick the bishop." };
        },
      });
      ctx.clearMarks();
      await ctx.say(
        "Now that the rook can capture (and give check) again, White threatens Re8, a back-rank checkmate. Usually a queen is the best promotion. In Remorse Chess, a bishop can be the winning choice.",
      );
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
