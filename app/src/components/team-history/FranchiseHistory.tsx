import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
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
import { EmptyState, Panel, Section, StatTile } from "@/components/layout";
import { ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipTitle } from "@/components/game-live/ChartTooltip";
import { DraftPickRows } from "@/components/draft/DraftPickRows";
import { FranchisePeopleSection } from "@/components/team-history/FranchisePeopleSection";
import { useFranchiseHistory } from "@/hooks";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { formatSeason } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { shortTrophyName } from "@/lib/trophies";
import type { FranchiseAward, FranchiseSeason } from "@/types";

const SERIES_COLOUR = "var(--chart-1)";
const TABLE_ROWS = 20;

const pointsPct = (v: number | null) => (v == null ? "–" : v.toFixed(3).replace(/^0/, ""));

function record(s: FranchiseSeason): string {
  const parts = [s.wins, s.losses];
  if (s.ties) parts.push(s.ties);
  if (s.overtimeLosses != null) parts.push(s.overtimeLosses);
  return parts.join("–");
}

function SeasonTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: FranchiseSeason }> }) {
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return null;
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg shadow-black/5">
      <TooltipTitle colour={SERIES_COLOUR}>
        {formatSeason(s.season)} {s.teamName}
      </TooltipTitle>
      <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Record</dt>
        <dd className="text-right tabular-nums">{record(s)}</dd>
        <dt className="text-muted-foreground">Points %</dt>
        <dd className="text-right font-semibold tabular-nums">{pointsPct(s.pointsPct)}</dd>
        <dt className="text-muted-foreground">Playoffs</dt>
        <dd className="text-right">{s.wonCup ? "Won the Stanley Cup" : (s.playoffResult ?? "Missed")}</dd>
      </dl>
    </div>
  );
}

// Fitted to the data in steps of .100, always including .500.
function pctDomain(seasons: FranchiseSeason[]): [number, number] {
  const values = seasons.map((s) => s.pointsPct).filter((v): v is number => v != null);
  const lo = Math.min(0.5, ...values);
  const hi = Math.max(0.5, ...values);
  return [Math.max(0, Math.floor(lo * 10) / 10), Math.min(1, Math.ceil(hi * 10) / 10)];
}

function PointsPctChart({ seasons }: { seasons: FranchiseSeason[] }) {
  const [lo, hi] = pctDomain(seasons);
  const ticks = Array.from({ length: Math.round((hi - lo) * 10) + 1 }, (_, i) => Math.round((lo + i / 10) * 10) / 10);
  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={seasons} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_AXIS_COLOURS.grid} vertical={false} />
          <XAxis
            dataKey="season"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => String(v)}
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
            stroke={CHART_AXIS_COLOURS.grid}
            tickLine={false}
          />
          <YAxis
            domain={[lo, hi]}
            ticks={ticks}
            tickFormatter={pointsPct}
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ReferenceLine y={0.5} stroke={CHART_AXIS_COLOURS.reference} strokeDasharray="4 3" />
          <Tooltip content={<SeasonTooltip />} cursor={{ stroke: CHART_AXIS_COLOURS.grid }} />
          <Line
            type="linear"
            dataKey="pointsPct"
            stroke={SERIES_COLOUR}
            strokeWidth={2}
            // Stanley Cup seasons get an ink dot ringed in the surface colour.
            dot={(props: { cx?: number; cy?: number; payload?: FranchiseSeason; index?: number }) =>
              props.payload?.wonCup && props.cx != null && props.cy != null ? (
                <circle key={props.index} cx={props.cx} cy={props.cy} r={4.5} fill="var(--foreground)" stroke="var(--card)" strokeWidth={2} />
              ) : (
                <g key={props.index} />
              )
            }
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-muted-foreground">
        Points % is points over points available (two a game). Black dots mark Stanley Cup seasons; the dashed line is .500.
      </p>
    </div>
  );
}

/** Every season, newest first; the team code shows only where it differs from today's (earlier names and cities). */
function SeasonTable({ seasons, team }: { seasons: FranchiseSeason[]; team: string }) {
  const [showAll, setShowAll] = useState(false);
  const newestFirst = useMemo(() => [...seasons].reverse(), [seasons]);
  const rows = showAll ? newestFirst : newestFirst.slice(0, TABLE_ROWS);
  const anyTies = seasons.some((s) => s.ties);
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs">
              <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">Season</th>
              <th className="px-3 py-2 text-right font-medium">GP</th>
              <th className="px-3 py-2 text-right font-medium" title={anyTies ? "Wins–losses–ties–overtime losses" : "Wins–losses–overtime losses"}>
                Record
              </th>
              <th className="px-3 py-2 text-right font-medium">Pts</th>
              <th className="px-3 py-2 text-right font-medium">Pts%</th>
              <th className="px-3 py-2 text-right font-medium">GF</th>
              <th className="px-3 py-2 text-right font-medium">GA</th>
              <th className="px-3 py-2 text-right font-medium">Division</th>
              <th className="px-3 py-2 text-left font-medium">Playoffs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.season} className="border-b last:border-0">
                <td className="sticky left-0 z-10 bg-card px-3 py-2 whitespace-nowrap">
                  {formatSeason(s.season)}
                  {s.team !== team && <span className="ml-2 text-xs text-muted-foreground" title={s.teamName}>{s.team}</span>}
                </td>
                <td className="px-3 py-2 text-right">{s.gamesPlayed}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{record(s)}</td>
                <td className="px-3 py-2 text-right">{s.points}</td>
                <td className="px-3 py-2 text-right">{pointsPct(s.pointsPct)}</td>
                <td className="px-3 py-2 text-right">{s.goalsFor}</td>
                <td className="px-3 py-2 text-right">{s.goalsAgainst}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap text-muted-foreground">
                  {s.divisionRank ? `${s.divisionRank} · ${s.divisionName ?? ""}` : "–"}
                </td>
                <td className={cn("px-3 py-2 whitespace-nowrap", s.wonCup ? "font-semibold" : !s.madePlayoffs && "text-muted-foreground")}>
                  {s.wonCup ? "Won the Stanley Cup" : (s.playoffResult ?? "–")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {newestFirst.length > TABLE_ROWS && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show recent seasons" : `Show all ${newestFirst.length} seasons`}
          </Button>
        </div>
      )}
    </div>
  );
}

