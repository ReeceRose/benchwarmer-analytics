import { Minus, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HeaderWithTooltip } from "@/components/shared";
import { TeamTag } from "@/components/shared/TeamTag";
import { OddsChange } from "@/components/projections/PlayoffOddsTable";
import { formatOdds } from "@/lib/odds";
import type { TeamOdds } from "@/lib/projections/simulate";
import { cn } from "@/lib/utils";

/** Points of win chance against an average team per click of "your take". */
export const TAKE_STEP = 2.5;
export const MAX_TAKE = 10;

function TakeStepper({ team, value, onChange }: { team: string; value: number; onChange: (v: number) => void }) {
  const step = (d: number) => onChange(Math.max(-MAX_TAKE, Math.min(MAX_TAKE, value + d)));
  const button = "inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30";
  return (
    <div className="inline-flex items-center gap-1">
      <button type="button" className={button} onClick={() => step(-TAKE_STEP)} disabled={value <= -MAX_TAKE} aria-label={`Rate ${team} lower`}>
        <Minus className="size-3.5" />
      </button>
      <span className={cn("w-9 text-center text-xs tabular-nums", value ? "font-semibold" : "text-muted-foreground")}>
        {value > 0 ? `+${value}` : value}
      </span>
      <button type="button" className={button} onClick={() => step(TAKE_STEP)} disabled={value >= MAX_TAKE} aria-label={`Rate ${team} higher`}>
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

/** The reader's odds for every team, with the change from our model and "your take" per team. */
export function SandboxResults({
  odds,
  model,
  season,
  nudges,
  onNudge,
  running,
}: {
  odds: TeamOdds[];
  model: TeamOdds[] | null;
  season: number;
  nudges: Record<string, number>;
  onNudge: (team: string, value: number) => void;
  running: boolean;
}) {
  const ours = new Map((model ?? []).map((o) => [o.abbrev, o]));
  const rows = [...odds].sort((a, b) => b.makePlayoffs - a.makePlayoffs || b.pointsAvg - a.pointsAvg);
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className={cn("p-0 transition-opacity", running && "opacity-60")}>
        <Table className="min-w-160">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card pl-4 sm:pl-5">Team</TableHead>
              <HeaderWithTooltip label="Your take" tooltip="Nudge a team up or down, in points of win chance against an average team" className="text-center" />
              <HeaderWithTooltip label="Points" tooltip="Average final points across your simulations" className="text-right" />
              <HeaderWithTooltip label="Playoffs" tooltip="Your chance of making the playoffs" className="text-right" />
              <HeaderWithTooltip label="vs ours" tooltip="Change from our model, in percentage points" className="text-right" />
              <HeaderWithTooltip label="Cup" tooltip="Your chance of winning the Stanley Cup" className="text-right" />
              <HeaderWithTooltip label="vs ours" tooltip="Change from our model, in percentage points" className="pr-4 text-right sm:pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o) => {
              const m = ours.get(o.abbrev);
              return (
                <TableRow key={o.abbrev}>
                  <TableCell className="sticky left-0 z-10 bg-card pl-4 sm:pl-5">
                    <TeamTag abbrev={o.abbrev} season={season} />
                  </TableCell>
                  <TableCell className="text-center">
                    <TakeStepper team={o.abbrev} value={nudges[o.abbrev] ?? 0} onChange={(v) => onNudge(o.abbrev, v)} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{Math.round(o.pointsAvg)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatOdds(o.makePlayoffs)}</TableCell>
                  <TableCell className="text-right">{m ? <OddsChange change={o.makePlayoffs - m.makePlayoffs} /> : null}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatOdds(o.winCup)}</TableCell>
                  <TableCell className="pr-4 text-right sm:pr-5">{m ? <OddsChange change={o.winCup - m.winCup} /> : null}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
