import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RankedBars, RankedTeamLabel, niceAxis } from "@/components/charts";
import { SegmentedControl } from "@/components/layout";
import { formatSeason } from "@/lib/formatters";
import { getTeamName } from "@/lib/team-names";
import type { PenaltiesByVenueResponse, VenuePenaltyTotals } from "@/types";

export type ArenaMetric = "calls" | "visitors";
export type ArenaRange = "season" | "three" | "all";

interface ArenaTotals {
  team: string;
  games: number;
  /** Called on the visitors: the home team's penalties drawn. */
  onVisitors: number;
  /** Called on the home team: its penalties taken. */
  onHome: number;
  /** Calls an average arena would have seen in the same seasons and games. */
  expected: number;
}

const add = (a: ArenaTotals, b: VenuePenaltyTotals, leagueRate: number): ArenaTotals => ({
  ...a,
  games: a.games + b.gamesPlayed,
  onVisitors: a.onVisitors + b.drawn,
  onHome: a.onHome + b.taken,
  expected: a.expected + b.gamesPlayed * leagueRate,
});

/**
 * Every team's home games pooled over the seasons in range: how much gets
 * called in each building, and on whom.
 */
function arenaTotals(data: PenaltiesByVenueResponse, seasons: readonly number[]): ArenaTotals[] {
  const byTeam = new Map<string, ArenaTotals>();
  for (const s of data.seasons) {
    if (!seasons.includes(s.season)) continue;
    const games = s.teams.reduce((total, t) => total + t.home.gamesPlayed, 0);
    const calls = s.teams.reduce((total, t) => total + t.home.drawn + t.home.taken, 0);
    const leagueRate = games > 0 ? calls / games : 0;
    for (const t of s.teams) {
      const current = byTeam.get(t.team) ?? { team: t.team, games: 0, onVisitors: 0, onHome: 0, expected: 0 };
      byTeam.set(t.team, add(current, t.home, leagueRate));
    }
  }
  return [...byTeam.values()].filter((t) => t.games > 0);
}

const callsPerGame = (t: Pick<ArenaTotals, "games" | "onVisitors" | "onHome">) =>
  t.games > 0 ? (t.onVisitors + t.onHome) / t.games : 0;
const visitorShare = (t: Pick<ArenaTotals, "onVisitors" | "onHome">) =>
  t.onVisitors + t.onHome > 0 ? (t.onVisitors / (t.onVisitors + t.onHome)) * 100 : 50;

interface ArenaPenaltiesCardProps {
  data: PenaltiesByVenueResponse;
  season: number;
  metric: ArenaMetric;
  range: ArenaRange;
  onChange: (updates: { arenaMetric?: ArenaMetric; arenaRange?: ArenaRange }) => void;
}

/** Penalties called in each team's building against the league's average arena. */
export function ArenaPenaltiesCard({ data, season, metric, range, onChange }: ArenaPenaltiesCardProps) {
  const available = data.seasons.map((s) => s.season).filter((s) => s <= season);
  const seasons =
    range === "season" ? [season] : range === "three" ? available.slice(-3) : available;
  const arenas = arenaTotals(data, seasons);
  const span =
    seasons.length === 1
      ? formatSeason(seasons[0])
      : `${formatSeason(seasons[0])} to ${formatSeason(seasons.at(-1)!)}`;

  const league = arenas.reduce(
    (total, a) => ({
      games: total.games + a.games,
      onVisitors: total.onVisitors + a.onVisitors,
      onHome: total.onHome + a.onHome,
    }),
    { games: 0, onVisitors: 0, onHome: 0 },
  );
  const isCalls = metric === "calls";
  const average = isCalls ? callsPerGame(league) : visitorShare(league);
  // Over several seasons, scale each arena by the league's rate in the seasons
  // it hosted games, so teams that only played in the lower-penalty years
  // (VGK, SEA, UTA) aren't flattered. One season: no change.
  const adjusted = seasons.length > 1;
  const callsValue = (a: ArenaTotals) =>
    adjusted && a.expected > 0 ? ((a.onVisitors + a.onHome) / a.expected) * average : callsPerGame(a);

  const rows = arenas
    .map((a) => {
      const value = isCalls ? callsValue(a) : visitorShare(a);
      return {
        key: a.team,
        abbrev: a.team,
        label: <RankedTeamLabel abbrev={a.team} />,
        value,
        display: isCalls ? value.toFixed(2) : `${value.toFixed(1)}%`,
        meta: isCalls
          ? `${visitorShare(a).toFixed(0)}% visitors`
          : `${a.onVisitors}–${a.onHome}`,
        title: `${getTeamName(a.team)} home games, ${span}: ${a.onVisitors + a.onHome} called in ${a.games} games (${a.onVisitors} on visitors, ${a.onHome} on ${a.team})`,
      };
    })
    .sort((a, b) => b.value - a.value);

  const { domain, ticks } = niceAxis([...rows.map((r) => r.value), average], { pad: isCalls ? 0.1 : 0.5 });
  const sign = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(isCalls ? 2 : 1)}`;
  const busiest = rows[0];
  const quietest = rows.at(-1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Calls by arena</CardTitle>
        <CardDescription>
          {isCalls
            ? "Penalties called per game in each team's home games, on both teams."
            : "Share of the calls in each team's home games that went against the visitors."}{" "}
          {span}.
        </CardDescription>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <SegmentedControl
            aria-label="Arena measure"
            value={metric}
            onValueChange={(m) => onChange({ arenaMetric: m })}
            options={[
              { value: "calls", label: "Calls per game" },
              { value: "visitors", label: "On visitors" },
            ]}
          />
          <SegmentedControl
            aria-label="Arena seasons"
            value={range}
            onValueChange={(r) => onChange({ arenaRange: r })}
            options={[
              { value: "season", label: "This season" },
              { value: "three", label: "Last 3 seasons" },
              { value: "all", label: "Since 2008-09" },
            ]}
          />
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No home games in this range yet.</p>
        ) : (
          <>
            <RankedBars
              rows={rows}
              headers={{ label: "Arena", value: isCalls ? "Per game" : "Visitors", meta: isCalls ? "On visitors" : "Visitors–home" }}
              domain={domain}
              ticks={ticks}
              formatTick={(t) => (isCalls ? t.toFixed(1) : `${t}%`)}
              baseline={average}
              renderRow={(row, props) => (
                <Link
                  key={row.key}
                  to="/teams/$abbrev/home-away"
                  params={{ abbrev: row.abbrev }}
                  search={{ metric: "penaltiesDrawnPer60" }}
                  {...props}
                />
              )}
            />
            <p className="mt-3 text-xs text-muted-foreground tabular-nums">
              Bars grow from the league&apos;s average arena ({isCalls ? average.toFixed(2) : `${average.toFixed(1)}%`}):
              right for {isCalls ? "busier buildings" : "arenas that call more on the visitors"}, left (muted) for{" "}
              {isCalls ? "quieter ones" : "arenas that call more on the home team"}.
              {busiest && quietest && (
                <>
                  {" "}
                  {busiest.abbrev} is {sign(busiest.value - average)} against the average, {quietest.abbrev}{" "}
                  {sign(quietest.value - average)}.
                </>
              )}{" "}
              {isCalls && adjusted && (
                <>
                  {" "}
                  Adjusted for the league&apos;s rate in the seasons each arena hosted games, since calls have
                  fallen over time; hover a row for the raw count.
                </>
              )}{" "}
              The arena is the home team&apos;s, so neutral-site games (outdoor games, games abroad) count for
              the home team.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
