import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { CHART_AXIS_COLOURS, SEMANTIC_COLOURS } from "@/lib/chart-colours";
import { formatIceTimeLong } from "@/lib/formatters";
import type { MatrixData } from "@/components/chemistry/chemistry-utils";
import type { ChemistryPair } from "@/types";

/** Minimum ice time together (5 minutes) for meaningful chemistry data */
const MIN_TOI_SECONDS = 300;

interface ChemistryTopPairsChartProps {
  matrixData: MatrixData;
  count?: number;
}

interface ChartDataPoint {
  pairLabel: string;
  player1Id: number;
  player2Id: number;
  xgPct: number;
  xgDiff: number; // Difference from 50%
  toi: number;
  toiFormatted: string;
  isGood: boolean;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="font-semibold mb-2">{data.pairLabel}</div>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">xG%:</span>{" "}
          <span
            className={`font-mono font-semibold ${data.isGood ? "text-success" : "text-destructive"}`}
          >
            {data.xgPct.toFixed(1)}%
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">vs Average:</span>{" "}
          <span className="font-mono">
            {data.xgDiff > 0 ? "+" : ""}
            {data.xgDiff.toFixed(1)}%
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">Time Together:</span>{" "}
          <span className="font-mono">{data.toiFormatted}</span>
        </p>
      </div>
    </div>
  );
}

export function ChemistryTopPairsChart({
  matrixData,
  count = 10,
}: ChemistryTopPairsChartProps) {
  const navigate = useNavigate();

  const { topPairs, bottomPairs } = useMemo(() => {
    // Get unique pairs with valid xG%
    const seenPairs = new Set<string>();
    const allPairs: ChemistryPair[] = [];

    for (const [, pair] of matrixData.pairLookup) {
      const pairKey = [pair.player1Id, pair.player2Id].sort().join("-");
      if (seenPairs.has(pairKey)) continue;
      if (pair.expectedGoalsPct == null) continue;
      if (pair.totalIceTimeSeconds < MIN_TOI_SECONDS) continue;
      seenPairs.add(pairKey);
      allPairs.push(pair);
    }

    // Sort by xG%
    const sorted = allPairs.sort(
      (a, b) => (b.expectedGoalsPct ?? 50) - (a.expectedGoalsPct ?? 50)
    );

    const mapToChartData = (pair: ChemistryPair): ChartDataPoint => {
      const lastName1 = pair.player1Name.split(" ").pop() || pair.player1Name;
      const lastName2 = pair.player2Name.split(" ").pop() || pair.player2Name;
      const xgPct = pair.expectedGoalsPct ?? 50;
      return {
        pairLabel: `${lastName1} / ${lastName2}`,
        player1Id: pair.player1Id,
        player2Id: pair.player2Id,
        xgPct,
        xgDiff: xgPct - 50,
        toi: pair.totalIceTimeSeconds,
        toiFormatted: formatIceTimeLong(pair.totalIceTimeSeconds),
        isGood: xgPct >= 50,
      };
    };

    return {
      topPairs: sorted.slice(0, count).map(mapToChartData),
      bottomPairs: sorted
        .slice(-count)
        .reverse()
        .map(mapToChartData),
    };
  }, [matrixData, count]);

  const handleClick = (data: ChartDataPoint) => {
    // Navigate to first player in the pair
    navigate({
      to: "/players/$id",
      params: { id: String(data.player1Id) },
    });
  };

  if (topPairs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Not enough pair data to display rankings.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-success mb-3">
          Best Pairs (Highest xG%)
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(250, topPairs.length * 28)}>
          <BarChart
            data={topPairs}
            layout="vertical"
            margin={{ top: 5, right: 30, bottom: 5, left: 110 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[35, 65]}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              tickFormatter={(v: number) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="pairLabel"
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              width={105}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine
              x={50}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="3 3"
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}
            />
            <Bar
              dataKey="xgPct"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(_, index) => handleClick(topPairs[index])}
            >
              {topPairs.map((_, index) => (
                <Cell
                  key={index}
                  fill={SEMANTIC_COLOURS.success}
                  fillOpacity={0.9 - index * 0.05}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-destructive mb-3">
          Worst Pairs (Lowest xG%)
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(250, bottomPairs.length * 28)}>
          <BarChart
            data={bottomPairs}
            layout="vertical"
            margin={{ top: 5, right: 30, bottom: 5, left: 110 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[35, 65]}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              tickFormatter={(v: number) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="pairLabel"
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              width={105}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine
              x={50}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="3 3"
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}
            />
            <Bar
              dataKey="xgPct"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(_, index) => handleClick(bottomPairs[index])}
            >
              {bottomPairs.map((_, index) => (
                <Cell
                  key={index}
                  fill={SEMANTIC_COLOURS.danger}
                  fillOpacity={0.9 - index * 0.05}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Showing pairs with at least 5 minutes of ice time together. Click a bar to view player profile.
      </p>
    </div>
  );
}
