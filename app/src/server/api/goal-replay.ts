// Player and puck positions for the ~14 seconds around a goal, from the NHL's
// goal replay tracking. Coordinates arrive in inches from the rink's top-left
// corner; the response uses NHL rink feet centred on the red line (the same
// space as the game centre's Rink), with y running down as in SVG.

import type { ApiContext } from "@/server/api/handler";
import { HttpError } from "@/server/api/errors";
import { round } from "@/server/api/format";
import { intRouteParam } from "@/server/api/query";
import { getGoalReplay as fetchGoalReplay, type NhlReplayFrame } from "@/server/api/nhl-client";
import type { GoalReplayEntity, GoalReplayFrame, GoalReplayResponse } from "@/types";

const toFeetX = (inches: number) => round(inches / 12 - 100, 1);
const toFeetY = (inches: number) => round(inches / 12 - 42.5, 1);

const optionalInt = (v: number | string | undefined): number | null => {
  const n = typeof v === "string" ? Number.parseInt(v, 10) : v;
  return n != null && Number.isFinite(n) ? n : null;
};

export function toReplayFrames(raw: NhlReplayFrame[]): GoalReplayFrame[] {
  const frames = raw.filter((f) => typeof f.timeStamp === "number" && f.onIce);
  if (frames.length === 0) return [];
  const start = frames[0].timeStamp!;
  return frames.map((f) => {
    let puck: GoalReplayFrame["puck"] = null;
    const players: GoalReplayEntity[] = [];
    for (const e of Object.values(f.onIce ?? {})) {
      if (typeof e.x !== "number" || typeof e.y !== "number") continue;
      const playerId = optionalInt(e.playerId);
      if (playerId === null) {
        // The puck is the one entity with no player.
        puck = { x: toFeetX(e.x), y: toFeetY(e.y) };
        continue;
      }
      players.push({
        playerId,
        team: e.teamAbbrev || null,
        sweaterNumber: optionalInt(e.sweaterNumber),
        x: toFeetX(e.x),
        y: toFeetY(e.y),
      });
    }
    return { t: round((f.timeStamp! - start) / 10, 1), puck, players };
  });
}

export async function getGoalReplay({ params }: ApiContext): Promise<GoalReplayResponse> {
  const gameId = params.gameId ?? "";
  const eventId = intRouteParam(params.eventId);
  if (!/^\d{10}$/.test(gameId) || eventId === undefined) {
    throw new HttpError(404, { error: "Replay not found", code: "NOT_FOUND" });
  }
  // Game IDs start with the season's start year.
  const season = Number(gameId.slice(0, 4));
  const raw = await fetchGoalReplay(season, gameId, eventId);
  const frames = raw ? toReplayFrames(raw) : [];
  if (frames.length === 0) throw new HttpError(404, { error: "No tracking for this goal", code: "NOT_FOUND" });
  return { gameId, eventId, frames };
}
