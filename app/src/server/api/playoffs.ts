// The playoff bracket for a season, from the NHL API.

import type { ApiContext } from "@/server/api/handler";
import { HttpError } from "@/server/api/errors";
import { getPlayoffBracket, type NhlBracketSeries, type NhlBracketTeam } from "@/server/api/nhl-client";
import { currentSeason } from "@/server/ingestion/normalize";
import type { BracketSeries, BracketTeamSide, PlayoffBracketResponse } from "@/types";

const FIRST_BRACKET_SEASON = 2007; // the 2007-08 playoffs

function side(team: NhlBracketTeam | null | undefined, seed: string | null | undefined, wins: number | undefined, winnerId: number | null | undefined): BracketTeamSide {
  return {
    team: team?.abbrev ?? null,
    name: team?.name?.default ?? null,
    seed: seed ?? null,
    wins: wins ?? 0,
    won: winnerId != null && team?.id === winnerId,
  };
}

/**
 * Bracket rounds 1-4 (the 2020 qualifying round is left out). Each round's
 * series split into halves by letter: the first half is the left (usually
 * Eastern) side.
 */
export function toBracket(series: NhlBracketSeries[]): BracketSeries[] {
  const rounds = series.filter((s) => (s.playoffRound ?? 0) >= 1 && s.seriesLetter);
  return rounds
    .map((s) => {
      const round = s.playoffRound!;
      const inRound = rounds.filter((x) => x.playoffRound === round).map((x) => x.seriesLetter!).sort();
      const index = inRound.indexOf(s.seriesLetter!);
      return {
        letter: s.seriesLetter!,
        round,
        title: s.seriesTitle ?? `Round ${round}`,
        half: inRound.length < 2 ? null : index < inRound.length / 2 ? ("left" as const) : ("right" as const),
        top: side(s.topSeedTeam, s.topSeedRankAbbrev, s.topSeedWins, s.winningTeamId),
        bottom: side(s.bottomSeedTeam, s.bottomSeedRankAbbrev, s.bottomSeedWins, s.winningTeamId),
      };
    })
    .sort((a, b) => a.round - b.round || a.letter.localeCompare(b.letter));
}

export async function getPlayoffs(ctx: ApiContext): Promise<PlayoffBracketResponse> {
  const latest = currentSeason();
  const requested = ctx.query.int("season");
  if (requested !== undefined && (requested < FIRST_BRACKET_SEASON || requested > latest)) {
    throw new HttpError(404, { error: "No bracket for that season", code: "NOT_FOUND" });
  }
  // Default: this season's playoffs once they start, else last season's.
  let season = requested ?? latest;
  let raw = await getPlayoffBracket(season + 1);
  if (!raw && requested === undefined) {
    season -= 1;
    raw = await getPlayoffBracket(season + 1);
  }
  if (!raw) throw new HttpError(404, { error: "No bracket for that season", code: "NOT_FOUND" });
  const series = toBracket(raw);
  const final = series.find((s) => s.round === 4);
  const champion = final ? (final.top.won ? final.top.team : final.bottom.won ? final.bottom.team : null) : null;
  // Seasons up to the latest with a bracket (this season's once it starts).
  const newest = Math.max(season, latest - 1);
  const seasons = Array.from({ length: newest - FIRST_BRACKET_SEASON + 1 }, (_, i) => newest - i);
  return { season, seasons, series, champion };
}
