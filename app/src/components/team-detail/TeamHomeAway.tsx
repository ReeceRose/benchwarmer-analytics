import { Section } from "@/components/layout";
import { Card, MirroredBar, TeamLabel } from "@/components/game-live/parts";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamHomeAway } from "@/hooks";
import { formatSeason } from "@/lib/formatters";
import type { HomeAwaySide } from "@/types";
import { formatPointsPct, HOME_AWAY_GROUPS, showValue as show } from "@/components/team-detail/home-away-metrics";

function Record({ side, data }: { side: "away" | "home"; data: HomeAwaySide }) {
  return (
    <div className={side === "home" ? "text-right" : undefined}>
      <TeamLabel side={side}>
        <span className="text-xs text-muted-foreground">{side === "home" ? "Home" : "Away"}</span>
      </TeamLabel>
      <p className="font-display text-2xl font-bold tabular-nums sm:text-3xl">
        {data.wins}–{data.losses}–{data.otLosses}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {data.gamesPlayed} GP · {show(data.pointsPct, formatPointsPct)} points %
      </p>
    </div>
  );
}

/**
 * A team's results and rates in home games against road games, with every
 * team's home and road figures under each stat for context.
 */
export function TeamHomeAway({ abbrev, season, playoffs }: { abbrev: string; season?: number; playoffs?: boolean }) {
  const { data, isLoading, error } = useTeamHomeAway(abbrev, season, playoffs);
  if (error) return null;

  const empty = data != null && data.home.gamesPlayed + data.away.gamesPlayed === 0;

  return (
    <Section
      title={data ? `${formatSeason(data.season)} ${data.playoffs ? "playoffs" : "regular season"}` : "Season"}
      description="Road games on the left, home games on the right. Under each stat, the league's road and home figures."
    >
      {isLoading || !data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : empty ? (
        <p className="text-sm text-muted-foreground">No games yet this season.</p>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex items-end justify-between gap-4">
              <Record side="away" data={data.away} />
              <Record side="home" data={data.home} />
            </div>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            {HOME_AWAY_GROUPS.map((group) => (
              <Card key={group.title} title={group.title}>
                {group.metrics.map((m) => {
                  const away = data.away[m.key];
                  const home = data.home[m.key];
                  return (
                    <MirroredBar
                      key={m.key}
                      label={
                        <>
                          {m.label}
                          <span className="block text-[11px] text-muted-foreground/80">
                            League {show(data.league.away[m.key], m.format)} · {show(data.league.home[m.key], m.format)}
                          </span>
                        </>
                      }
                      away={away ?? 0}
                      home={home ?? 0}
                      awayText={show(away, m.format)}
                      homeText={show(home, m.format)}
                      lowerIsBetter={m.lowerIsBetter}
                    />
                  );
                })}
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <TeamLabel side="away">Away</TeamLabel>
            <span>Bold = better side</span>
            <TeamLabel side="home">Home</TeamLabel>
          </div>
        </div>
      )}
    </Section>
  );
}
