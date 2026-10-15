import { StreaksSection } from "@/components/game-scores/Streaks";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as z from "zod/mini";
import { seasonsQueryOptions } from "@/hooks/useSeasons";
import { usePageTitle, useSeasons, useSingleGameRecords } from "@/hooks";
import { ErrorState, SeasonSelector } from "@/components/shared";
import { EmptyState, PageHeader, Panel, SegmentedControl } from "@/components/layout";
import { GameScoreList, GameScoreListSkeleton } from "@/components/game-scores/GameScoreList";

const searchSchema = z.object({
  season: z.optional(z.number()),
  position: z.optional(z.enum(["F", "D"])),
  playoffs: z.optional(z.boolean()),
});

export const Route = createFileRoute("/single-games")({
  component: SingleGamesPage,
  loader: ({ context }) => context.queryClient.prefetchQuery(seasonsQueryOptions),
  validateSearch: searchSchema,
});

function SingleGamesPage() {
  usePageTitle("Single-game records");
  const navigate = useNavigate({ from: Route.fullPath });
  const { season, position, playoffs } = Route.useSearch();
  const { data: seasons } = useSeasons();
  const effectiveSeason = season ?? seasons?.seasons?.[0]?.year;
  const { data, isLoading, error, refetch } = useSingleGameRecords(effectiveSeason, position, playoffs);

  const update = (next: Partial<{ season: number; position: "F" | "D" | undefined; playoffs: boolean | undefined }>) =>
    navigate({ search: (prev) => ({ ...prev, ...next }) });

  const missing = data ? data.gamesFinal - data.gamesWithScores : 0;

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Single-game records"
        description="The season's best and worst individual games by Game Score."
        actions={
          <SeasonSelector value={effectiveSeason} onValueChange={(s) => update({ season: s })} />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          aria-label="Position"
          value={position ?? "all"}
          onValueChange={(v) => update({ position: v === "all" ? undefined : (v as "F" | "D") })}
          options={[
            { value: "all", label: "All skaters" },
            { value: "F", label: "Forwards" },
            { value: "D", label: "Defence" },
          ]}
        />
        <SegmentedControl
          aria-label="Game type"
          value={playoffs ? "playoffs" : "regular"}
          onValueChange={(v) => update({ playoffs: v === "playoffs" ? true : undefined })}
          options={[
            { value: "regular", label: "Regular season" },
            { value: "playoffs", label: "Playoffs" },
          ]}
        />
      </div>

      {error ? (
        <ErrorState title="Couldn't load single-game records" message="The request failed." onRetry={() => refetch()} />
      ) : data && data.best.length === 0 ? (
        <EmptyState
          title="No games with Game Scores yet"
          hint={playoffs ? "Try the regular season." : "Game Scores are added the morning after each game."}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel>
              <h3 className="mb-2 text-sm font-semibold">Best games</h3>
              {isLoading || !data ? <GameScoreListSkeleton rows={10} /> : <GameScoreList entries={data.best} showDate />}
            </Panel>
            <Panel>
              <h3 className="mb-2 text-sm font-semibold">Worst games</h3>
              {isLoading || !data ? <GameScoreListSkeleton rows={10} /> : <GameScoreList entries={data.worst} showDate />}
            </Panel>
          </div>
          {data && (
            <p className="text-xs text-muted-foreground">
              Covers {data.gamesWithScores} of {data.gamesFinal} games.
              {missing > 0 && ` The NHL hasn't published shift data for the other ${missing}, which Game Score's 5v5 on-ice part needs.`}{" "}
              <Link to="/glossary" hash="GS/GP" className="text-link">How Game Score works</Link>
            </p>
          )}
          {!playoffs && <StreaksSection />}
        </>
      )}
    </div>
  );
}
