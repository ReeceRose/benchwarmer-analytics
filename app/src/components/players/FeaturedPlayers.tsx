import { Link } from "@tanstack/react-router";
import { useSeasons, useOutliers } from "@/hooks";
import { Panel } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPositionShort } from "@/lib/formatters";
import { getPlayerInitials } from "@/lib/player-headshots";
import { cn } from "@/lib/utils";
import type { OutlierEntry, GoalieOutlierEntry } from "@/types";

const SKATER_COUNT = 6;
const GOALIE_COUNT = 3;

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

/** One player in a featured list: headshot, name, meta, value on the right. */
function PlayerRow({
  playerId,
  name,
  headshotUrl,
  meta,
  value,
  valueClass,
  detail,
}: {
  playerId: number;
  name: string;
  headshotUrl?: string;
  meta: string;
  value: string;
  valueClass?: string;
  detail: string;
}) {
  return (
    <Link
      to="/players/$id"
      params={{ id: String(playerId) }}
      className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/60"
    >
      <Avatar className="size-8 shrink-0">
        {headshotUrl && <AvatarImage src={headshotUrl} alt="" />}
        <AvatarFallback className="text-xs">{getPlayerInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium group-hover:text-link">{name}</span>
        <span className="block text-xs text-muted-foreground">{meta}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className={cn("block text-sm font-semibold tabular-nums", valueClass)}>{value}</span>
        <span className="block text-xs text-muted-foreground tabular-nums">{detail}</span>
      </span>
    </Link>
  );
}

function SkaterRow({ player }: { player: OutlierEntry }) {
  return (
    <PlayerRow
      playerId={player.playerId}
      name={player.name}
      headshotUrl={player.headshotUrl}
      meta={[player.team, player.position && formatPositionShort(player.position)].filter(Boolean).join(" · ")}
      value={signed(player.differential)}
      detail={`${player.goals} G · ${player.expectedGoals.toFixed(1)} xG`}
    />
  );
}

function GoalieRow({ goalie }: { goalie: GoalieOutlierEntry }) {
  const gsax = goalie.goalsSavedAboveExpected;
  return (
    <PlayerRow
      playerId={goalie.playerId}
      name={goalie.name}
      headshotUrl={goalie.headshotUrl}
      meta={[goalie.team, "G"].filter(Boolean).join(" · ")}
      value={signed(gsax)}
      valueClass={gsax > 0 ? "text-success" : gsax < 0 ? "text-error" : undefined}
      detail="GSAx"
    />
  );
}

function FeaturedPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Panel>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      <div className="mt-3 space-y-1">{children}</div>
    </Panel>
  );
}

function PanelSkeleton({ count }: { count: number }) {
  return (
    <Panel>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-1.5 h-3 w-44" />
      <div className="mt-3 space-y-1">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-14" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

interface FeaturedPlayersProps {
  enabled: boolean;
}

/** This season's 5-on-5 outliers: skaters scoring above and below their xG, and goalies by GSAx. */
export function FeaturedPlayers({ enabled }: FeaturedPlayersProps) {
  const { data: seasonsData, isLoading: seasonsLoading } = useSeasons();
  const currentSeason = seasonsData?.seasons?.[0]?.year;
  const { data: outliers, isLoading: outliersLoading } = useOutliers(
    enabled ? currentSeason : undefined,
    "5on5",
    SKATER_COUNT,
    GOALIE_COUNT,
  );

  if (!enabled) return null;

  if (seasonsLoading || outliersLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PanelSkeleton count={SKATER_COUNT} />
        <PanelSkeleton count={SKATER_COUNT} />
        <PanelSkeleton count={GOALIE_COUNT * 2} />
      </div>
    );
  }

  if (!outliers) return null;

  const skatersHot = outliers.skaterOutliers?.runningHot ?? [];
  const skatersCold = outliers.skaterOutliers?.runningCold ?? [];
  const goalies = [
    ...(outliers.goalieOutliers?.runningHot ?? []),
    ...(outliers.goalieOutliers?.runningCold ?? []),
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {skatersHot.length > 0 && (
        <FeaturedPanel title="Running hot" description="Most goals above expected goals, 5 on 5.">
          {skatersHot.map((p) => (
            <SkaterRow key={p.playerId} player={p} />
          ))}
        </FeaturedPanel>
      )}
      {skatersCold.length > 0 && (
        <FeaturedPanel title="Running cold" description="Furthest below expected goals: due for more.">
          {skatersCold.map((p) => (
            <SkaterRow key={p.playerId} player={p} />
          ))}
        </FeaturedPanel>
      )}
      {goalies.length > 0 && (
        <FeaturedPanel title="Goalies" description="Best and worst goals saved above expected.">
          {goalies.map((g) => (
            <GoalieRow key={g.playerId} goalie={g} />
          ))}
        </FeaturedPanel>
      )}
    </div>
  );
}
