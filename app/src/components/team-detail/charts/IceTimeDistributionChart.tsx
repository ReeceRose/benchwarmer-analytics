import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartLegend, RankedBars, RankedPlayerLabel, niceAxis } from "@/components/charts";
import { formatToi } from "@/lib/formatters";
import type { RosterPlayer } from "@/types/player";
import { UNIT_COLOURS } from "@/lib/chart-colours";

interface IceTimeDistributionChartProps {
  players: RosterPlayer[];
  teamAbbrev: string;
}

const LIMIT = 15;
const FORWARD_COLOUR = UNIT_COLOURS.forwards;
const DEFENCE_COLOUR = UNIT_COLOURS.defence;

/** The 15 skaters with the most ice time per game, forwards and defence in two colours. */
export function IceTimeDistributionChart({ players, teamAbbrev }: IceTimeDistributionChartProps) {
  const rows = players
    .filter((p) => p.position !== "G" && (p.iceTimeSeconds ?? 0) > 0 && (p.gamesPlayed ?? 0) > 0)
    .map((p) => {
      const perGame = (p.iceTimeSeconds ?? 0) / (p.gamesPlayed ?? 1);
      const isDefence = p.position === "D";
      return {
        key: String(p.id),
        playerId: p.id,
        label: <RankedPlayerLabel playerId={p.id} name={p.name} team={p.currentTeamAbbreviation ?? teamAbbrev} />,
        value: perGame / 60,
        display: formatToi(perGame),
        meta: `${p.gamesPlayed} GP`,
        colour: isDefence ? DEFENCE_COLOUR : FORWARD_COLOUR,
        title: `${p.name} (${p.position ?? "F"}): ${formatToi(perGame)} per game`,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, LIMIT);

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ice time</CardTitle>
          <CardDescription>No ice time for this roster yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { domain, ticks } = niceAxis(rows.map((r) => r.value), { includeZero: true });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Ice time</CardTitle>
        <CardDescription>Top {LIMIT} skaters by average ice time per game.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartLegend
          className="mb-3"
          items={[
            { label: "Forwards", colour: FORWARD_COLOUR },
            { label: "Defence", colour: DEFENCE_COLOUR },
          ]}
        />
        <RankedBars
          variant="player"
          rows={rows}
          headers={{ label: "Player", value: "TOI/GP", meta: "GP" }}
          domain={domain}
          ticks={ticks}
          formatTick={(t) => `${t}m`}
          renderRow={(row, props) => (
            <Link key={row.key} to="/players/$id" params={{ id: String(row.playerId) }} {...props} />
          )}
        />
      </CardContent>
    </Card>
  );
}
