import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RankedBars, RankedTeamLabel, niceAxis } from "@/components/charts";
import type { StandingsWithAnalytics } from "@/types";

interface GoalDifferentialChartProps {
  teams: StandingsWithAnalytics[];
}

/** Goals for minus against, best first: bars grow right from zero for positive, left (muted) for negative. */
export function GoalDifferentialChart({ teams }: GoalDifferentialChartProps) {
  const rows = [...teams]
    .sort((a, b) => b.goalDifferential - a.goalDifferential || b.goalsFor - a.goalsFor)
    .map((t) => ({
      key: t.abbreviation,
      abbrev: t.abbreviation,
      label: <RankedTeamLabel abbrev={t.abbreviation} />,
      value: t.goalDifferential,
      display: `${t.goalDifferential > 0 ? "+" : ""}${t.goalDifferential}`,
      meta: `${t.goalsFor}–${t.goalsAgainst}`,
      title: t.name,
    }));

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goal differential</CardTitle>
          <CardDescription>No standings yet this season.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const extent = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const { domain, ticks } = niceAxis([-extent, extent]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Goal differential</CardTitle>
        <CardDescription>Goals for minus goals against, best first.</CardDescription>
      </CardHeader>
      <CardContent>
        <RankedBars
          rows={rows}
          headers={{ label: "Team", value: "Diff", meta: "GF–GA" }}
          domain={domain}
          ticks={ticks}
          formatTick={(t) => (t > 0 ? `+${t}` : String(t))}
          baseline={0}
          renderRow={(row, props) => (
            <Link key={row.key} to="/teams/$abbrev" params={{ abbrev: row.abbrev }} {...props} />
          )}
        />
      </CardContent>
    </Card>
  );
}
