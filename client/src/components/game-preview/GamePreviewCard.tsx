import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HeadToHeadSection } from "@/components/game-preview/HeadToHeadSection";
import { TeamComparisonSection } from "@/components/game-preview/TeamComparisonSection";
import { HotPlayersSection } from "@/components/game-preview/HotPlayersSection";
import { GoalieMatchupSection } from "@/components/game-preview/GoalieMatchupSection";
import { getSeasonFromDate } from "@/lib/game-formatters";
import type { GamePreview, GoalieRecentFormResponse } from "@/types";

interface GamePreviewCardProps {
  preview: GamePreview;
  goalieRecentForm?: GoalieRecentFormResponse;
}

export function GamePreviewCard({
  preview,
  goalieRecentForm,
}: GamePreviewCardProps) {
  const { game, headToHead, teamComparison, hotPlayers, goalieMatchup } =
    preview;

  const season = getSeasonFromDate(game.date);

  const startTime = game.startTimeUtc
    ? new Date(game.startTimeUtc).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : null;

  // Build series summary for header
  const { season: seriesRecord } = headToHead;
  const totalGames =
    seriesRecord.homeWins + seriesRecord.awayWins + seriesRecord.overtimeLosses;
  let seriesSummary = "";
  if (totalGames > 0) {
    if (seriesRecord.homeWins > seriesRecord.awayWins) {
      seriesSummary = `${game.homeTeam} leads ${seriesRecord.homeWins}-${seriesRecord.awayWins}`;
    } else if (seriesRecord.awayWins > seriesRecord.homeWins) {
      seriesSummary = `${game.awayTeam} leads ${seriesRecord.awayWins}-${seriesRecord.homeWins}`;
    } else {
      seriesSummary = `Series tied ${seriesRecord.homeWins}-${seriesRecord.awayWins}`;
    }
    if (seriesRecord.overtimeLosses > 0) {
      seriesSummary += ` (${seriesRecord.overtimeLosses} OT)`;
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="text-center">
          <div className="text-sm text-muted-foreground uppercase tracking-wide">
            Game Preview
          </div>
          <CardTitle className="text-2xl">
            <span className="inline-flex flex-col items-center">
              <Link
                to="/teams/$abbrev"
                params={{ abbrev: game.awayTeam }}
                search={{ season }}
                className="hover:underline"
              >
                {game.awayTeam}
              </Link>
              {teamComparison.away.roadRecord && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({teamComparison.away.roadRecord} away)
                </span>
              )}
            </span>
            <span className="text-muted-foreground mx-3">@</span>
            <span className="inline-flex flex-col items-center">
              <Link
                to="/teams/$abbrev"
                params={{ abbrev: game.homeTeam }}
                search={{ season }}
                className="hover:underline"
              >
                {game.homeTeam}
              </Link>
              {teamComparison.home.homeRecord && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({teamComparison.home.homeRecord} home)
                </span>
              )}
            </span>
          </CardTitle>
          {startTime && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {startTime}
            </div>
          )}
          {seriesSummary && (
            <div className="text-sm text-muted-foreground">{seriesSummary}</div>
          )}
          {(teamComparison.away.streak || teamComparison.home.streak) && (
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>
                {game.awayTeam}: {teamComparison.away.streak}
                {teamComparison.away.last10 && (
                  <span className="text-muted-foreground/70 ml-2">
                    L10: {teamComparison.away.last10}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground/30">|</span>
              <span>
                {game.homeTeam}: {teamComparison.home.streak}
                {teamComparison.home.last10 && (
                  <span className="text-muted-foreground/70 ml-2">
                    L10: {teamComparison.home.last10}
                  </span>
                )}
              </span>
            </div>
          )}
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="py-4">
          <TeamComparisonSection data={teamComparison} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <GoalieMatchupSection
              data={goalieMatchup}
              homeTeam={game.homeTeam}
              awayTeam={game.awayTeam}
              recentForm={goalieRecentForm}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <HotPlayersSection
              data={hotPlayers}
              homeTeam={game.homeTeam}
              awayTeam={game.awayTeam}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4">
          <HeadToHeadSection
            data={headToHead}
            homeTeam={game.homeTeam}
            awayTeam={game.awayTeam}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function GamePreviewSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="text-center py-4">
          <Skeleton className="h-4 w-24 mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto mt-2" />
          <Skeleton className="h-4 w-32 mx-auto mt-2" />
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="py-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
