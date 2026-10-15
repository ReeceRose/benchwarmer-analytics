import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RankedBars, RankedPlayerLabel, niceAxis } from "@/components/charts";
import { LEADERBOARD_CATEGORY_LABELS, isLowerBetterCategory } from "@/lib/leaderboard-categories";
import type { LeaderboardEntry, LeaderboardCategory } from "@/types";

interface Top10LeadersChartProps {
  entries: LeaderboardEntry[];
  category: LeaderboardCategory;
}


// Fractions that can't sensibly start at zero: drawn as a dot on a fitted range.
const FRACTION_CATEGORIES: LeaderboardCategory[] = ["savePct", "corsiPct", "fenwickPct", "oiShPct", "oiSvPct"];

function formatValue(value: number, category: LeaderboardCategory): string {
  switch (category) {
    case "savePct":
      return value >= 1 ? value.toFixed(3) : `.${(value * 1000).toFixed(0).padStart(3, "0")}`;
    case "corsiPct":
    case "fenwickPct":
    case "oiShPct":
    case "oiSvPct":
      return `${(value * 100).toFixed(1)}%`;
    case "gaa":
    case "xgPer60":
    case "expectedGoals":
    case "gsax":
    case "xga":
    case "gameScore":
      return value.toFixed(2);
    case "iceTime":
    case "goalieTime":
      return Math.round(value / 60).toLocaleString();
    default:
      return value.toLocaleString();
  }
}

/** The top 10 in the selected category, best first. */
export function Top10LeadersChart({ entries, category }: Top10LeadersChartProps) {
  const label = LEADERBOARD_CATEGORY_LABELS[category];
  const isFraction = FRACTION_CATEGORIES.includes(category);
  const isTime = category === "iceTime" || category === "goalieTime";
  const lowerIsBetter = isLowerBetterCategory(category);

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 10: {label}</CardTitle>
          <CardDescription>No qualified players for this selection.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rows = entries.slice(0, 10).map((e) => ({
    key: `${e.playerId}-${e.team ?? ""}`,
    playerId: e.playerId,
    rank: e.rank,
    label: <RankedPlayerLabel playerId={e.playerId} name={e.name} team={e.team} />,
    value: e.primaryValue,
    display: formatValue(e.primaryValue, category),
    meta: e.team ?? "–",
    title: `${e.name}: ${formatValue(e.primaryValue, category)} ${label} in ${e.gamesPlayed} GP`,
  }));

  const values = rows.map((r) => r.value);
  const { domain, ticks } = isFraction
    ? niceAxis(values, { pad: (Math.max(...values) - Math.min(...values)) * 0.1 || 0.005 })
    : niceAxis(values, { includeZero: true });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top 10: {label}</CardTitle>
        <CardDescription>
          {lowerIsBetter ? "Lowest first: lower is better." : "League leaders in this category."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RankedBars
          variant="player"
          rows={rows}
          headers={{ label: "Player", value: isTime ? "Min" : label, meta: "Team" }}
          domain={domain}
          ticks={ticks}
          formatTick={(t) => formatValue(t, category)}
          marker={isFraction ? "dot" : "bar"}
          renderRow={(row, props) => (
            <Link key={row.key} to="/players/$id" params={{ id: String(row.playerId) }} {...props} />
          )}
        />
        {isFraction && (
          <p className="mt-3 text-xs text-muted-foreground">
            Percentages sit on a zoomed range, so they're dots rather than bars.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
