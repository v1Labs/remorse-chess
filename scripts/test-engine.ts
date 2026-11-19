/**
 * Rules-engine tests: perft counts for standard move generation, plus scenarios for every
 * Remorse Chess rule. Run with `npm test`. Targets the latest version's engine.
 */
import * as E from "../src/versions/v9/lib/chess/engine.ts";
let failed = 0;
const assert = (c: unknown, msg: string) => {
  if (!c) {
    failed++;
    console.error("FAIL", msg);
  } else console.log("ok  ", msg);
};
function perft(s: E.GameState, d: number): number {
  if (d === 0) return 1;
  let n = 0;
  for (const m of E.legalMoves(s)) n += perft(E.makeMove(s, m).state, d - 1);
  return n;
}
const start = E.fromFen(E.START_FEN);
assert(perft(start, 3) === 8902, "perft start 3");
assert(perft(start, 4) === 197281, "perft start 4");
const kiwi = E.fromFen("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1");
assert(perft(kiwi, 1) === 48, "kiwipete 1");
assert(perft(kiwi, 2) === 2039, "kiwipete 2");
const p3 = E.fromFen("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1");
assert(perft(p3, 1) === 14 && perft(p3, 2) === 191, "position 3 d1-2");

const play = (s: E.GameState, sans: string[]) => { let ev: E.MoveEvents | null = null; for (const san of sans) { const r = E.makeMove(s, E.moveFromSan(s, san)); s = r.state; ev = r.events; } return { s, ev: ev! }; };
const at = (s: E.GameState, name: string) => s.board[E.parseSquare(name)];

// Caro-Kann tutorial line
let { s, ev } = play(start, ["e4", "c6", "d4", "d5", "Nf3", "dxe4"]);
assert(at(s, "e4")?.guilt && ev.guilt === "plain", "dxe4 makes pawn guilty");
({ s } = play(s, ["Nc3"]));
assert(!E.legalMoves(s).some(m => E.squareName(m.from) === "e4" && E.squareName(m.to) === "f3"), "guilty pawn cannot take f3");
assert(E.explainIllegal(s, E.parseSquare("e4"), E.parseSquare("f3")) === "guilty", "explain guilty");
assert(E.blockedCaptures(s, E.parseSquare("e4")).map(E.squareName).join() === "f3", "blocked captures f3");
({ s, ev } = play(s, ["Bf5"]));
assert(!at(s, "e4")?.guilt && ev.absolvedIds.length === 1, "Bf5 absolves e4");

// self-cleanse
s = E.fromFen("6k1/pp3ppp/8/8/6n1/8/PP2BPPP/6K1 w - - 0 1");
({ s, ev } = play(s, ["Bxg4"]));
assert(ev.guilt === "self" && at(s, "g4")?.guilt?.pending === "self", "bishop self pending");
({ s } = play(s, ["a6"]));
assert(at(s, "g4")?.guilt, "still guilty after opponent reply");
({ s, ev } = play(s, ["h3"]));
assert(!at(s, "g4")?.guilt && ev.cleansedIds.includes("wb1"), "bishop cleansed after own next move");

// proximity
const prox = E.fromFen("6k1/pp3ppp/8/8/4p3/2NB4/PP3PPP/6K1 w - - 0 1");
({ s, ev } = play(prox, ["Nxe4", "a6"]));
assert(at(s, "e4")?.guilt?.pending === "proximity", "proximity pending");
({ s, ev } = play(s, ["h3"]));
assert(!at(s, "e4")?.guilt && ev.cleansedIds.length === 1, "proximity cleansed");
({ s, ev } = play(prox, ["Nxe4", "a6", "Ng3"]));
assert(at(s, "g3")?.guilt && ev.lapsedIds.length === 1 && at(s, "g3")?.guilt?.pending === null, "proximity lapses when separated");

// no bishops: promote to bishop absolves
s = E.fromFen("7k/3PR1pp/8/8/8/8/5PPP/6K1 w - - 0 1", ["e7"]);
({ s, ev } = play(s, ["d8=B"]));
assert(!at(s, "e7")?.guilt && ev.absolvedIds.length === 1, "promotion to bishop absolves");

// guilty pieces don't give check; capture's check counts once
assert(!E.inCheck(E.fromFen("k7/8/8/8/8/8/8/R3K3 b - - 0 1", ["a1"])), "guilty rook gives no check");
const c = E.fromFen("k7/8/8/8/8/8/p7/R3K3 w - - 0 1");
({ s } = play(c, ["Rxa2+"]));
assert(E.inCheck(s), "capture delivers check");
assert(E.legalMoves(s).every(m => E.squareName(m.to) !== "a7"), "king must escape the capture's check");
assert(!E.inCheck(E.fromFen("8/8/8/8/8/8/R7/k7 w - - 0 1", ["a2"])), "after grace guilty rook doesn't check");
const s2 = play(c, ["Rxa2+", "Kb8", "Kd2"]).s; // black to move, rook guilty
assert(E.legalMoves(s2).some(m => E.squareName(m.to) === "a8"), "king may stand on file of guilty rook");
// mate via capture
const m8 = E.fromFen("6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1");
const mate = play(m8, ["Re8+"]).s;
assert(E.getStatus(mate) === "checkmate", "clean rook back-rank mate");
const mc = E.fromFen("4r1k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1");
const mate2 = play(mc, ["Rxe8#"]).s;
assert(E.getStatus(mate2) === "checkmate", "capture into checkmate");

// ---- v2: moving next to a bishop starts cleansing
const mv = E.fromFen("6k1/pp3ppp/8/5N2/8/3B4/PP3PPP/6K1 w - - 0 1", ["f5"]);
({ s, ev } = play(mv, ["Ne3"]));
assert(ev.pendingIds.length === 1 && at(s, "e3")?.guilt?.pending === "proximity", "v2: guilty knight moving beside bishop starts cleansing");
({ s } = play(s, ["a6"]));
assert(at(s, "e3")?.guilt, "v2: still guilty after opponent reply");
({ s, ev } = play(s, ["h3"]));
assert(!at(s, "e3")?.guilt && ev.cleansedIds.length === 1, "v2: cleansed after owner's next move");
({ s, ev } = play(mv, ["Ne3", "a6", "Ng4"]));
assert(at(s, "g4")?.guilt?.pending === null && ev.lapsedIds.length === 1, "v2: lapses when knight leaves");
({ s, ev } = play(mv, ["Ne3", "a6", "Bc2"]));
assert(at(s, "e3")?.guilt?.pending === null && ev.lapsedIds.length === 1, "v2: lapses when bishop leaves");
({ s, ev } = play(mv, ["Ne3", "a6", "Be4"]));
assert(!at(s, "e3")?.guilt && ev.absolvedIds.length === 1, "v2: bishop arriving still absolves immediately");
// opponent capturing the bishop makes it lapse
const lb = E.fromFen("3r2k1/pp3ppp/8/5N2/8/3B4/PP3PPP/6K1 w - - 0 1", ["f5"]);
({ s, ev } = play(lb, ["Ne3", "Rxd3"]));
assert(at(s, "e3")?.guilt?.pending === null && ev.lapsedIds.length === 1, "v2: lapses when bishop is captured");

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll engine tests passed");
