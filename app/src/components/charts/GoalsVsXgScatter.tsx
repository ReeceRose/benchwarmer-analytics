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
import { X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChartLegend } from "@/components/charts/ChartLegend";
import { niceAxis } from "@/components/charts/nice-axis";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import { useChartSelection } from "@/hooks";

export interface GoalsVsXgPoint {
  playerId: number;
  name: string;
  team: string;
  goals: number;
  expectedGoals: number;
  /** Shown after the name, e.g. position. */
  note?: string;
}

interface GoalsVsXgScatterProps {
  points: readonly GoalsVsXgPoint[];
  title?: string;
  description: string;
  emptyText: string;
  /**
   * Which side of the line is the story: "above" (finishing better than
   * chances) or "below" (due for more goals). That side gets `chart-1`, the
   * other muted ink. Neither side is good or bad, so no green or red.
   */
  highlight?: "above" | "below";
  noun?: string;
}

const ABOVE_LABEL = "Scored more than xG";
const BELOW_LABEL = "Scored fewer than xG";
const SIZE = { fine: 12, coarse: 16 };

const isCoarse = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

interface Point extends GoalsVsXgPoint {
  diff: number;
}

function pointColour(diff: number, highlight: "above" | "below") {
  const above = diff > 0;
  return above === (highlight === "above") ? "var(--chart-1)" : "var(--muted-foreground)";
}

function formatDiff(diff: number) {
  return `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`;
}

function PlayerTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) {
  if (isCoarse() || !active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg shadow-black/5">
      <p className="mb-1 font-semibold">
        {p.name}
        {p.note && <span className="ml-1 text-xs font-normal text-muted-foreground">{p.note}</span>}
      </p>
      <p className="text-xs text-muted-foreground">
        Goals <span className="font-semibold text-foreground tabular-nums">{p.goals}</span>
        {" · "}xG <span className="text-foreground tabular-nums">{p.expectedGoals.toFixed(1)}</span>
        {" · "}
        <span className="font-semibold text-foreground tabular-nums">{formatDiff(p.diff)}</span>
      </p>
    </div>
  );
}

function HeadshotDot({
  cx,
  cy,
  payload,
  selected,
  highlight,
}: {
  cx?: number;
  cy?: number;
  payload?: Point;
  selected: boolean;
  highlight: "above" | "below";
}) {
  if (cx == null || cy == null || !payload) return null;
  const size = isCoarse() ? SIZE.coarse : SIZE.fine;
  return (
    <foreignObject x={cx - size} y={cy - size} width={size * 2} height={size * 2}>
      <img
        src={getPlayerHeadshotUrl(payload.playerId, payload.team)}
        alt={payload.name}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          objectFit: "cover",
          background: "var(--card)",
          border: selected ? "3px solid var(--foreground)" : `2px solid ${pointColour(payload.diff, highlight)}`,
        }}
      />
    </foreignObject>
  );
}

/**
 * Goals against expected goals for a set of skaters, a headshot per player and
 * a dashed goals = xG line. Hover for numbers; tap pins a detail panel.
 */
export function GoalsVsXgScatter({
  points,
  title = "Goals vs expected goals",
  description,
  emptyText,
  highlight = "above",
  noun = "player",
}: GoalsVsXgScatterProps) {
  const navigate = useNavigate();
  const { selectedItem, handleSelect, clearSelection } = useChartSelection<Point>();

  if (points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{emptyText}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const data: Point[] = points.map((p) => ({ ...p, diff: p.goals - p.expectedGoals }));
  const { domain, ticks } = niceAxis(
    data.flatMap((d) => [d.goals, d.expectedGoals]),
    { includeZero: true },
  );
  const [min, max] = domain;
  const goTo = (p: Point) => navigate({ to: "/players/$id", params: { id: String(p.playerId) } });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ top: 12, right: 16, bottom: 28, left: 4 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />
            <XAxis
              type="number"
              dataKey="expectedGoals"
              domain={domain}
              ticks={ticks}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
            >
              <Label value="Expected goals (xG)" position="bottom" offset={10} style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }} />
            </XAxis>
            <YAxis
              type="number"
              dataKey="goals"
              domain={domain}
              ticks={ticks}
              width={44}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
            >
              <Label value="Goals" angle={-90} position="insideLeft" offset={10} style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }} />
            </YAxis>
            <ReferenceLine
              segment={[
                { x: min, y: min },
                { x: max, y: max },
              ]}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
            />
            <Tooltip content={<PlayerTooltip />} cursor={false} />
            <Scatter
              data={data}
              cursor="pointer"
              shape={(props: { cx?: number; cy?: number; payload?: Point }) => (
                <HeadshotDot
                  {...props}
                  highlight={highlight}
                  selected={selectedItem?.playerId === props.payload?.playerId}
                />
              )}
              onClick={(d) => {
                const p = d as unknown as Point;
                if (isCoarse()) handleSelect(p);
                else goTo(p);
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>

        {selectedItem && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-10 shrink-0">
                <AvatarImage src={getPlayerHeadshotUrl(selectedItem.playerId, selectedItem.team)} alt="" />
                <AvatarFallback>{getPlayerInitials(selectedItem.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">{selectedItem.name}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {selectedItem.goals} G · {selectedItem.expectedGoals.toFixed(1)} xG ·{" "}
                  <span className="font-semibold text-foreground">{formatDiff(selectedItem.diff)}</span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => goTo(selectedItem)}>
                Player page
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>
          </div>
        )}

        <ChartLegend
          className="mt-3"
          items={
            highlight === "above"
              ? [
                  { label: ABOVE_LABEL, colour: "var(--chart-1)" },
                  { label: BELOW_LABEL, colour: "var(--muted-foreground)" },
                  { label: "Goals = xG", colour: CHART_AXIS_COLOURS.reference, dashed: true },
                ]
              : [
                  { label: BELOW_LABEL, colour: "var(--chart-1)" },
                  { label: ABOVE_LABEL, colour: "var(--muted-foreground)" },
                  { label: "Goals = xG", colour: CHART_AXIS_COLOURS.reference, dashed: true },
                ]
          }
        />
        <p className="mt-2 text-xs text-muted-foreground sm:hidden">Tap a {noun} for details.</p>
      </CardContent>
    </Card>
  );
}
