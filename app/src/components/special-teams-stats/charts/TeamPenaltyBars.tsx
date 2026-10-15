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

type Metric = "drawn" | "taken" | "net" | "netTime";

interface TeamPenaltyBarsProps {
  teams: TeamSpecialTeamsRanking[];
  metric: Metric;
  season?: number;
}

const signed = (v: number, digits: number) => `${v > 0 ? "+" : ""}${v.toFixed(digits)}`;

const METRICS: Record<
  Metric,
  {
    title: string;
    description: string;
    header: string;
    metaHeader: string;
    value: (t: TeamSpecialTeamsRanking) => number;
    display: (v: number) => string;
    meta: (t: TeamSpecialTeamsRanking) => string;
    /** Rank the smallest value first. */
    ascending?: boolean;
    /** Bars grow from zero in both directions. */
    diverging?: boolean;
    caption: string;
  }
> = {
  drawn: {
    title: "Penalties drawn",
    description: "Opponent penalties per 60 minutes, all situations.",
    header: "Per 60",
    metaHeader: "Total",
    value: (t) => t.penaltiesDrawnPer60,
    display: (v) => v.toFixed(2),
    meta: (t) => String(t.penaltiesDrawn),
    caption: "Most first. Each one usually means a power play.",
  },
  taken: {
    title: "Penalties taken",
    description: "The team's own penalties per 60 minutes, all situations.",
    header: "Per 60",
    metaHeader: "Total",
    value: (t) => t.penaltiesTakenPer60,
    display: (v) => v.toFixed(2),
    meta: (t) => String(t.penaltiesTaken),
    ascending: true,
    caption: "Fewest first: the most disciplined teams are at the top.",
  },
  net: {
    title: "Penalty differential",
    description: "Drawn minus taken, per 60 minutes.",
    header: "Net/60",
    metaHeader: "Net",
    value: (t) => t.netPenaltiesPer60,
    display: (v) => signed(v, 2),
    meta: (t) => signed(t.netPenalties, 0),
    diverging: true,
    caption: "Bars grow right for teams that draw more than they take, left (muted) for teams that take more.",
  },
  netTime: {
    title: "Power play time minus penalty kill time",
    description: "Minutes per game at 5-on-4 less minutes at 4-on-5.",
    header: "Net min",
    metaHeader: "PP / PK",
    value: (t) => t.ppMinutesPerGame - t.pkMinutesPerGame,
    display: (v) => signed(v, 2),
    meta: (t) => `${t.ppMinutesPerGame.toFixed(1)} / ${t.pkMinutesPerGame.toFixed(1)}`,
    diverging: true,
    caption: "What the penalty differential is worth on the clock. Right: more time with the extra skater.",
  },
};

/** One penalty rate for every team, ranked. */
export function TeamPenaltyBars({ teams, metric, season }: TeamPenaltyBarsProps) {
  const config = METRICS[metric];

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{config.title}</CardTitle>
          <CardDescription>No teams for this season yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rows = teams
    .map((team) => {
      const value = config.value(team);
      return {
        key: team.teamAbbreviation,
        abbrev: team.teamAbbreviation,
        label: <RankedTeamLabel abbrev={team.teamAbbreviation} />,
        value,
        display: config.display(value),
        meta: config.meta(team),
        title: team.teamName,
      };
    })
    .sort((a, b) => (config.ascending ? a.value - b.value : b.value - a.value));

  const values = rows.map((r) => r.value);
  const { domain, ticks } = niceAxis(values, { includeZero: true });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <RankedBars
          rows={rows}
          headers={{ label: "Team", value: config.header, meta: config.metaHeader }}
          domain={domain}
          ticks={ticks}
          formatTick={(t) => (config.diverging ? signed(t, 1).replace(/\.0$/, "") : String(t))}
          baseline={config.diverging ? 0 : undefined}
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
        <p className="mt-3 text-xs text-muted-foreground">{config.caption}</p>
      </CardContent>
    </Card>
  );
}
