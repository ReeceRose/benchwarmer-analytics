import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_AXIS_COLOURS, CHART_COLOURS } from "@/lib/chart-colours";
import type { SkaterStats } from "@/types";

type Row = {
  label: string;
  key: "5on5" | "5on4" | "4on5";
  pointsPer60: number;
  goalsPer60: number;
  assistsPer60: number;
  toiMinutes: number;
};

function per60(value: number, iceTimeSeconds: number): number {
  if (iceTimeSeconds <= 0) return 0;
  return value / (iceTimeSeconds / 3600);
}

export function SituationBreakdownChart({
  stats,
  season,
}: {
  stats: SkaterStats[];
  season: number;
}) {
  const data = useMemo(() => {
    const seasonStats = stats.filter((s) => !s.isPlayoffs && s.season === season);

    const bySituation = new Map<string, { points: number; goals: number; assists: number; toi: number }>();
    for (const s of seasonStats) {
      if (s.situation !== "5on5" && s.situation !== "5on4" && s.situation !== "4on5") continue;
      const key = s.situation;
      const existing = bySituation.get(key) ?? { points: 0, goals: 0, assists: 0, toi: 0 };
      existing.points += s.points;
      existing.goals += s.goals;
      existing.assists += s.assists;
      existing.toi += s.iceTimeSeconds;
      bySituation.set(key, existing);
    }

    const rows: Row[] = [
      { key: "5on5", label: "5v5", pointsPer60: 0, goalsPer60: 0, assistsPer60: 0, toiMinutes: 0 },
      { key: "5on4", label: "PP", pointsPer60: 0, goalsPer60: 0, assistsPer60: 0, toiMinutes: 0 },
      { key: "4on5", label: "SH", pointsPer60: 0, goalsPer60: 0, assistsPer60: 0, toiMinutes: 0 },
    ];

    for (const row of rows) {
      const agg = bySituation.get(row.key);
      if (!agg) continue;
      row.pointsPer60 = Number(per60(agg.points, agg.toi).toFixed(2));
      row.goalsPer60 = Number(per60(agg.goals, agg.toi).toFixed(2));
      row.assistsPer60 = Number(per60(agg.assists, agg.toi).toFixed(2));
      row.toiMinutes = Math.round(agg.toi / 60);
    }

    return rows;
  }, [stats, season]);

  const totalToi = data.reduce((sum, d) => sum + d.toiMinutes, 0);
  if (totalToi === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Situation Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />
            <YAxis
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              width={45}
              tickFormatter={(v: number) => v.toFixed(1)}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.25 }}
              content={({ active, payload, label }) => {
                const row = payload?.[0]?.payload as Row | undefined;
                if (!active || !row) return null;
                return (
                  <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
                    <p className="font-semibold mb-2">{label}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Goals/60</span>
                        <span className="font-mono font-semibold">{row.goalsPer60.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Assists/60</span>
                        <span className="font-mono font-semibold">{row.assistsPer60.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Points/60</span>
                        <span className="font-mono font-semibold">{row.pointsPer60.toFixed(2)}</span>
                      </div>  
                      <div className="flex justify-between gap-4 pt-2 border-t">
                        <span className="text-muted-foreground">TOI</span>
                        <span className="font-medium tabular-nums">{row.toiMinutes}m</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="goalsPer60"
              name="Goals/60"
              fill={CHART_COLOURS[2]}
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="assistsPer60"
              name="Assists/60"
              fill={CHART_COLOURS[3]}
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="pointsPer60"
              name="Points/60"
              fill={CHART_COLOURS[0]}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        <div
          className="mt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground"
          aria-label="Chart legend"
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: CHART_COLOURS[2] }}
            />
            <span>Goals/60</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: CHART_COLOURS[3] }}
            />
            <span>Assists/60</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: CHART_COLOURS[0] }}
            />
            <span>Points/60</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Rate stats by situation for the selected season. Tooltip includes TOI for context.
        </p>
      </CardContent>
    </Card>
  );
}

