import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as z from "zod/mini";
import { EmptyState, PageHeader } from "@/components/layout";
import { ErrorState } from "@/components/shared";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle, usePlayoffBracket } from "@/hooks";
import { formatSeason } from "@/lib/formatters";
import { getTeamName } from "@/lib/team-names";
import { cn } from "@/lib/utils";
import type { BracketSeries, BracketTeamSide } from "@/types";

const searchSchema = z.object({ season: z.optional(z.number()) });

export const Route = createFileRoute("/playoffs")({
  component: PlayoffsPage,
  validateSearch: searchSchema,
});

const ROUND_NAMES: Record<number, string> = { 1: "First round", 2: "Second round", 3: "Conference final", 4: "Stanley Cup Final" };

function TeamLine({ side, season, decided }: { side: BracketTeamSide; season: number; decided: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 px-2.5 py-1.5", decided && !side.won && "text-muted-foreground")}>
      {side.team ? <TeamLogo abbrev={side.team} size="sm" /> : <span className="size-5" />}
      {side.team ? (
        <Link
          to="/teams/$abbrev"
          params={{ abbrev: side.team }}
          search={{ season }}
          title={side.name ?? getTeamName(side.team)}
          className={cn("min-w-0 flex-1 truncate hover:text-link", side.won && "font-semibold")}
        >
          {side.team}
        </Link>
      ) : (
        <span className="flex-1 text-muted-foreground">TBD</span>
      )}
      {side.seed && <span className="text-[11px] text-muted-foreground">{side.seed}</span>}
      <span className={cn("w-4 text-right tabular-nums", side.won && "font-semibold")}>{side.wins}</span>
    </div>
  );
}

function SeriesCard({ series, season }: { series: BracketSeries; season: number }) {
  const decided = series.top.won || series.bottom.won;
  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card text-sm">
      <TeamLine side={series.top} season={season} decided={decided} />
      <TeamLine side={series.bottom} season={season} decided={decided} />
    </div>
  );
}

function Column({ title, series, season }: { title: string; series: BracketSeries[]; season: number }) {
  return (
    <div className="flex min-w-0 flex-col">
      <h2 className="mb-2 text-center text-xs font-medium text-muted-foreground">{title}</h2>
      <div className="flex flex-1 flex-col justify-around gap-3">
        {series.map((s) => (
          <SeriesCard key={s.letter} series={s} season={season} />
        ))}
      </div>
    </div>
  );
}

function BracketSkeleton() {
  return (
    <div className="grid min-w-256 grid-cols-7 gap-3">
      {[4, 2, 1, 1, 1, 2, 4].map((n, i) => (
        <div key={i} className="flex flex-col justify-around gap-3">
          {Array.from({ length: n }, (_, j) => (
            <Skeleton key={j} className="h-16 rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

function PlayoffsPage() {
  usePageTitle("Playoff bracket");
  const { season } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data, isLoading, error, refetch } = usePlayoffBracket(season);

  const round = (r: number, half: BracketSeries["half"]) => (data?.series ?? []).filter((s) => s.round === r && s.half === half);
  const shown = data?.season ?? season;

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Playoff bracket"
        description={
          data?.champion
            ? `${formatSeason(data.season)}: the ${getTeamName(data.champion)} won the Stanley Cup.`
            : "Every series of a season's playoffs, round by round."
        }
        actions={
          <>
            <Select value={shown?.toString()} onValueChange={(v) => navigate({ search: { season: Number(v) } })}>
              <SelectTrigger className="w-32" aria-label="Season">
                <SelectValue placeholder="Season" />
              </SelectTrigger>
              <SelectContent>
                {(data?.seasons ?? []).map((s) => (
                  <SelectItem key={s} value={s.toString()}>
                    {formatSeason(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" asChild>
              <Link to="/playoff-odds">Playoff odds</Link>
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState title="Couldn't load the bracket" message="The NHL didn't answer, or there's no bracket for that season." onRetry={() => refetch()} />
      ) : (
        <div className="overflow-x-auto pb-2">
          {isLoading || !data ? (
            <BracketSkeleton />
          ) : data.series.length === 0 ? (
            <EmptyState title="No bracket for this season" hint="Pick another season." />
          ) : (
            <div className="grid min-w-256 grid-cols-7 gap-3">
              <Column title={ROUND_NAMES[1]} series={round(1, "left")} season={data.season} />
              <Column title={ROUND_NAMES[2]} series={round(2, "left")} season={data.season} />
              <Column title={ROUND_NAMES[3]} series={round(3, "left")} season={data.season} />
              <Column title={ROUND_NAMES[4]} series={round(4, null)} season={data.season} />
              <Column title={ROUND_NAMES[3]} series={round(3, "right")} season={data.season} />
              <Column title={ROUND_NAMES[2]} series={round(2, "right")} season={data.season} />
              <Column title={ROUND_NAMES[1]} series={round(1, "right")} season={data.season} />
            </div>
          )}
        </div>
      )}
      {data && data.series.length > 0 && (
        <p className="text-xs text-muted-foreground">
          The Eastern Conference is on the left in most seasons (in 2020–21 the halves were divisions). Seeds are the NHL's (D1 = division winner, WC = wild card). Bold marks each series winner.{data.season === 2019 ? " The 2020 qualifying round isn't shown." : ""}
        </p>
      )}
    </div>
  );
}
