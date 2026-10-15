import { describe, expect, it } from "vitest";
import { toReplayFrames } from "@/server/api/goal-replay";

describe("toReplayFrames", () => {
  it("converts inches from the top-left corner to rink feet and splits out the puck", () => {
    const frames = toReplayFrames([
      {
        timeStamp: 1000,
        onIce: {
          "1": { id: 1, playerId: "", x: 2281.2, y: 516, sweaterNumber: "", teamAbbrev: "" },
          "9035": { id: 9035, playerId: 8476999, x: 2256, y: 546, sweaterNumber: 35, teamAbbrev: "OTT" },
        },
      },
      { timeStamp: 1001, onIce: { "1": { id: 1, playerId: "", x: 1200, y: 510 } } },
    ]);
    expect(frames).toEqual([
      // 2281.2 / 12 - 100 = 90.1; 516 / 12 - 42.5 = 0.5
      { t: 0, puck: { x: 90.1, y: 0.5 }, players: [{ playerId: 8476999, team: "OTT", sweaterNumber: 35, x: 88, y: 3 }] },
      { t: 0.1, puck: { x: 0, y: 0 }, players: [] },
    ]);
  });

  it("skips frames without a timestamp and returns nothing for an empty replay", () => {
    expect(toReplayFrames([{ onIce: {} }])).toEqual([]);
    expect(toReplayFrames([])).toEqual([]);
  });

  it("reads string sweater numbers and player IDs", () => {
    const [frame] = toReplayFrames([{ timeStamp: 5, onIce: { a: { playerId: "8478402", sweaterNumber: "97", teamAbbrev: "EDM", x: 1200, y: 510 } } }]);
    expect(frame.players[0]).toMatchObject({ playerId: 8478402, sweaterNumber: 97 });
    expect(frame.puck).toBeNull();
  });
});
