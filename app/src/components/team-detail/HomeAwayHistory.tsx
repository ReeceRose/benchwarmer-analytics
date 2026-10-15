import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState, Section } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartLegend } from "@/components/charts";
import { TeamLabel } from "@/components/game-live/parts";
import { teamColour } from "@/components/game-live/live-utils";
import {
  formatEdge,
  homeEdge,
  HOME_AWAY_GROUPS,
  HOME_AWAY_METRICS,
  showValue,
  type HomeAwayMetric,
  type HomeAwayMetricKey,
} from "@/components/team-detail/home-away-metrics";
import { useLeagueHomeAwayHistory, useTeamHomeAwayHistory } from "@/hooks";
import { CHART_AXIS_COLOURS, REFERENCE_COLOUR } from "@/lib/chart-colours";
import { getCurrentSeason } from "@/lib/date-utils";
import { formatSeason } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { HomeAwaySeason, HomeAwaySide } from "@/types";

interface Point {
  season: number;
  label: string;
  away: number | null;
  home: number | null;
  leagueAway: number | null;
  leagueHome: number | null;
  edge: number | null;
  /** The edge split by sign, so each half gets its own colour. */
  edgeUp: number | null;
  edgeDown: number | null;
  leagueEdge: number | null;
}

const gamesPlayed = (s: HomeAwaySeason) => s.home.gamesPlayed + s.away.gamesPlayed;
const record = (s: HomeAwaySide) => `${s.wins}–${s.losses}–${s.otLosses}`;

/** The current season, while it's well short of the one before. */
function isInProgress(seasons: HomeAwaySeason[]): boolean {
  const last = seasons.at(-1);
  const previous = seasons.at(-2);
  if (!last || last.season !== getCurrentSeason()) return false;
  return !previous || gamesPlayed(last) < gamesPlayed(previous) * 0.9;
}

const axisProps = {
  tick: { fill: CHART_AXIS_COLOURS.tick, fontSize: 11 },
  tickLine: false,
} as const;

function ChartTooltip({
  active,
  payload,
  metric,
  kind,
}: {
  active?: boolean;
  payload?: Array<{ payload: Point }>;
  metric: HomeAwayMetric;
  kind: "split" | "edge";
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg shadow-black/5">
      <p className="mb-1.5 font-semibold">{point.label}</p>
      <div className="grid grid-cols-[auto_auto_auto] gap-x-3 gap-y-1 text-xs tabular-nums">
        <span />
        <span className="text-right text-muted-foreground">Team</span>
        <span className="text-right text-muted-foreground">League</span>
        {kind === "split" ? (
          <>
            <TeamLabel side="away">Away</TeamLabel>
            <span className="text-right">{showValue(point.away, metric.format)}</span>
            <span className="text-right text-muted-foreground">{showValue(point.leagueAway, metric.format)}</span>
            <TeamLabel side="home">Home</TeamLabel>
            <span className="text-right">{showValue(point.home, metric.format)}</span>
            <span className="text-right text-muted-foreground">{showValue(point.leagueHome, metric.format)}</span>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">Home edge</span>
            <span className="text-right font-semibold">{formatEdge(metric, point.edge)}</span>
            <span className="text-right text-muted-foreground">{formatEdge(metric, point.leagueEdge)}</span>
          </>
        )}
      </div>
    </div>
  );
}

