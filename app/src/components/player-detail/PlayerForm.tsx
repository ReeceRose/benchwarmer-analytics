import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel, SegmentedControl, Section } from "@/components/layout";
import { ChartLegend, niceAxis } from "@/components/charts";
import { TooltipTitle } from "@/components/game-live/ChartTooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { formatGameDate } from "@/lib/game-formatters";
import { formatSavePct, formatToi } from "@/lib/formatters";
import {
  GOALIE_METRICS,
  SKATER_METRICS,
  rollingMetric,
  scoringBreakdown,
  stretches,
  venueSplits,
  type GamesMetric,
  type PlayerFormPoint,
} from "@/lib/player-form";
import { cn } from "@/lib/utils";
import type { GoalieGameLogEntry, SkaterGameLogEntry } from "@/types";

const SERIES_COLOUR = "var(--chart-1)";

type BaseGame = SkaterGameLogEntry | GoalieGameLogEntry;

interface MetricOption<G> {
  key: string;
  label: string;
  /** Lowercase noun for captions and tooltips, e.g. "points per game". */
  unit: string;
  metric: GamesMetric<G>;
  format: (v: number) => string;
}

function resultText(g: BaseGame): string {
  if (g.result === null || g.teamScore === null || g.opponentScore === null) return "";
  const extra = g.periodType === "OT" || g.periodType === "SO" ? ` ${g.periodType}` : "";
  return `${g.result === "OTL" ? "L" : g.result} ${g.teamScore}–${g.opponentScore}${extra}`;
}

function gameTicks(count: number): number[] {
  const step = count > 40 ? 10 : 5;
  const ticks = [1];
  for (let g = step; g <= count; g += step) ticks.push(g);
  return ticks;
}

function FormTooltip<G extends BaseGame>({
  active,
  payload,
  option,
  describe,
}: {
  active?: boolean;
  payload?: Array<{ payload: PlayerFormPoint<G> }>;
  option: MetricOption<G>;
  describe: (g: G) => string;
}) {
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return null;
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const g = point.game;
  return (
    <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg shadow-black/5">
      <TooltipTitle>
        Game {point.gameNum}: {g.isHome ? "vs" : "@"} {g.opponent}
      </TooltipTitle>
      <p className="text-xs text-muted-foreground">
        {formatGameDate(g.gameDate)}
        {resultText(g) && ` · ${resultText(g)}`}
      </p>
      <p className="mt-1.5 text-xs">{describe(g)}</p>
      {point.value !== null && (
        <p className="mt-1 text-xs">
          Last {point.windowGames}: <span className="font-semibold tabular-nums">{option.format(point.value)}</span>{" "}
          {option.unit}
        </p>
      )}
    </div>
  );
}

/**
 * A rolling average of one metric against the season, with a toggle between
 * metrics. Lines start once the window has `minGames` games.
 */
function FormChart<G extends BaseGame>({
  games,
  options,
  windowSize,
  minGames,
  describe,
}: {
  games: readonly G[];
  options: MetricOption<G>[];
  windowSize: number;
  minGames: number;
  describe: (g: G) => string;
}) {
  const [key, setKey] = useState(options[0].key);
  const option = options.find((o) => o.key === key) ?? options[0];
  const points = useMemo(() => rollingMetric(games, option.metric, windowSize, minGames), [games, option, windowSize, minGames]);
  const season = option.metric(games);
  const values = points.flatMap((p) => (p.value !== null ? [p.value] : [])).concat(season !== null ? [season] : []);
  const latest = points[points.length - 1];

  return (
    <Section
      title="Form"
      description={`Rolling ${windowSize}-game average against the season.`}
    >
      <Panel>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <ChartLegend
            items={[
              { label: `Last ${windowSize} games`, colour: SERIES_COLOUR },
              { label: "Season average", colour: CHART_AXIS_COLOURS.reference, dashed: true },
            ]}
          />
          <SegmentedControl
            aria-label="Form metric"
            value={option.key}
            onValueChange={setKey}
            options={options.map((o) => ({ value: o.key, label: o.label }))}
          />
        </div>
        {games.length < minGames || values.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Form needs at least {minGames} games.
          </p>
        ) : (
          <>
            <FormChartPlot points={points} values={values} season={season} option={option} describe={describe} />
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">
              {latest.value !== null && `Last ${latest.windowGames} games: ${option.format(latest.value)} ${option.unit} · `}
              Season: {season !== null ? option.format(season) : "–"}. Lines start at game {minGames}.
            </p>
          </>
        )}
      </Panel>
    </Section>
  );
}

