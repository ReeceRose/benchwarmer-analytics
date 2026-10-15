import { useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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
import { useTeamGameLog, useTeamSeasons } from "@/hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, Panel, Section, SegmentedControl } from "@/components/layout";
import { ErrorState, TeamTag } from "@/components/shared";
import { ChartLegend } from "@/components/charts/ChartLegend";
import { TooltipTitle } from "@/components/game-live/ChartTooltip";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { formatGameDate } from "@/lib/game-formatters";
import { formatPercent } from "@/lib/formatters";
import {
  rollingForm,
  seasonXgShare,
  splitFor,
  teamSplits,
  type FormPoint,
  type FormSituation,
} from "@/lib/team-form";
import { cn } from "@/lib/utils";
import type { TeamGameLogEntry } from "@/types";

const WINDOW = 10;
// Lines start once the window has this many games; one or two games are noise.
const MIN_GAMES = 5;
const SERIES_COLOUR = "var(--chart-1)";

const SITUATION_LABELS: Record<FormSituation, string> = {
  fiveOnFive: "5 on 5",
  all: "All situations",
};

export interface TeamGamesSearch {
  season?: number;
  situation?: FormSituation;
  playoffs?: boolean;
}

interface TeamGamesDashboardProps extends TeamGamesSearch {
  abbrev: string;
}

/** Team "Games" tab: rolling form chart and the game log. */
export function TeamGamesDashboard({
  abbrev,
  season,
  situation = "fiveOnFive",
  playoffs = false,
}: TeamGamesDashboardProps) {
  const navigate = useNavigate({ from: "/teams/$abbrev/games" });
  const { data: seasons, isLoading: seasonsLoading } = useTeamSeasons(abbrev);
  const effectiveSeason = season ?? seasons?.seasons[0]?.year;
  const { data, isLoading, error, refetch } = useTeamGameLog(
    abbrev,
    effectiveSeason,
    playoffs,
  );

  const updateSearch = (updates: TeamGamesSearch) => {
    navigate({
      search: (prev) => ({ ...prev, ...updates }),
      resetScroll: false,
    });
  };

  const games = useMemo(() => data?.games ?? [], [data]);
  const form = useMemo(
    () =>
      rollingForm(games, situation, WINDOW).map((p) =>
        p.windowGames < MIN_GAMES ? { ...p, xgShare: null, goalShare: null } : p,
      ),
    [games, situation],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Games</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Game-by-game expected goals and form through the season.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={effectiveSeason?.toString() ?? ""}
            onValueChange={(v) => updateSearch({ season: parseInt(v, 10) })}
          >
            <SelectTrigger className="w-32" aria-label="Season">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              {seasons?.seasons.map((s) => (
                <SelectItem key={s.year} value={s.year.toString()}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SegmentedControl
            aria-label="Season type"
            value={playoffs ? "playoffs" : "regular"}
            onValueChange={(v) => updateSearch({ playoffs: v === "playoffs" })}
            options={[
              { value: "regular", label: "Regular season" },
              { value: "playoffs", label: "Playoffs" },
            ]}
          />
          <SegmentedControl
            aria-label="Situation"
            value={situation}
            onValueChange={(v) => updateSearch({ situation: v })}
            options={[
              { value: "fiveOnFive", label: SITUATION_LABELS.fiveOnFive },
              { value: "all", label: SITUATION_LABELS.all },
            ]}
          />
        </div>
      </div>

      {isLoading || seasonsLoading ? (
        <TeamGamesSkeleton />
      ) : error ? (
        <ErrorState
          title="Failed to load games"
          message="Unable to load this team's games. Please try again."
          onRetry={() => refetch()}
        />
      ) : games.length === 0 ? (
        <EmptyState
          title={playoffs ? "No playoff games this season" : "No games for this season yet"}
          hint="Try another season."
        />
      ) : (
        <>
          <Section
            title="Form"
            description={`Share of ${SITUATION_LABELS[situation].toLowerCase()} expected goals and goals over a rolling ${WINDOW}-game window. Above 50% means out-chancing opponents.`}
          >
            <Panel>
              <FormChart points={form} games={games} situation={situation} />
            </Panel>
          </Section>

          <Section
            title="Splits"
            description={`Record by venue and rest. Goals and xG% are ${SITUATION_LABELS[situation].toLowerCase()}.`}
          >
            <SplitsTable games={games} situation={situation} />
          </Section>

          <Section title="Game log" description={`${SITUATION_LABELS[situation]}, newest first. Results include overtime and shootouts.`}>
            <GameLogTable games={games} situation={situation} season={effectiveSeason} />
          </Section>
        </>
      )}
    </div>
  );
}

// Y-axis ticks in tens around the data, always including 40-60%.
function shareTicks(points: readonly FormPoint[]): number[] {
  const values = points.flatMap((p) => [p.xgShare, p.goalShare]).filter((v): v is number => v !== null);
  const low = Math.max(0, Math.floor(Math.min(40, ...values) / 10) * 10);
  const high = Math.min(100, Math.ceil(Math.max(60, ...values) / 10) * 10);
  const ticks: number[] = [];
  for (let v = low; v <= high; v += 10) ticks.push(v);
  return ticks;
}

// Game 1, then every 10th game.
function gameTicks(count: number): number[] {
  const ticks = [1];
  for (let g = 10; g <= count; g += 10) ticks.push(g);
  return ticks;
}

function formatShare(value: number | null): string {
  return value === null ? "–" : `${value.toFixed(1)}%`;
}

function FormTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: FormPoint }> }) {
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return null;
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const { game } = point;

  return (
    <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg shadow-black/5">
      <TooltipTitle>
        Game {point.gameNum}: {game.isHome ? "vs" : "@"} {game.opponent}
      </TooltipTitle>
      <p className="mb-2 text-xs text-muted-foreground">
        {formatGameDate(game.gameDate)}
        {game.result && ` · ${resultText(game)}`}
      </p>
      <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs">
        <dt className="text-muted-foreground">xG share, last {point.windowGames}</dt>
        <dd className="text-right font-semibold tabular-nums">{formatShare(point.xgShare)}</dd>
        <dt className="text-muted-foreground">Goal share, last {point.windowGames}</dt>
        <dd className="text-right font-semibold tabular-nums">{formatShare(point.goalShare)}</dd>
      </dl>
    </div>
  );
}

function FormChart({
  points,
  games,
  situation,
}: {
  points: FormPoint[];
  games: TeamGameLogEntry[];
  situation: FormSituation;
}) {
  const latest = points[points.length - 1];
  const season = seasonXgShare(games, situation);
  const yTicks = shareTicks(points);

  return (
    <div>
      <ChartLegend
        className="mb-3"
        items={[
          { label: "Goal share", colour: SERIES_COLOUR },
          { label: "xG share", colour: SERIES_COLOUR, dashed: true },
          { label: "50%", colour: CHART_AXIS_COLOURS.reference, dashed: true },
        ]}
      />
      <ResponsiveContainer width="100%" height={280}>
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
            domain={[yTicks[0], yTicks[yTicks.length - 1]]}
            ticks={yTicks}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ReferenceLine y={50} stroke={CHART_AXIS_COLOURS.reference} strokeDasharray="4 3" />
          <Tooltip content={<FormTooltip />} cursor={{ stroke: CHART_AXIS_COLOURS.grid }} />
          <Line
            type="linear"
            dataKey="goalShare"
            name="Goal share"
            stroke={SERIES_COLOUR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="xgShare"
            name="xG share"
            stroke={SERIES_COLOUR}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-muted-foreground tabular-nums">
        {latest.windowGames >= MIN_GAMES
          ? `Last ${latest.windowGames} games: ${formatShare(latest.xgShare)} xG share · `
          : ""}
        Season: {formatShare(season)} xG share. Lines start at game {MIN_GAMES}; until game {WINDOW} they average every game so far.
      </p>
    </div>
  );
}

function resultText(game: TeamGameLogEntry): string {
  if (game.result === null || game.teamScore === null || game.opponentScore === null) return "";
  const suffix = game.periodType === "OT" || game.periodType === "SO" ? ` ${game.periodType}` : "";
  return `${game.result === "OTL" ? "L" : game.result} ${game.teamScore}–${game.opponentScore}${suffix}`;
}

function shareOrNull(forValue: number, againstValue: number): number | null {
  const total = forValue + againstValue;
  return total > 0 ? forValue / total : null;
}

function GameLogTable({
  games,
  situation,
  season,
}: {
  games: TeamGameLogEntry[];
  situation: FormSituation;
  season?: number;
}) {
  const rows = [...games].reverse();

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="overflow-x-auto">
        <Table className="min-w-180">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 w-32 bg-card">Date</TableHead>
              <TableHead>Opponent</TableHead>
              <TableHead>Result</TableHead>
              <TableHead className="text-right">GF</TableHead>
              <TableHead className="text-right">GA</TableHead>
              <TableHead className="text-right">xGF</TableHead>
              <TableHead className="text-right">xGA</TableHead>
              <TableHead className="text-right">xG%</TableHead>
              <TableHead className="text-right">CF%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((game) => {
              const split = splitFor(game, situation);
              const xgPct = split ? shareOrNull(split.xGoalsFor, split.xGoalsAgainst) : null;
              const cfPct = split ? shareOrNull(split.shotAttemptsFor, split.shotAttemptsAgainst) : null;
              return (
                <TableRow key={game.gameId} className="group">
                  <TableCell className="sticky left-0 z-10 bg-card whitespace-nowrap group-hover:bg-muted">
                    <Link
                      to="/games/$gameId"
                      params={{ gameId: game.gameId }}
                      className="hover:text-link"
                    >
                      {formatGameDate(game.gameDate)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-4 text-xs text-muted-foreground">{game.isHome ? "vs" : "@"}</span>
                      <TeamTag abbrev={game.opponent} season={season} />
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {game.result ? (
                      <span className={cn(game.result === "W" ? "font-semibold" : "text-muted-foreground")}>
                        {resultText(game)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">–</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{split?.goalsFor ?? "–"}</TableCell>
                  <TableCell className="text-right">{split?.goalsAgainst ?? "–"}</TableCell>
                  <TableCell className="text-right">{split ? split.xGoalsFor.toFixed(2) : "–"}</TableCell>
                  <TableCell className="text-right">{split ? split.xGoalsAgainst.toFixed(2) : "–"}</TableCell>
                  <TableCell className={cn("text-right", xgPct !== null && xgPct > 0.5 && "font-semibold")}>
                    {xgPct !== null ? formatPercent(xgPct) : "–"}
                  </TableCell>
                  <TableCell className="text-right">{cfPct !== null ? formatPercent(cfPct) : "–"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SplitsTable({ games, situation }: { games: TeamGameLogEntry[]; situation: FormSituation }) {
  const splits = teamSplits(games, situation);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="overflow-x-auto">
        <Table className="min-w-140">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card">Split</TableHead>
              <TableHead className="text-right">GP</TableHead>
              <TableHead className="text-right">Record</TableHead>
              <TableHead className="text-right">Pts%</TableHead>
              <TableHead className="text-right">GF</TableHead>
              <TableHead className="text-right">GA</TableHead>
              <TableHead className="text-right">xG%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {splits.map((split) => (
              <TableRow key={split.key}>
                <TableCell className="sticky left-0 z-10 bg-card font-medium">{split.label}</TableCell>
                <TableCell className="text-right">{split.games}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {split.games > 0 ? `${split.wins}-${split.losses}-${split.otLosses}` : "–"}
                </TableCell>
                <TableCell className="text-right">
                  {split.pointsPct !== null ? formatPercent(split.pointsPct) : "–"}
                </TableCell>
                <TableCell className="text-right">{split.games > 0 ? split.goalsFor : "–"}</TableCell>
                <TableCell className="text-right">{split.games > 0 ? split.goalsAgainst : "–"}</TableCell>
                <TableCell className={cn("text-right", split.xgShare !== null && split.xgShare > 50 && "font-semibold")}>
                  {split.xgShare !== null ? `${split.xgShare.toFixed(1)}%` : "–"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TeamGamesSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-85 rounded-2xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
