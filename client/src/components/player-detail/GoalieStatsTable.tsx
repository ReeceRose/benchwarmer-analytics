import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HeaderWithTooltip } from "@/components/shared";
import { formatToi, formatSeason, formatSavePct } from "@/lib/formatters";
import { formatGaa, formatGsax } from "@/components/player-detail/goalie-stats";
import type { GoalieSeasonRow, GoalieCareerTotals } from "@/components/player-detail/goalie-stats";

interface GoalieStatsTableProps {
  rows: GoalieSeasonRow[];
  totals: GoalieCareerTotals;
}

export function GoalieStatsTable({ rows, totals }: GoalieStatsTableProps) {
  const hasPlayoffData = rows.some((r) => r.playoffGp !== null);

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-md">
        <p className="font-medium">No statistics available</p>
        <p className="text-sm mt-1">This goalie may not have NHL stats recorded yet.</p>
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
              <HeaderWithTooltip label="TOI" tooltip="Total time on ice" className="text-right hidden md:table-cell" />
              <HeaderWithTooltip label="GA" tooltip="Goals against" className="text-right" />
              <HeaderWithTooltip label="SA" tooltip="Shots against" className="text-right" />
              <HeaderWithTooltip label="SV%" tooltip="Save percentage" className="text-right" />
              <HeaderWithTooltip label="GAA" tooltip="Goals against average per 60 minutes" className="text-right" />
              <HeaderWithTooltip label="GSAx" tooltip="Goals saved above expected — positive is better" className="text-right hidden lg:table-cell" />
              {hasPlayoffData && (
                <>
                  <HeaderWithTooltip label="GP" tooltip="Playoff games played" className="text-right border-l" />
                  <HeaderWithTooltip label="GA" tooltip="Playoff goals against" className="text-right" />
                  <HeaderWithTooltip label="SA" tooltip="Playoff shots against" className="text-right" />
                  <HeaderWithTooltip label="SV%" tooltip="Playoff save percentage" className="text-right" />
                </>
              )}
            </TableRow>
          {hasPlayoffData && (
            <TableRow className="bg-muted/30">
              <TableHead colSpan={5} className="text-xs text-muted-foreground py-1">Regular Season</TableHead>
              <TableHead colSpan={4} className="text-xs text-muted-foreground py-1 hidden md:table-cell" />
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
              <TableCell className="text-right tabular-nums hidden md:table-cell">{formatToi(row.toi)}</TableCell>
              <TableCell className="text-right tabular-nums">{row.ga}</TableCell>
              <TableCell className="text-right tabular-nums">{row.sa}</TableCell>
              <TableCell className="text-right tabular-nums font-medium">{formatSavePct(row.svPct)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatGaa(row.gaa)}</TableCell>
              <TableCell className="text-right tabular-nums hidden lg:table-cell">{formatGsax(row.gsax)}</TableCell>
              {hasPlayoffData && (
                <>
                  <TableCell className="text-right tabular-nums border-l">{row.playoffGp ?? "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.playoffGa ?? "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.playoffSa ?? "-"}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatSavePct(row.playoffSvPct)}</TableCell>
                </>
              )}
            </TableRow>
          ))}
          <TableRow className="bg-muted/50 font-semibold border-t-2">
            <TableCell>Totals</TableCell>
            <TableCell></TableCell>
            <TableCell className="text-right tabular-nums">{totals.gp}</TableCell>
            <TableCell className="text-right tabular-nums hidden md:table-cell">{formatToi(totals.toi)}</TableCell>
            <TableCell className="text-right tabular-nums">{totals.ga}</TableCell>
            <TableCell className="text-right tabular-nums">{totals.sa}</TableCell>
            <TableCell className="text-right tabular-nums">{formatSavePct(totals.svPct)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatGaa(totals.gaa)}</TableCell>
            <TableCell className="text-right tabular-nums hidden lg:table-cell">{formatGsax(totals.gsax)}</TableCell>
            {hasPlayoffData && (
              <>
                <TableCell className="text-right tabular-nums border-l">{totals.playoffGp || "-"}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.playoffGa || "-"}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.playoffSa || "-"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatSavePct(totals.playoffSvPct)}</TableCell>
              </>
            )}
          </TableRow>
        </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
