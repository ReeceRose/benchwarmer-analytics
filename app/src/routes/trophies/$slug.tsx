import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyState, PageHeader, Panel, Section } from "@/components/layout";
import { ErrorState, TeamTag } from "@/components/shared";
import { TrophyImage } from "@/components/trophies/TrophyImage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle, useTrophy } from "@/hooks";
import { formatSeason } from "@/lib/formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { AwardEntry, TrophyRace, TrophySeason } from "@/types";

export const Route = createFileRoute("/trophies/$slug")({
  component: TrophyPage,
});

const SEASON_ROWS = 25;

function EntryName({ entry }: { entry: AwardEntry }) {
  const name =
    entry.hasPlayerPage && entry.playerId ? (
      <Link to="/players/$id" params={{ id: String(entry.playerId) }} className="hover:text-link">
        {entry.name}
      </Link>
    ) : entry.team && !entry.playerId ? (
      <Link to="/teams/$abbrev" params={{ abbrev: entry.team }} search={{ season: entry.season }} className="hover:text-link">
        {entry.name}
      </Link>
    ) : (
      <span>{entry.name}</span>
    );
  return (
    <span>
      {name}
      {entry.playerId && entry.team && <span className="ml-1.5 text-xs text-muted-foreground">{entry.team}</span>}
    </span>
  );
}

// Who's won it most, from the seasons shown.
function mostWins(seasons: TrophySeason[]): { name: string; count: number; latest: number }[] {
  const tally = new Map<string, { name: string; count: number; latest: number }>();
  for (const s of seasons) {
    for (const w of s.winners) {
      const t = tally.get(w.name) ?? { name: w.name, count: 0, latest: s.season };
      tally.set(w.name, { ...t, count: t.count + 1, latest: Math.max(t.latest, s.season) });
    }
  }
  return [...tally.values()].filter((t) => t.count > 1).sort((a, b) => b.count - a.count || b.latest - a.latest).slice(0, 5);
}

function RacePanel({ race }: { race: TrophyRace }) {
  return (
    <Section title={`${formatSeason(race.season)} race`} description={race.note}>
      <Panel>
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>Player</span>
          <span>{race.stat}</span>
        </div>
        <ol className="space-y-1">
          {race.leaders.map((l, i) => (
            <li key={l.playerId}>
              <Link
                to="/players/$id"
                params={{ id: String(l.playerId) }}
                className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/60"
              >
                <span className="w-4 shrink-0 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={getPlayerHeadshotUrl(l.playerId, l.team ?? undefined)} alt="" />
                  <AvatarFallback className="text-[10px]">{getPlayerInitials(l.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium group-hover:text-link">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{l.team}</div>
                </div>
                <span className="font-semibold tabular-nums">{l.display}</span>
              </Link>
            </li>
          ))}
        </ol>
      </Panel>
    </Section>
  );
}

function TrophyPage() {
  const { slug } = Route.useParams();
  const { data, isLoading, error, refetch } = useTrophy(slug);
  const [showAll, setShowAll] = useState(false);
  usePageTitle(data?.trophy.name ?? "Trophy");
  const leaders = useMemo(() => (data ? mostWins(data.seasons) : []), [data]);

  if (error) {
    return (
      <div className="container py-8">
        <ErrorState title="Trophy not found" message="There's no trophy here, or the request failed." onRetry={() => refetch()} />
      </div>
    );
  }
  if (isLoading || !data) {
    return (
      <div className="container space-y-6 py-8">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const { trophy, seasons, race } = data;
  const rows = showAll ? seasons : seasons.slice(0, SEASON_ROWS);
  const isTeamTrophy = trophy.category === "team";

  return (
    <div className="container space-y-8 py-8">
      <div className="flex items-start gap-5">
        <TrophyImage src={trophy.imageUrl} className="hidden w-24 sm:block" />
        <div className="min-w-0 flex-1">
        <PageHeader
          title={trophy.name}
          description={trophy.description ?? undefined}
          actions={
            <Button variant="outline" asChild>
              <Link to="/trophies">All trophies</Link>
            </Button>
          }
        />
        </div>
      </div>

      {(race || leaders.length > 0) && (
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          {race && <RacePanel race={race} />}
          {leaders.length > 0 && (
            <Section title="Most wins" description="Every season on record.">
              <Panel>
                <ol className="space-y-2">
                  {leaders.map((l, i) => (
                    <li key={l.name} className="flex items-center gap-3 text-sm">
                      <span className="w-4 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                      <span className="flex-1 font-medium">{l.name}</span>
                      <span className="text-xs text-muted-foreground">last in {formatSeason(l.latest)}</span>
                      <span className="w-6 text-right font-semibold tabular-nums">{l.count}</span>
                    </li>
                  ))}
                </ol>
              </Panel>
            </Section>
          )}
        </div>
      )}

      <Section title="Winners" description={isTeamTrophy ? "Every season, with the runner-up." : "Every season, with the runners-up and finalists where the NHL lists them."}>
        {seasons.length === 0 ? (
          <EmptyState title="No winners on record yet" />
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs">
                    <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">Season</th>
                    <th className="px-3 py-2 text-left font-medium">Winner</th>
                    <th className="px-3 py-2 text-left font-medium">{isTeamTrophy ? "Runner-up" : "Runners-up and finalists"}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.season} className="border-b last:border-0">
                      <td className="sticky left-0 z-10 bg-card px-3 py-2 whitespace-nowrap text-muted-foreground">{formatSeason(s.season)}</td>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">
                        {s.winners.length === 0 ? (
                          <span className="font-normal text-muted-foreground">Not awarded</span>
                        ) : isTeamTrophy && s.winners[0].team ? (
                          <TeamTag abbrev={s.winners[0].team} season={s.season} className="text-foreground" />
                        ) : (
                          s.winners.map((w, i) => (
                            <span key={w.name}>
                              {i > 0 && <span className="text-muted-foreground"> and </span>}
                              <EntryName entry={w} />
                            </span>
                          ))
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {s.others.length === 0
                          ? "–"
                          : s.others.map((o, i) => (
                              <span key={o.name}>
                                {i > 0 && ", "}
                                <EntryName entry={o} />
                              </span>
                            ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {seasons.length > SEASON_ROWS && (
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Show recent seasons" : `Show all ${seasons.length} seasons`}
                </Button>
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
