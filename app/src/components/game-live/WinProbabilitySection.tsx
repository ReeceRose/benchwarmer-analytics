import { useRef, useState } from "react";
import { StatTile } from "@/components/layout";
import { TooltipTitle } from "@/components/game-live/ChartTooltip";
import { Card, Swatch, TeamLabel } from "@/components/game-live/parts";
import { PowerPlayBands } from "@/components/game-live/ShotSections";
import { gameClock, periodName, teamColour, teamTint, timelineEnd } from "@/components/game-live/live-utils";
import { useChartTooltip } from "@/components/game-live/useChartTooltip";
import { useElementWidth } from "@/components/game-live/useElementWidth";
import { useGameProjections } from "@/hooks";
import { easternDate } from "@/lib/game-formatters";
import type { LiveGameResponse, TeamSide } from "@/types";

type Point = { t: number; home: number };

const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/**
 * Moves the series' starting point from home ice alone to the matchup's
 * pregame probability. The model adds a pregame shift on the logit scale that
 * fades to nothing by the end of regulation, so this is exact.
 */
function withPregame(points: readonly Point[], pregame: number | undefined): Point[] {
  const base = points[0]?.home;
  if (pregame === undefined || base === undefined || base <= 0 || base >= 1) return [...points];
  const shift = logit(pregame) - logit(base);
  return points.map((p) => {
    if (p.t >= 3600 || p.home <= 0 || p.home >= 1) return p;
    return { t: p.t, home: sigmoid(logit(p.home) + shift * (1 - p.t / 3600)) };
  });
}

