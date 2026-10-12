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
import type { TeamSpecialTeamsRanking } from "@/types";

interface PPvsPKScatterProps {
  teams: TeamSpecialTeamsRanking[];
  season?: number;
}

interface ChartDataPoint {
  abbrev: string;
  name: string;
  ppPct: number;
  pkPct: number;
  combined: number;
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

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <TeamLogo abbrev={data.abbrev} size="sm" />
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">PP%:</span>{" "}
          <span className="font-mono">{data.ppPct.toFixed(1)}%</span>
        </p>
        <p>
          <span className="text-muted-foreground">PK%:</span>{" "}
          <span className="font-mono">{data.pkPct.toFixed(1)}%</span>
        </p>
        <p>
          <span className="text-muted-foreground">Combined:</span>{" "}
          <span className="font-mono font-semibold">
            {data.combined.toFixed(1)}%
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
  const isElite = data.ppPct > 20 && data.pkPct > 80;
  const isPoor = data.ppPct < 18 && data.pkPct < 78;

  return (
    <div className="mt-3 p-3 border rounded-lg bg-muted/30 animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <TeamLogo abbrev={data.abbrev} size="md" />
          <div className="min-w-0">
            <p className="font-semibold truncate">
              {data.name}
              {isElite && (
                <span className="ml-2 text-success text-xs">Elite</span>
              )}
              {isPoor && (
                <span className="ml-2 text-destructive text-xs">Struggling</span>
              )}
            </p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                <span className="text-xs">PP%:</span>{" "}
                <span className="font-mono">{data.ppPct.toFixed(1)}%</span>
              </span>
              <span>
                <span className="text-xs">PK%:</span>{" "}
                <span className="font-mono">{data.pkPct.toFixed(1)}%</span>
              </span>
              <span className="font-mono font-semibold">
                {data.combined.toFixed(1)}%
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

export function PPvsPKScatter({ teams, season }: PPvsPKScatterProps) {
  const navigate = useNavigate();
  const { selectedItem, handleSelect, clearSelection } =
    useChartSelection<ChartDataPoint>();

  const chartData: ChartDataPoint[] = teams.map((team) => ({
    abbrev: team.teamAbbreviation,
    name: team.teamName,
    ppPct: team.ppPct,
    pkPct: team.pkPct,
    combined: team.specialTeamsPct,
  }));

  const handleClick = (data: ChartDataPoint) => {
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
      handleSelect(data);
    } else {
      navigate({
        to: "/teams/$abbrev/special-teams",
        params: { abbrev: data.abbrev },
        search: { season },
      });
    }
  };

  const handleNavigateToTeam = () => {
    if (selectedItem) {
      navigate({
        to: "/teams/$abbrev/special-teams",
        params: { abbrev: selectedItem.abbrev },
        search: { season },
      });
    }
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PP% vs PK%</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate averages for reference lines
  const avgPP =
    chartData.reduce((sum, d) => sum + d.ppPct, 0) / chartData.length;
  const avgPK =
    chartData.reduce((sum, d) => sum + d.pkPct, 0) / chartData.length;

  // Calculate domain with padding
  const ppPcts = chartData.map((d) => d.ppPct);
  const pkPcts = chartData.map((d) => d.pkPct);
  const xMin = Math.floor(Math.min(...ppPcts) - 2);
  const xMax = Math.ceil(Math.max(...ppPcts) + 2);
  const yMin = Math.floor(Math.min(...pkPcts) - 2);
  const yMax = Math.ceil(Math.max(...pkPcts) + 2);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">PP% vs PK%</CardTitle>
        <CardDescription>
          Teams in upper-right excel at both special teams
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={450}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />

            <ReferenceArea
              x1={xMin}
              x2={avgPP}
              y1={avgPK}
              y2={yMax}
              fill="hsl(217, 91%, 60%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={avgPP}
              x2={xMax}
              y1={avgPK}
              y2={yMax}
              fill="hsl(142, 76%, 36%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={xMin}
              x2={avgPP}
              y1={yMin}
              y2={avgPK}
              fill="hsl(0, 72%, 51%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={avgPP}
              x2={xMax}
              y1={yMin}
              y2={avgPK}
              fill="hsl(45, 93%, 47%)"
              fillOpacity={0.08}
            />

            <XAxis
              type="number"
              dataKey="ppPct"
              domain={[xMin, xMax]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Power Play %"
                position="bottom"
                offset={15}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="pkPct"
              domain={[yMin, yMax]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Penalty Kill %"
                angle={-90}
                position="insideLeft"
                offset={10}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </YAxis>

            <ReferenceLine
              x={avgPP}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <ReferenceLine
              y={avgPK}
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
            <span className="font-medium">Good PK Only</span>
            <p className="text-muted-foreground">High PK%, Below Avg PP%</p>
          </div>
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "hsla(142, 76%, 36%, 0.15)" }}
          >
            <span className="font-medium text-success">Elite Special Teams</span>
            <p className="text-muted-foreground">High PP% & PK%</p>
          </div>
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "hsla(0, 72%, 51%, 0.15)" }}
          >
            <span className="font-medium text-destructive">Poor Special Teams</span>
            <p className="text-muted-foreground">Below Avg PP% & PK%</p>
          </div>
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "hsla(45, 93%, 47%, 0.15)" }}
          >
            <span className="font-medium">Good PP Only</span>
            <p className="text-muted-foreground">High PP%, Below Avg PK%</p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3 sm:hidden">
          Tap a team to see details
        </p>
      </CardContent>
    </Card>
  );
}
