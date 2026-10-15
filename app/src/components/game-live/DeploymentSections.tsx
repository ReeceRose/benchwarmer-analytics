import { useMemo, useState } from "react";
import { SegmentedControl } from "@/components/layout";
import { TooltipTitle } from "@/components/game-live/ChartTooltip";
import { useChartTooltip } from "@/components/game-live/useChartTooltip";
import { Card, TeamLabel } from "@/components/game-live/parts";
import { SIDES, fmt, gameClock, mmss, periodName, share, teamColour, teamTint, timelineEnd } from "@/components/game-live/live-utils";
import type { LiveGameResponse, LiveUnit, TeamSide } from "@/types";

function UnitTable({ title, units }: { title: string; units: LiveUnit[] }) {
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th className="pb-1.5 text-left font-medium">{title}</th>
          <th className="pb-1.5 text-right font-medium">5v5 TOI</th>
          <th className="pb-1.5 text-right font-medium">Attempts</th>
          <th className="pb-1.5 text-right font-medium">xG</th>
          <th className="pb-1.5 text-right font-medium">Goals</th>
        </tr>
      </thead>
      <tbody>
        {units.length === 0 && (
          <tr><td colSpan={5} className="py-2 text-muted-foreground">No shift data yet</td></tr>
        )}
        {units.map((u) => {
          const cf = share(u.attemptsFor, u.attemptsAgainst);
          return (
            <tr key={u.players.join()} className="border-t">
              <td className="py-1.5 pr-2">{u.players.join(" – ")}</td>
              <td className="py-1.5 text-right">{mmss(u.seconds)}</td>
              <td className="py-1.5 text-right whitespace-nowrap">
                {u.attemptsFor}–{u.attemptsAgainst}
                {cf != null && <span className="ml-1 text-xs text-muted-foreground">{fmt(cf)}%</span>}
              </td>
              <td className="py-1.5 text-right whitespace-nowrap">{fmt(u.xgFor, 2)}–{fmt(u.xgAgainst, 2)}</td>
              <td className="py-1.5 text-right">{u.goalsFor}–{u.goalsAgainst}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function LinesSection({ data }: { data: LiveGameResponse }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {SIDES.map((side) => (
        <Card key={side} title={<TeamLabel side={side}>{data[side].name}</TeamLabel>}>
          <div className="space-y-4 overflow-x-auto">
            <UnitTable title="Forward line" units={data.lines[side].forwards} />
            <UnitTable title="Defence pair" units={data.lines[side].defense} />
          </div>
        </Card>
      ))}
    </div>
  );
}

const POSITION_ORDER: Record<string, number> = { C: 0, L: 1, R: 2, D: 3, G: 4 };

export function ShiftChart({ data }: { data: LiveGameResponse }) {
  const { bind, tooltip } = useChartTooltip();
  const [team, setTeam] = useState<"both" | TeamSide>("both");
  const byPlayer = useMemo(() => {
    const map = new Map<number, { start: number; end: number }[]>();
    for (const s of data.shifts) {
      const list = map.get(s.playerId) ?? [];
      list.push(s);
      map.set(s.playerId, list);
    }
    return map;
  }, [data.shifts]);
  const players = data.roster
    .filter((p) => byPlayer.has(p.playerId) && (team === "both" || p.team === team))
    .sort((a, b) => (a.team === b.team ? 0 : a.team === "away" ? -1 : 1) || (POSITION_ORDER[a.position] ?? 9) - (POSITION_ORDER[b.position] ?? 9) || a.number - b.number);
  const RH = 13;
  const L = 130;
  const W = 1000;
  const end = timelineEnd(data);
  const H = players.length * RH + 24;
  const x = (t: number) => L + ((W - L - 8) * t) / end;
  const plotH = H - 22;
  const latestShift = data.shifts.reduce((m, s) => Math.max(m, s.end), 0);

  if (players.length === 0) return <Card><p className="text-sm text-muted-foreground">No shift data yet.</p></Card>;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl aria-label="Team" value={team} onValueChange={setTeam}
          options={[{ value: "both", label: "Both" }, { value: "away", label: data.away.abbrev }, { value: "home", label: data.home.abbrev }]} />
        <span className="text-xs text-muted-foreground">Shift data through {gameClock(latestShift)} · play-by-play through {gameClock(data.meta.elapsedSeconds)}</span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-3xl" role="img" aria-label="Shift chart">
          {data.strengthSegments.filter((s) => s.advantage).map((s) => (
            <rect key={s.start} x={x(s.start)} y={0} width={Math.max(1, x(s.end) - x(s.start))} height={plotH} fill={teamTint(s.advantage!)} />
          ))}
          {Array.from({ length: end / 300 + 1 }, (_, i) => i * 300).map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={plotH} stroke="var(--border)" strokeDasharray={t % 1200 ? "2 3" : undefined} strokeOpacity={t % 1200 ? 0.6 : 1} />
          ))}
          {Array.from({ length: end / 1200 }, (_, p) => (
            <text key={p} x={x(p * 1200 + 600)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">{periodName(p + 1)}</text>
          ))}
          {players.map((p, i) => {
            const y = i * RH;
            const shifts = byPlayer.get(p.playerId)!;
            const total = shifts.reduce((sum, s) => sum + s.end - s.start, 0);
            return (
              <g key={p.playerId}>
                {i > 0 && players[i - 1].team !== p.team && <line x1={0} x2={W} y1={y} y2={y} stroke="var(--foreground)" strokeOpacity={0.25} />}
                <text x={L - 8} y={y + RH - 3} textAnchor="end" fontSize={10} fill="var(--foreground)">{p.name} · {p.position}</text>
                {shifts.map((s) => (
                  <rect
                    key={s.start}
                    x={x(s.start)}
                    y={y + 2}
                    width={Math.max(1, x(s.end) - x(s.start) - 0.5)}
                    height={RH - 4}
                    rx={2}
                    fill={teamColour(p.team)}
                    fillOpacity={p.position === "G" ? 0.35 : 0.9}
                    {...bind(
                      <>
                        <TooltipTitle colour={teamColour(p.team)}>{p.name}</TooltipTitle>
                        {gameClock(s.start)} → {gameClock(s.end)} · {mmss(s.end - s.start)}
                        <br />
                        {shifts.length} shifts · {mmss(total)} total · avg {mmss(total / shifts.length)}
                      </>,
                    )}
                  />
                ))}
              </g>
            );
          })}
          {data.shots.filter((s) => s.result === "GOAL").map((g) => (
            <line key={`${g.t}-${g.shooterId}`} x1={x(g.t)} x2={x(g.t)} y1={0} y2={plotH} stroke={teamColour(g.team)} strokeWidth={1.5} />
          ))}
          {data.meta.elapsedSeconds < end && (
            <line x1={x(data.meta.elapsedSeconds)} x2={x(data.meta.elapsedSeconds)} y1={0} y2={plotH} stroke="var(--foreground)" strokeDasharray="3 2" strokeOpacity={0.6} />
          )}
        </svg>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Vertical lines mark goals in the scoring team's colour. Shaded bands are power plays.</p>
      {tooltip}
    </Card>
  );
}

export function OnIceNow({ data }: { data: LiveGameResponse }) {
  const { situation, meta } = data;
  return (
    <Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {SIDES.map((side) => (
          <div key={side}>
            <div className="mb-2 text-sm">
              <TeamLabel side={side}><b>{data[side].name}</b></TeamLabel>
              {situation && <span className="text-muted-foreground"> · {side === "away" ? situation.awaySkaters : situation.homeSkaters} skaters</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {data.onIce[side].length === 0 && <span className="text-sm text-muted-foreground">–</span>}
              {data.onIce[side].map((p) => (
                <div key={p.playerId} className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm">
                  {p.headshot ? (
                    <img src={p.headshot} alt="" className="size-8 rounded-full bg-muted" style={{ outline: `2px solid ${teamColour(side)}`, outlineOffset: 1 }} />
                  ) : (
                    <span className="size-8 rounded-full bg-muted" />
                  )}
                  <span>
                    <span className="block leading-tight">
                      #{p.number} {p.name} <span className="text-muted-foreground">{p.position}</span>
                    </span>
                    {p.toiSeconds != null && <span className="block text-[11px] leading-tight text-muted-foreground tabular-nums">{mmss(p.toiSeconds)} TOI</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground lg:col-span-2">
          {meta.inIntermission ? "Intermission" : `${meta.clockRunning ? "Clock running" : "Clock stopped"} · ${periodName(meta.period)}, ${meta.timeRemaining ?? "–"} left`}
          {situation?.descriptions.length ? ` · ${situation.descriptions.join(", ")}${situation.timeRemaining ? ` (${situation.timeRemaining})` : ""}` : ""}
        </p>
      </div>
    </Card>
  );
}
