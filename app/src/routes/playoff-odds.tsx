import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as z from "zod/mini";
import { usePageTitle, usePlayoffOdds } from "@/hooks";
import { ErrorState, TableSkeleton } from "@/components/shared";
import { EmptyState, PageHeader, Panel, SegmentedControl, StatTile } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayoffOddsTable } from "@/components/projections/PlayoffOddsTable";
import { formatOdds, NOTABLE_CHANGE } from "@/lib/odds";
import { formatGameDateLong } from "@/lib/game-formatters";
import type { GamePlayoffStakes, PlayoffOddsResponse, TeamPlayoffOdds } from "@/types";

const searchSchema = z.object({
  view: z.optional(z.enum(["division", "wildcard", "league"])),
});

export const Route = createFileRoute("/playoff-odds")({
  component: PlayoffOddsPage,
  validateSearch: searchSchema,
});

const CONFERENCES = ["Eastern", "Western"];

function groups(data: PlayoffOddsResponse, view: "division" | "wildcard" | "league") {
  const byPoints = (a: TeamPlayoffOdds, b: TeamPlayoffOdds) => b.pointsAvg - a.pointsAvg;
  if (view === "league") {
    return [{ title: "League", teams: [...data.teams].sort((a, b) => b.winCup - a.winCup || byPoints(a, b)), cutAfter: undefined }];
  }
  return CONFERENCES.flatMap((conference) => {
    const teams = data.teams.filter((t) => t.conference === conference);
    if (view === "wildcard") {
      return [{ title: `${conference} Conference`, teams: [...teams].sort((a, b) => b.makePlayoffs - a.makePlayoffs || byPoints(a, b)), cutAfter: 8 }];
    }
    const divisions = [...new Set(teams.map((t) => t.division))].sort();
    return divisions.map((division) => ({
      title: division,
      teams: teams.filter((t) => t.division === division).sort(byPoints),
      cutAfter: 3,
    }));
  });
}

function stakes(g: GamePlayoffStakes) {
  return Math.max(g.homeIfWin - g.homeIfLoss, g.awayIfWin - g.awayIfLoss);
}

