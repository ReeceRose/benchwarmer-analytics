import { useMemo, useRef, useState } from "react";
import { SegmentedControl } from "@/components/layout";
import { TooltipTitle } from "@/components/game-live/ChartTooltip";
import { useChartTooltip } from "@/components/game-live/useChartTooltip";
import { Rink } from "@/components/game-live/Rink";
import { Card, Swatch, TeamLabel } from "@/components/game-live/parts";
import { SIDES, fmt, gameClock, periodName, teamColour, teamTint, timelineEnd, titleCase } from "@/components/game-live/live-utils";
import type { LiveGameResponse, LiveShot, ShotResult, StrengthState, TeamSide } from "@/types";

const RESULT_LABEL: Record<ShotResult, string> = { GOAL: "Goal", SOG: "Shot on goal", MISS: "Missed", BLOCK: "Blocked" };

function PowerPlayBands({ data, x, top, height }: { data: LiveGameResponse; x: (t: number) => number; top: number; height: number }) {
  return (
    <>
      {data.strengthSegments
        .filter((s) => s.advantage)
        .map((s) => (
          <rect key={s.start} x={x(s.start)} y={top} width={Math.max(1, x(s.end) - x(s.start))} height={height} fill={teamTint(s.advantage!)} />
        ))}
    </>
  );
}

