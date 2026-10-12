import { useState } from "react";
import { SegmentedControl } from "@/components/layout";
import { TooltipTitle } from "@/components/game-live/ChartTooltip";
import { useChartTooltip } from "@/components/game-live/useChartTooltip";
import { Rink } from "@/components/game-live/Rink";
import { Card, Swatch, TeamLabel } from "@/components/game-live/parts";
import { SIDES, fmt, mmss, periodName, teamColour, titleCase } from "@/components/game-live/live-utils";
import type { LiveGameResponse, PuckEventType, TeamSide } from "@/types";

type MapType = Exclude<PuckEventType, "penalty">;
const TYPE_LABEL: Record<MapType, string> = { hit: "Hit", giveaway: "Giveaway", takeaway: "Takeaway", faceoff: "Faceoff win" };
const ZONE_LABEL = { O: "offensive", N: "neutral", D: "defensive" } as const;

export function PuckEventsMap({ data }: { data: LiveGameResponse }) {
  const { bind, tooltip } = useChartTooltip();
  const [type, setType] = useState<MapType>("hit");
  const events = data.events.filter((e) => e.type === type);
  const leaders = new Map<string, { side: TeamSide; name: string; count: number }>();
  for (const e of events) {
    const key = `${e.team}|${e.player}`;
    const entry = leaders.get(key) ?? { side: e.team, name: e.player, count: 0 };
    entry.count++;
    leaders.set(key, entry);
  }
  const top = [...leaders.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  const byZone = (side: TeamSide) => (["O", "N", "D"] as const).map((z) => events.filter((e) => e.team === side && e.zone === z).length);

  return (
    <Card>
      <SegmentedControl aria-label="Event type" value={type} onValueChange={setType} className="mb-3"
        options={[{ value: "hit", label: "Hits" }, { value: "giveaway", label: "Giveaways" }, { value: "takeaway", label: "Takeaways" }, { value: "faceoff", label: "Faceoff wins" }]} />
      <Rink labels={[`← ${data.away.abbrev} attacking`, `${data.home.abbrev} attacking →`]}>
        {events.map((e, i) => {
          if (e.x == null || e.y == null) return null;
          const px = e.team === "home" ? e.x : -e.x;
          const py = e.team === "home" ? -e.y : e.y;
          return (
            <g key={i}>
              <circle cx={px} cy={py} r={2.1} fill={teamColour(e.team)} fillOpacity={0.85} stroke="var(--card)" strokeWidth={0.35} />
              <circle
                cx={px}
                cy={py}
                r={3.2}
                fill="transparent"
                {...bind(
                  <>
                    <TooltipTitle colour={teamColour(e.team)}>{e.player}</TooltipTitle>
                    {periodName(e.period)} {e.timeInPeriod} · {TYPE_LABEL[type]}
                    {e.opponent && (type === "hit" ? ` on ${e.opponent}` : type === "faceoff" ? ` vs ${e.opponent}` : "")}
                    {e.zone && <><br />In {data[e.team].abbrev}'s {ZONE_LABEL[e.zone]} zone</>}
                  </>,
                )}
              />
            </g>
          );
        })}
      </Rink>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <table className="h-fit w-full text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="pb-1 text-left font-medium">By zone (own view)</th>
              <th className="pb-1 text-right font-medium">Off</th>
              <th className="pb-1 text-right font-medium">Neu</th>
              <th className="pb-1 text-right font-medium">Def</th>
            </tr>
          </thead>
          <tbody>
            {SIDES.map((side) => (
              <tr key={side} className="border-t">
                <td className="py-1"><TeamLabel side={side}>{data[side].abbrev}</TeamLabel></td>
                {byZone(side).map((v, i) => <td key={i} className="py-1 text-right">{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <table className="h-fit w-full text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="pb-1 text-left font-medium">Most</th>
              <th className="pb-1 text-right font-medium">#</th>
            </tr>
          </thead>
          <tbody>
            {top.map((p) => (
              <tr key={`${p.side}${p.name}`} className="border-t">
                <td className="py-1"><TeamLabel side={p.side}>{p.name}</TeamLabel></td>
                <td className="py-1 text-right">{p.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tooltip}
    </Card>
  );
}

export function PenaltiesSection({ data }: { data: LiveGameResponse }) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="pb-1.5 text-left font-medium">Time</th>
              <th className="pb-1.5 text-left font-medium">Player</th>
              <th className="pb-1.5 text-left font-medium">Infraction</th>
              <th className="pb-1.5 text-right font-medium">Min</th>
              <th className="pb-1.5 pl-3 text-left font-medium">Drawn by</th>
              <th className="pb-1.5 pl-3 text-left font-medium">Power play</th>
            </tr>
          </thead>
          <tbody>
            {data.penalties.length === 0 && (
              <tr><td colSpan={6} className="py-2 text-muted-foreground">No penalties</td></tr>
            )}
            {data.penalties.map((p) => (
              <tr key={`${p.t}-${p.player}`} className="border-t">
                <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">{periodName(p.period)} {p.timeInPeriod}</td>
                <td className="py-1.5 pr-3 whitespace-nowrap"><TeamLabel side={p.team}>{p.player}</TeamLabel></td>
                <td className="py-1.5 pr-3">{titleCase(p.infraction)}</td>
                <td className="py-1.5 text-right tabular-nums">{p.minutes}</td>
                <td className="py-1.5 pl-3 whitespace-nowrap text-muted-foreground">{p.drawnBy ?? "–"}</td>
                <td className="py-1.5 pl-3 text-xs whitespace-nowrap">
                  {p.type === "MIN" || p.type === "MAJ" || p.type === "BEN"
                    ? p.powerPlayGoal
                      ? <><b>Goal</b> · {p.powerPlayGoal}</>
                      : `${p.powerPlayAttempts} att · ${fmt(p.powerPlayXg, 2)} xG`
                    : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 space-y-1 text-xs text-muted-foreground tabular-nums">
        {SIDES.map((side) => {
          const pp = data.stats[side].byStrength.PP;
          return (
            <div key={side} className="flex items-center gap-1.5">
              <Swatch side={side} />
              <b className="text-foreground">{data[side].abbrev}</b> PP {data.powerPlay[side] ?? "–"} · {mmss(data.stats[side].timeByStrength.PP ?? 0)} on the PP · {pp?.attempts ?? 0} attempts · {fmt(pp?.xg ?? 0, 2)} xG
            </div>
          );
        })}
      </div>
    </Card>
  );
}
