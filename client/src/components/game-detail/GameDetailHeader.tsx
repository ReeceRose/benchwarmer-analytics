import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveIndicator } from "@/components/shared";
import {
  formatGameDateLong,
  formatGameTime,
  formatPeriod,
  getSeasonFromDate,
} from "@/lib/game-formatters";
import type { GameSummary, GameGoal, GamePreview } from "@/types";

interface GameDetailHeaderProps {
  game?: GameSummary;
  preview?: GamePreview;
}

function DetailedGoalsList({
  goals,
  awayCode,
}: {
  goals: GameGoal[];
  awayCode: string;
}) {
  if (!goals || goals.length === 0) return null;

  return (
    <div className="pt-4 border-t text-sm text-left">
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
        Goals
      </div>
      <div className="space-y-1.5">
        {goals.map((goal, idx) => (
          <div key={idx} className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {goal.teamCode === awayCode ? "A" : "H"}
            </Badge>
            <span className="font-medium">{goal.scorerName}</span>
            <span className="text-muted-foreground">
              {formatPeriod(goal.period)} {goal.timeInPeriod}
            </span>
            {goal.strength && goal.strength !== "ev" && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0 uppercase"
              >
                {goal.strength}
              </Badge>
            )}
            {goal.isGameWinningGoal && (
              <Badge className="text-xs px-1.5 py-0.5 bg-highlight/20 text-highlight border-highlight/30">
                GWG
              </Badge>
            )}
            {goal.assists.length > 0 && (
              <span className="text-muted-foreground text-xs">
                ({goal.assists.join(", ")})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function GameDetailHeader({ game, preview }: GameDetailHeaderProps) {
  // Determine game state - prefer game data if available
  const gameState = game?.gameState ?? (preview ? "FUT" : null);
  const isFuture = gameState === "FUT" || gameState === "PRE";
  const isLive = gameState === "LIVE" || gameState === "CRIT";
  const isCompleted = gameState === "OFF";

  // Get team data - prefer game data, fall back to preview
  const homeTeamCode = game?.home.teamCode ?? preview?.game.homeTeam ?? "";
  const awayTeamCode = game?.away.teamCode ?? preview?.game.awayTeam ?? "";
  const homeTeamName =
    game?.home.teamName ?? preview?.game.homeTeamName ?? null;
  const awayTeamName =
    game?.away.teamName ?? preview?.game.awayTeamName ?? null;

  // Get date for season calculation
  const gameDate = game?.gameDate ?? preview?.game.date ?? "";
  const season = gameDate
    ? getSeasonFromDate(gameDate)
    : new Date().getFullYear();

  // Scores (only for live/completed)
  const homeGoals = game?.home.goals;
  const awayGoals = game?.away.goals;
  const homeWins = isCompleted && (homeGoals ?? 0) > (awayGoals ?? 0);
  const awayWins = isCompleted && (awayGoals ?? 0) > (homeGoals ?? 0);

  // Get streak/L10/record data from game (preferred) or preview (fallback)
  const homeStreak = game?.home.streak ?? preview?.teamComparison.home.streak;
  const awayStreak = game?.away.streak ?? preview?.teamComparison.away.streak;
  const homeLast10 = game?.home.last10 ?? preview?.teamComparison.home.last10;
  const awayLast10 = game?.away.last10 ?? preview?.teamComparison.away.last10;
  const homeRecord =
    game?.home.homeRecord ?? preview?.teamComparison.home.homeRecord;
  const awayRoadRecord =
    game?.away.roadRecord ?? preview?.teamComparison.away.roadRecord;

  // Build series summary from game data or preview head-to-head
  let seriesSummary = game?.seasonSeries ?? "";
  if (!seriesSummary && preview?.headToHead.season) {
    const {
      homeWins: hWins,
      awayWins: aWins,
      overtimeLosses,
    } = preview.headToHead.season;
    const totalGames = hWins + aWins + overtimeLosses;
    if (totalGames > 0) {
      if (hWins > aWins) {
        seriesSummary = `${homeTeamCode} leads ${hWins}-${aWins}`;
      } else if (aWins > hWins) {
        seriesSummary = `${awayTeamCode} leads ${aWins}-${hWins}`;
      } else {
        seriesSummary = `Series tied ${hWins}-${aWins}`;
      }
      if (overtimeLosses > 0) {
        seriesSummary += ` (${overtimeLosses} OT)`;
      }
    }
  }

  // Start time
  const startTimeUtc = game?.startTimeUtc ?? preview?.game.startTimeUtc;
  const startTime = startTimeUtc ? formatGameTime(startTimeUtc) : null;

  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        <div className="text-sm text-muted-foreground uppercase tracking-wide">
          {isLive && game ? (
            <div className="flex items-center justify-center gap-2">
              <LiveIndicator />
              <span className="font-medium text-foreground">
                {formatPeriod(game.currentPeriod, game.inIntermission)}
                {!game.inIntermission &&
                  game.timeRemaining &&
                  ` ${game.timeRemaining}`}
              </span>
              {game.away.shotsOnGoal !== null &&
                game.home.shotsOnGoal !== null && (
                  <span className="font-mono text-xs">
                    SOG: {game.away.shotsOnGoal}-{game.home.shotsOnGoal}
                  </span>
                )}
            </div>
          ) : isCompleted && game ? (
            <>
              Final
              {game.periodType && game.periodType !== "REG" && (
                <Badge variant="secondary" className="ml-2">
                  {game.periodType}
                </Badge>
              )}
            </>
          ) : isFuture ? (
            "Game Preview"
          ) : (
            "Scheduled"
          )}
        </div>

        <div className="flex items-center justify-center gap-8">
          <Link
            to="/teams/$abbrev"
            params={{ abbrev: awayTeamCode }}
            search={{ season }}
            className={`text-center hover:opacity-100 transition-opacity ${
              isCompleted ? (awayWins ? "" : "opacity-70") : ""
            }`}
          >
            <div className="text-2xl font-bold hover:text-primary transition-colors">
              {awayTeamCode}
            </div>
            {awayTeamName && (
              <div className="text-sm text-muted-foreground">
                {awayTeamName}
              </div>
            )}
            {(awayRoadRecord || game?.away.record) && (
              <div className="text-xs text-muted-foreground">
                ({awayRoadRecord ? `${awayRoadRecord} away` : game?.away.record}
                )
              </div>
            )}
          </Link>

          {isFuture ? (
            <span className="text-2xl text-muted-foreground">@</span>
          ) : (
            <div className="flex items-center gap-4">
              <span
                className={`text-5xl font-bold tabular-nums ${
                  isCompleted ? (awayWins ? "" : "text-muted-foreground") : ""
                }`}
              >
                {awayGoals ?? "-"}
              </span>
              <span className="text-2xl text-muted-foreground">-</span>
              <span
                className={`text-5xl font-bold tabular-nums ${
                  isCompleted ? (homeWins ? "" : "text-muted-foreground") : ""
                }`}
              >
                {homeGoals ?? "-"}
              </span>
            </div>
          )}

          <Link
            to="/teams/$abbrev"
            params={{ abbrev: homeTeamCode }}
            search={{ season }}
            className={`text-center hover:opacity-100 transition-opacity ${
              isCompleted ? (homeWins ? "" : "opacity-70") : ""
            }`}
          >
            <div className="text-2xl font-bold hover:text-primary transition-colors">
              {homeTeamCode}
            </div>
            {homeTeamName && (
              <div className="text-sm text-muted-foreground">
                {homeTeamName}
              </div>
            )}
            {(homeRecord || game?.home.record) && (
              <div className="text-xs text-muted-foreground">
                ({homeRecord ? `${homeRecord} home` : game?.home.record})
              </div>
            )}
          </Link>
        </div>

        <div className="text-sm text-muted-foreground">
          {isFuture && startTime ? (
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              {startTime}
            </div>
          ) : gameDate ? (
            <>
              {formatGameDateLong(gameDate)}
              {startTimeUtc && ` • ${formatGameTime(startTimeUtc)}`}
            </>
          ) : null}
        </div>

        {seriesSummary && (
          <div className="text-sm text-muted-foreground">{seriesSummary}</div>
        )}

        {(awayStreak || homeStreak) && (
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>
              {awayTeamCode}: {awayStreak}
              {awayLast10 && (
                <span className="text-muted-foreground/70 ml-2">
                  L10: {awayLast10}
                </span>
              )}
            </span>
            <span className="text-muted-foreground/30">|</span>
            <span>
              {homeTeamCode}: {homeStreak}
              {homeLast10 && (
                <span className="text-muted-foreground/70 ml-2">
                  L10: {homeLast10}
                </span>
              )}
            </span>
          </div>
        )}

        {game && game.periods.length > 0 && (
          <div className="flex items-center justify-center gap-4 pt-2 border-t">
            {game.periods.map((p) => (
              <div key={p.period} className="text-center">
                <div className="text-xs text-muted-foreground font-medium">
                  {p.period <= 3
                    ? `P${p.period}`
                    : p.period === 4
                      ? "OT"
                      : `OT${p.period - 3}`}
                </div>
                <div className="font-mono text-sm">
                  {p.awayGoals}-{p.homeGoals}
                </div>
              </div>
            ))}
          </div>
        )}

        {game && game.goals && game.goals.length > 0 && (
          <DetailedGoalsList goals={game.goals} awayCode={awayTeamCode} />
        )}
      </div>
    </Card>
  );
}

export function GameDetailHeaderSkeleton() {
  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        <Skeleton className="h-4 w-24 mx-auto" />
        <div className="flex items-center justify-center gap-8">
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-16 mx-auto" />
            <Skeleton className="h-4 w-24 mx-auto" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12" />
            <Skeleton className="h-6 w-4" />
            <Skeleton className="h-12 w-12" />
          </div>
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-16 mx-auto" />
            <Skeleton className="h-4 w-24 mx-auto" />
          </div>
        </div>
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </Card>
  );
}
