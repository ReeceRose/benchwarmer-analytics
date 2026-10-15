import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RankedBars, RankedTeamLabel } from "@/components/charts";
import type { TeamPowerRanking } from "@/types";

interface TeamRankingBarsProps {
  teams: TeamPowerRanking[];
  season?: number;
}

/** Share of available points, one bar per team from zero, best record first. Bars under .500 are faded. */
export function TeamRankingBars({ teams, season }: TeamRankingBarsProps) {
  const rows = teams
    .map((team) => {
      const pointsPct = team.gamesPlayed > 0 ? (team.points / (team.gamesPlayed * 2)) * 100 : 0;
      return {
        key: team.abbreviation,
        abbrev: team.abbreviation,
        label: <RankedTeamLabel abbrev={team.abbreviation} />,
        value: pointsPct,
        points: team.points,
        display: `${pointsPct.toFixed(1)}%`,
        meta: `${team.wins}-${team.losses}-${team.otLosses}`,
        title: `${team.name}: ${team.points} pts in ${team.gamesPlayed} GP`,
      };
    })
    .sort((a, b) => b.value - a.value || b.points - a.points);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Points %</CardTitle>
        <CardDescription>Share of available points, best record first.</CardDescription>
      </CardHeader>
      <CardContent>
        <RankedBars
          rows={rows}
          headers={{ label: "Team", value: "Pts%", meta: "Record" }}
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          formatTick={(t) => `${t}%`}
          reference={50}
          fadeBelowReference
          renderRow={(row, props) => (
            <Link
              key={row.key}
              to="/teams/$abbrev"
              params={{ abbrev: row.abbrev }}
              search={{ season }}
              {...props}
            />
          )}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Dashed line is .500. Teams below it are faded.
        </p>
      </CardContent>
    </Card>
  );
}
