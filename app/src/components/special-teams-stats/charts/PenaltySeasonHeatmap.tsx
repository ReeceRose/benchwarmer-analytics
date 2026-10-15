import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedControl } from "@/components/layout";
import { TeamLogo } from "@/components/shared";
import { Swatch } from "@/components/game-live/parts";
import { useSeriesColours } from "@/hooks/useSeriesColours";
import { niceAxis } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { CHART_AXIS_COLOURS, CHART_COLOURS, REFERENCE_COLOUR } from "@/lib/chart-colours";
import { getCurrentSeason } from "@/lib/date-utils";
import { formatOrdinal, formatSeason } from "@/lib/formatters";
import { getTeamName } from "@/lib/team-names";
import { cn } from "@/lib/utils";
import { penaltyRates, venueTotals, type PenaltyRates, type Venue } from "@/lib/venue-penalties";
import type { HomeAwayMetricKey } from "@/components/team-detail/home-away-metrics";
import type { PenaltiesByVenueResponse } from "@/types";

export type HeatmapStat = "drawnPer60" | "takenPer60" | "netPer60" | "calledPer60" | "drawn" | "taken";
export type HeatmapOrder = "fewest" | "most";
export type SeasonLayout = "heatmap" | "teams" | "all";
export type SeasonPlot = "value" | "rank";

const STATS: Record<
  HeatmapStat,
  { label: string; short: string; value: (r: PenaltyRates) => number; format: (v: number) => string; homeAwayMetric: HomeAwayMetricKey }
