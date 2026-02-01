import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveIndicator, GoalsList } from "@/components/shared";
import { formatGameTimeShort, formatPeriod } from "@/lib/game-formatters";
import type { GameSummary } from "@/types";

interface GameCardProps {
  game: GameSummary;
}

export function GameCard({ game }: GameCardProps) {
  const isCompleted = game.gameState === "OFF";
  const isLive = game.gameState === "LIVE" || game.gameState === "CRIT";
  const homeWins =
    isCompleted && (game.home.goals ?? 0) > (game.away.goals ?? 0);
  const awayWins =
    isCompleted && (game.away.goals ?? 0) > (game.home.goals ?? 0);

  // Get the appropriate record based on home/away context
  const awayDisplayRecord = game.away.roadRecord || game.away.record;
  const homeDisplayRecord = game.home.homeRecord || game.home.record;

  return (
    <Link to="/games/$gameId" params={{ gameId: game.gameId }}>
      <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {isLive ? (
                <>
                  <LiveIndicator />
                  <span className="font-medium">
                    {formatPeriod(game.currentPeriod, game.inIntermission)}
                    {!game.inIntermission &&
                      game.timeRemaining &&
                      ` ${game.timeRemaining}`}
                  </span>
                </>
              ) : isCompleted ? (
                <span>
                  Final
                  {game.periodType && game.periodType !== "REG" && (
                    <Badge
                      variant="secondary"
                      className="ml-2 text-[10px] px-1"
                    >
                      {game.periodType}
                    </Badge>
                  )}
                </span>
              ) : (
                <span>{formatGameTimeShort(game.startTimeUtc)}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(isLive || isCompleted) &&
                game.away.shotsOnGoal !== null &&
                game.home.shotsOnGoal !== null && (
                  <span className="font-mono text-[10px]">
                    SOG: {game.away.shotsOnGoal}-{game.home.shotsOnGoal}
                  </span>
                )}
              {game.hasShotData && !isLive && (
                <Badge variant="outline" className="text-[10px]">
                  Stats
                </Badge>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div
              className={`flex items-center justify-between ${awayWins ? "" : isCompleted ? "opacity-70" : ""}`}
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {game.away.teamCode}
                </Badge>
                <span className="text-sm truncate">{game.away.teamName}</span>
                {awayDisplayRecord && (
                  <span className="text-[10px] text-muted-foreground">
                    ({awayDisplayRecord}
                    {game.away.roadRecord ? " away" : ""})
                  </span>
                )}
              </div>
              <span
                className={`font-mono text-lg font-bold ${awayWins ? "" : isCompleted ? "text-muted-foreground" : ""}`}
              >
                {game.away.goals ?? "-"}
              </span>
            </div>
            <div
              className={`flex items-center justify-between ${homeWins ? "" : isCompleted ? "opacity-70" : ""}`}
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {game.home.teamCode}
                </Badge>
                <span className="text-sm truncate">{game.home.teamName}</span>
                {homeDisplayRecord && (
                  <span className="text-[10px] text-muted-foreground">
                    ({homeDisplayRecord}
                    {game.home.homeRecord ? " home" : ""})
                  </span>
                )}
              </div>
              <span
                className={`font-mono text-lg font-bold ${homeWins ? "" : isCompleted ? "text-muted-foreground" : ""}`}
              >
                {game.home.goals ?? "-"}
              </span>
            </div>
          </div>
          {(game.seasonSeries || game.away.streak || game.home.streak) && (
            <div className="text-[10px] text-muted-foreground text-center space-y-0.5">
              {game.seasonSeries && <div>{game.seasonSeries}</div>}
              {(game.away.streak || game.home.streak) && (
                <div>
                  {game.away.teamCode}: {game.away.streak || "-"}
                  {game.away.last10 && (
                    <span className="opacity-70 ml-1">
                      L10: {game.away.last10}
                    </span>
                  )}
                  <span className="mx-2 opacity-30">|</span>
                  {game.home.teamCode}: {game.home.streak || "-"}
                  {game.home.last10 && (
                    <span className="opacity-70 ml-1">
                      L10: {game.home.last10}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          {game.hasShotData &&
            isCompleted &&
            game.away.expectedGoals !== null &&
            game.home.expectedGoals !== null && (
              <div className="pt-2 border-t text-[10px] text-muted-foreground font-mono flex justify-between">
                <span>{game.away.teamCode} xG: {game.away.expectedGoals.toFixed(1)}</span>
                <span>{game.home.teamCode} xG: {game.home.expectedGoals.toFixed(1)}</span>
              </div>
            )}
          {isLive && game.goals && game.goals.length > 0 && (
            <GoalsList goals={game.goals} awayCode={game.away.teamCode} />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
