import type { RaceTeam } from "@/types";

export type Row = { date: string } & Record<string, number | string>;

// One row per date anyone in the division played, with each team's points
// as of that date (carried forward between games).
export function raceRows(teams: RaceTeam[]): Row[] {
  const dates = [...new Set(teams.flatMap((t) => t.points.map((p) => p.date)))].sort();
  const cursor = new Map(teams.map((t) => [t.team, { i: 0, points: 0 }]));
  return dates.map((date) => {
    const row: Row = { date };
    for (const t of teams) {
      const c = cursor.get(t.team)!;
      while (c.i < t.points.length && t.points[c.i].date <= date) c.points = t.points[c.i++].points;
      row[t.team] = c.points;
    }
    return row;
  });
}
