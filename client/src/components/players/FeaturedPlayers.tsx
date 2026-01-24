import { Link } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, Shield } from "lucide-react";
import { useSeasons, useOutliers } from "@/hooks";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPosition } from "@/lib/formatters";
import type { OutlierEntry, GoalieOutlierEntry } from "@/types";

interface PlayerCardProps {
  player: OutlierEntry;
  trend: "hot" | "cold";
}

export function PlayerCard({ player, trend }: PlayerCardProps) {
  const initials = player.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isHot = trend === "hot";
  const diffDisplay =
    player.differential > 0
      ? `+${player.differential.toFixed(1)}`
      : player.differential.toFixed(1);

  return (
    <Link to="/players/$id" params={{ id: String(player.playerId) }}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full py-0">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9">
              {player.headshotUrl && (
                <AvatarImage src={player.headshotUrl} alt={player.name} />
              )}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{player.name}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {player.position && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {formatPosition(player.position)}
                  </Badge>
                )}
                {player.team && <span>{player.team}</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div
                className={`flex items-center gap-0.5 text-sm font-semibold ${isHot ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
              >
                {isHot ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span>{diffDisplay}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {player.goals}G / {player.expectedGoals.toFixed(1)} xG
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface GoalieCardProps {
  goalie: GoalieOutlierEntry;
  trend: "hot" | "cold";
}

export function GoalieCard({ goalie, trend }: GoalieCardProps) {
  const initials = goalie.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isHot = trend === "hot";
  const gsaxDisplay =
    goalie.goalsSavedAboveExpected > 0
      ? `+${goalie.goalsSavedAboveExpected.toFixed(1)}`
      : goalie.goalsSavedAboveExpected.toFixed(1);

  return (
    <Link to="/players/$id" params={{ id: String(goalie.playerId) }}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full py-0">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9">
              {goalie.headshotUrl && (
                <AvatarImage src={goalie.headshotUrl} alt={goalie.name} />
              )}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{goalie.name}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                  G
                </Badge>
                {goalie.team && <span>{goalie.team}</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div
                className={`flex items-center gap-0.5 text-sm font-semibold ${isHot ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
              >
                {isHot ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span>{gsaxDisplay}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">GSAx</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-10 mb-1" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const SKATER_COUNT = 6;
const GOALIE_COUNT = 3;

function SectionSkeleton({ count = SKATER_COUNT }: { count?: number }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

interface FeaturedPlayersProps {
  enabled: boolean;
}

export function FeaturedPlayers({ enabled }: FeaturedPlayersProps) {
  const { data: seasonsData, isLoading: seasonsLoading } = useSeasons();
  const currentSeason = seasonsData?.seasons?.[0]?.year;
  const { data: outliers, isLoading: outliersLoading } = useOutliers(
    enabled ? currentSeason : undefined,
    "5on5",
    SKATER_COUNT,
    GOALIE_COUNT
  );

  const isLoading = seasonsLoading || outliersLoading;

  if (!enabled) return null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionSkeleton count={SKATER_COUNT} />
        <SectionSkeleton count={SKATER_COUNT} />
        <SectionSkeleton count={GOALIE_COUNT} />
      </div>
    );
  }

  if (!outliers) {
    return null;
  }

  const { skaterOutliers, goalieOutliers } = outliers;
  const skatersHot = skaterOutliers?.runningHot ?? [];
  const skatersCold = skaterOutliers?.runningCold ?? [];
  const goaliesHot = goalieOutliers?.runningHot ?? [];
  const goaliesCold = goalieOutliers?.runningCold ?? [];

  return (
    <div className="space-y-6">
      {skatersHot.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            <h2 className="font-semibold">Running Hot</h2>
            <span className="text-xs text-muted-foreground">
              Outperforming expected goals
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {skatersHot.map((player) => (
              <PlayerCard key={player.playerId} player={player} trend="hot" />
            ))}
          </div>
        </div>
      )}

      {skatersCold.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            <h2 className="font-semibold">Running Cold</h2>
            <span className="text-xs text-muted-foreground">
              Due for positive regression
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {skatersCold.map((player) => (
              <PlayerCard key={player.playerId} player={player} trend="cold" />
            ))}
          </div>
        </div>
      )}

      {(goaliesHot.length > 0 || goaliesCold.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Goalies</h2>
            <span className="text-xs text-muted-foreground">
              Goals Saved Above Expected
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {goaliesHot.map((goalie) => (
              <GoalieCard key={goalie.playerId} goalie={goalie} trend="hot" />
            ))}
            {goaliesCold.map((goalie) => (
              <GoalieCard key={goalie.playerId} goalie={goalie} trend="cold" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
