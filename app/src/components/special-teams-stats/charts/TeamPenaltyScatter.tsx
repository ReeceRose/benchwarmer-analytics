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
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { TeamLogo } from "@/components/shared";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { getTeamLogoUrl } from "@/lib/team-logos";
import { useChartSelection } from "@/hooks";
import type { TeamSpecialTeamsRanking } from "@/types";

interface TeamPenaltyScatterProps {
  teams: TeamSpecialTeamsRanking[];
  season?: number;
}

interface ChartDataPoint {
  abbrev: string;
  name: string;
  drawnPer60: number;
  takenPer60: number;
  netPer60: number;
  drawn: number;
  taken: number;
}

const MOBILE_SIZE = 16;
const DESKTOP_SIZE = 12;

const isCoarsePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

const signed = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`;

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (isCoarsePointer() || !active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg shadow-black/5">
      <div className="mb-2 flex items-center gap-2">
        <TeamLogo abbrev={data.abbrev} size="sm" />
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="grid grid-cols-[auto_auto_auto] gap-x-3 gap-y-1 text-xs tabular-nums">
        <span />
        <span className="text-right text-muted-foreground">Per 60</span>
        <span className="text-right text-muted-foreground">Total</span>
        <span className="text-muted-foreground">Drawn</span>
        <span className="text-right">{data.drawnPer60.toFixed(2)}</span>
        <span className="text-right">{data.drawn}</span>
        <span className="text-muted-foreground">Taken</span>
        <span className="text-right">{data.takenPer60.toFixed(2)}</span>
        <span className="text-right">{data.taken}</span>
        <span className="text-muted-foreground">Net</span>
        <span className="text-right font-semibold">{signed(data.netPer60)}</span>
        <span className="text-right font-semibold">
          {data.drawn - data.taken > 0 ? "+" : ""}
          {data.drawn - data.taken}
        </span>
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

  const size = isCoarsePointer() ? MOBILE_SIZE : DESKTOP_SIZE;

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
          filter: isSelected ? "drop-shadow(0 0 4px var(--primary))" : undefined,
        }}
      />
      {isSelected && (
        <circle cx={cx} cy={cy} r={size + 3} fill="none" stroke="var(--primary)" strokeWidth={2} />
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
  return (
    <div className="mt-3 animate-in rounded-xl border bg-card p-3 duration-200 slide-in-from-bottom-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <TeamLogo abbrev={data.abbrev} size="md" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{data.name}</p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground tabular-nums">
              <span>
                <span className="text-xs">Drawn/60</span>{" "}
                <span className="text-foreground">{data.drawnPer60.toFixed(2)}</span>
              </span>
              <span>
                <span className="text-xs">Taken/60</span>{" "}
                <span className="text-foreground">{data.takenPer60.toFixed(2)}</span>
              </span>
              <span className="font-semibold text-foreground">{signed(data.netPer60)}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="outline" onClick={onNavigate}>
            Team page
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Penalties drawn per 60 against penalties taken per 60, one logo per team. */
export function TeamPenaltyScatter({ teams, season }: TeamPenaltyScatterProps) {
  const navigate = useNavigate();
  const { selectedItem, handleSelect, clearSelection } = useChartSelection<ChartDataPoint>();

  const chartData: ChartDataPoint[] = teams.map((team) => ({
    abbrev: team.teamAbbreviation,
    name: team.teamName,
    drawnPer60: team.penaltiesDrawnPer60,
    takenPer60: team.penaltiesTakenPer60,
    netPer60: team.netPenaltiesPer60,
    drawn: team.penaltiesDrawn,
    taken: team.penaltiesTaken,
  }));

  const goToTeam = (abbrev: string) =>
    navigate({ to: "/teams/$abbrev/special-teams", params: { abbrev }, search: { season } });

  const handleClick = (data: ChartDataPoint) => {
    if (isCoarsePointer()) handleSelect(data);
    else goToTeam(data.abbrev);
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Penalties drawn vs taken</CardTitle>
          <CardDescription>No teams for this season yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const avgDrawn = chartData.reduce((sum, d) => sum + d.drawnPer60, 0) / chartData.length;
  const avgTaken = chartData.reduce((sum, d) => sum + d.takenPer60, 0) / chartData.length;

  // Both axes share one range so the diagonal (drawn = taken) sits at 45°.
  const all = chartData.flatMap((d) => [d.drawnPer60, d.takenPer60]);
  const min = Math.floor(Math.min(...all) * 4 - 1) / 4;
  const max = Math.ceil(Math.max(...all) * 4 + 1) / 4;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Penalties drawn vs taken</CardTitle>
        <CardDescription>
          Per 60 minutes, all situations. Teams below the diagonal draw more
          penalties than they take; the dashed cross marks the league averages.
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
            <XAxis
              type="number"
              dataKey="drawnPer60"
              domain={[min, max]}
              tickFormatter={(v: number) => v.toFixed(1)}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Drawn per 60"
                position="bottom"
                offset={15}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="takenPer60"
              domain={[min, max]}
              tickFormatter={(v: number) => v.toFixed(1)}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Taken per 60"
                angle={-90}
                position="insideLeft"
                offset={10}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </YAxis>

            <ReferenceLine
              segment={[
                { x: min, y: min },
                { x: max, y: max },
              ]}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeWidth={1.5}
            />
            <ReferenceLine
              x={avgDrawn}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <ReferenceLine
              y={avgTaken}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />

            <Tooltip content={<CustomTooltip />} />
            <Scatter
              data={chartData}
              shape={(props: { cx?: number; cy?: number; payload?: ChartDataPoint }) => (
                <CustomDot {...props} isSelected={selectedItem?.abbrev === props.payload?.abbrev} />
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
            onNavigate={() => goToTeam(selectedItem.abbrev)}
          />
        )}
        <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-xl bg-muted/60 p-2">
            <span className="font-medium text-error">Losing the whistle</span>
            <p className="text-muted-foreground">Take many, draw few</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-2">
            <span className="font-medium">Chaotic</span>
            <p className="text-muted-foreground">Take many, draw many</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-2">
            <span className="font-medium">Disciplined</span>
            <p className="text-muted-foreground">Take few, draw few</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-2">
            <span className="font-medium text-success">Winning the whistle</span>
            <p className="text-muted-foreground">Take few, draw many</p>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground sm:hidden">Tap a team for details.</p>
      </CardContent>
    </Card>
  );
}
