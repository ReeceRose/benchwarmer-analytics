// Shots on goal, goals and shooting % by shot type (wrist, snap, slap…) from
// the NHL stats API, beside the league's shooting % on each type.

import type { ApiContext } from "@/server/api/handler";
import { HttpError } from "@/server/api/errors";
import { round } from "@/server/api/format";
import { getStatsReport, regularSeasonFilter } from "@/server/api/nhl-client";
import { requirePlayer } from "@/server/api/players";
import { NHL_TEAM_IDS } from "@/server/api/tracking";
import { currentSeason } from "@/server/ingestion/normalize";
import type { ShotTypeRow, ShotTypesResponse } from "@/types";

// The stats API's field suffixes. The rare ones (bat, poke, between the
// legs, cradle) only exist for players and fold into "Other".
const TYPES = [
  { key: "wrist", field: "Wrist", label: "Wrist" },
  { key: "snap", field: "Snap", label: "Snap" },
  { key: "slap", field: "Slap", label: "Slap" },
  { key: "backhand", field: "Backhand", label: "Backhand" },
  { key: "tipIn", field: "TipIn", label: "Tip-in" },
  { key: "deflected", field: "Deflected", label: "Deflection" },
  { key: "wrapAround", field: "WrapAround", label: "Wraparound" },
] as const;
const OTHER_FIELDS = ["Bat", "BetweenLegs", "Cradle", "Poke"];

type Row = Record<string, number | string | null | undefined>;

const n = (row: Row, key: string) => {
  const v = row[key];
  return typeof v === "number" ? v : 0;
};

// Shots and goals by type, summed over rows (several seasons, teams…).
export function shotTypeTotals(rows: Row[]): Map<string, { shots: number; goals: number }> {
  const totals = new Map<string, { shots: number; goals: number }>();
  const add = (key: string, shots: number, goals: number) => {
    const t = totals.get(key) ?? { shots: 0, goals: 0 };
    totals.set(key, { shots: t.shots + shots, goals: t.goals + goals });
  };
  for (const row of rows) {
    for (const t of TYPES) add(t.key, n(row, `shotsOnNet${t.field}`), n(row, `goals${t.field}`));
    for (const f of OTHER_FIELDS) add("other", n(row, `shotsOnNet${f}`), n(row, `goals${f}`));
  }
  return totals;
}

const pct = (goals: number, shots: number) => (shots > 0 ? round(goals / shots, 4) : null);

export function shotTypeRows(own: Map<string, { shots: number; goals: number }>, league: Map<string, { shots: number; goals: number }>): ShotTypeRow[] {
  const labels: Record<string, string> = Object.fromEntries([...TYPES.map((t) => [t.key, t.label]), ["other", "Other"]]);
  return [...own.entries()]
    .filter(([, t]) => t.shots > 0)
    .map(([type, t]) => {
      const lg = league.get(type);
      return {
        type,
        label: labels[type] ?? type,
        shots: t.shots,
        goals: t.goals,
        shootingPct: pct(t.goals, t.shots),
        // Teams don't report the rare types, so "Other" has no league number.
        leagueShootingPct: type === "other" || !lg ? null : pct(lg.goals, lg.shots),
      };
    })
    .sort((a, b) => b.shots - a.shots || a.label.localeCompare(b.label));
}

async function leagueTotals(season: number) {
  const rows = await getStatsReport<Row>("team/shottype", regularSeasonFilter(season));
  return shotTypeTotals(rows ?? []);
}

function upstream(): never {
  throw new HttpError(502, { error: "NHL stats are unavailable", code: "UPSTREAM_UNAVAILABLE" });
}

// The latest regular season (this one or last) where the player has shots.
export async function getPlayerShotTypes(ctx: ApiContext): Promise<ShotTypesResponse> {
  const player = await requirePlayer(ctx.db, ctx.params.id);
  if (player.position === "G") return { season: null, types: [] };
  const latest = currentSeason();
  const rows = await getStatsReport<Row>(
    "skater/shottype",
    `playerId=${player.id} and gameTypeId=2 and seasonId>=${latest - 1}${latest} and seasonId<=${latest}${latest + 1}`,
  );
  if (rows === null) upstream();
  for (const season of [latest, latest - 1]) {
    const own = shotTypeTotals(rows.filter((r) => r.seasonId === Number(`${season}${season + 1}`)));
    if ([...own.values()].some((t) => t.shots > 0)) {
      return { season, types: shotTypeRows(own, await leagueTotals(season)) };
    }
  }
  return { season: null, types: [] };
}

export async function getTeamShotTypes(ctx: ApiContext): Promise<ShotTypesResponse> {
  const teamId = NHL_TEAM_IDS[ctx.params.abbrev?.toUpperCase() ?? ""];
  if (teamId === undefined) throw new HttpError(404, { error: "Team not found", code: "TEAM_NOT_FOUND" });
  for (const season of [currentSeason(), currentSeason() - 1]) {
    const rows = await getStatsReport<Row>("team/shottype", regularSeasonFilter(season));
    if (rows === null) upstream();
    const own = shotTypeTotals(rows.filter((r) => r.teamId === teamId));
    if ([...own.values()].some((t) => t.shots > 0)) {
      return { season, types: shotTypeRows(own, shotTypeTotals(rows)) };
    }
  }
  return { season: null, types: [] };
}