function BiggestGames({ games }: { games: GamePlayoffStakes[] }) {
  const ranked = [...games].sort((a, b) => stakes(b) - stakes(a)).slice(0, 5);
  return (
    <Panel>
      <h3 className="text-sm font-semibold">Biggest games today</h3>
      <p className="mb-2 text-xs text-muted-foreground">Ranked by how much the result moves either team's playoff odds.</p>
      <ol className="space-y-1">
        {ranked.map((g) => {
          const homeStakes = g.homeIfWin - g.homeIfLoss >= g.awayIfWin - g.awayIfLoss;
          const [team, win, loss] = homeStakes ? [g.homeTeam, g.homeIfWin, g.homeIfLoss] : [g.awayTeam, g.awayIfWin, g.awayIfLoss];
          const favourite = g.homeWinProbability >= 0.5 ? `${g.homeTeam} ${formatOdds(g.homeWinProbability)}` : `${g.awayTeam} ${formatOdds(1 - g.homeWinProbability)}`;
          return (
            <li key={g.gameId}>
              <Link
                to="/games/$gameId"
                params={{ gameId: g.gameId }}
                className="group -mx-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 rounded-xl px-2 py-1.5 hover:bg-muted/60"
              >
                <span className="text-sm font-medium group-hover:text-link">
                  {g.awayTeam} @ {g.homeTeam}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{favourite} to win</span>
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {team} playoffs: {formatOdds(win)} with a win, {formatOdds(loss)} with a loss
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

function Tiles({ data }: { data: PlayoffOddsResponse }) {
  const favourite = data.teams.reduce((best, t) => (t.winCup > best.winCup ? t : best), data.teams[0]);
  const changes = data.teams.filter((t) => t.makePlayoffsChange != null);
  const riser = changes.reduce<TeamPlayoffOdds | null>((best, t) => (!best || t.makePlayoffsChange! > best.makePlayoffsChange! ? t : best), null);
  const faller = changes.reduce<TeamPlayoffOdds | null>((best, t) => (!best || t.makePlayoffsChange! < best.makePlayoffsChange! ? t : best), null);
  const move = (t: TeamPlayoffOdds | null) => (t ? `${t.makePlayoffsChange! > 0 ? "+" : ""}${Math.round(t.makePlayoffsChange! * 100)} pts` : "");
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatTile label="Cup favourite" value={`${favourite.team} ${formatOdds(favourite.winCup)}`} note={`${formatOdds(favourite.makePlayoffs)} to make the playoffs`} />
      <StatTile
        label="Biggest riser"
        value={riser && riser.makePlayoffsChange! > 0 ? riser.team : "–"}
        note={riser && riser.makePlayoffsChange! > 0 ? `${move(riser)} to ${formatOdds(riser.makePlayoffs)} playoffs` : "Day-over-day changes start after a second run"}
      />
      <StatTile
        label="Biggest faller"
        value={faller && faller.makePlayoffsChange! < 0 ? faller.team : "–"}
        note={faller && faller.makePlayoffsChange! < 0 ? `${move(faller)} to ${formatOdds(faller.makePlayoffs)} playoffs` : "Day-over-day changes start after a second run"}
      />
    </div>
  );
}

function PlayoffOddsPage() {
  usePageTitle("Playoff odds");
  const navigate = useNavigate({ from: Route.fullPath });
  const { view = "division" } = Route.useSearch();
  const { data, isLoading, error, refetch } = usePlayoffOdds();

  const range = data?.teams.length
    ? {
        min: Math.floor(Math.min(...data.teams.map((t) => t.pointsP10)) / 10) * 10,
        max: Math.ceil(Math.max(...data.teams.map((t) => t.pointsP90)) / 10) * 10,
      }
    : { min: 0, max: 1 };

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Playoff odds"
        description={
          data?.runDate
            ? `${data.simulations.toLocaleString()} simulations of the rest of the season, as of ${formatGameDateLong(data.runDate)}.`
            : "Simulations of the rest of the season, updated every morning."
        }
      />

      {error ? (
        <ErrorState title="Couldn't load playoff odds" message="The projections request failed." onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
          <TableSkeleton rows={8} columns={10} />
        </div>
      ) : !data.runDate ? (
        <EmptyState title="No projections yet" hint="Playoff odds are calculated every morning during the regular season." />
      ) : (
        <>
          <Tiles data={data} />
          {data.games.length > 0 && <BiggestGames games={data.games} />}
          <SegmentedControl
            aria-label="Grouping"
            value={view}
            onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, view: v === "division" ? undefined : (v as "wildcard" | "league") }) })}
            options={[
              { value: "division", label: "Division" },
              { value: "wildcard", label: "Wild card" },
              { value: "league", label: "League" },
            ]}
          />
          <div className="space-y-4">
            {groups(data, view).map((g) => (
              <PlayoffOddsTable key={g.title} title={g.title} teams={g.teams} season={data.season} range={range} cutAfter={g.cutAfter} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Each simulation plays out every remaining game from today's standings. Team strength comes from 5v5 expected
            goals and goal differential per game, blended with last season early on, and is drawn with some uncertainty in
            each simulation so early-season odds aren't overconfident.
            {view === "wildcard" && " The dashed line marks each conference's eight playoff spots."}
            {view === "division" && " The dashed line marks each division's three automatic spots."} Δ is colour-coded only
            for moves of {Math.round(NOTABLE_CHANGE * 100)} points or more; smaller daily moves are mostly noise.{" "}
            <Link to="/glossary" hash="Playoff Odds" className="text-link">How it works</Link>
          </p>
        </>
      )}
    </div>
  );
}
