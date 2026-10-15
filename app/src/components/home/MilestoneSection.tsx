import { Link } from "@tanstack/react-router";
import { Panel, Section } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useMilestones } from "@/hooks";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { Milestone } from "@/types";

const UNITS: Record<string, [string, string]> = {
  Points: ["point", "points"],
  Goals: ["goal", "goals"],
  Assists: ["assist", "assists"],
  "Games Played": ["game", "games"],
  Wins: ["win", "wins"],
  Shutouts: ["shutout", "shutouts"],
};

function unit(m: Milestone, count: number): string {
  const [one, many] = UNITS[m.milestone] ?? [m.milestone.toLowerCase(), m.milestone.toLowerCase()];
  return count === 1 ? one : many;
}

function pace(m: Milestone): string {
  if (m.milestone === "Games Played") return m.remaining === 1 ? "Next game" : `${m.remaining} games away`;
  if (m.gamesAway == null) return "";
  return m.gamesAway <= 1 ? "Could come next game" : `About ${m.gamesAway} games away`;
}

function MilestoneRow({ m }: { m: Milestone }) {
  return (
    <li>
      <Link
        to="/players/$id"
        params={{ id: String(m.playerId) }}
        className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/60"
      >
        <Avatar className="size-8 shrink-0">
          <AvatarImage src={m.team ? getPlayerHeadshotUrl(m.playerId, m.team) : undefined} alt="" />
          <AvatarFallback className="text-[10px]">{getPlayerInitials(m.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium group-hover:text-link">{m.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {m.team ? `${m.team} · ` : ""}
            {m.current.toLocaleString()} {unit(m, m.current)}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold tabular-nums">
            {m.remaining} to {m.target.toLocaleString()} {unit(m, m.target)}
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">{pace(m)}</div>
        </div>
      </Link>
    </li>
  );
}

function MilestoneSkeleton() {
  return (
    <div className="grid gap-x-8 gap-y-1 lg:grid-cols-2">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="ml-auto h-4 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Active players closest to a big career number (500 points, 200 goals, 700
 * games, 150 wins…), nearest first at their career pace. Hidden when the
 * NHL's list is empty or unavailable.
 */
export function MilestoneSection() {
  const { data, isLoading, error } = useMilestones();
  if (error || (data && data.milestones.length === 0)) return null;
  const half = Math.ceil((data?.milestones.length ?? 0) / 2);

  return (
    <Section
      title="Milestone watch"
      description="Active players closest to a big career number, in regular-season games, at their career pace."
    >
      <Panel>
        {isLoading || !data ? (
          <MilestoneSkeleton />
        ) : (
          <div className="grid gap-x-8 gap-y-1 lg:grid-cols-2">
            <ol className="space-y-1">
              {data.milestones.slice(0, half).map((m) => (
                <MilestoneRow key={`${m.playerId}-${m.milestone}`} m={m} />
              ))}
            </ol>
            <ol className="space-y-1">
              {data.milestones.slice(half).map((m) => (
                <MilestoneRow key={`${m.playerId}-${m.milestone}`} m={m} />
              ))}
            </ol>
          </div>
        )}
      </Panel>
    </Section>
  );
}
