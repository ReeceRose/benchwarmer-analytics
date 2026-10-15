import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedControl } from "@/components/layout";
import { Swatch } from "@/components/game-live/parts";
import { TooltipTitle } from "@/components/game-live/ChartTooltip";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { useStandingsRace } from "@/hooks";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { formatGameDate } from "@/lib/game-formatters";
import { cn } from "@/lib/utils";
import { raceRows } from "@/components/standings/charts/race-rows";

const DIVISIONS = ["Atlantic", "Metropolitan", "Central", "Pacific"] as const;
type Division = (typeof DIVISIONS)[number];

const FOCUS = "var(--chart-1)";
const OTHERS = "var(--muted-foreground)";

function RaceTooltip({ active, payload, label, focus }: { active?: boolean; payload?: { dataKey?: string | number; value?: number }[]; label?: string; focus: string }) {
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return null;
  if (!active || !payload?.length || !label) return null;
  const rows = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return (
    <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg shadow-black/5">
      <TooltipTitle>{formatGameDate(label)}</TooltipTitle>
      <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-xs">
        {rows.map((r) => (
          <div key={String(r.dataKey)} className="contents">
            <dt className={cn(r.dataKey === focus ? "font-semibold" : "text-muted-foreground")}>{String(r.dataKey)}</dt>
            <dd className={cn("text-right tabular-nums", r.dataKey === focus && "font-semibold")}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Points by date for one division. One team is drawn in `chart-1` and the
 * rest in muted ink; pick a team from the list under the chart (or hover its
 * line) to bring it forward.
 */
export function PointsRaceChart({ season }: { season?: number }) {
  const { data, isLoading } = useStandingsRace(season);
  const [division, setDivision] = useState<Division>("Atlantic");
  const [picked, setPicked] = useState<string | null>(null);

  const teams = useMemo(() => (data?.teams ?? []).filter((t) => t.division === division), [data, division]);
  const rows = useMemo(() => raceRows(teams), [teams]);
  const standings = useMemo(
    () =>
      teams
        .map((t) => ({ team: t.team, points: t.points.at(-1)?.points ?? 0, gamesPlayed: t.points.at(-1)?.gamesPlayed ?? 0 }))
        .sort((a, b) => b.points - a.points || a.gamesPlayed - b.gamesPlayed || a.team.localeCompare(b.team)),
    [teams],
  );
  const focus = picked && teams.some((t) => t.team === picked) ? picked : (standings[0]?.team ?? "");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Points race</CardTitle>
            <CardDescription>Each team's points through the season, a division at a time.</CardDescription>
          </div>
          <SegmentedControl
            aria-label="Division"
            value={division}
            onValueChange={(d) => {
              setDivision(d);
              setPicked(null);
            }}
            options={DIVISIONS.map((d) => ({ value: d, label: d }))}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No games played yet this season.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_AXIS_COLOURS.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => formatGameDate(d)}
                  tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
                  stroke={CHART_AXIS_COLOURS.grid}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip content={<RaceTooltip focus={focus} />} cursor={{ stroke: CHART_AXIS_COLOURS.grid }} />
                {[...teams.filter((t) => t.team !== focus), ...teams.filter((t) => t.team === focus)].map((t) => (
                  <Line
                    key={t.team}
                    type="linear"
                    dataKey={t.team}
                    stroke={t.team === focus ? FOCUS : OTHERS}
                    strokeOpacity={t.team === focus ? 1 : 0.35}
                    strokeWidth={t.team === focus ? 2.5 : 1.5}
                    dot={false}
                    activeDot={t.team === focus ? { r: 4 } : false}
                    isAnimationActive={false}
                    onMouseEnter={() => setPicked(t.team)}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Highlight a team">
              {standings.map((s) => (
                <button
                  key={s.team}
                  type="button"
                  onClick={() => setPicked(s.team)}
                  aria-pressed={s.team === focus}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs tabular-nums hover:bg-muted",
                    s.team === focus ? "bg-muted font-semibold" : "text-muted-foreground",
                  )}
                >
                  {s.team === focus && <Swatch colour={FOCUS} />}
                  <TeamLogo abbrev={s.team} size="sm" />
                  {s.team} {s.points}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Teams are listed by points; pick one to highlight it. Hover the chart for every team's points on a date.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
