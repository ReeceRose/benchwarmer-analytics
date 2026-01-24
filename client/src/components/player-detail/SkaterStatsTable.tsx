import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkline, HeaderWithTooltip } from "@/components/shared";
import { getSeasonPercentiles } from "@/lib/api";
import { formatToi, formatPercent, formatSeason } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { SkaterSeasonRow, SkaterCareerTotals } from "@/components/player-detail/skater-stats";

// Helper to calculate percentile from a value given percentile thresholds
function calculatePercentile(value: number, thresholds: number[]): number {
  if (thresholds.length === 0) return 50;
  // thresholds[i] is the value at percentile (i+1)
  // Find where our value falls
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) {
      return i + 1; // Return percentile (1-99)
    }
  }
  return 1; // Below 1st percentile
}

// Helper to get color class based on percentile
function getPercentileColor(pctl: number): string {
  if (pctl >= 90) return "text-success";
  if (pctl >= 75) return "text-success";
  if (pctl >= 50) return "text-foreground";
  if (pctl >= 25) return "text-warning";
  return "text-error";
}

// Helper to render luck indicator cell
function LuckCell({ goals, xg }: { goals: number; xg: number }) {
  if (xg === 0) return <span className="text-muted-foreground">-</span>;

  const diff = goals - xg;
  const isLucky = diff > 1;
  const isUnlucky = diff < -1;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(
          "inline-flex items-center gap-0.5 cursor-help",
          isLucky && "text-success",
          isUnlucky && "text-error",
          !isLucky && !isUnlucky && "text-muted-foreground"
        )}>
          {isLucky && <TrendingUp className="h-3 w-3" />}
          {isUnlucky && <TrendingDown className="h-3 w-3" />}
          {!isLucky && !isUnlucky && <Minus className="h-3 w-3" />}
          <span className="tabular-nums">{diff > 0 ? "+" : ""}{diff.toFixed(1)}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {goals} goals vs {xg.toFixed(1)} expected
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

interface SkaterStatsTableProps {
  rows: SkaterSeasonRow[];
  totals: SkaterCareerTotals;
}

