import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatToi, formatPercent, formatSeason } from "@/lib/formatters";
import type { SkaterSeasonRow, SkaterCareerTotals } from "@/components/player-detail/skater-stats";

interface SkaterStatsTableProps {
  rows: SkaterSeasonRow[];
  totals: SkaterCareerTotals;
}

export function SkaterStatsTable({ rows, totals }: SkaterStatsTableProps) {
  const hasPlayoffData = rows.some((r) => r.playoffGp !== null);

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-md">
        <p className="font-medium">No statistics available</p>
        <p className="text-sm mt-1">This player may not have NHL stats recorded yet.</p>
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
            <TableHead className="text-right font-semibold">G</TableHead>
            <TableHead className="text-right font-semibold">A</TableHead>
            <TableHead className="text-right font-semibold">P</TableHead>
            <TableHead className="text-right font-semibold hidden md:table-cell">TOI</TableHead>
            <TableHead className="text-right font-semibold hidden md:table-cell">S</TableHead>
            <TableHead className="text-right font-semibold hidden lg:table-cell">xG</TableHead>
            <TableHead className="text-right font-semibold hidden lg:table-cell">CF%</TableHead>
            {hasPlayoffData && (
              <>
                <TableHead className="text-right font-semibold border-l">GP</TableHead>
                <TableHead className="text-right font-semibold">G</TableHead>
                <TableHead className="text-right font-semibold">A</TableHead>
                <TableHead className="text-right font-semibold">P</TableHead>
              </>
            )}
          </TableRow>
          {hasPlayoffData && (
            <TableRow className="bg-muted/30">
              <TableHead colSpan={6} className="text-xs text-muted-foreground py-1">Regular Season</TableHead>
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
              <TableCell className="text-right tabular-nums">{row.g}</TableCell>
              <TableCell className="text-right tabular-nums">{row.a}</TableCell>
              <TableCell className="text-right tabular-nums font-medium">{row.p}</TableCell>
              <TableCell className="text-right tabular-nums hidden md:table-cell">{formatToi(row.toi)}</TableCell>
              <TableCell className="text-right tabular-nums hidden md:table-cell">{row.shots}</TableCell>
              <TableCell className="text-right tabular-nums hidden lg:table-cell">{row.xg.toFixed(1)}</TableCell>
              <TableCell className="text-right tabular-nums hidden lg:table-cell">
                {row.cf != null ? formatPercent(row.cf) : "-"}
              </TableCell>
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
            <TableCell className="text-right tabular-nums hidden md:table-cell">{formatToi(totals.toi)}</TableCell>
            <TableCell className="text-right tabular-nums hidden md:table-cell">{totals.shots}</TableCell>
            <TableCell className="text-right tabular-nums hidden lg:table-cell">{totals.xg.toFixed(1)}</TableCell>
            <TableCell className="text-right tabular-nums hidden lg:table-cell">-</TableCell>
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
    </div>
  );
}