const AWARD_ROWS = 15;

/** Trophy counts, then every individual and coaching award, newest first. */
function FranchiseAwards({ awards }: { awards: FranchiseAward[] }) {
  const [showAll, setShowAll] = useState(false);
  const counts = useMemo(() => {
    const byTrophy = new Map<string, { slug: string; trophy: string; count: number }>();
    for (const a of awards) {
      const t = byTrophy.get(a.slug) ?? { slug: a.slug, trophy: a.trophy, count: 0 };
      byTrophy.set(a.slug, { ...t, count: t.count + 1 });
    }
    return [...byTrophy.values()].sort((a, b) => b.count - a.count || a.trophy.localeCompare(b.trophy));
  }, [awards]);
  const rows = showAll ? awards : awards.slice(0, AWARD_ROWS);

  return (
    <Section
      title="Award winners"
      description="Players and coaches who won an NHL award with the franchise."
      action={
        <Link to="/trophies" className="text-link">
          All trophies
        </Link>
      }
    >
      <Panel className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {counts.map((c) => (
            <Link
              key={c.slug}
              to="/trophies/$slug"
              params={{ slug: c.slug }}
              className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {shortTrophyName(c.slug, c.trophy)} <span className="font-semibold text-foreground tabular-nums">{c.count}</span>
            </Link>
          ))}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs">
              <th className="pb-2 text-left font-medium">Season</th>
              <th className="pb-2 text-left font-medium">Trophy</th>
              <th className="pb-2 text-left font-medium">Winner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={`${a.season}-${a.slug}-${i}`} className="border-t">
                <td className="py-1.5 pr-3 whitespace-nowrap text-muted-foreground">{formatSeason(a.season)}</td>
                <td className="py-1.5 pr-3">
                  <Link to="/trophies/$slug" params={{ slug: a.slug }} className="hover:text-link">
                    {shortTrophyName(a.slug, a.trophy)}
                  </Link>
                </td>
                <td className="py-1.5 font-medium">
                  {a.hasPlayerPage && a.playerId ? (
                    <Link to="/players/$id" params={{ id: String(a.playerId) }} className="hover:text-link">
                      {a.name}
                    </Link>
                  ) : (
                    a.name
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {awards.length > AWARD_ROWS && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show recent winners" : `Show all ${awards.length} winners`}
            </Button>
          </div>
        )}
      </Panel>
    </Section>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

/** A franchise's whole NHL history: every season, playoff runs and recent first-round picks. */
export function FranchiseHistory({ abbrev }: { abbrev: string }) {
  const { data, isLoading, error, refetch } = useFranchiseHistory(abbrev);

  if (error) {
    return <ErrorState title="Couldn't load franchise history" message="The history request failed." onRetry={() => refetch()} />;
  }
  if (isLoading || !data) return <HistorySkeleton />;
  if (data.seasons.length === 0) {
    return <EmptyState title="No franchise history yet" hint="NHL records load weekly; check back after the next update." />;
  }

  const lastCup = [...data.seasons].reverse().find((s) => s.wonCup);
  const completed = data.seasons.length;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="In the NHL since" value={formatSeason(data.firstSeason)} note={data.franchiseName} />
        <StatTile label="Seasons" value={completed} />
        <StatTile
          label="Playoff appearances"
          value={data.playoffAppearances}
          note={`${Math.round((100 * data.playoffAppearances) / completed)}% of seasons`}
        />
        <StatTile label="Stanley Cups" value={data.cups} note={lastCup ? `Last in ${formatSeason(lastCup.season)}` : "Still waiting"} />
      </div>

      <Section title="Points % by season" description="Every regular season in franchise history, including its earlier names and cities.">
        <Panel>
          <PointsPctChart seasons={data.seasons} />
        </Panel>
      </Section>

      <Section title="Season by season" description="Newest first. Record is wins, losses, then ties and overtime losses where the rules had them.">
        <SeasonTable seasons={data.seasons} team={data.team} />
      </Section>

      <FranchisePeopleSection people={data.people} />

      {data.awards.length > 0 && <FranchiseAwards awards={data.awards} />}

      {data.firstRoundPicks.length > 0 && (
        <Section
          title="First-round picks"
          description="The last 15 drafts, with each pick's NHL career so far."
          action={
            <Link to="/draft" search={{ team: data.team }} className="text-link">
              Full draft history
            </Link>
          }
        >
          <Panel>
            <DraftPickRows picks={data.firstRoundPicks} showYear />
          </Panel>
        </Section>
      )}
    </div>
  );
}