> = {
  drawnPer60: {
    label: "Penalties drawn per 60",
    short: "drawn/60",
    value: (r) => r.penaltiesDrawnPer60,
    format: (v) => v.toFixed(2),
    homeAwayMetric: "penaltiesDrawnPer60",
  },
  takenPer60: {
    label: "Penalties taken per 60",
    short: "taken/60",
    value: (r) => r.penaltiesTakenPer60,
    format: (v) => v.toFixed(2),
    homeAwayMetric: "penaltiesTakenPer60",
  },
  netPer60: {
    label: "Penalty differential per 60",
    short: "net/60",
    value: (r) => r.netPenaltiesPer60,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`,
    homeAwayMetric: "netPenaltiesPer60",
  },
  calledPer60: {
    label: "Penalties called per 60 (both teams)",
    short: "called/60",
    value: (r) => Number((r.penaltiesDrawnPer60 + r.penaltiesTakenPer60).toFixed(2)),
    format: (v) => v.toFixed(2),
    homeAwayMetric: "penaltiesDrawnPer60",
  },
  drawn: {
    label: "Penalties drawn",
    short: "drawn",
    value: (r) => r.penaltiesDrawn,
    format: String,
    homeAwayMetric: "penaltiesDrawnPer60",
  },
  taken: {
    label: "Penalties taken",
    short: "taken",
    value: (r) => r.penaltiesTaken,
    format: String,
    homeAwayMetric: "penaltiesTakenPer60",
  },
};

export const HEATMAP_STATS = Object.keys(STATS) as [HeatmapStat, ...HeatmapStat[]];

const VENUE_TEXT: Record<Venue, string> = { all: "all games", home: "home games", away: "road games" };

interface Cell {
  value: number;
  gamesPlayed: number;
  /** 1 = the season's fewest (or most, by `order`). */
  rank: number;
  of: number;
  /** 0 for the season's lowest value, 1 for its highest. */
  share: number;
}

interface PenaltySeasonHeatmapProps {
  data: PenaltiesByVenueResponse;
  venue: Venue;
  stat: HeatmapStat;
  order: HeatmapOrder;
  layout: SeasonLayout;
  plot: SeasonPlot;
  /** Teams highlighted on the all-teams chart; defaults to the top three. */
  highlighted?: string[];
  from?: number;
  to?: number;
  /** Sort rows by this season's value; otherwise by average rank. */
  sortSeason?: number;
  /** The season picked at the top of the page, outlined. */
  highlightSeason?: number;
  onChange: (updates: {
    stat?: HeatmapStat;
    order?: HeatmapOrder;
    layout?: SeasonLayout;
    plot?: SeasonPlot;
    teams?: string;
    from?: number;
    to?: number;
    sortSeason?: number;
  }) => void;
}

/**
 * Teams down the side, seasons across: one penalty stat for home games, road
 * games or both. Shading is the team's place within that season (penalty
 * rates have fallen a lot since 2008), and each season's leader is ringed.
 */
export function PenaltySeasonHeatmap({
  data,
  venue,
  stat,
  order,
  layout,
  plot,
  highlighted,
  from,
  to,
  sortSeason,
  highlightSeason,
  onChange,
}: PenaltySeasonHeatmapProps) {
  const config = STATS[stat];
  const allSeasons = data.seasons.map((s) => s.season);
  const first = from ?? allSeasons.at(-10) ?? allSeasons[0];
  const last = to ?? allSeasons.at(-1);
  const seasons = data.seasons.filter((s) => s.season >= first && (last == null || s.season <= last));

  // The current season while it's well short of the last full one.
  const games = (i: number) =>
    data.seasons[i]?.teams.reduce((total, t) => total + t.home.gamesPlayed + t.away.gamesPlayed, 0) ?? 0;
  const latest = data.seasons.length - 1;
  const inProgressSeason =
    data.seasons[latest]?.season === getCurrentSeason() && games(latest) < games(latest - 1) * 0.9
      ? data.seasons[latest].season
      : undefined;

  // season → team → cell
  const cells = new Map<number, Map<string, Cell>>();
  for (const s of seasons) {
    const values = s.teams
      .map((t) => {
        const totals = venueTotals(t, venue);
        return { team: t.team, gamesPlayed: totals.gamesPlayed, value: config.value(penaltyRates(totals)) };
      })
      .filter((v) => v.gamesPlayed > 0);
    const sorted = [...values].sort((a, b) => (order === "fewest" ? a.value - b.value : b.value - a.value));
    const low = Math.min(...values.map((v) => v.value));
    const high = Math.max(...values.map((v) => v.value));
    cells.set(
      s.season,
      new Map(
        sorted.map((v, i) => [
          v.team,
          {
            value: v.value,
            gamesPlayed: v.gamesPlayed,
            rank: i + 1,
            of: sorted.length,
            share: high > low ? (v.value - low) / (high - low) : 0.5,
          },
        ]),
      ),
    );
  }

  // Seasons in progress don't count towards the average rank.
  const ranked = seasons.filter((s) => s.season !== inProgressSeason);
  const teams = [...new Set(seasons.flatMap((s) => s.teams.map((t) => t.team)))].map((team) => {
    const ranks = ranked.map((s) => cells.get(s.season)?.get(team)?.rank).filter((r): r is number => r != null);
    return { team, averageRank: ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null };
  });
  const sortValue = (team: string, averageRank: number | null) => {
    if (sortSeason != null) return cells.get(sortSeason)?.get(team)?.rank ?? Infinity;
    return averageRank ?? Infinity;
  };
  teams.sort((a, b) => sortValue(a.team, a.averageRank) - sortValue(b.team, b.averageRank));

  const leaders = seasons.map((s) => {
    const entry = [...(cells.get(s.season)?.entries() ?? [])].find(([, c]) => c.rank === 1);
    return entry ? { team: entry[0], ...entry[1] } : null;
  });
  const rankWord = order === "fewest" ? "fewest" : "most";

  const headerClass = "px-1 pb-2 text-center text-[11px] font-medium whitespace-nowrap text-muted-foreground";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Season by season</CardTitle>
        <CardDescription>
          {layout === "all" ? (
            <>
              {config.label} in {VENUE_TEXT[venue]}: every team on one chart
              {plot === "rank" ? ", as its rank each season (1st at the top)" : ", with the league average dashed"}.
              Pick teams to label them; the first five get colours.
            </>
          ) : layout === "teams" ? (
            <>
              {config.label} in {VENUE_TEXT[venue]}: one chart per team, all on the same scale, against the league
              average (dashed).
            </>
          ) : (
            <>
              {config.label} in {VENUE_TEXT[venue]}, every team. Shading is each team&apos;s place within the season
              (darker = more), and the season&apos;s {rankWord} is ringed.
            </>
          )}
        </CardDescription>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <SegmentedControl
            aria-label="Layout"
            value={layout}
            onValueChange={(l) => onChange({ layout: l })}
            options={[
              { value: "all", label: "All teams" },
              { value: "teams", label: "Team charts" },
              { value: "heatmap", label: "Heatmap" },
            ]}
          />
          {layout === "all" && (
            <SegmentedControl
              aria-label="Plot"
              value={plot}
              onValueChange={(p) => onChange({ plot: p })}
              options={[
                { value: "value", label: "Value" },
                { value: "rank", label: "Rank" },
              ]}
            />
          )}
          <Select value={stat} onValueChange={(v) => onChange({ stat: v as HeatmapStat })}>
            <SelectTrigger className="w-56" aria-label="Stat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HEATMAP_STATS.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATS[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SegmentedControl
            aria-label="Rank order"
            value={order}
            onValueChange={(o) => onChange({ order: o })}
            options={[
              { value: "fewest", label: "Fewest first" },
              { value: "most", label: "Most first" },
            ]}
          />
          <Select value={String(first)} onValueChange={(v) => onChange({ from: Number(v) })}>
            <SelectTrigger className="w-32" aria-label="From season">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allSeasons
                .filter((s) => last == null || s <= last)
                .map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    From {formatSeason(s)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={String(last)} onValueChange={(v) => onChange({ to: Number(v) })}>
            <SelectTrigger className="w-32" aria-label="To season">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allSeasons
                .filter((s) => s >= first)
                .map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    To {formatSeason(s)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {layout === "all" ? (
          <AllTeamsChart
            teams={teams.map((t) => t.team)}
            seasons={seasons.map((s) => s.season).filter((season) => season !== inProgressSeason)}
            cells={cells}
            format={config.format}
            short={config.short}
            plot={plot}
            rankWord={rankWord}
            highlighted={highlighted ?? teams.slice(0, 3).map((t) => t.team)}
            onHighlight={(next) => onChange({ teams: next.join(",") })}
            inProgress={inProgressSeason != null}
          />
        ) : layout === "teams" ? (
          <TeamCharts
            teams={teams}
            seasons={seasons.map((s) => s.season).filter((season) => season !== inProgressSeason)}
            cells={cells}
            format={config.format}
            metric={config.homeAwayMetric}
            rankWord={rankWord}
            sortSeason={sortSeason}
            inProgress={inProgressSeason != null}
          />
        ) : (
        <>
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="border-separate border-spacing-0.5 text-xs tabular-nums">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card pr-2 pb-2 text-left text-[11px] font-medium text-muted-foreground">
                  Team
                </th>
                <th className={headerClass}>
                  <button
                    type="button"
                    onClick={() => onChange({ sortSeason: undefined })}
                    className={cn("hover:text-foreground", sortSeason == null && "text-foreground")}
                    title={`Sort by average rank (1 = ${rankWord})`}
                  >
                    Avg rank
                  </button>
                </th>
                {seasons.map((s) => (
                  <th key={s.season} className={headerClass}>
                    <button
                      type="button"
                      onClick={() => onChange({ sortSeason: s.season })}
                      className={cn(
                        "rounded-full px-1 hover:text-foreground",
                        sortSeason === s.season && "text-foreground",
                        s.season === highlightSeason && "underline underline-offset-4",
                      )}
                      title={`Sort by ${formatSeason(s.season)}`}
                    >
                      {formatSeason(s.season).slice(2)}
                    </button>
                    {s.season === inProgressSeason && <span className="block font-normal">so far</span>}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-10 bg-card pr-2 pb-1 text-left text-[11px] font-medium text-muted-foreground capitalize">
                  {rankWord}
                </th>
                <th />
                {leaders.map((leader, i) => (
                  <th key={seasons[i].season} className="pb-1">
                    {leader && (
                      <span className="flex justify-center" title={`${getTeamName(leader.team)}: ${config.format(leader.value)}`}>
                        <TeamLogo abbrev={leader.team} size="xs" />
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map(({ team, averageRank }) => (
                <tr key={team}>
                  <td className="sticky left-0 z-10 bg-card pr-2">
                    <Link
                      to="/teams/$abbrev/home-away"
                      params={{ abbrev: team }}
                      search={{ metric: config.homeAwayMetric }}
                      className="flex items-center gap-1.5 font-medium whitespace-nowrap hover:text-link"
                      title={getTeamName(team)}
                    >
                      <TeamLogo abbrev={team} size="xs" />
                      {team}
                    </Link>
                  </td>
                  <td className="px-1 text-center text-muted-foreground">
                    {averageRank != null ? averageRank.toFixed(1) : "–"}
                  </td>
                  {seasons.map((s) => {
                    const cell = cells.get(s.season)?.get(team);
                    if (!cell) return <td key={s.season} className="h-7 w-12 min-w-12" />;
                    const leader = cell.rank === 1;
                    return (
                      <td
                        key={s.season}
                        className={cn(
                          "h-7 w-12 min-w-12 rounded-md text-center",
                          leader && "font-semibold ring-2 ring-foreground ring-inset",
                          s.season === inProgressSeason && "opacity-60",
                        )}
                        style={{
                          background: `color-mix(in oklab, var(--chart-1) ${Math.round(8 + cell.share * 52)}%, var(--card))`,
                        }}
                        title={`${getTeamName(team)}, ${formatSeason(s.season)} ${VENUE_TEXT[venue]}: ${config.format(cell.value)} ${config.short} (${formatOrdinal(cell.rank)} ${rankWord} of ${cell.of}, ${cell.gamesPlayed} GP)`}
                      >
                        {config.format(cell.value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Rank 1 = {rankWord} in that season. Click a season to sort by it, or Avg rank to sort by the average across
          the range{inProgressSeason ? " (the season in progress isn't counted)" : ""}. Hover a cell for games played.
        </p>
        </>
        )}
      </CardContent>
    </Card>
  );
}

const W = 200;
const H = 64;

/**
 * Small multiples: one line per team across the seasons, every panel on the
 * same y scale so heights compare, with the league average dashed behind.
 */
function TeamCharts({
  teams,
  seasons,
  cells,
  format,
  metric,
  rankWord,
  sortSeason,
  inProgress,
}: {
  teams: { team: string; averageRank: number | null }[];
  seasons: number[];
  cells: Map<number, Map<string, Cell>>;
  format: (v: number) => string;
  metric: HomeAwayMetricKey;
  rankWord: string;
  sortSeason?: number;
  inProgress: boolean;
}) {
  if (seasons.length === 0) return <p className="text-sm text-muted-foreground">No full seasons in this range.</p>;

  const values = seasons.flatMap((season) => [...(cells.get(season)?.values() ?? [])].map((c) => c.value));
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = (high - low) * 0.08 || 1;
  const [min, max] = [low - pad, high + pad];
  const x = (i: number) => (seasons.length === 1 ? W / 2 : (i / (seasons.length - 1)) * W);
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const league = seasons.map((season) => {
    const all = [...(cells.get(season)?.values() ?? [])].map((c) => c.value);
    return all.length > 0 ? all.reduce((a, b) => a + b, 0) / all.length : null;
  });
  const path = (points: (number | null)[]) =>
    points
      .map((v, i) => (v == null ? null : `${x(i)},${y(v)}`))
      .reduce<string[]>((segments, point, i) => {
        if (point == null) return segments;
        const joined = i > 0 && points[i - 1] != null;
        return [...segments, `${joined ? "L" : "M"}${point}`];
      }, [])
      .join(" ");
  const leaguePath = path(league);
  const highlight = sortSeason != null ? seasons.indexOf(sortSeason) : -1;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {teams.map(({ team, averageRank }, index) => {
          const points = seasons.map((season) => cells.get(season)?.get(team)?.value ?? null);
          let lastIndex = points.length - 1;
          while (lastIndex >= 0 && points[lastIndex] == null) lastIndex--;
          if (lastIndex < 0) return null;
          const latest = cells.get(seasons[lastIndex])?.get(team);
          return (
            <Link
              key={team}
              to="/teams/$abbrev/home-away"
              params={{ abbrev: team }}
              search={{ metric }}
              className="group rounded-xl border p-3 transition-colors hover:bg-muted/60"
              title={getTeamName(team)}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 font-medium group-hover:text-link">
                  <span className="w-4 shrink-0 text-muted-foreground tabular-nums">{index + 1}</span>
                  <TeamLogo abbrev={team} size="xs" />
                  {team}
                </span>
                <span className="font-semibold tabular-nums">{format(points[lastIndex]!)}</span>
              </div>
              <p className="mt-0.5 text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
                {averageRank != null ? `Avg rank ${averageRank.toFixed(1)}` : ""}
                {latest ? ` · ${formatOrdinal(latest.rank)} in ${formatSeason(seasons[lastIndex])}` : ""}
              </p>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-2 h-16 w-full overflow-visible" aria-hidden>
                {highlight >= 0 && (
                  <line x1={x(highlight)} x2={x(highlight)} y1={0} y2={H} stroke="var(--border)" vectorEffect="non-scaling-stroke" />
                )}
                <path d={leaguePath} fill="none" stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                <path d={path(points)} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="mt-1 flex justify-between text-[10px] whitespace-nowrap text-muted-foreground tabular-nums">
                <span>{formatSeason(seasons[0])}</span>
                <span>{formatSeason(seasons[lastIndex])}</span>
              </div>
            </Link>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Every panel runs from {format(Math.max(low, min))} to {format(high)}. Ordered the same as the heatmap (rank 1 ={" "}
        {rankWord}); the number top right is the latest full season.
        {inProgress ? " The season in progress is left out." : ""}
      </p>
    </>
  );
}

const CHART_HEIGHT = 440;
const CHART_TOP = 10;
const X_AXIS_HEIGHT = 30;
/** Minimum pixels between two end labels. */
const LABEL_GAP = 12;
const TOOLTIP_ROWS = 12;

/**
 * Every team on one chart: grey lines, with the picked teams in series
 * colours and labelled at their last point. By value (league average dashed)
 * or by rank within each season, 1st at the top.
 */
function AllTeamsChart({
  teams,
  seasons,
  cells,
  format,
  short,
  plot,
  rankWord,
  highlighted,
  onHighlight,
  inProgress,
}: {
  teams: string[];
  seasons: number[];
  cells: Map<number, Map<string, Cell>>;
  format: (v: number) => string;
  short: string;
  plot: SeasonPlot;
  rankWord: string;
  highlighted: string[];
  onHighlight: (teams: string[]) => void;
  inProgress: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  // The palette has five colours (never cycled); picks after that are ink.
  const coloured = highlighted.slice(0, CHART_COLOURS.length);
  const seriesColour = useSeriesColours(coloured);
  const colour = (team: string) => (coloured.includes(team) ? seriesColour(team) : "var(--foreground)");
  if (seasons.length === 0) return <p className="text-sm text-muted-foreground">No full seasons in this range.</p>;

  const byRank = plot === "rank";
  const rows = seasons.map((season) => {
    const seasonCells = cells.get(season);
    const values = [...(seasonCells?.values() ?? [])].map((c) => c.value);
    const row: Record<string, number | string | null> = {
      label: formatSeason(season),
      league: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null,
    };
    for (const team of teams) {
      const cell = seasonCells?.get(team);
      row[team] = cell ? (byRank ? cell.rank : cell.value) : null;
    }
    return row;
  });
  const maxRank = Math.max(...seasons.map((season) => cells.get(season)?.size ?? 0));
  const allValues = rows.flatMap((row) =>
    Object.entries(row)
      .filter(([key, v]) => key !== "label" && typeof v === "number")
      .map(([, v]) => v as number),
  );
  const valueAxis = niceAxis(allValues);
  const [low, high] = byRank ? [1, Math.max(maxRank, 2)] : valueAxis.domain;
  // Pixel height of the plot: the chart, less the top margin and the x axis.
  const plotHeight = CHART_HEIGHT - CHART_TOP - X_AXIS_HEIGHT;
  const toPx = (v: number) => (byRank ? (v - low) / (high - low) : (high - v) / (high - low)) * plotHeight;
  const lastIndex = (team: string) => {
    let i = rows.length - 1;
    while (i >= 0 && rows[i][team] == null) i--;
    return i;
  };
  // Grey lines first so the coloured ones draw on top.
  const order = [
    ...teams.filter((t) => !highlighted.includes(t) && t !== hovered),
    ...teams.filter((t) => highlighted.includes(t) && t !== hovered),
    ...(hovered ? [hovered] : []),
  ];
  const toggle = (team: string) =>
    onHighlight(highlighted.includes(team) ? highlighted.filter((t) => t !== team) : [...highlighted, team]);

  // End labels: spread apart vertically when lines finish close together, so
  // every picked team stays readable. Grouped by where each line ends.
  const labelled = [...new Set([...highlighted, ...(hovered ? [hovered] : [])])];
  const labelShift = new Map<string, number>();
  const ends = new Map<number, { team: string; px: number }[]>();
  for (const team of labelled) {
    const i = lastIndex(team);
    if (i < 0) continue;
    const group = ends.get(i) ?? [];
    group.push({ team, px: toPx(rows[i][team] as number) });
    ends.set(i, group);
  }
  for (const group of ends.values()) {
    group.sort((a, b) => a.px - b.px);
    const placed = group.map((g) => g.px);
    for (let i = 1; i < placed.length; i++) placed[i] = Math.max(placed[i], placed[i - 1] + LABEL_GAP);
    const overflow = placed.at(-1)! - (plotHeight + 4);
    if (overflow > 0) {
      for (let i = placed.length - 1; i >= 0; i--) {
        placed[i] = i === placed.length - 1 ? placed[i] - overflow : Math.min(placed[i], placed[i + 1] - LABEL_GAP);
      }
    }
    group.forEach((g, i) => labelShift.set(g.team, placed[i] - g.px));
  }
  const formatY = (v: number) => (byRank ? formatOrdinal(v) : format(v));

  return (
    <>
      <div style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: CHART_TOP, right: 44, left: 0, bottom: 0 }} onMouseLeave={() => setHovered(null)}>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: CHART_AXIS_COLOURS.grid }}
              interval="preserveStartEnd"
              minTickGap={16}
              height={X_AXIS_HEIGHT}
            />
            <YAxis
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
              reversed={byRank}
              domain={[low, high]}
              allowDataOverflow
              ticks={
                byRank
                  ? [1, 8, 16, 24, maxRank].filter((t, i, all) => t <= maxRank && all.indexOf(t) === i)
                  : valueAxis.ticks
              }
              tickFormatter={formatY}
              allowDecimals={!byRank}
            />
            <Tooltip
              cursor={{ stroke: CHART_AXIS_COLOURS.grid }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as Record<string, number | null>;
                const shown = [...new Set([...highlighted, ...(hovered ? [hovered] : [])])].filter((t) => row[t] != null);
                shown.sort((a, b) => (row[a] as number) - (row[b] as number));
                const more = shown.length - TOOLTIP_ROWS;
                if (more > 0) shown.splice(TOOLTIP_ROWS);
                return (
                  <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg shadow-black/5">
                    <p className="mb-1.5 font-semibold">{label}</p>
                    <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs tabular-nums">
                      {shown.map((team) => (
                        <span key={team} className="contents">
                          <span className="flex items-center gap-1.5">
                            <Swatch colour={colour(team)} />
                            {team}
                          </span>
                          <span className="text-right font-medium">{formatY(row[team] as number)}</span>
                        </span>
                      ))}
                      {!byRank && row.league != null && (
                        <>
                          <span className="text-muted-foreground">League avg</span>
                          <span className="text-right text-muted-foreground">{format(row.league)}</span>
                        </>
                      )}
                    </div>
                    {more > 0 && <p className="mt-1 text-xs text-muted-foreground">and {more} more</p>}
                    {shown.length === 0 && <p className="text-xs text-muted-foreground">Hover a line or pick teams below.</p>}
                  </div>
                );
              }}
            />
            {!byRank && (
              <Line
                type="linear"
                dataKey="league"
                stroke={REFERENCE_COLOUR}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
            {order.map((team) => {
              const picked = highlighted.includes(team);
              const isHovered = team === hovered;
              const isColoured = coloured.includes(team);
              const stroke = picked || isHovered ? colour(team) : "var(--muted-foreground)";
              const last = lastIndex(team);
              return (
                <Line
                  key={team}
                  type="linear"
                  dataKey={team}
                  stroke={stroke}
                  strokeOpacity={isColoured || isHovered ? 1 : picked ? 0.8 : 0.22}
                  strokeWidth={isHovered ? 3 : isColoured ? 2.5 : picked ? 1.5 : 1}
                  connectNulls={false}
                  isAnimationActive={false}
                  activeDot={picked || isHovered ? { r: 4, fill: stroke, stroke: "var(--card)", strokeWidth: 2 } : false}
                  onMouseEnter={() => setHovered(team)}
                  onClick={() => toggle(team)}
                  style={{ cursor: "pointer" }}
                  dot={(props: { cx?: number; cy?: number; index?: number }) => {
                    const { cx, cy, index } = props;
                    if (!(picked || isHovered) || index !== last || cx == null || cy == null) {
                      return <g key={`${team}-${index}`} />;
                    }
                    return (
                      <text key={`${team}-${index}`} x={cx + 6} y={cy + 4 + (labelShift.get(team) ?? 0)} fontSize={11} fontWeight={600} fill={stroke}>
                        {team}
                      </text>
                    );
                  }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onHighlight(teams)}>
          All
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => onHighlight([])}
          disabled={highlighted.length === 0}
        >
          Clear
        </Button>
        {teams.map((team) => {
          const picked = highlighted.includes(team);
          return (
            <button
              key={team}
              type="button"
              onClick={() => toggle(team)}
              onMouseEnter={() => setHovered(team)}
              onMouseLeave={() => setHovered(null)}
              aria-pressed={picked}
              title={getTeamName(team)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                picked ? "border-foreground/40 font-semibold" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {picked && <Swatch colour={colour(team)} />}
              <TeamLogo abbrev={team} size="xs" />
              {team}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Teams are listed in the same order as the other layouts (rank 1 = {rankWord}). Click a team or its line to
        pick it; the first five picks get colours, the rest are drawn in ink. Hover to trace any line.{" "}
        {byRank ? "Rank is within each season." : `Per-season ${short}; the dashed line is the league average.`}
        {inProgress ? " The season in progress is left out." : ""}
      </p>
    </>
  );
}
