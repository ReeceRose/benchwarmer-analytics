import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatToi, formatSavePct, formatPercent } from "@/lib/formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type {
  Leaderboards,
  GoalieLeaderboards,
  LeaderEntry,
  LeaderboardCategory,
} from "@/types";

interface Category {
  key: LeaderboardCategory;
  title: string;
  entries: LeaderEntry[];
  format: (value: number) => string;
}

const signed = (v: number) => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1));

function categories(
  leaders: Leaderboards,
  goalieLeaders?: GoalieLeaderboards,
): Category[] {
  const skaters: Category[] = [
    { key: "points", title: "Points", entries: leaders.points, format: String },
    { key: "goals", title: "Goals", entries: leaders.goals, format: String },
    {
      key: "expectedGoals",
      title: "Expected goals",
      entries: leaders.expectedGoals,
      format: (v) => v.toFixed(1),
    },
    {
      key: "corsiPct",
      title: "Corsi %",
      entries: leaders.corsiPct,
      format: (v) => formatPercent(v, true).replace("%", ""),
    },
    {
      key: "iceTime",
      title: "Total ice time",
      entries: leaders.iceTime,
      format: formatToi,
    },
  ];
  const goalies: Category[] = goalieLeaders
    ? [
        {
          key: "savePct",
          title: "Save %",
          entries: goalieLeaders.savePct,
          format: formatSavePct,
        },
        {
          key: "gsax",
          title: "Goals saved above expected",
          entries: goalieLeaders.goalsSavedAboveExpected,
          format: signed,
        },
        {
          key: "gaa",
          title: "Goals against average",
          entries: goalieLeaders.goalsAgainstAvg,
          format: (v) => v.toFixed(2),
        },
      ]
    : [];
  return [...skaters, ...goalies];
}

interface LeaderGridProps {
  leaders: Leaderboards;
  goalieLeaders?: GoalieLeaderboards;
  season?: number;
  situation?: string;
}

export function LeaderGrid({
  leaders,
  goalieLeaders,
  season,
  situation,
}: LeaderGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {categories(leaders, goalieLeaders).map((cat) => (
        <LeaderCard
          key={cat.key}
          category={cat}
          season={season}
          situation={situation}
        />
      ))}
    </div>
  );
}

function LeaderCard({
  category,
  season,
  situation,
}: {
  category: Category;
  season?: number;
  situation?: string;
}) {
  const [first, ...rest] = category.entries.slice(0, 3);

  return (
    <div className="rounded-2xl border bg-card p-4">
      <Link
        to="/leaderboards"
        search={{ category: category.key, season, situation }}
        className="group flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-link"
      >
        {category.title}
        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
      {!first ? (
        <p className="py-6 text-sm text-muted-foreground">
          No qualified players yet.
        </p>
      ) : (
        <>
          <Link
            to="/players/$id"
            params={{ id: String(first.playerId) }}
            className="group my-3 flex items-center gap-3"
          >
            <PlayerAvatar entry={first} className="size-12" />
            <div className="min-w-0">
              <div className="truncate font-semibold group-hover:text-link">
                {first.name}
              </div>
              <div className="text-xs text-muted-foreground">{first.team}</div>
            </div>
            <div className="ml-auto font-display text-3xl font-bold tabular-nums">
              {category.format(first.value)}
            </div>
          </Link>
          {rest.map((entry, i) => (
            <Link
              key={entry.playerId}
              to="/players/$id"
              params={{ id: String(entry.playerId) }}
              className="group flex items-center gap-2 border-t py-1.5 text-sm"
            >
              <span className="w-3 text-xs text-muted-foreground">{i + 2}</span>
              <PlayerAvatar entry={entry} className="size-6" />
              <span className="truncate group-hover:text-link">{entry.name}</span>
              <span className="text-xs text-muted-foreground">{entry.team}</span>
              <span className="ml-auto font-medium tabular-nums">
                {category.format(entry.value)}
              </span>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}

function PlayerAvatar({
  entry,
  className,
}: {
  entry: LeaderEntry;
  className: string;
}) {
  return (
    <Avatar className={`${className} bg-accent`}>
      <AvatarImage
        src={getPlayerHeadshotUrl(entry.playerId, entry.team)}
        alt=""
        className="object-cover"
      />
      <AvatarFallback className="text-[10px]">
        {getPlayerInitials(entry.name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function LeaderGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card p-4">
          <Skeleton className="h-3 w-20" />
          <div className="my-3 flex items-center gap-3">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-8 w-12" />
          </div>
          <Skeleton className="my-2 h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
