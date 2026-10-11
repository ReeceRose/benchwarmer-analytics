import { useNavigate } from "@tanstack/react-router";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
  ReferenceArea,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";
import { TeamLogo } from "@/components/shared";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { getTeamLogoUrl } from "@/lib/team-logos";
import { useChartSelection } from "@/hooks";
import type { TeamPowerRanking } from "@/types";

interface QualityVsQuantityChartProps {
  teams: TeamPowerRanking[];
  season?: number;
}

interface ChartDataPoint {
  abbrev: string;
  name: string;
  corsiPct: number;
  xGoalsPct: number;
}

const MOBILE_SIZE = 16;
const DESKTOP_SIZE = 12;

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
    return null;
  }

  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const isGoodQuality = data.xGoalsPct > 50;
  const isGoodQuantity = data.corsiPct > 50;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <TeamLogo abbrev={data.abbrev} size="sm" />
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">CF% (Quantity):</span>{" "}
          <span
            className={`font-mono ${isGoodQuantity ? "text-success" : "text-error"}`}
          >
            {data.corsiPct.toFixed(1)}%
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">xG% (Quality):</span>{" "}
          <span
            className={`font-mono ${isGoodQuality ? "text-success" : "text-error"}`}
          >
            {data.xGoalsPct.toFixed(1)}%
          </span>
        </p>
      </div>
    </div>
  );
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
  isSelected?: boolean;
}) {
  const { cx, cy, payload, isSelected } = props;
  if (!cx || !cy || !payload) return null;

  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const size = isMobile ? MOBILE_SIZE : DESKTOP_SIZE;

  return (
    <g>
      <image
        href={getTeamLogoUrl(payload.abbrev)}
        x={cx - size}
        y={cy - size}
        width={size * 2}
        height={size * 2}
        style={{
          transition: "all 0.15s",
          filter: isSelected ? "drop-shadow(0 0 4px hsl(var(--primary)))" : undefined,
        }}
      />
      {isSelected && (
        <circle
          cx={cx}
          cy={cy}
          r={size + 3}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
        />
      )}
    </g>
  );
}

