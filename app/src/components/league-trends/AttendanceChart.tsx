import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipTitle } from "@/components/game-live/ChartTooltip";
import { useAttendance } from "@/hooks";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { formatSeason } from "@/lib/formatters";
import type { AttendanceSeason } from "@/types";

const SERIES = "var(--chart-1)";
const millions = (v: number) => `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;

function AttendanceTooltip({ active, payload }: { active?: boolean; payload?: { payload: AttendanceSeason }[] }) {
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return null;
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg shadow-black/5">
      <TooltipTitle colour={SERIES}>{formatSeason(s.season)}</TooltipTitle>
      <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-xs">
        <dt className="text-muted-foreground">Regular season</dt>
        <dd className="text-right font-semibold tabular-nums">{s.regular?.toLocaleString() ?? "–"}</dd>
        <dt className="text-muted-foreground">Playoffs</dt>
        <dd className="text-right tabular-nums">{s.playoffs?.toLocaleString() ?? "–"}</dd>
        <dt className="text-muted-foreground">Total</dt>
        <dd className="text-right tabular-nums">{s.total?.toLocaleString() ?? "–"}</dd>
      </dl>
    </div>
  );
}

/** Regular-season attendance for every season the NHL has a figure for. */
export function AttendanceChart() {
  const { data, isLoading, error } = useAttendance();
  if (error) return null;
  if (isLoading || !data) return <Skeleton className="h-80 rounded-2xl" />;
  const seasons = data.seasons.filter((s) => s.regular != null);
  if (seasons.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Attendance</CardTitle>
        <CardDescription>Fans through the gates in the regular season, every season on record.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={seasons} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_AXIS_COLOURS.grid} vertical={false} />
            <XAxis
              dataKey="season"
              tickFormatter={(v: number) => String(v)}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis tickFormatter={millions} tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<AttendanceTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
            <Bar dataKey="regular" fill={SERIES} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-muted-foreground">
          From NHL records. Gaps and dips are lockouts and shortened seasons (1994–95, 2004–05, 2012–13) and the 2020–21 season
          played mostly without fans.
        </p>
      </CardContent>
    </Card>
  );
}