/** The last point at or before `t`, or the first point. */
function valueAt(points: readonly Point[], t: number): number {
  let v = points[0]?.home ?? 0.5;
  for (const p of points) {
    if (p.t > t) break;
    v = p.home;
  }
  return v;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const favourite = (data: LiveGameResponse, home: number) =>
  home >= 0.5 ? `${data.home.abbrev} ${pct(home)}` : `${data.away.abbrev} ${pct(1 - home)}`;

interface Swing {
  t: number;
  team: TeamSide;
  scorer: string;
  before: number;
  after: number;
}

/**
 * Each goal's change in win probability, for the scoring team. The series has
 * two points at every goal (before and after); the scorer comes from the goal
 * summary, which can be a second or two off the play-by-play.
 */
function goalSwings(data: LiveGameResponse, points: readonly Point[]): Swing[] {
  const swings: Swing[] = [];
  for (let i = 1; i < points.length; i++) {
    const [prev, cur] = [points[i - 1], points[i]];
    if (prev.t !== cur.t || prev.home === cur.home) continue;
    const team: TeamSide = cur.home > prev.home ? "home" : "away";
    const own = (v: number) => (team === "home" ? v : 1 - v);
    const goal = data.goals.find((g) => g.team === team && Math.abs(g.t - cur.t) <= 3);
    swings.push({ t: cur.t, team, scorer: goal?.scorer ?? "Goal", before: own(prev.home), after: own(cur.home) });
  }
  return swings;
}

/**
 * The home team's chance of winning through the game, from the in-game model:
 * above the midline the home team is favoured, below it the away team.
 */
export function WinProbabilitySection({ data }: { data: LiveGameResponse }) {
  const { show, hide, tooltip } = useChartTooltip();
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: boxRef, width: W } = useElementWidth<HTMLDivElement>(1000);
  const [cursor, setCursor] = useState<number | null>(null);
  const gameDate = data.meta.startTimeUtc ? easternDate(data.meta.startTimeUtc) : undefined;
  const { data: pregameByGame } = useGameProjections(gameDate);
  const pregameOdds = pregameByGame?.get(data.meta.gameId);
  const points = withPregame(data.winProbability, pregameOdds);
  const H = W < 640 ? 200 : 260;
  const M = { l: 46, r: 16, t: 12, b: 24 };
  const end = timelineEnd(data);
  const now = data.meta.elapsedSeconds;
  const x = (t: number) => M.l + ((W - M.l - M.r) * t) / end;
  const y = (home: number) => M.t + (H - M.t - M.b) * (1 - home);
  const mid = y(0.5);

  const path = points.length ? `M${points.map((p) => `${x(p.t)},${y(p.home)}`).join("L")}` : "";
  const area = points.length ? `${path}L${x(points.at(-1)!.t)},${mid}L${x(points[0].t)},${mid}Z` : "";

  const swings = goalSwings(data, points);
  const biggest = swings.reduce<Swing | null>((best, s) => (!best || s.after - s.before > best.after - best.before ? s : best), null);
  const pregame = points[0]?.home ?? null;
  // The trailing team's best moment: the lowest point for whoever is favoured now.
  const current = points.at(-1)?.home ?? 0.5;
  const leader: TeamSide = current >= 0.5 ? "home" : "away";
  const underdog: TeamSide = leader === "home" ? "away" : "home";
  const underdogPeak = points.reduce(
    (best, p) => {
      const v = underdog === "home" ? p.home : 1 - p.home;
      return v > best.v ? { v, t: p.t } : best;
    },
    { v: 0, t: 0 },
  );

  const onMove = (event: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((event.clientX - rect.left) * W) / rect.width;
    const t = Math.round(Math.max(0, Math.min(now, ((px - M.l) / (W - M.l - M.r)) * end)));
    setCursor(t);
    const home = valueAt(points, t);
    const score = (side: TeamSide) => data.goals.filter((g) => g.team === side && g.t <= t).length;
    show(
      event,
      <>
        <TooltipTitle>{gameClock(t)}</TooltipTitle>
        <table className="tabular-nums">
          <tbody>
            {(["away", "home"] as const).map((side) => (
              <tr key={side}>
                <td><TeamLabel side={side}>{data[side].abbrev}</TeamLabel></td>
                <td className="pl-3 text-right">{score(side)}</td>
                <td className="pl-3 text-right font-semibold">{pct(side === "home" ? home : 1 - home)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>,
    );
  };

  const isFinal = now > 0 && points.at(-1) && (points.at(-1)!.home === 0 || points.at(-1)!.home === 1);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <TeamLabel side="away">{data.away.abbrev} favoured (below)</TeamLabel>
          <TeamLabel side="home">{data.home.abbrev} favoured (above)</TeamLabel>
          <span className="inline-flex items-center gap-1.5"><Swatch colour={teamTint("home", 30)} />Power play (shaded by team)</span>
          <span>● Goal</span>
        </div>
        <div ref={boxRef}>
          <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Win probability through the game">
            <defs>
              <clipPath id="wp-home"><rect x={0} y={0} width={W} height={mid} /></clipPath>
              <clipPath id="wp-away"><rect x={0} y={mid} width={W} height={H - mid} /></clipPath>
            </defs>
            <PowerPlayBands data={data} x={x} top={M.t} height={H - M.t - M.b} />
            {[1, 0.75, 0.5, 0.25, 0].map((v) => (
              <g key={v}>
                <line
                  x1={M.l}
                  x2={W - M.r}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="var(--border)"
                  strokeOpacity={v === 0.5 ? 1 : 0.6}
                  strokeDasharray={v === 0.5 ? "4 4" : undefined}
                />
                <text x={M.l - 6} y={y(v) + 3.5} textAnchor="end" fontSize={10.5} fill="var(--muted-foreground)">
                  {pct(v >= 0.5 ? v : 1 - v)}
                </text>
              </g>
            ))}
            {(["home", "away"] as const).map((side) => {
              const ty = side === "home" ? M.t + 22 : H - M.b - 14;
              return (
                <g key={side}>
                  <rect x={M.l + 6} y={ty - 8} width={8} height={8} rx={2} fill={teamColour(side)} />
                  <text x={M.l + 18} y={ty} fontSize={10.5} fill="var(--muted-foreground)">{data[side].abbrev}</text>
                </g>
              );
            })}
            {Array.from({ length: end / 1200 }, (_, i) => i).map((p) => (
              <g key={p}>
                {p > 0 && <line x1={x(p * 1200)} x2={x(p * 1200)} y1={M.t} y2={H - M.b} stroke="var(--border)" strokeDasharray="3 3" />}
                <text x={x(p * 1200 + 600)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">{periodName(p + 1)}</text>
              </g>
            ))}
            {(["home", "away"] as const).map((side) => (
              <g key={side} clipPath={`url(#wp-${side})`}>
                <path d={area} fill={teamTint(side, 12)} />
                <path d={path} fill="none" stroke={teamColour(side)} strokeWidth={2} strokeLinejoin="round" />
              </g>
            ))}
            {now < end && !isFinal && (
              <>
                <line x1={x(now)} x2={x(now)} y1={M.t} y2={H - M.b} stroke="var(--foreground)" strokeOpacity={0.4} />
                <text x={x(now) + 4} y={M.t + 9} fontSize={10.5} fill="var(--muted-foreground)">now</text>
              </>
            )}
            {cursor != null && <line x1={x(cursor)} x2={x(cursor)} y1={M.t} y2={H - M.b} stroke="var(--muted-foreground)" strokeDasharray="2 3" />}
            <rect
              x={M.l}
              y={M.t}
              width={W - M.l - M.r}
              height={H - M.t - M.b}
              fill="transparent"
              onMouseMove={onMove}
              onMouseLeave={() => { hide(); setCursor(null); }}
            />
            {swings.map((s) => (
              <circle
                key={`${s.t}-${s.scorer}`}
                cx={x(s.t)}
                cy={y(s.team === "home" ? s.after : 1 - s.after)}
                r={5}
                fill="var(--card)"
                stroke={teamColour(s.team)}
                strokeWidth={2}
                pointerEvents="none"
              />
            ))}
          </svg>
        </div>
        {tooltip}
      </Card>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Pregame"
          value={pregame == null ? "–" : favourite(data, pregame)}
          note={pregameOdds === undefined ? "Home ice only; no matchup rating for this game" : "From both teams' ratings and home ice"}
        />
        <StatTile
          label="Biggest swing"
          value={biggest ? `+${Math.round((biggest.after - biggest.before) * 100)} ${data[biggest.team].abbrev}` : "–"}
          note={biggest ? `${biggest.scorer}, ${gameClock(biggest.t)}: ${pct(biggest.before)} → ${pct(biggest.after)}` : "No goals yet"}
        />
        <StatTile
          label={`${data[underdog].abbrev}'s best chance`}
          value={pct(underdogPeak.v)}
          note={underdogPeak.t === 0 ? "At puck drop" : gameClock(underdogPeak.t)}
        />
      </div>
    </div>
  );
}
