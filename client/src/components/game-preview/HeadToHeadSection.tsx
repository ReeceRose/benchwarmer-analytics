import { Badge } from "@/components/ui/badge";
import type { HeadToHead } from "@/types";

interface HeadToHeadSectionProps {
  data: HeadToHead;
  homeTeam: string;
  awayTeam: string;
}

export function HeadToHeadSection({
  data,
  homeTeam,
  awayTeam,
}: HeadToHeadSectionProps) {
  const { season, lastFive } = data;
  const totalGames = season.homeWins + season.awayWins + season.overtimeLosses;

  // Determine who leads the series
  let seriesLeader = "";
  if (season.homeWins > season.awayWins) {
    seriesLeader = `${homeTeam} leads`;
  } else if (season.awayWins > season.homeWins) {
    seriesLeader = `${awayTeam} leads`;
  } else {
    seriesLeader = "Series tied";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Season Series</h3>
        {totalGames > 0 && (
          <span className="text-sm text-muted-foreground">
            {seriesLeader} {season.homeWins}-{season.awayWins}
            {season.overtimeLosses > 0 && `-${season.overtimeLosses}`}
          </span>
        )}
      </div>

      {lastFive.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No previous meetings this season
        </p>
      ) : (
        <div className="space-y-2">
          {lastFive.map((game, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm py-1.5 px-2 -mx-2 bg-muted/30 rounded"
            >
              <span className="text-muted-foreground">
                {new Date(game.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="font-mono">{game.score}</span>
              <div className="flex items-center gap-2">
                <Badge
                  variant={game.winner === homeTeam ? "default" : "secondary"}
                  className="text-xs"
                >
                  {game.winner}
                </Badge>
                {game.overtimeType && (
                  <Badge variant="outline" className="text-xs">
                    {game.overtimeType}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
