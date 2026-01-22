import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HeadToHeadSection } from "@/components/game-preview/HeadToHeadSection";
import { TeamComparisonSection } from "@/components/game-preview/TeamComparisonSection";
import { HotPlayersSection } from "@/components/game-preview/HotPlayersSection";
import { GoalieMatchupSection } from "@/components/game-preview/GoalieMatchupSection";
import type { GamePreview } from "@/types";

interface GamePreviewCardProps {
  preview: GamePreview;
}

export function GamePreviewCard({ preview }: GamePreviewCardProps) {
  const { game, headToHead, teamComparison, hotPlayers, goalieMatchup } =
    preview;

  const startTime = game.startTimeUtc
    ? new Date(game.startTimeUtc).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <Card>
        <CardHeader className="text-center pb-2">
          <div className="text-sm text-muted-foreground uppercase tracking-wide">
            Game Preview
          </div>
          <CardTitle className="text-2xl">
            <Link
              to="/teams/$abbrev"
              params={{ abbrev: game.awayTeam }}
              className="hover:underline"
            >
              {game.awayTeam}
            </Link>
            <span className="text-muted-foreground mx-3">@</span>
            <Link
              to="/teams/$abbrev"
              params={{ abbrev: game.homeTeam }}
              className="hover:underline"
            >
              {game.homeTeam}
            </Link>
          </CardTitle>
          {startTime && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {startTime}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <TeamComparisonSection data={teamComparison} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <HeadToHeadSection
                data={headToHead}
                homeTeam={game.homeTeam}
                awayTeam={game.awayTeam}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <GoalieMatchupSection
                data={goalieMatchup}
                homeTeam={game.homeTeam}
                awayTeam={game.awayTeam}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <HotPlayersSection
                data={hotPlayers}
                homeTeam={game.homeTeam}
                awayTeam={game.awayTeam}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function GamePreviewSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center pb-2">
          <Skeleton className="h-4 w-24 mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto mt-2" />
          <Skeleton className="h-4 w-32 mx-auto mt-2" />
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
