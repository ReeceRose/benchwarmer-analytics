import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RankedBars, RankedPlayerLabel, niceAxis } from "@/components/charts";
import type { BreakoutCandidate } from "@/types";

interface BreakoutScoreChartProps {
  candidates: BreakoutCandidate[];
}

const LIMIT = 15;

/** The top 15 by breakout score, with goals against xG alongside. */
export function BreakoutScoreChart({ candidates }: BreakoutScoreChartProps) {
  if (candidates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top breakout candidates</CardTitle>
          <CardDescription>No candidates for this selection. Try fewer games.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rows = [...candidates]
    .sort((a, b) => b.breakoutScore - a.breakoutScore)
    .slice(0, LIMIT)
    .map((c) => ({
      key: `${c.playerId}-${c.team}`,
      playerId: c.playerId,
      label: <RankedPlayerLabel playerId={c.playerId} name={c.name} team={c.team} />,
      value: c.breakoutScore,
      display: c.breakoutScore.toFixed(1),
      meta: c.team,
      title: `${c.name}: ${c.goals} G on ${c.expectedGoals.toFixed(1)} xG in ${c.gamesPlayed} GP`,
    }));

  const { domain, ticks } = niceAxis(rows.map((r) => r.value), { includeZero: true });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top breakout candidates</CardTitle>
        <CardDescription>Top {LIMIT} by breakout score.</CardDescription>
      </CardHeader>
      <CardContent>
        <RankedBars
          variant="player"
          rows={rows}
          headers={{ label: "Player", value: "Score", meta: "Team" }}
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
