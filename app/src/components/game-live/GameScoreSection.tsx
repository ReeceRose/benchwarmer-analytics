import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, TeamLabel } from "@/components/game-live/parts";
import { SIDES, mmss, teamColour } from "@/components/game-live/live-utils";
import { cn } from "@/lib/utils";
import type { LiveGameResponse, LiveSkater, TeamSide } from "@/types";

const PARTS = [
  { key: "scoring", label: "Scoring", title: "Goals, assists and shots" },
  { key: "onIce", label: "5v5", title: "5v5 shot attempts and goals for and against while on the ice" },
  { key: "other", label: "Other", title: "Blocks, penalties drawn and taken, faceoffs" },
] as const;

const fmtScore = (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));

/** A bar growing right (positive) or left (negative) from a centre line. */
function DivergingBar({ value, max, side }: { value: number; max: number; side: TeamSide }) {
  const width = max > 0 ? (50 * Math.min(Math.abs(value), max)) / max : 0;
  return (
    <div className="relative h-2.5 rounded-full bg-muted">
      <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/25" />
      <div
        className={cn("absolute inset-y-0", value >= 0 ? "left-1/2 rounded-r-full" : "right-1/2 rounded-l-full bg-muted-foreground/45")}
        style={{ width: `${width}%`, background: value >= 0 ? teamColour(side) : undefined }}
      />
    </div>
  );
}

const TOP = 6;
const BOTTOM = 3;

function Row({ s, side, max, best }: { s: LiveSkater; side: TeamSide; max: number; best: boolean }) {
  return (
    <div className={cn(GRID, "border-t py-1.5 text-sm tabular-nums")}>
      <span className="flex min-w-0 items-baseline gap-1.5">
        <Link
          to="/players/$id"
          params={{ id: String(s.playerId) }}
          className={cn("truncate hover:text-link", best && "font-semibold")}
          title={s.name}
        >
          {s.name}
        </Link>
        <span className="shrink-0 text-xs text-muted-foreground" title="Time on ice">{mmss(s.toiSeconds)}</span>
      </span>
      <DivergingBar value={s.gameScore.total} max={max} side={side} />
      {PARTS.map((p) => (
        <span key={p.key} className="hidden text-right text-xs text-muted-foreground sm:block">
          {fmtScore(s.gameScore[p.key])}
        </span>
      ))}
      <span className={cn("text-right", best ? "font-bold" : "font-medium")}>{s.gameScore.total.toFixed(2)}</span>
    </div>
  );
}

const GRID =
  "grid grid-cols-[minmax(0,9.5rem)_minmax(3rem,1fr)_3rem] items-center gap-x-3 sm:grid-cols-[minmax(0,11.5rem)_minmax(5rem,1fr)_repeat(3,2.75rem)_3.25rem]";

function TeamGameScores({ data, side, max, expanded }: { data: LiveGameResponse; side: TeamSide; max: number; expanded: boolean }) {
  const skaters = data.skaters
    .filter((s) => s.team === side && s.gameScore)
    .sort((a, b) => b.gameScore.total - a.gameScore.total);
  const collapse = !expanded && skaters.length > TOP + BOTTOM + 1;
  const top = collapse ? skaters.slice(0, TOP) : skaters;
  const bottom = collapse ? skaters.slice(-BOTTOM) : [];
  const row = (s: LiveSkater) => <Row key={s.playerId} s={s} side={side} max={max} best={s === skaters[0]} />;
  return (
    <Card title={<TeamLabel side={side}>{data[side].name}</TeamLabel>}>
      <div className={cn(GRID, "pb-1 text-xs text-muted-foreground")}>
        <span>Skater · TOI</span>
        <span />
        {PARTS.map((p) => (
          <span key={p.key} title={p.title} className="hidden cursor-help text-right sm:block">{p.label}</span>
        ))}
        <span className="text-right">GS</span>
      </div>
      {top.map(row)}
      {collapse && (
        <div className="border-t py-1.5 text-center text-xs text-muted-foreground">
          {skaters.length - TOP - BOTTOM} more
        </div>
      )}
      {bottom.map(row)}
    </Card>
  );
}

/** Each team's skaters ranked by Game Score, with the parts that make it up. */
export function GameScoreSection({ data }: { data: LiveGameResponse }) {
  const [expanded, setExpanded] = useState(false);
  const max = Math.max(1, ...data.skaters.map((s) => Math.abs(s.gameScore?.total ?? 0)));
  const longest = Math.max(...SIDES.map((side) => data.skaters.filter((s) => s.team === side).length));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {SIDES.map((side) => (
          <TeamGameScores key={side} data={data} side={side} max={max} expanded={expanded} />
        ))}
      </div>
      {longest > TOP + BOTTOM + 1 && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show fewer" : "Show all skaters"}
          </Button>
        </div>
      )}
    </div>
  );
}
