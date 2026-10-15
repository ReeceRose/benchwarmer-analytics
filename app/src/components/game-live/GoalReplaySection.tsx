import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { TooltipTitle } from "@/components/game-live/ChartTooltip";
import { Rink } from "@/components/game-live/Rink";
import { useChartTooltip } from "@/components/game-live/useChartTooltip";
import { Swatch, TeamLabel } from "@/components/game-live/parts";
import { fmt, mmss, periodName, teamColour } from "@/components/game-live/live-utils";
import { SegmentedControl } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoalReplay } from "@/hooks";
import { cn } from "@/lib/utils";
import type { GoalReplayFrame, LiveGameResponse, LiveGoal, TeamSide } from "@/types";

const SPEEDS = [
  { value: "1", label: "1×" },
  { value: "0.5", label: "½×" },
  { value: "0.25", label: "¼×" },
] as const;
type Speed = (typeof SPEEDS)[number]["value"];

// How many seconds of puck path to draw behind it.
const TRAIL_SECONDS = 2;

interface Positioned {
  key: string;
  playerId: number | null;
  x: number;
  y: number;
  side: TeamSide | null;
  number: number | null;
  isScorer: boolean;
}

// Positions at time `t`, interpolated between the two nearest frames so
// playback stays smooth at any speed.
function positionsAt(frames: GoalReplayFrame[], t: number, sideOf: (team: string | null) => TeamSide | null, scorerId: number | null) {
  let i = 0;
  while (i < frames.length - 2 && frames[i + 1].t <= t) i++;
  const a = frames[i];
  const b = frames[Math.min(i + 1, frames.length - 1)];
  const span = b.t - a.t;
  const k = span > 0 ? Math.min(1, Math.max(0, (t - a.t) / span)) : 0;
  const lerp = (p: number, q: number) => p + (q - p) * k;

  const next = new Map(b.players.map((p) => [p.playerId, p]));
  const players: Positioned[] = a.players.map((p) => {
    const q = next.get(p.playerId) ?? p;
    return {
      key: String(p.playerId),
      playerId: p.playerId,
      x: lerp(p.x, q.x),
      y: lerp(p.y, q.y),
      side: sideOf(p.team),
      number: p.sweaterNumber,
      isScorer: p.playerId === scorerId,
    };
  });
  const puck = a.puck && b.puck ? { x: lerp(a.puck.x, b.puck.x), y: lerp(a.puck.y, b.puck.y) } : (a.puck ?? null);
  const trail = frames.filter((f) => f.puck && f.t <= t && f.t >= t - TRAIL_SECONDS).map((f) => f.puck!);
  if (puck) trail.push(puck);
  return { players, puck, trail };
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const POSITION_NAMES: Record<string, string> = { C: "Centre", L: "Left wing", R: "Right wing", D: "Defence", G: "Goalie" };

// Who a dot is and how their night is going, from the game's box score.
function PlayerTooltip({ data, goal, playerId, side }: { data: LiveGameResponse; goal: LiveGoal; playerId: number; side: TeamSide | null }) {
  const skater = data.skaters.find((s) => s.playerId === playerId);
  const goalie = data.goalies.find((g) => g.playerId === playerId);
  const rostered = data.roster.find((r) => r.playerId === playerId);
  const name = skater?.name ?? goalie?.name ?? rostered?.name ?? "Unknown player";
  const number = skater?.number ?? goalie?.number ?? rostered?.number;
  const position = goalie ? "G" : (skater?.position ?? rostered?.position);
  const role =
    playerId === goal.scorerId
      ? "Scored this goal"
      : goal.assists.some((a) => a.name === name)
        ? "Assisted on this goal"
        : null;

  return (
    <>
      <TooltipTitle colour={side ? teamColour(side) : undefined}>
        {number != null && `#${number} `}
        {name}
      </TooltipTitle>
      <div className="text-muted-foreground">
        {[side && data[side].abbrev, position && (POSITION_NAMES[position] ?? position)].filter(Boolean).join(" · ")}
      </div>
      {role && <div className="font-medium">{role}</div>}
      {skater && (
        <div className="tabular-nums">
          Tonight: {skater.goals} G · {skater.assists} A · {skater.shotsOnGoal} SOG · {mmss(skater.toiSeconds)} TOI
        </div>
      )}
      {goalie && (
        <div className="tabular-nums">
          Tonight: {goalie.saves}/{goalie.shotsAgainst} saves
          {goalie.savePct != null && ` · ${fmt(goalie.savePct, 3).replace(/^0/, "")}`}
        </div>
      )}
    </>
  );
}

function ReplayPlayer({ data, goal }: { data: LiveGameResponse; goal: LiveGoal }) {
  const { data: replay, isLoading, error } = useGoalReplay(String(data.meta.gameId), goal.eventId);
  const frames = useMemo(() => replay?.frames ?? [], [replay]);
  const end = frames.at(-1)?.t ?? 0;

  const [t, setTState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>("1");
  const { bind, tooltip } = useChartTooltip();
  // The animation loop reads and advances time through a ref.
  const time = useRef(0);
  const setT = (value: number) => {
    time.current = value;
    setTState(value);
  };

  // A new goal starts from the top (and plays, unless motion is reduced).
  useEffect(() => {
    time.current = 0;
    setTState(0);
    setPlaying(!prefersReducedMotion());
  }, [goal.eventId, frames]);

  useEffect(() => {
    if (!playing || frames.length === 0) return;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      const dt = last == null ? 0 : (now - last) / 1000;
      last = now;
      const next = Math.min(end, time.current + dt * Number(speed));
      time.current = next;
      setTState(next);
      if (next >= end) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, end, frames.length]);

  const sideOf = (team: string | null): TeamSide | null =>
    team === data.away.abbrev ? "away" : team === data.home.abbrev ? "home" : null;
  const { players, puck, trail } = useMemo(
    () => (frames.length > 0 ? positionsAt(frames, t, sideOf, goal.scorerId) : { players: [], puck: null, trail: [] }),
    // sideOf only depends on the team codes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frames, t, goal.scorerId, data.away.abbrev, data.home.abbrev],
  );

  if (error) {
    return (
      <div className="flex aspect-[202/94] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        The NHL hasn't published tracking for this goal.
      </div>
    );
  }
  if (isLoading || frames.length === 0) return <Skeleton className="aspect-[202/94] w-full rounded-xl" />;

  const done = t >= end;
  return (
    <div className="space-y-3">
      <Rink>
        {trail.length > 1 && (
          <polyline
            points={trail.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--foreground)"
            strokeOpacity={0.35}
            strokeWidth={0.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {players.map((p) => (
          <g
            key={p.key}
            transform={`translate(${p.x} ${p.y})`}
            {...(p.playerId != null ? bind(<PlayerTooltip data={data} goal={goal} playerId={p.playerId} side={p.side} />) : {})}
          >
            <circle
              r={2.2}
              fill={p.side ? teamColour(p.side) : "var(--muted-foreground)"}
              stroke={p.isScorer ? "var(--foreground)" : "var(--card)"}
              strokeWidth={p.isScorer ? 0.6 : 0.4}
            />
            {p.number != null && (
              <text pointerEvents="none" textAnchor="middle" dominantBaseline="central" fontSize={1.9} fontWeight={700} fill="white">
                {p.number}
              </text>
            )}
          </g>
        ))}
        {puck && <circle cx={puck.x} cy={puck.y} r={0.9} fill="var(--foreground)" stroke="var(--card)" strokeWidth={0.3} />}
      </Rink>
      {tooltip}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (done) setT(0);
            setPlaying((v) => (done ? true : !v));
          }}
          aria-label={playing ? "Pause" : done ? "Replay" : "Play"}
        >
          {playing ? <Pause className="size-4" /> : done ? <RotateCcw className="size-4" /> : <Play className="size-4" />}
          {playing ? "Pause" : done ? "Replay" : "Play"}
        </Button>
        <input
          type="range"
          min={0}
          max={end}
          step={0.1}
          value={t}
          onChange={(e) => {
            setPlaying(false);
            setT(Number(e.target.value));
          }}
          aria-label="Replay position"
          className="h-1.5 min-w-32 flex-1 cursor-pointer accent-[var(--primary)]"
        />
        <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
          {t.toFixed(1)}s
        </span>
        <SegmentedControl aria-label="Playback speed" value={speed} onValueChange={(v) => setSpeed(v as Speed)} options={[...SPEEDS]} />
      </div>
    </div>
  );
}

function goalLabel(g: LiveGoal): string {
  return `${periodName(g.period)} ${g.timeInPeriod}`;
}

/**
 * Player and puck tracking for the build-up to each goal, played back on the
 * rink. Goals the NHL has no tracking for are left out.
 */
export function GoalReplaySection({ data }: { data: LiveGameResponse }) {
  const goals = useMemo(() => data.goals.filter((g) => g.hasReplay && g.eventId != null), [data.goals]);
  const [selected, setSelected] = useState<number | null>(null);
  const goal = goals.find((g) => g.eventId === selected) ?? goals.at(-1);
  if (!goal) return null;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.6fr_1fr]">
      <div className="space-y-2">
        <ReplayPlayer data={data} goal={goal} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <TeamLabel side="away">{data.away.abbrev}</TeamLabel>
          <TeamLabel side="home">{data.home.abbrev}</TeamLabel>
          <span className="inline-flex items-center gap-1.5">
            <Swatch colour="var(--foreground)" className="rounded-full" />
            Puck, with its last two seconds
          </span>
          <span>Ringed: the scorer</span>
        </div>
      </div>
      <ol className="space-y-1">
        {goals.map((g) => (
          <li key={g.eventId} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(g.eventId)}
              aria-pressed={g === goal}
              className={cn(
                "group -ml-2 flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-muted/60",
                g === goal && "bg-muted",
              )}
            >
              <Swatch side={g.team} />
              <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">{goalLabel(g)}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{g.scorer}</span>
              {g.strength && g.strength !== "EV" && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase">{g.strength}</span>
              )}
              <span className="text-xs text-muted-foreground tabular-nums">
                {g.awayScore}–{g.homeScore}
              </span>
            </button>
            {g.highlightUrl && (
              <a
                href={g.highlightUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs text-link hover:underline"
                aria-label={`Watch ${g.scorer}'s goal on NHL.com`}
              >
                Watch
              </a>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
