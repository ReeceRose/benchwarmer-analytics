import type { GoalieStats } from "@/types";

export interface GoalieSeasonRow {
  season: number;
  team: string;
  gp: number;
  toi: number;
  ga: number;
  sa: number;
  svPct: number | null;
  gaa: number | null;
  gsax: number | null;
  playoffGp: number | null;
  playoffGa: number | null;
  playoffSa: number | null;
  playoffSvPct: number | null;
}

export interface GoalieCareerTotals {
  gp: number;
  toi: number;
  ga: number;
  sa: number;
  svPct: number | null;
  gaa: number | null;
  gsax: number;
  playoffGp: number;
  playoffGa: number;
  playoffSa: number;
  playoffSvPct: number | null;
}

export function buildGoalieSeasonRows(stats: GoalieStats[], situation: string): GoalieSeasonRow[] {
  const seasonTeamMap = new Map<string, { regular: GoalieStats[]; playoffs: GoalieStats[] }>();

  for (const stat of stats) {
    if (stat.situation !== situation) continue;

    const key = `${stat.season}-${stat.team}`;
    if (!seasonTeamMap.has(key)) {
      seasonTeamMap.set(key, { regular: [], playoffs: [] });
    }
    const group = seasonTeamMap.get(key)!;
    if (stat.isPlayoffs) {
      group.playoffs.push(stat);
    } else {
      group.regular.push(stat);
    }
  }

  const rows: GoalieSeasonRow[] = [];

  for (const [key, data] of seasonTeamMap.entries()) {
    const [seasonStr, team] = key.split("-");
    const season = parseInt(seasonStr, 10);

    const reg = data.regular.reduce(
      (acc, s) => ({
        gp: acc.gp + s.gamesPlayed,
        toi: acc.toi + s.iceTimeSeconds,
        ga: acc.ga + s.goalsAgainst,
        sa: acc.sa + s.shotsAgainst,
        gsax: acc.gsax + (s.goalsSavedAboveExpected ?? 0),
      }),
      { gp: 0, toi: 0, ga: 0, sa: 0, gsax: 0 }
    );

    const play = data.playoffs.reduce(
      (acc, s) => ({
        gp: acc.gp + s.gamesPlayed,
        ga: acc.ga + s.goalsAgainst,
        sa: acc.sa + s.shotsAgainst,
      }),
      { gp: 0, ga: 0, sa: 0 }
    );

    if (reg.gp > 0) {
      rows.push({
        season,
        team,
        gp: reg.gp,
        toi: reg.toi,
        ga: reg.ga,
        sa: reg.sa,
        svPct: reg.sa > 0 ? (reg.sa - reg.ga) / reg.sa : null,
        gaa: reg.toi > 0 ? (reg.ga / (reg.toi / 3600)) : null,
        gsax: reg.gsax,
        playoffGp: play.gp > 0 ? play.gp : null,
        playoffGa: play.gp > 0 ? play.ga : null,
        playoffSa: play.gp > 0 ? play.sa : null,
        playoffSvPct: play.sa > 0 ? (play.sa - play.ga) / play.sa : null,
      });
    }
  }

  return rows.sort((a, b) => b.season - a.season);
}

export function calculateGoalieTotals(rows: GoalieSeasonRow[]): GoalieCareerTotals {
  const totals = rows.reduce(
    (acc, row) => ({
      gp: acc.gp + row.gp,
      toi: acc.toi + row.toi,
      ga: acc.ga + row.ga,
      sa: acc.sa + row.sa,
      gsax: acc.gsax + (row.gsax ?? 0),
      playoffGp: acc.playoffGp + (row.playoffGp ?? 0),
      playoffGa: acc.playoffGa + (row.playoffGa ?? 0),
      playoffSa: acc.playoffSa + (row.playoffSa ?? 0),
    }),
    { gp: 0, toi: 0, ga: 0, sa: 0, gsax: 0, playoffGp: 0, playoffGa: 0, playoffSa: 0 }
  );

  return {
    ...totals,
    svPct: totals.sa > 0 ? (totals.sa - totals.ga) / totals.sa : null,
    gaa: totals.toi > 0 ? (totals.ga / (totals.toi / 3600)) : null,
    playoffSvPct: totals.playoffSa > 0 ? (totals.playoffSa - totals.playoffGa) / totals.playoffSa : null,
  };
}

export function formatGaa(value: number | null): string {
  if (value === null) return "-";
  return value.toFixed(2);
}

export function formatGsax(value: number | null): string {
  if (value === null) return "-";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}
