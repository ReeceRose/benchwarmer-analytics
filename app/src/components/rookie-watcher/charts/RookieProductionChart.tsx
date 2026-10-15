import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RankedBars, RankedPlayerLabel, niceAxis } from "@/components/charts";
import type { Rookie } from "@/types";

interface RookieProductionChartProps {
  rookies: Rookie[];
}

const LIMIT = 15;

/** The top 15 rookie scorers. */
export function RookieProductionChart({ rookies }: RookieProductionChartProps) {
  if (rookies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top rookie scorers</CardTitle>
          <CardDescription>No rookies meet these filters.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rows = [...rookies]
    .sort((a, b) => b.points - a.points || b.goals - a.goals)
    .slice(0, LIMIT)
    .map((r) => ({
      key: `${r.playerId}-${r.team}`,
      playerId: r.playerId,
      label: <RankedPlayerLabel playerId={r.playerId} name={r.name} team={r.team} />,
      value: r.points,
      display: r.points,
      meta: r.team,
      title: `${r.name}: ${r.goals} G, ${r.assists} A in ${r.gamesPlayed} GP`,
    }));

  const { domain, ticks } = niceAxis(rows.map((r) => r.value), { includeZero: true });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top rookie scorers</CardTitle>
        <CardDescription>Top {LIMIT} first-year players by points.</CardDescription>
      </CardHeader>
      <CardContent>
        <RankedBars
          variant="player"
          rows={rows}
          headers={{ label: "Player", value: "Pts", meta: "Team" }}
          domain={domain}
          ticks={ticks}
          formatTick={(t) => String(t)}
          renderRow={(row, props) => (
            <Link key={row.key} to="/players/$id" params={{ id: String(row.playerId) }} {...props} />
          )}
        />
      </CardContent>
    </Card>
  );
}