function FormChartPlot<G extends BaseGame>({
  points,
  values,
  season,
  option,
  describe,
}: {
  points: PlayerFormPoint<G>[];
  values: number[];
  season: number | null;
  option: MetricOption<G>;
  describe: (g: G) => string;
}) {
  const axis = niceAxis(values, { pad: 0 });
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 20, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={CHART_AXIS_COLOURS.grid}
          strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
          vertical={false}
        />
        <XAxis
          dataKey="gameNum"
          type="number"
          domain={[1, Math.max(points.length, 2)]}
          ticks={gameTicks(points.length)}
          tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
          stroke={CHART_AXIS_COLOURS.grid}
          tickLine={false}
          label={{ value: "Game", position: "bottom", offset: 0, fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
        />
        <YAxis
          domain={axis.domain}
          ticks={axis.ticks}
          tickFormatter={option.format}
          tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        {season !== null && <ReferenceLine y={season} stroke={CHART_AXIS_COLOURS.reference} strokeDasharray="4 3" />}
        <Tooltip
          content={<FormTooltip option={option} describe={describe} />}
          cursor={{ stroke: CHART_AXIS_COLOURS.grid }}
        />
        <Line
          type="monotone"
          dataKey="value"
          name={option.label}
          stroke={SERIES_COLOUR}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface StretchColumn<G> {
  label: string;
  value: (games: readonly G[]) => number | null;
  format: (v: number) => string;
  /** Lower is better (GAA): bold when below the season. */
  lowerIsBetter?: boolean;
  /** Context, not performance: never bold. */
  plain?: boolean;
}

/** Last 5/10/20 against the season; bold where a stretch beats the season. */
function StretchesTable<G>({ games, sizes, columns }: { games: readonly G[]; sizes: number[]; columns: StretchColumn<G>[] }) {
  const rows = stretches(games, sizes);
  const seasonValues = columns.map((c) => c.value(games));
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="overflow-x-auto">
        <Table className="min-w-160">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card pl-4 sm:pl-5">Stretch</TableHead>
              <TableHead className="text-right">GP</TableHead>
              {columns.map((c) => (
                <TableHead key={c.label} className="text-right last:pr-4 sm:last:pr-5">
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label} className={cn(row.isSeason && "text-muted-foreground")}>
                <TableCell className="sticky left-0 z-10 bg-card pl-4 font-medium sm:pl-5">{row.label}</TableCell>
                <TableCell className="text-right">{row.games.length}</TableCell>
                {columns.map((c, i) => {
                  const v = c.value(row.games);
                  const s = seasonValues[i];
                  const better =
                    !row.isSeason && !c.plain && v !== null && s !== null && (c.lowerIsBetter ? v < s : v > s);
                  return (
                    <TableCell key={c.label} className={cn("text-right last:pr-4 sm:last:pr-5", better && "font-semibold text-foreground")}>
                      {v !== null ? c.format(v) : "–"}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Small two-column table of label → values. */
function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {head.map((h, i) => (
                <TableHead key={h} className={cn(i === 0 ? "pl-4 sm:pl-5" : "text-right", i === head.length - 1 && "pr-4 sm:pr-5")}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={String(row[0])}>
                {row.map((cell, i) => (
                  <TableCell
                    key={i}
                    className={cn(i === 0 ? "pl-4 font-medium sm:pl-5" : "text-right", i === row.length - 1 && "pr-4 sm:pr-5")}
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const twoDp = (v: number) => v.toFixed(2);
const share = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "–");
const signed = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`;

const SKATER_OPTIONS: MetricOption<SkaterGameLogEntry>[] = [
  { key: "points", label: "Points", unit: "points per game", metric: SKATER_METRICS.points, format: twoDp },
  { key: "goals", label: "Goals", unit: "goals per game", metric: SKATER_METRICS.goals, format: twoDp },
  { key: "shots", label: "Shots", unit: "shots per game", metric: SKATER_METRICS.shots, format: (v) => v.toFixed(1) },
  { key: "xg", label: "xG", unit: "xG per game", metric: SKATER_METRICS.xGoals, format: twoDp },
  { key: "toi", label: "TOI", unit: "per game", metric: SKATER_METRICS.toiMinutes, format: (v) => formatToi(v * 60) },
];

const describeSkaterGame = (g: SkaterGameLogEntry) =>
  `${g.goals} G, ${g.assists} A · ${g.shots} shots · ${formatToi(g.toiSeconds)}`;

const SKATER_STRETCH_COLUMNS: StretchColumn<SkaterGameLogEntry>[] = [
  { label: "P/GP", value: SKATER_METRICS.points, format: twoDp },
  { label: "G/GP", value: SKATER_METRICS.goals, format: twoDp },
  { label: "A/GP", value: SKATER_METRICS.assists, format: twoDp },
  { label: "Shots", value: SKATER_METRICS.shots, format: (v) => v.toFixed(1) },
  { label: "xG", value: SKATER_METRICS.xGoals, format: twoDp },
  {
    label: "+/-",
    value: (games) => games.reduce((n, g) => n + g.plusMinus, 0),
    format: (v) => (v > 0 ? `+${v}` : String(v)),
    plain: true,
  },
  { label: "TOI", value: SKATER_METRICS.toiMinutes, format: (v) => formatToi(v * 60), plain: true },
];

/** Skater form chart, stretches, home/away splits and where the points came from. */
export function SkaterFormSections({ games }: { games: SkaterGameLogEntry[] }) {
  const breakdown = scoringBreakdown(games);
  return (
    <>
      <FormChart games={games} options={SKATER_OPTIONS} windowSize={10} minGames={5} describe={describeSkaterGame} />
      <Section title="Stretches" description="Per game, most recent games first. Bold is better than the season.">
        <StretchesTable games={games} sizes={[5, 10, 20]} columns={SKATER_STRETCH_COLUMNS} />
      </Section>
      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Splits" description="Home and away.">
          <SimpleTable
            head={["Split", "GP", "G", "P", "P/GP", "xG"]}
            rows={venueSplits(games).map((s) => [
              s.label,
              s.games.length,
              s.games.reduce((n, g) => n + g.goals, 0),
              s.games.reduce((n, g) => n + g.points, 0),
              s.games.length > 0 ? twoDp(SKATER_METRICS.points(s.games)!) : "–",
              s.games.some((g) => g.xGoals !== null)
                ? s.games.reduce((n, g) => n + (g.xGoals ?? 0), 0).toFixed(1)
                : "–",
            ])}
          />
        </Section>
        <Section title="Scoring" description="Where the points came from.">
          <SimpleTable
            head={["Category", "Count", "Share"]}
            rows={[
              ["Power-play points", breakdown.powerPlayPoints, share(breakdown.powerPlayPoints, breakdown.points)],
              ["Other points", breakdown.otherPoints, share(breakdown.otherPoints, breakdown.points)],
              ["Multi-point games", breakdown.multiPointGames, share(breakdown.multiPointGames, breakdown.games)],
              ["Pointless games", breakdown.pointlessGames, share(breakdown.pointlessGames, breakdown.games)],
            ]}
          />
        </Section>
      </div>
    </>
  );
}

const GOALIE_OPTIONS: MetricOption<GoalieGameLogEntry>[] = [
  { key: "svpct", label: "Sv%", unit: "save percentage", metric: GOALIE_METRICS.savePct, format: (v) => formatSavePct(v) },
  { key: "gsax", label: "GSAx", unit: "GSAx per game", metric: GOALIE_METRICS.gsaxPerGame, format: signed },
  { key: "gaa", label: "GAA", unit: "goals against average", metric: GOALIE_METRICS.goalsAgainstAverage, format: twoDp },
];

const describeGoalieGame = (g: GoalieGameLogEntry) =>
  `${g.shotsAgainst - g.goalsAgainst} saves on ${g.shotsAgainst} shots${
    g.goalsSavedAboveExpected !== null ? ` · GSAx ${signed(g.goalsSavedAboveExpected)}` : ""
  }`;

const GOALIE_STRETCH_COLUMNS: StretchColumn<GoalieGameLogEntry>[] = [
  { label: "Sv%", value: GOALIE_METRICS.savePct, format: (v) => formatSavePct(v) },
  { label: "GAA", value: GOALIE_METRICS.goalsAgainstAverage, format: twoDp, lowerIsBetter: true },
  { label: "GSAx/GP", value: GOALIE_METRICS.gsaxPerGame, format: signed },
  {
    label: "SA/GP",
    value: (games) => (games.length > 0 ? games.reduce((n, g) => n + g.shotsAgainst, 0) / games.length : null),
    format: (v) => v.toFixed(1),
    plain: true,
  },
];

/** Goalie form chart (5-game window: goalies play fewer games), stretches and home/away splits. */
export function GoalieFormSections({ games }: { games: GoalieGameLogEntry[] }) {
  return (
    <>
      <FormChart games={games} options={GOALIE_OPTIONS} windowSize={5} minGames={3} describe={describeGoalieGame} />
      <Section title="Stretches" description="Most recent games first. Bold is better than the season.">
        <StretchesTable games={games} sizes={[5, 10, 20]} columns={GOALIE_STRETCH_COLUMNS} />
      </Section>
      <Section title="Splits" description="Home and away.">
        <SimpleTable
          head={["Split", "GP", "Sv%", "GAA", "GSAx"]}
          rows={venueSplits(games).map((s) => {
            const sv = GOALIE_METRICS.savePct(s.games);
            const gaa = GOALIE_METRICS.goalsAgainstAverage(s.games);
            const withXg = s.games.filter((g) => g.goalsSavedAboveExpected !== null);
            return [
              s.label,
              s.games.length,
              sv !== null ? formatSavePct(sv) : "–",
              gaa !== null ? twoDp(gaa) : "–",
              withXg.length > 0 ? signed(withXg.reduce((n, g) => n + g.goalsSavedAboveExpected!, 0)) : "–",
            ];
          })}
        />
      </Section>
    </>
  );
}
