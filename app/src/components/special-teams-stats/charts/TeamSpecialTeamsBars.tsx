import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RankedBars, RankedTeamLabel, niceAxis } from "@/components/charts";
import type { TeamSpecialTeamsRanking } from "@/types";

interface TeamSpecialTeamsBarsProps {
  teams: TeamSpecialTeamsRanking[];
  metric: "pp" | "pk";
  season?: number;
}

/**
 * PP% or PK% for every team. PK% can't sensibly start at zero, so both grow
 * out from the league average: right for above, left (muted) for below.
 */
export function TeamSpecialTeamsBars({ teams, metric, season }: TeamSpecialTeamsBarsProps) {
  const isPp = metric === "pp";
  const title = isPp ? "Power play %" : "Penalty kill %";

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>No teams for this season yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rows = teams
    .map((team) => {
      const value = isPp ? team.ppPct : team.pkPct;
      return {
        key: team.teamAbbreviation,
        abbrev: team.teamAbbreviation,
        label: <RankedTeamLabel abbrev={team.teamAbbreviation} />,
        value,
        display: `${value.toFixed(1)}%`,
        meta: isPp
          ? `${team.ppGoals}/${team.ppOpportunities}`
          : `${team.pkTimesShort - team.pkGoalsAgainst}/${team.pkTimesShort}`,
        title: team.teamName,
      };
    })
    .sort((a, b) => b.value - a.value);

  const average = rows.reduce((sum, r) => sum + r.value, 0) / rows.length;
  const { domain, ticks } = niceAxis(rows.map((r) => r.value), { pad: 1 });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {isPp
            ? "Share of power plays that end in a goal."
            : "Share of penalties killed without conceding."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RankedBars
          rows={rows}
          headers={{ label: "Team", value: isPp ? "PP%" : "PK%", meta: isPp ? "Goals/opp." : "Killed" }}
          domain={domain}
          ticks={ticks}
          formatTick={(t) => `${t}%`}
          baseline={average}
          renderRow={(row, props) => (
            <Link
              key={row.key}
              to="/teams/$abbrev/special-teams"
              params={{ abbrev: row.abbrev }}
              search={{ season }}
              {...props}
            />
          )}
        />
        <p className="mt-3 text-xs text-muted-foreground tabular-nums">
          Bars grow from the league average ({average.toFixed(1)}%): right
          for teams above it, left for teams below.
        </p>
      </CardContent>
    </Card>
  );
}