/** Cumulative xG step lines with goals, plus attempts per two minutes. */
export function GameFlowChart({ data }: { data: LiveGameResponse }) {
  const { bind, show, hide, tooltip } = useChartTooltip();
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const W = 1000;
  const H = 280;
  const M = { l: 36, r: 76, t: 14, b: 24 };
  const end = timelineEnd(data);
  const now = data.meta.elapsedSeconds;
  const x = (t: number) => M.l + ((W - M.l - M.r) * t) / end;

  const series = useMemo(() => {
    const build = (side: TeamSide) => {
      const pts: [number, number][] = [[0, 0]];
      let total = 0;
      for (const s of data.shots) {
        if (s.team !== side || s.result === "BLOCK") continue;
        pts.push([s.t, total]);
        total += s.xg ?? 0;
        pts.push([s.t, total]);
      }
      pts.push([now, total]);
      return pts;
    };
    return { away: build("away"), home: build("home") };
  }, [data.shots, now]);
  const valueAt = (side: TeamSide, t: number) => {
    let v = 0;
    for (const [tt, c] of series[side]) if (tt <= t) v = c;
    return v;
  };
  const yMax = Math.max(1, series.away.at(-1)![1], series.home.at(-1)![1]) * 1.15;
  const y = (v: number) => H - M.b - ((H - M.t - M.b) * v) / yMax;
  const step = yMax > 4 ? 1 : 0.5;
  const goals = data.shots.filter((s) => s.result === "GOAL");
  // Goal name labels sit above their dot; nudge a label up when it would
  // overlap one already placed (goals close in time and xG).
  const labelY = new Map<LiveShot, number>();
  const placed: { x: number; y: number; w: number }[] = [];
  for (const g of goals) {
    const lx = x(g.t);
    const w = g.shooter.split(" ").pop()!.length * 5.6 + 6;
    let ly = y(valueAt(g.team, g.t)) - 10;
    while (placed.some((p) => Math.abs(p.x - lx) < (p.w + w) / 2 && Math.abs(p.y - ly) < 12)) ly -= 12;
    placed.push({ x: lx, y: ly, w });
    labelY.set(g, ly);
  }

  const onMove = (event: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((event.clientX - rect.left) * W) / rect.width;
    const t = Math.round(Math.max(0, Math.min(now, ((px - M.l) / (W - M.l - M.r)) * end)));
    setCursor(t);
    const count = (side: TeamSide, f: (s: LiveShot) => boolean) => data.shots.filter((s) => s.team === side && s.t <= t && f(s)).length;
    show(
      event,
      <>
        <TooltipTitle>{gameClock(t)}</TooltipTitle>
        <table className="tabular-nums">
          <tbody>
            <tr><td /><td className="pl-3 text-right font-semibold">{data.away.abbrev}</td><td className="pl-3 text-right font-semibold">{data.home.abbrev}</td></tr>
            <tr><td>xG</td><td className="pl-3 text-right">{fmt(valueAt("away", t), 2)}</td><td className="pl-3 text-right">{fmt(valueAt("home", t), 2)}</td></tr>
            <tr><td>Goals</td><td className="pl-3 text-right">{count("away", (s) => s.result === "GOAL")}</td><td className="pl-3 text-right">{count("home", (s) => s.result === "GOAL")}</td></tr>
            <tr><td>Attempts</td><td className="pl-3 text-right">{count("away", () => true)}</td><td className="pl-3 text-right">{count("home", () => true)}</td></tr>
          </tbody>
        </table>
      </>,
    );
  };

  // Attempts per two minutes, home above the axis and away below.
  const BIN = 120;
  const bins = Array.from({ length: Math.ceil(end / BIN) }, () => ({ away: 0, home: 0, awayXg: 0, homeXg: 0 }));
  for (const s of data.shots) {
    const b = bins[Math.min(bins.length - 1, Math.floor(s.t / BIN))];
    b[s.team]++;
    if (s.result !== "BLOCK") b[s.team === "away" ? "awayXg" : "homeXg"] += s.xg ?? 0;
  }
  const MH = 120;
  const mid = MH / 2;
  const binMax = Math.max(3, ...bins.map((b) => Math.max(b.away, b.home)));
  const barH = (v: number) => ((mid - 8) * v) / binMax;
  const bw = (W - M.l - M.r) / bins.length;

  return (
    <Card>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {SIDES.map((side) => (
          <TeamLabel key={side} side={side}>{data[side].abbrev} xG</TeamLabel>
        ))}
        <span className="inline-flex items-center gap-1.5"><Swatch colour={teamTint("home", 30)} />Power play (shaded by team)</span>
        <span>● Goal</span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative expected goals">
        <PowerPlayBands data={data} x={x} top={M.t} height={H - M.t - M.b} />
        {Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step).map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeOpacity={0.6} />
            <text x={M.l - 6} y={y(v) + 3.5} textAnchor="end" fontSize={10.5} fill="var(--muted-foreground)">{v.toFixed(1)}</text>
          </g>
        ))}
        {Array.from({ length: end / 1200 }, (_, i) => i).map((p) => (
          <g key={p}>
            {p > 0 && <line x1={x(p * 1200)} x2={x(p * 1200)} y1={M.t} y2={H - M.b} stroke="var(--border)" strokeDasharray="3 3" />}
            <text x={x(p * 1200 + 600)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">{periodName(p + 1)}</text>
          </g>
        ))}
        {now < end && (
          <>
            <line x1={x(now)} x2={x(now)} y1={M.t} y2={H - M.b} stroke="var(--foreground)" strokeOpacity={0.4} />
            <text x={x(now) + 4} y={M.t + 9} fontSize={10.5} fill="var(--muted-foreground)">now</text>
          </>
        )}
        {SIDES.map((side) => {
          const pts = series[side];
          const last = pts.at(-1)!;
          return (
            <g key={side}>
              <path d={`M${pts.map(([t, v]) => `${x(t)},${y(v)}`).join("L")}`} fill="none" stroke={teamColour(side)} strokeWidth={2} strokeLinejoin="round" />
              <text x={x(last[0]) + 6} y={y(last[1]) + (side === "away" ? 12 : -2)} fontSize={11.5} fontWeight={600} fill="var(--foreground)">
                {data[side].abbrev} {last[1].toFixed(2)}
              </text>
            </g>
          );
        })}
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
        {goals.map((g) => {
          const v = valueAt(g.team, g.t);
          return (
            <g key={`${g.t}-${g.shooterId}`}>
              <text x={x(g.t)} y={labelY.get(g)} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">{g.shooter.split(" ").pop()}</text>
              <circle
                cx={x(g.t)}
                cy={y(v)}
                r={6}
                fill={teamColour(g.team)}
                stroke="var(--card)"
                strokeWidth={2}
                {...bind(
                  <>
                    <TooltipTitle colour={teamColour(g.team)}>Goal · {g.shooter}</TooltipTitle>
                    {gameClock(g.t)} · {g.strength}
                    <br />
                    {g.shotType ?? "shot"}, {fmt(g.distance)} ft · xG {fmt(g.xg, 2)}
                  </>,
                )}
              />
            </g>
          );
        })}
      </svg>
      <svg viewBox={`0 0 ${W} ${MH}`} className="mt-1 w-full" role="img" aria-label="Shot attempts per two minutes">
        <line x1={M.l} x2={W - M.r} y1={mid} y2={mid} stroke="var(--border)" />
        <text x={M.l - 6} y={12} textAnchor="end" fontSize={10.5} fill="var(--muted-foreground)">{data.home.abbrev}</text>
        <text x={M.l - 6} y={MH - 4} textAnchor="end" fontSize={10.5} fill="var(--muted-foreground)">{data.away.abbrev}</text>
        <text x={W - M.r + 6} y={mid - 3} fontSize={10.5} fill="var(--muted-foreground)">attempts</text>
        <text x={W - M.r + 6} y={mid + 10} fontSize={10.5} fill="var(--muted-foreground)">per 2 min</text>
        {bins.map((b, i) => {
          if (i * BIN > now) return null;
          const bx = M.l + i * bw + 1.5;
          const w = bw - 3;
          return (
            <g key={i}>
              {b.home > 0 && <rect x={bx} y={mid - 1 - barH(b.home)} width={w} height={barH(b.home)} rx={3} fill={teamColour("home")} />}
              {b.away > 0 && <rect x={bx} y={mid + 1} width={w} height={barH(b.away)} rx={3} fill={teamColour("away")} />}
              <rect
                x={M.l + i * bw}
                y={0}
                width={bw}
                height={MH}
                fill="transparent"
                {...bind(
                  <>
                    <TooltipTitle>{gameClock(i * BIN)} – {gameClock(Math.min((i + 1) * BIN, end))}</TooltipTitle>
                    {data.home.abbrev}: {b.home} attempts · {b.homeXg.toFixed(2)} xG
                    <br />
                    {data.away.abbrev}: {b.away} attempts · {b.awayXg.toFixed(2)} xG
                  </>,
                )}
              />
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">
        {data.meta.xgSource === "moneypuck"
          ? "xG is MoneyPuck's, matched to NHL play-by-play shot by shot."
          : "xG is approximate: a distance, angle and shot-type model on NHL play-by-play. MoneyPuck's xG replaces it after the game."}
      </p>
      {tooltip}
    </Card>
  );
}

function ShotMark({ shot, onBind }: { shot: LiveShot; onBind: ReturnType<typeof useChartTooltip>["bind"] }) {
  if (shot.x == null || shot.y == null) return null;
  // Away shoots left, home shoots right.
  const px = shot.team === "home" ? shot.x : -shot.x;
  const py = shot.team === "home" ? -shot.y : shot.y;
  const r = 1.1 + Math.sqrt(shot.xg ?? 0.02) * 4.2;
  const c = teamColour(shot.team);
  const tip = (
    <>
      <TooltipTitle colour={c}>{shot.shooter} · {RESULT_LABEL[shot.result]}</TooltipTitle>
      {gameClock(shot.t)} · {shot.strength}
      {shot.highDanger && " · high danger"}
      {shot.rebound && " · rebound"}
      <br />
      {shot.shotType ?? "unknown type"}, {fmt(shot.distance)} ft, {fmt(shot.angle)}°
      <br />
      {shot.result !== "BLOCK" && <>xG <b>{fmt(shot.xg, 3)}</b> · </>}
      {shot.goalie && `Goalie ${shot.goalie}`}
      {shot.missReason && <><br />Missed: {shot.missReason.replace(/-/g, " ")}</>}
      {shot.blocker && <><br />Blocked by {shot.blocker}</>}
    </>
  );
  return (
    <g>
      {shot.result === "GOAL" ? (
        <>
          <circle cx={px} cy={py} r={r + 0.9} fill={c} stroke="var(--card)" strokeWidth={0.6} />
          <circle cx={px} cy={py} r={Math.max(0.7, r * 0.35)} fill="var(--card)" />
        </>
      ) : shot.result === "SOG" ? (
        <circle cx={px} cy={py} r={r} fill={c} fillOpacity={0.85} stroke="var(--card)" strokeWidth={0.35} />
      ) : shot.result === "MISS" ? (
        <circle cx={px} cy={py} r={r} fill="none" stroke={c} strokeWidth={0.55} />
      ) : (
        <path d={`M${px - 1.3},${py - 1.3}L${px + 1.3},${py + 1.3}M${px + 1.3},${py - 1.3}L${px - 1.3},${py + 1.3}`} stroke={c} strokeWidth={0.55} />
      )}
      <circle cx={px} cy={py} r={Math.max(r, 2.6)} fill="transparent" {...onBind(tip)} />
    </g>
  );
}

type TeamFilter = "both" | TeamSide;
type ResultFilter = "all" | ShotResult;
type StateFilter = "all" | StrengthState;

export function LiveShotMap({ data }: { data: LiveGameResponse }) {
  const { bind, tooltip } = useChartTooltip();
  const [team, setTeam] = useState<TeamFilter>("both");
  const [result, setResult] = useState<ResultFilter>("all");
  const [state, setState] = useState<StateFilter>("all");
  const [period, setPeriod] = useState("all");
  const periods = [...new Set(data.shots.map((s) => s.period))].sort((a, b) => a - b);
  const order: Record<ShotResult, number> = { BLOCK: 0, MISS: 1, SOG: 2, GOAL: 3 };
  const shots = data.shots
    .filter((s) => (team === "both" || s.team === team)
      && (result === "all" || s.result === result || (result === "SOG" && s.result === "GOAL"))
      && (state === "all" || s.state === state)
      && (period === "all" || String(s.period) === period))
    .sort((a, b) => order[a.result] - order[b.result]);
  const unblocked = shots.filter((s) => s.result !== "BLOCK");

  return (
    <Card>
      <div className="mb-3 flex flex-wrap gap-2">
        <SegmentedControl aria-label="Team" value={team} onValueChange={setTeam}
          options={[{ value: "both", label: "Both" }, { value: "away", label: data.away.abbrev }, { value: "home", label: data.home.abbrev }]} />
        <SegmentedControl aria-label="Result" value={result} onValueChange={setResult}
          options={[{ value: "all", label: "All" }, { value: "GOAL", label: "Goals" }, { value: "SOG", label: "On goal" }, { value: "MISS", label: "Missed" }, { value: "BLOCK", label: "Blocked" }]} />
        <SegmentedControl aria-label="Strength" value={state} onValueChange={setState}
          options={[{ value: "all", label: "All" }, { value: "EV", label: "EV" }, { value: "PP", label: "PP" }, { value: "SH", label: "SH" }]} />
        <SegmentedControl aria-label="Period" value={period} onValueChange={setPeriod}
          options={[{ value: "all", label: "All" }, ...periods.map((p) => ({ value: String(p), label: periodName(p) }))]} />
      </div>
      <Rink labels={[`← ${data.away.abbrev} shooting`, `${data.home.abbrev} shooting →`]}>
        {shots.map((s) => (
          <ShotMark key={`${s.t}-${s.shooterId}-${s.result}-${s.x}`} shot={s} onBind={bind} />
        ))}
      </Rink>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <svg width={14} height={14} aria-hidden><circle cx={7} cy={7} r={5.5} fill="var(--foreground)" /><circle cx={7} cy={7} r={2} fill="var(--card)" /></svg>Goal
        </span>
        <span className="inline-flex items-center gap-1.5"><svg width={14} height={14} aria-hidden><circle cx={7} cy={7} r={4.5} fill="var(--muted-foreground)" /></svg>On goal</span>
        <span className="inline-flex items-center gap-1.5"><svg width={14} height={14} aria-hidden><circle cx={7} cy={7} r={4} fill="none" stroke="var(--muted-foreground)" strokeWidth={1.6} /></svg>Missed</span>
        <span className="inline-flex items-center gap-1.5"><svg width={14} height={14} aria-hidden><path d="M3 3L11 11M11 3L3 11" stroke="var(--muted-foreground)" strokeWidth={1.8} /></svg>Blocked</span>
        <span>Size = xG · dashed box = high-danger area</span>
        <span className="ml-auto tabular-nums">
          {shots.length} attempts · {unblocked.length} unblocked · {fmt(unblocked.reduce((sum, s) => sum + (s.xg ?? 0), 0), 2)} xG
        </span>
      </div>
      {tooltip}
    </Card>
  );
}

function CountTable({ data, counts }: { data: LiveGameResponse; counts: Record<TeamSide, Record<string, number>> }) {
  const keys = [...new Set([...Object.keys(counts.away), ...Object.keys(counts.home)])].sort(
    (a, b) => (counts.away[b] ?? 0) + (counts.home[b] ?? 0) - (counts.away[a] ?? 0) - (counts.home[a] ?? 0),
  );
  if (keys.length === 0) return <p className="text-sm text-muted-foreground">None yet</p>;
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th className="pb-1.5 text-left font-medium" />
          <th className="pb-1.5 text-right font-medium">{data.away.abbrev}</th>
          <th className="pb-1.5 text-right font-medium">{data.home.abbrev}</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => (
          <tr key={k} className="border-t">
            <td className="py-1">{titleCase(k.replace(/-/g, " "))}</td>
            <td className="py-1 text-right">{counts.away[k] ?? 0}</td>
            <td className="py-1 text-right">{counts.home[k] ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ShotProfile({ data }: { data: LiveGameResponse }) {
  const bins: [number, number, string][] = [[0, 15, "<15 ft"], [15, 25, "15–25 ft"], [25, 35, "25–35 ft"], [35, 50, "35–50 ft"], [50, 999, "50+ ft"]];
  const count = (side: TeamSide) =>
    bins.map(([lo, hi]) => data.shots.filter((s) => s.team === side && s.result !== "BLOCK" && s.distance != null && s.distance >= lo && s.distance < hi).length);
  const away = count("away");
  const home = count("home");
  const max = Math.max(1, ...away, ...home);
  const avg = (side: TeamSide) => {
    const list = data.shots.filter((s) => s.team === side && s.result !== "BLOCK" && s.distance != null);
    return list.reduce((sum, s) => sum + s.distance!, 0) / Math.max(list.length, 1);
  };
  return (
    <div className="space-y-4">
      <Card title="Shot distance (unblocked)">
        <div className="space-y-1">
          {bins.map(([, , label], i) => (
            <div key={label} className="grid grid-cols-[1.5rem_1fr_4.5rem_1fr_1.5rem] items-center gap-2 text-xs tabular-nums">
              <span className="text-right">{away[i]}</span>
              <div className="flex h-3 justify-end">
                <div className="rounded-l-[3px]" style={{ width: `${(100 * away[i]) / max}%`, background: teamColour("away") }} />
              </div>
              <span className="text-center text-muted-foreground">{label}</span>
              <div className="h-3">
                <div className="h-3 rounded-r-[3px]" style={{ width: `${(100 * home[i]) / max}%`, background: teamColour("home") }} />
              </div>
              <span>{home[i]}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
          Average distance: {data.away.abbrev} {fmt(avg("away"), 1)} ft · {data.home.abbrev} {fmt(avg("home"), 1)} ft
        </p>
      </Card>
      <Card title="Shot types">
        <CountTable data={data} counts={{ away: data.stats.away.shotTypes, home: data.stats.home.shotTypes }} />
      </Card>
      <Card title="Why shots missed">
        <CountTable data={data} counts={{ away: data.stats.away.missReasons, home: data.stats.home.missReasons }} />
      </Card>
    </div>
  );
}