export function SkaterStatsTable({ rows, totals }: SkaterStatsTableProps) {
  const hasPlayoffData = rows.some((r) => r.playoffGp !== null);

  // Get unique seasons from rows
  const seasons = useMemo(() => {
    return [...new Set(rows.map((r) => r.season))].sort((a, b) => b - a);
  }, [rows]);

  // Fetch percentiles for all seasons in parallel
  const percentileQueries = useQueries({
    queries: seasons.map((season) => ({
      queryKey: ["analytics", "season-percentiles", season],
      queryFn: () => getSeasonPercentiles(season),
      staleTime: 1000 * 60 * 30, // 30 min cache
    })),
  });

  // Build a map of season -> percentile data
  const percentilesBySeason = useMemo(() => {
    const result = new Map<number, number[]>();
    for (let i = 0; i < seasons.length; i++) {
      const data = percentileQueries[i]?.data;
      if (data?.pointsPerGame) {
        result.set(seasons[i], data.pointsPerGame);
      }
    }
    return result;
  }, [seasons, percentileQueries]);

  // Calculate percentiles for each row
  const rowPercentiles = useMemo(() => {
    const result: Map<string, number> = new Map();

    for (const row of rows) {
      const thresholds = percentilesBySeason.get(row.season);
      if (!thresholds) continue;
      const ppg = row.gp > 0 ? row.p / row.gp : 0;
      const pctl = calculatePercentile(ppg, thresholds);
      result.set(`${row.season}-${row.team}`, pctl);
    }
    return result;
  }, [rows, percentilesBySeason]);

  // Calculate trend data (points per game by season, oldest to newest for sparkline)
  const trendData = useMemo(() => {
    const sortedRows = [...rows].sort((a, b) => a.season - b.season);
    return {
      ppg: sortedRows.map((r) => (r.gp > 0 ? r.p / r.gp : 0)),
      gpg: sortedRows.map((r) => (r.gp > 0 ? r.g / r.gp : 0)),
    };
  }, [rows]);

  // Determine if trending up or down
  const getTrend = (data: number[]) => {
    if (data.length < 2) return "neutral";
    const recent = data.slice(-3);
    const earlier = data.slice(0, -3);
    if (earlier.length === 0) return "neutral";
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    if (recentAvg > earlierAvg * 1.1) return "up";
    if (recentAvg < earlierAvg * 0.9) return "down";
    return "neutral";
  };

  const pointsTrend = getTrend(trendData.ppg);

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-md">
        <p className="font-medium">No statistics available</p>
        <p className="text-sm mt-1">This player may not have NHL stats recorded yet.</p>
      </div>
    );
  }

  return (
    <Card className="py-0 gap-0">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Season</TableHead>
              <TableHead className="font-semibold">Team</TableHead>
              <HeaderWithTooltip label="GP" tooltip="Games played" className="text-right" />
              <HeaderWithTooltip label="G" tooltip="Goals" className="text-right" />
              <HeaderWithTooltip label="A" tooltip="Assists" className="text-right" />
              <HeaderWithTooltip label="P" tooltip="Points (Goals + Assists)" className="text-right" />
              <HeaderWithTooltip label="Pctl" tooltip="Points per game percentile vs league" className="text-right hidden sm:table-cell" />
              <HeaderWithTooltip label="TOI" tooltip="Total time on ice" className="text-right hidden md:table-cell" />
              <HeaderWithTooltip label="S" tooltip="Shots on goal" className="text-right hidden md:table-cell" />
              <HeaderWithTooltip label="xG" tooltip="Expected goals based on shot quality" className="text-right hidden lg:table-cell" />
              <HeaderWithTooltip label="Luck" tooltip="Goals minus expected goals (positive = lucky)" className="text-right hidden lg:table-cell" />
              <HeaderWithTooltip label="CF%" tooltip="Corsi For % — shot attempt share while on ice" className="text-right hidden lg:table-cell" />
              {rows.length >= 2 && (
                <HeaderWithTooltip label="Trend" tooltip="Points per game trend over career" className="text-center hidden xl:table-cell" />
              )}
              {hasPlayoffData && (
                <>
                  <HeaderWithTooltip label="GP" tooltip="Playoff games played" className="text-right border-l" />
                  <HeaderWithTooltip label="G" tooltip="Playoff goals" className="text-right" />
                  <HeaderWithTooltip label="A" tooltip="Playoff assists" className="text-right" />
                  <HeaderWithTooltip label="P" tooltip="Playoff points" className="text-right" />
                </>
              )}
            </TableRow>
            {hasPlayoffData && (
              <TableRow className="bg-muted/30">
                <TableHead colSpan={6} className="text-xs text-muted-foreground py-1">Regular Season</TableHead>
                <TableHead colSpan={5} className="text-xs text-muted-foreground py-1 hidden md:table-cell" />
                {rows.length >= 2 && (
                  <TableHead className="hidden xl:table-cell" />
                )}
                <TableHead colSpan={4} className="text-xs text-muted-foreground py-1 border-l">Playoffs</TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.season}-${row.team}`} className="hover:bg-muted/30">
                <TableCell className="font-medium">{formatSeason(row.season)}</TableCell>
                <TableCell>
                  <Link
                    to="/teams/$abbrev"
                    params={{ abbrev: row.team }}
                    search={{ season: row.season }}
                    className="hover:underline"
                  >
                    {row.team}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.gp}</TableCell>
                <TableCell className="text-right tabular-nums">{row.g}</TableCell>
                <TableCell className="text-right tabular-nums">{row.a}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{row.p}</TableCell>
                <TableCell className="text-right tabular-nums hidden sm:table-cell">
                  {(() => {
                    const pctl = rowPercentiles.get(`${row.season}-${row.team}`);
                    if (pctl === undefined) return <span className="text-muted-foreground">-</span>;
                    return (
                      <span className={cn("font-medium", getPercentileColor(pctl))}>
                        {pctl}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-right tabular-nums hidden md:table-cell">{formatToi(row.toi)}</TableCell>
                <TableCell className="text-right tabular-nums hidden md:table-cell">{row.shots}</TableCell>
                <TableCell className="text-right tabular-nums hidden lg:table-cell">{row.xg.toFixed(1)}</TableCell>
                <TableCell className="text-right hidden lg:table-cell">
                  <LuckCell goals={row.g} xg={row.xg} />
                </TableCell>
                <TableCell className="text-right tabular-nums hidden lg:table-cell">
                  {row.cf != null ? formatPercent(row.cf, false) : "-"}
                </TableCell>
                {rows.length >= 2 && (
                  <TableCell className="hidden xl:table-cell" />
                )}
                {hasPlayoffData && (
                  <>
                    <TableCell className="text-right tabular-nums border-l">{row.playoffGp ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.playoffG ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.playoffA ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{row.playoffP ?? "-"}</TableCell>
                  </>
                )}
              </TableRow>
            ))}
            <TableRow className="bg-muted/50 font-semibold border-t-2">
              <TableCell>Totals</TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right tabular-nums">{totals.gp}</TableCell>
              <TableCell className="text-right tabular-nums">{totals.g}</TableCell>
              <TableCell className="text-right tabular-nums">{totals.a}</TableCell>
              <TableCell className="text-right tabular-nums">{totals.p}</TableCell>
              <TableCell className="text-right tabular-nums hidden sm:table-cell">-</TableCell>
              <TableCell className="text-right tabular-nums hidden md:table-cell">{formatToi(totals.toi)}</TableCell>
              <TableCell className="text-right tabular-nums hidden md:table-cell">{totals.shots}</TableCell>
              <TableCell className="text-right tabular-nums hidden lg:table-cell">{totals.xg.toFixed(1)}</TableCell>
              <TableCell className="text-right hidden lg:table-cell">
                <LuckCell goals={totals.g} xg={totals.xg} />
              </TableCell>
              <TableCell className="text-right tabular-nums hidden lg:table-cell">-</TableCell>
              {rows.length >= 2 && (
                <TableCell className="hidden xl:table-cell">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center gap-1.5">
                        <Sparkline data={trendData.ppg} width={50} height={16} />
                        {pointsTrend === "up" && <TrendingUp className="h-3.5 w-3.5 text-success" />}
                        {pointsTrend === "down" && <TrendingDown className="h-3.5 w-3.5 text-error" />}
                        {pointsTrend === "neutral" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">Points per game trend</p>
                      <p className="text-xs text-muted-foreground">
                        {pointsTrend === "up" && "Production trending up"}
                        {pointsTrend === "down" && "Production trending down"}
                        {pointsTrend === "neutral" && "Production stable"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
              )}
              {hasPlayoffData && (
                <>
                  <TableCell className="text-right tabular-nums border-l">{totals.playoffGp || "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.playoffG || "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.playoffA || "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.playoffP || "-"}</TableCell>
                </>
              )}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
