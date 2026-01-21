import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatToi, formatSeason } from "@/lib/formatters";
import { formatSavePct, formatGaa, formatGsax } from "@/components/player-detail/goalie-stats";
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
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Season</TableHead>
            <TableHead className="font-semibold">Team</TableHead>
            <TableHead className="text-right font-semibold">GP</TableHead>
            <TableHead className="text-right font-semibold hidden md:table-cell">TOI</TableHead>
            <TableHead className="text-right font-semibold">GA</TableHead>
            <TableHead className="text-right font-semibold">SA</TableHead>
            <TableHead className="text-right font-semibold">SV%</TableHead>
            <TableHead className="text-right font-semibold">GAA</TableHead>
            <TableHead className="text-right font-semibold hidden lg:table-cell">GSAx</TableHead>
            {hasPlayoffData && (
              <>
                <TableHead className="text-right font-semibold border-l">GP</TableHead>
                <TableHead className="text-right font-semibold">GA</TableHead>
                <TableHead className="text-right font-semibold">SA</TableHead>
                <TableHead className="text-right font-semibold">SV%</TableHead>
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
    </div>
  );
}
