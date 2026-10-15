import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HeaderWithTooltip } from "@/components/shared";
import { TeamTag } from "@/components/shared/TeamTag";
import { formatOdds, NOTABLE_CHANGE } from "@/lib/odds";
import { cn } from "@/lib/utils";
import type { TeamPlayoffOdds } from "@/types";

export function OddsChange({ change }: { change: number | null }) {
  if (change == null) return <span className="text-muted-foreground">–</span>;
  const pts = Math.round(change * 100);
  if (pts === 0) return <span className="text-muted-foreground">–</span>;
  const notable = Math.abs(change) >= NOTABLE_CHANGE;
  return (
    <span className={cn("tabular-nums", notable ? (change > 0 ? "text-success" : "text-error") : "text-muted-foreground")}>
      {change > 0 ? "▲" : "▼"} {Math.abs(pts)}
    </span>
  );
}

/** The middle 80% of simulated final points as a muted band, with a tick at the average. */
function PointsRange({ team, min, max }: { team: TeamPlayoffOdds; min: number; max: number }) {
  const x = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-3 w-full min-w-24" aria-hidden>
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted-foreground/35"
          style={{ left: x(team.pointsP10), width: `calc(${x(team.pointsP90)} - ${x(team.pointsP10)})` }}
        />
        <div className="absolute top-0 h-3 w-0.5 rounded-full bg-foreground" style={{ left: x(team.pointsAvg) }} />
      </div>
      <span className="w-9 shrink-0 text-right font-medium tabular-nums" title={`${team.pointsP10}–${team.pointsP90} in 80% of simulations`}>
        {Math.round(team.pointsAvg)}
      </span>
    </div>
  );
}

/**
 * One group of teams (a division, a conference or the league) with projected
 * points and the chance of reaching each round. `cutAfter` draws the playoff
 * line under that many rows.
 */
export function PlayoffOddsTable({
  title,
  teams,
  season,
  range,
  cutAfter,
}: {
  title: string;
  teams: TeamPlayoffOdds[];
  season: number;
  range: { min: number; max: number };
  cutAfter?: number;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-0">
        <h3 className="px-4 pt-4 pb-2 text-sm font-semibold sm:px-5">{title}</h3>
        <Table className="min-w-160">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card pl-4 sm:pl-5">Team</TableHead>
              <HeaderWithTooltip label="GP" tooltip="Games played" className="text-right" />
              <HeaderWithTooltip label="PTS" tooltip="Points so far" className="text-right" />
              <HeaderWithTooltip label="Projected points" tooltip="Average final points across simulations; the band is the middle 80%" className="w-56" />
              <HeaderWithTooltip label="Playoffs" tooltip="Chance of making the playoffs" className="text-right" />
              <HeaderWithTooltip label="2nd rd" tooltip="Chance of winning a first-round series" className="text-right" />
              <HeaderWithTooltip label="Conf. final" tooltip="Chance of reaching the conference final" className="text-right" />
              <HeaderWithTooltip label="Final" tooltip="Chance of reaching the Stanley Cup Final" className="text-right" />
              <HeaderWithTooltip label="Cup" tooltip="Chance of winning the Stanley Cup" className="text-right" />
              <HeaderWithTooltip label="Δ" tooltip="Change in playoff odds since the previous day, in percentage points" className="pr-4 text-right sm:pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((t, i) => (
              <TableRow key={t.team} className={cn(cutAfter !== undefined && i === cutAfter - 1 && "[&>td]:border-b-foreground/40 [&>td]:border-dashed")}>
                <TableCell className="sticky left-0 z-10 bg-card pl-4 sm:pl-5">
                  <TeamTag abbrev={t.team} season={season} />
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{t.gamesPlayed}</TableCell>
                <TableCell className="text-right tabular-nums">{t.points}</TableCell>
                <TableCell>
                  <PointsRange team={t} min={range.min} max={range.max} />
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatOdds(t.makePlayoffs)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatOdds(t.winRound1)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatOdds(t.winRound2)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatOdds(t.winConference)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatOdds(t.winCup)}</TableCell>
                <TableCell className="pr-4 text-right sm:pr-5">
                  <OddsChange change={t.makePlayoffsChange} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
