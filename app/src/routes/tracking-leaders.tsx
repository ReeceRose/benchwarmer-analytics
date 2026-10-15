import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as z from "zod/mini";
import { PageHeader, Panel, SegmentedControl } from "@/components/layout";
import { ErrorState } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle, useTrackingLeaders } from "@/hooks";
import { getCurrentSeason } from "@/lib/date-utils";
import { formatPercent, formatSeason } from "@/lib/formatters";
import { formatGameDate } from "@/lib/game-formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { TrackingLeader, TrackingLeaderBoard, TrackingLeaderPosition } from "@/types";

const searchSchema = z.object({
  season: z.optional(z.number()),
  position: z.optional(z.enum(["all", "F", "D"])),
});

export const Route = createFileRoute("/tracking-leaders")({
  component: TrackingLeadersPage,
  validateSearch: searchSchema,
});

// NHL EDGE starts in 2021-22.
const FIRST_SEASON = 2021;

function formatValue(board: TrackingLeaderBoard, value: number): string {
  if (board.unit === "%") return formatPercent(value);
  if (board.unit === "") return value.toLocaleString();
  return `${value.toFixed(board.unit === "mi" ? 1 : 2)} ${board.unit}`;
}

function LeaderRow({ board, leader, rank }: { board: TrackingLeaderBoard; leader: TrackingLeader; rank: number }) {
  const meta = [leader.team, leader.position, leader.moment ? formatGameDate(leader.moment.gameDate) : leader.detail]
    .filter(Boolean)
    .join(" · ");
  const body = (
    <>
      <span className="w-4 shrink-0 text-xs text-muted-foreground tabular-nums">{rank}</span>
      <Avatar className="size-8 shrink-0">
        <AvatarImage
          src={leader.headshot ?? (leader.playerId ? getPlayerHeadshotUrl(leader.playerId, leader.team ?? undefined) : undefined)}
          alt=""
        />
        <AvatarFallback className="text-[10px]">{getPlayerInitials(leader.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium group-hover:text-link">{leader.name}</div>
        <div className="truncate text-xs text-muted-foreground">{meta}</div>
      </div>
      <div className="shrink-0 text-right font-semibold tabular-nums">{formatValue(board, leader.value)}</div>
    </>
  );
  const className = "group -mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/60";
  return (
    <li>
      {leader.playerId ? (
        <Link to="/players/$id" params={{ id: String(leader.playerId) }} className={className}>
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
    </li>
  );
}

function BoardSkeleton() {
  return (
    <Panel>
      <Skeleton className="mb-3 h-5 w-40" />
      <div className="space-y-1">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <Skeleton className="h-3 w-4" />
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TrackingLeadersPage() {
  usePageTitle("Tracking leaders");
  const { season, position = "all" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data, isLoading, error, refetch } = useTrackingLeaders(season, position);
  const latest = getCurrentSeason();
  const seasons = Array.from({ length: latest - FIRST_SEASON + 1 }, (_, i) => latest - i);
  const shownSeason = data?.season ?? season;

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Tracking leaders"
        description="The league's fastest skaters, hardest shots and most miles, from NHL EDGE player and puck tracking."
        actions={
          <>
            <Select
              value={shownSeason?.toString()}
              onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, season: Number(v) }) })}
            >
              <SelectTrigger className="w-32" aria-label="Season">
                <SelectValue placeholder="Season" />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((s) => (
                  <SelectItem key={s} value={s.toString()}>
                    {formatSeason(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SegmentedControl
              aria-label="Position"
              value={position}
              onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, position: v === "all" ? undefined : (v as TrackingLeaderPosition) }) })}
              options={[
                { value: "all", label: "All skaters" },
                { value: "F", label: "Forwards" },
                { value: "D", label: "Defence" },
              ]}
            />
            <Button variant="outline" asChild>
              <Link to="/leaderboards">Leaderboards</Link>
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState title="Couldn't load tracking leaders" message="NHL EDGE didn't answer. Try again in a minute." onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {isLoading || !data
            ? Array.from({ length: 6 }, (_, i) => <BoardSkeleton key={i} />)
            : data.boards.map((board) => (
                <Panel key={board.key}>
                  <h2 className="mb-2 text-sm font-semibold">{board.title}</h2>
                  <ol className="space-y-1">
                    {board.leaders.map((leader, i) => (
                      <LeaderRow key={`${leader.playerId ?? leader.name}-${i}`} board={board} leader={leader} rank={i + 1} />
                    ))}
                  </ol>
                </Panel>
              ))}
        </div>
      )}
      {data && (
        <p className="text-xs text-muted-foreground">
          {formatSeason(data.season)} regular season. Speeds and distances are tracked by the NHL; offensive-zone time is the share of a skater's ice time with the puck in the offensive zone.
        </p>
      )}
    </div>
  );
}
