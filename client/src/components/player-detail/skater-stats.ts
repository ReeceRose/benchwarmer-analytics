import type { SkaterStats } from "@/types";

export interface SkaterSeasonRow {
  season: number;
  team: string;
  gp: number;
  g: number;
  a: number;
  p: number;
  toi: number;
  shots: number;
  xg: number;
  cf: number | null;
  playoffGp: number | null;
  playoffG: number | null;
  playoffA: number | null;
  playoffP: number | null;
}

export interface SkaterCareerTotals {
  gp: number;
  g: number;
  a: number;
  p: number;
  toi: number;
  shots: number;
  xg: number;
  playoffGp: number;
  playoffG: number;
  playoffA: number;
  playoffP: number;
}

export function buildSkaterSeasonRows(stats: SkaterStats[], situation: string): SkaterSeasonRow[] {
  const seasonTeamMap = new Map<string, { regular: SkaterStats[]; playoffs: SkaterStats[] }>();

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

  const rows: SkaterSeasonRow[] = [];

  for (const [key, data] of seasonTeamMap.entries()) {
    const [seasonStr, team] = key.split("-");
    const season = parseInt(seasonStr, 10);

    const reg = data.regular.reduce(
      (acc, s) => ({
        gp: acc.gp + s.gamesPlayed,
        g: acc.g + s.goals,
        a: acc.a + s.assists,
        p: acc.p + s.points,
        toi: acc.toi + s.iceTimeSeconds,
        shots: acc.shots + s.shots,
        xg: acc.xg + (s.expectedGoals ?? 0),
        cfSum: acc.cfSum + (s.corsiForPct ?? 0) * s.iceTimeSeconds,
        cfTime: acc.cfTime + (s.corsiForPct != null ? s.iceTimeSeconds : 0),
      }),
      { gp: 0, g: 0, a: 0, p: 0, toi: 0, shots: 0, xg: 0, cfSum: 0, cfTime: 0 }
    );

    const play = data.playoffs.reduce(
      (acc, s) => ({
        gp: acc.gp + s.gamesPlayed,
        g: acc.g + s.goals,
        a: acc.a + s.assists,
        p: acc.p + s.points,
      }),
      { gp: 0, g: 0, a: 0, p: 0 }
    );

    if (reg.gp > 0) {
      rows.push({
        season,
        team,
        gp: reg.gp,
        g: reg.g,
        a: reg.a,
        p: reg.p,
        toi: reg.toi,
        shots: reg.shots,
        xg: reg.xg,
        cf: reg.cfTime > 0 ? reg.cfSum / reg.cfTime : null,
        playoffGp: play.gp > 0 ? play.gp : null,
        playoffG: play.gp > 0 ? play.g : null,
        playoffA: play.gp > 0 ? play.a : null,
        playoffP: play.gp > 0 ? play.p : null,
      });
    }
  }

  return rows.sort((a, b) => b.season - a.season);
}

export function calculateSkaterTotals(rows: SkaterSeasonRow[]): SkaterCareerTotals {
  return rows.reduce(
    (acc, row) => ({
      gp: acc.gp + row.gp,
      g: acc.g + row.g,
      a: acc.a + row.a,
      p: acc.p + row.p,
      toi: acc.toi + row.toi,
      shots: acc.shots + row.shots,
      xg: acc.xg + row.xg,
      playoffGp: acc.playoffGp + (row.playoffGp ?? 0),
      playoffG: acc.playoffG + (row.playoffG ?? 0),
      playoffA: acc.playoffA + (row.playoffA ?? 0),
      playoffP: acc.playoffP + (row.playoffP ?? 0),
    }),
    { gp: 0, g: 0, a: 0, p: 0, toi: 0, shots: 0, xg: 0, playoffGp: 0, playoffG: 0, playoffA: 0, playoffP: 0 }
  );
}
