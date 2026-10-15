import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RankedBars, RankedPlayerLabel, niceAxis } from "@/components/charts";
import type { SpecialTeamsPlayerLeader } from "@/types";

interface PlayerLeadersBarsProps {
  players: SpecialTeamsPlayerLeader[];
  situation: "5on4" | "4on5";
  metric?: "points" | "pointsPer60";
}

const LIMIT = 20;

/** The top 20 players on the power play or penalty kill, by points or points per 60. */
export function PlayerLeadersBars({ players, situation, metric = "points" }: PlayerLeadersBarsProps) {
  const situationLabel = situation === "5on4" ? "power play" : "penalty kill";
  const isPer60 = metric === "pointsPer60";
  const title = isPer60 ? `Points per 60 on the ${situationLabel}` : `Points on the ${situationLabel}`;

  if (players.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>No players meet these filters. Try a lower minimum.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rows = [...players]
    .sort((a, b) => (isPer60 ? b.pointsPer60 - a.pointsPer60 : b.points - a.points))
    .slice(0, LIMIT)
    .map((p) => ({
      key: `${p.playerId}-${p.team}`,
      playerId: p.playerId,
      label: <RankedPlayerLabel playerId={p.playerId} name={p.name} team={p.team} />,
      value: isPer60 ? p.pointsPer60 : p.points,
      display: isPer60 ? p.pointsPer60.toFixed(2) : p.points,
      meta: p.team,
      title: `${p.name}: ${p.goals} G, ${p.assists} A in ${Math.round(p.iceTimeMinutes)} min`,
    }));

  const { domain, ticks } = niceAxis(rows.map((r) => r.value), { includeZero: true });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Top {LIMIT} among players who meet the filters above.</CardDescription>
      </CardHeader>
      <CardContent>
        <RankedBars
          variant="player"
          rows={rows}
          headers={{ label: "Player", value: isPer60 ? "P/60" : "Pts", meta: "Team" }}
          domain={domain}
          ticks={ticks}
          formatTick={(t) => (Number.isInteger(t) ? String(t) : t.toFixed(1))}
          renderRow={(row, props) => (
            <Link key={row.key} to="/players/$id" params={{ id: String(row.playerId) }} {...props} />
          )}
        />
      </CardContent>
    </Card>
  );
}