function MetricSelect({ value, onChange }: { value: HomeAwayMetricKey; onChange: (m: HomeAwayMetricKey) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as HomeAwayMetricKey)}>
      <SelectTrigger className="w-52" aria-label="Stat">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {HOME_AWAY_GROUPS.map((group) => (
          <SelectGroup key={group.title}>
            <SelectLabel>{group.title}</SelectLabel>
            {group.metrics.map((m) => (
              <SelectItem key={m.key} value={m.key}>
                {m.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * One home/away stat for every season the team played: home and road side by
 * side, then the home edge against the league's.
 */
export function HomeAwayHistory({
  abbrev,
  playoffs,
  metric: metricKey,
  onMetricChange,
  onSeasonSelect,
}: {
  abbrev: string;
  playoffs?: boolean;
  metric: HomeAwayMetricKey;
  onMetricChange: (metric: HomeAwayMetricKey) => void;
  onSeasonSelect: (season: number) => void;
}) {
  const team = useTeamHomeAwayHistory(abbrev, playoffs);
  const league = useLeagueHomeAwayHistory(playoffs);
  const metric = HOME_AWAY_METRICS[metricKey];

  if (team.error || league.error) return null;

  const seasons = team.data?.seasons ?? [];
  const leagueBySeason = new Map(league.data?.seasons.map((s) => [s.season, s]));
  const inProgress = isInProgress(seasons);

  const points: Point[] = seasons.map((s) => {
    const lg = leagueBySeason.get(s.season);
    const leagueAway = lg?.away[metric.key] ?? null;
    const leagueHome = lg?.home[metric.key] ?? null;
    const edge = homeEdge(metric, s.home[metric.key], s.away[metric.key]);
    return {
      season: s.season,
      label: formatSeason(s.season),
      away: s.away[metric.key],
      home: s.home[metric.key],
      leagueAway,
      leagueHome,
      edge,
      edgeUp: edge != null && edge >= 0 ? edge : null,
      edgeDown: edge != null && edge < 0 ? edge : null,
      leagueEdge: homeEdge(metric, leagueHome, leagueAway),
    };
  });
  // A few games into a season, the split is noise: keep it to the table.
  const charted = inProgress ? points.slice(0, -1) : points;
  const scope = playoffs ? "playoff" : "regular season";

  return (
    <Section
      title="Over the seasons"
      description={`The team's ${scope} home and road games, every season since 2008-09.`}
      action={<MetricSelect value={metricKey} onChange={onMetricChange} />}
    >
      {team.isLoading || league.isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : points.length === 0 ? (
        <EmptyState title={`No ${scope} games`} hint="Try the other season type." />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{metric.label}, home and away</CardTitle>
                <CardDescription>Each season's home and road figure.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charted} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        stroke={CHART_AXIS_COLOURS.grid}
                        strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
                      />
                      <XAxis
                        dataKey="label"
                        {...axisProps}
                        axisLine={{ stroke: CHART_AXIS_COLOURS.grid }}
                        interval="preserveStartEnd"
                        minTickGap={16}
                      />
                      <YAxis
                        {...axisProps}
                        axisLine={false}
                        width={52}
                        domain={["auto", "auto"]}
                        tickFormatter={metric.format}
                      />
                      <Tooltip
                        cursor={{ stroke: CHART_AXIS_COLOURS.grid }}
                        content={<ChartTooltip metric={metric} kind="split" />}
                      />
                      {(["away", "home"] as const).map((side) => (
                        <Line
                          key={side}
                          type="linear"
                          dataKey={side}
                          stroke={teamColour(side)}
                          strokeWidth={2}
                          dot={{ r: 3, fill: teamColour(side), strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: teamColour(side), stroke: "var(--card)", strokeWidth: 2 }}
                          connectNulls={false}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <ChartLegend
                  className="mt-3"
                  items={[
                    { label: "Away", colour: teamColour("away") },
                    { label: "Home", colour: teamColour("home") },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Home edge</CardTitle>
                <CardDescription>
                  How much better the team was at home than on the road
                  {metric.lowerIsBetter ? " (fewer at home is better)" : ""}, against the league's edge.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={charted} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        stroke={CHART_AXIS_COLOURS.grid}
                        strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
                      />
                      <XAxis
                        dataKey="label"
                        {...axisProps}
                        axisLine={{ stroke: CHART_AXIS_COLOURS.grid }}
                        interval="preserveStartEnd"
                        minTickGap={16}
                      />
                      <YAxis
                        {...axisProps}
                        axisLine={false}
                        width={52}
                        tickFormatter={(v: number) => formatEdge(metric, v)}
                      />
                      <ReferenceLine y={0} stroke={CHART_AXIS_COLOURS.tick} strokeOpacity={0.5} />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
                        content={<ChartTooltip metric={metric} kind="edge" />}
                      />
                      <Bar dataKey="edgeUp" stackId="edge" fill={teamColour("home")} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="edgeDown" stackId="edge" fill="var(--muted-foreground)" radius={[0, 0, 3, 3]} isAnimationActive={false} />
                      <Line
                        type="linear"
                        dataKey="leagueEdge"
                        stroke={REFERENCE_COLOUR}
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <ChartLegend
                  className="mt-3"
                  items={[
                    { label: "Better at home", colour: teamColour("home") },
                    { label: "Better on the road", colour: "var(--muted-foreground)" },
                    { label: "League", colour: REFERENCE_COLOUR, dashed: true },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
          {inProgress && (
            <p className="text-xs text-muted-foreground">
              {formatSeason(points.at(-1)!.season)} is only {gamesPlayed(seasons.at(-1)!)} games in, so it's in the
              table but not the charts.
            </p>
          )}

          <div className="overflow-hidden rounded-2xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-card">Season</TableHead>
                  <TableHead className="text-right">
                    <TeamLabel side="away">Away record</TeamLabel>
                  </TableHead>
                  <TableHead className="text-right">
                    <TeamLabel side="home">Home record</TeamLabel>
                  </TableHead>
                  <TableHead className="text-right">Away {metric.label}</TableHead>
                  <TableHead className="text-right">Home {metric.label}</TableHead>
                  <TableHead className="text-right">Home edge</TableHead>
                  <TableHead className="text-right">League edge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...points].reverse().map((p, i) => {
                  const s = seasons[seasons.length - 1 - i];
                  const awayBetter = p.edge != null && p.edge < 0;
                  const homeBetter = p.edge != null && p.edge > 0;
                  const partial = inProgress && i === 0;
                  return (
                    <TableRow key={p.season}>
                      <TableCell className="sticky left-0 z-10 bg-card whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSeasonSelect(p.season)}
                          className="font-medium transition-colors hover:text-link"
                        >
                          {p.label}
                        </button>
                        {partial && <span className="ml-1.5 text-xs text-muted-foreground">so far</span>}
                      </TableCell>
                      <TableCell className="text-right">{record(s.away)}</TableCell>
                      <TableCell className="text-right">{record(s.home)}</TableCell>
                      <TableCell className={cn("text-right", awayBetter && "font-semibold")}>
                        {showValue(p.away, metric.format)}
                      </TableCell>
                      <TableCell className={cn("text-right", homeBetter && "font-semibold")}>
                        {showValue(p.home, metric.format)}
                      </TableCell>
                      <TableCell className="text-right">{formatEdge(metric, p.edge)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatEdge(metric, p.leagueEdge)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Pick a season to see its full split above. Bold marks the better side.
          </p>
        </div>
      )}
    </Section>
  );
}