function SelectionPanel({
  data,
  onClose,
  onNavigate,
}: {
  data: ChartDataPoint;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const isGoodQuality = data.xGoalsPct > 50;
  const isGoodQuantity = data.corsiPct > 50;
  const isDominant = isGoodQuality && isGoodQuantity;
  const isStruggling = !isGoodQuality && !isGoodQuantity;

  return (
    <div className="mt-3 p-3 border rounded-lg bg-muted/30 animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <TeamLogo abbrev={data.abbrev} size="md" />
          <div className="min-w-0">
            <p className="font-semibold truncate">
              {data.name}
              {isDominant && (
                <span className="ml-2 text-success text-xs">Dominant</span>
              )}
              {isStruggling && (
                <span className="ml-2 text-error text-xs">Struggling</span>
              )}
            </p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                <span className="text-xs">CF%:</span>{" "}
                <span className={`font-mono ${isGoodQuantity ? "text-success" : "text-error"}`}>
                  {data.corsiPct.toFixed(1)}%
                </span>
              </span>
              <span>
                <span className="text-xs">xG%:</span>{" "}
                <span className={`font-mono ${isGoodQuality ? "text-success" : "text-error"}`}>
                  {data.xGoalsPct.toFixed(1)}%
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="default" onClick={onNavigate}>
            View
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function QualityVsQuantityChart({
  teams,
  season,
}: QualityVsQuantityChartProps) {
  const navigate = useNavigate();
  const { selectedItem, handleSelect, clearSelection } =
    useChartSelection<ChartDataPoint>();

  // Prepare chart data - filter out teams without CF%/xG% data
  const chartData: ChartDataPoint[] = teams
    .filter((t) => t.corsiPct != null && t.xGoalsPct != null)
    .map((team) => ({
      abbrev: team.abbreviation,
      name: team.name,
      corsiPct: (team.corsiPct ?? 0) * 100,
      xGoalsPct: (team.xGoalsPct ?? 0) * 100,
    }));

  const handleClick = (data: ChartDataPoint) => {
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
      handleSelect(data);
    } else {
      navigate({
        to: "/teams/$abbrev",
        params: { abbrev: data.abbrev },
        search: { season },
      });
    }
  };

  const handleNavigateToTeam = () => {
    if (selectedItem) {
      navigate({
        to: "/teams/$abbrev",
        params: { abbrev: selectedItem.abbrev },
        search: { season },
      });
    }
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quality vs Quantity</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate domain with padding
  const cfPcts = chartData.map((d) => d.corsiPct);
  const xgPcts = chartData.map((d) => d.xGoalsPct);
  const xMin = Math.floor(Math.min(...cfPcts) - 1);
  const xMax = Math.ceil(Math.max(...cfPcts) + 1);
  const yMin = Math.floor(Math.min(...xgPcts) - 1);
  const yMax = Math.ceil(Math.max(...xgPcts) + 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Quality vs Quantity of Chances
        </CardTitle>
        <CardDescription>
          xG% (quality) vs CF% (volume) - top-right is dominant, bottom-left is
          struggling
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />

            <ReferenceArea
              x1={xMin}
              x2={50}
              y1={50}
              y2={yMax}
              fill="hsl(217, 91%, 60%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={50}
              x2={xMax}
              y1={50}
              y2={yMax}
              fill="hsl(142, 76%, 36%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={xMin}
              x2={50}
              y1={yMin}
              y2={50}
              fill="hsl(0, 72%, 51%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={50}
              x2={xMax}
              y1={yMin}
              y2={50}
              fill="hsl(45, 93%, 47%)"
              fillOpacity={0.08}
            />

            <XAxis
              type="number"
              dataKey="corsiPct"
              domain={[xMin, xMax]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Corsi For % (Shot Attempt Share)"
                position="bottom"
                offset={15}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="xGoalsPct"
              domain={[yMin, yMax]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Expected Goals %"
                angle={-90}
                position="insideLeft"
                offset={10}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </YAxis>

            <ReferenceLine
              x={50}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <ReferenceLine
              y={50}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />

            <Tooltip content={<CustomTooltip />} />
            <Scatter
              data={chartData}
              shape={(props: { cx?: number; cy?: number; payload?: ChartDataPoint }) => (
                <CustomDot
                  {...props}
                  isSelected={selectedItem?.abbrev === props.payload?.abbrev}
                />
              )}
              cursor="pointer"
              onClick={(data) => handleClick(data as unknown as ChartDataPoint)}
            />
          </ScatterChart>
        </ResponsiveContainer>

        {selectedItem && (
          <SelectionPanel
            data={selectedItem}
            onClose={clearSelection}
            onNavigate={handleNavigateToTeam}
          />
        )}

        <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-center">
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "hsla(217, 91%, 60%, 0.15)" }}
          >
            <span className="font-medium">Quality over Volume</span>
            <p className="text-muted-foreground">High xG%, Low CF%</p>
          </div>
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "hsla(142, 76%, 36%, 0.15)" }}
          >
            <span className="font-medium text-success">Dominant</span>
            <p className="text-muted-foreground">High xG%, High CF%</p>
          </div>
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "hsla(0, 72%, 51%, 0.15)" }}
          >
            <span className="font-medium text-error">Struggling</span>
            <p className="text-muted-foreground">Low xG%, Low CF%</p>
          </div>
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "hsla(45, 93%, 47%, 0.15)" }}
          >
            <span className="font-medium">Volume over Quality</span>
            <p className="text-muted-foreground">Low xG%, High CF%</p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3 sm:hidden">
          Tap a team to see details
        </p>
      </CardContent>
    </Card>
  );
}
