import { Panel } from "@/components/layout";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatToi, formatPercent } from "@/lib/formatters";
import type { ChemistryPair } from "@/types";

interface LineStatsPanelProps {
  // Chemistry data for selected player pairs
  pairStats: ChemistryPair[];
  // Number of players currently in the line
  playerCount: number;
  // Whether this is a forward line (3 players) or defense pair (2 players)
  isForwardLine: boolean;
}

interface StatRowProps {
  label: string;
  value: string | number;
  tooltip?: string;
  highlight?: "good" | "bad" | "neutral";
}

function StatRow({ label, value, tooltip, highlight }: StatRowProps) {
  const colorClass =
    highlight === "good"
      ? "text-success"
      : highlight === "bad"
        ? "text-error"
        : "";

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help text-sm text-muted-foreground underline decoration-muted-foreground/40 decoration-dotted underline-offset-4">
              {label}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
      <span className={`tabular-nums font-medium ${colorClass}`}>{value}</span>
    </div>
  );
}

export function LineStatsPanel({
  pairStats,
  playerCount,
  isForwardLine,
}: LineStatsPanelProps) {
  const requiredPlayers = isForwardLine ? 3 : 2;
  const requiredPairs = isForwardLine ? 3 : 1; // F line needs 3 pairs, D pair needs 1

  // Check if we have enough data
  const hasEnoughPlayers = playerCount >= requiredPlayers;
  const hasHistoricalData = pairStats.length >= requiredPairs;

  // Calculate aggregate stats from pairs
  const aggregateStats = pairStats.reduce(
    (acc, pair) => ({
      totalToi: acc.totalToi + pair.totalIceTimeSeconds,
      totalGf: acc.totalGf + pair.goalsFor,
      totalGa: acc.totalGa + pair.goalsAgainst,
      totalGp: Math.max(acc.totalGp, pair.gamesPlayed), // Use max GP from any pair
      xgPctSum: acc.xgPctSum + (pair.expectedGoalsPct ?? 50),
      cfPctSum: acc.cfPctSum + (pair.corsiPct ?? 50),
      validXgCount: acc.validXgCount + (pair.expectedGoalsPct != null ? 1 : 0),
      validCfCount: acc.validCfCount + (pair.corsiPct != null ? 1 : 0),
    }),
    {
      totalToi: 0,
      totalGf: 0,
      totalGa: 0,
      totalGp: 0,
      xgPctSum: 0,
      cfPctSum: 0,
      validXgCount: 0,
      validCfCount: 0,
    }
  );

  // Average the percentages
  const avgXgPct =
    aggregateStats.validXgCount > 0
      ? aggregateStats.xgPctSum / aggregateStats.validXgCount
      : null;
  const avgCfPct =
    aggregateStats.validCfCount > 0
      ? aggregateStats.cfPctSum / aggregateStats.validCfCount
      : null;

  // Determine if stats are good or bad (relative to 50%)
  const xgHighlight =
    avgXgPct != null ? (avgXgPct > 52 ? "good" : avgXgPct < 48 ? "bad" : "neutral") : "neutral";
  const cfHighlight =
    avgCfPct != null ? (avgCfPct > 52 ? "good" : avgCfPct < 48 ? "bad" : "neutral") : "neutral";

  return (
    <Panel>
      <h3 className="mb-2 text-sm font-semibold">Together this season</h3>
        {!hasEnoughPlayers ? (
          <div className="py-6 text-center text-muted-foreground">
            <p className="text-sm">
              Add {requiredPlayers - playerCount} more player
              {requiredPlayers - playerCount > 1 ? "s" : ""} to see stats
            </p>
          </div>
        ) : !hasHistoricalData ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm font-medium">No historical data</p>
            <p className="text-xs mt-1">
              These players haven't played together this season
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <StatRow
              label="Time on ice"
              value={formatToi(aggregateStats.totalToi / pairStats.length)}
              tooltip="Average time on ice together per pair"
            />
            <StatRow
              label="Goals for / against"
              value={`${aggregateStats.totalGf} / ${aggregateStats.totalGa}`}
              tooltip="Combined goals for and against when on ice together"
            />
            <StatRow
              label="xG%"
              value={avgXgPct != null ? formatPercent(avgXgPct, false) : "–"}
              tooltip="Expected goals percentage (>50% is good)"
              highlight={xgHighlight}
            />
            <StatRow
              label="CF%"
              value={avgCfPct != null ? formatPercent(avgCfPct, false) : "–"}
              tooltip="Corsi for percentage - shot attempt share (>50% is good)"
              highlight={cfHighlight}
            />
            <StatRow
              label="Games played"
              value={aggregateStats.totalGp}
              tooltip="Games played together"
            />
          </div>
        )}
    </Panel>
  );
}
