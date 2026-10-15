import { Link } from "@tanstack/react-router";
import { LiveIndicator } from "@/components/shared";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { formatGameTimeShort, formatPeriod } from "@/lib/game-formatters";
import { getTeamColours, teamMarkColour } from "@/lib/team-colours";
import { getTeamName } from "@/lib/team-names";
import { cn } from "@/lib/utils";
import type { GameSummary, GameTeam } from "@/types";

interface GameCardProps {
  game: GameSummary;
  /** Pregame chance the home team wins (from the playoff odds model). */
  homeWinProbability?: number;
}

export function GameCard({ game, homeWinProbability }: GameCardProps) {
  const isCompleted = game.gameState === "OFF";
  const isLive = game.gameState === "LIVE" || game.gameState === "CRIT";
  const homeWins = isCompleted && (game.home.goals ?? 0) > (game.away.goals ?? 0);
  const awayWins = isCompleted && (game.away.goals ?? 0) > (game.home.goals ?? 0);
  const showXg =
    game.hasShotData &&
    isCompleted &&
    game.away.expectedGoals !== null &&
    game.home.expectedGoals !== null;

  return (
    <Link
      to="/games/$gameId"
      params={{ gameId: game.gameId }}
      className="group flex h-full flex-col rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        {isLive ? (
          <span className="flex items-center gap-2">
            <LiveIndicator />
            <span className="font-medium text-foreground">
              {formatPeriod(game.currentPeriod, game.inIntermission)}
              {!game.inIntermission && game.timeRemaining && ` ${game.timeRemaining}`}
            </span>
          </span>
        ) : isCompleted ? (
          <span className="font-medium">
            Final
            {game.periodType && game.periodType !== "REG" && `/${game.periodType}`}
          </span>
        ) : (
          <span className="font-medium">{formatGameTimeShort(game.startTimeUtc)}</span>
        )}
        {(isLive || isCompleted) &&
          game.away.shotsOnGoal !== null &&
          game.home.shotsOnGoal !== null && (
            <span className="tabular-nums">
              Shots {game.away.shotsOnGoal}–{game.home.shotsOnGoal}
            </span>
          )}
      </div>

      <div className="space-y-2">
        <TeamLine
          team={game.away}
          record={game.away.roadRecord || game.away.record}
          recordLabel={game.away.roadRecord ? "away" : ""}
          dimmed={isCompleted && !awayWins}
        />
        <TeamLine
          team={game.home}
          record={game.home.homeRecord || game.home.record}
          recordLabel={game.home.homeRecord ? "home" : ""}
          dimmed={isCompleted && !homeWins}
        />
      </div>

      {showXg && (
        <XgShare away={game.away} home={game.home} />
      )}

      {!isCompleted && !isLive && (homeWinProbability !== undefined || game.away.streak || game.home.streak) && (
        <CardFooter className="text-xs text-muted-foreground">
          {homeWinProbability !== undefined && (
            <WinChance away={game.away} home={game.home} homeWinProbability={homeWinProbability} />
          )}
          {game.seasonSeries && <div className="mb-0.5">{game.seasonSeries}</div>}
          {(game.away.streak || game.home.streak) && (
            <>
              Streaks: {game.away.teamCode} {game.away.streak || "–"}, {game.home.teamCode}{" "}
              {game.home.streak || "–"}
            </>
          )}
        </CardFooter>
      )}
    </Link>
  );
}

/**
 * Bottom section of a card, pinned to the bottom so footers line up across a
 * grid row.
 */
function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-auto pt-3">
      <div className={cn("border-t pt-3", className)}>{children}</div>
    </div>
  );
}

function TeamLine({
  team,
  record,
  recordLabel,
  dimmed,
}: {
  team: GameTeam;
  record?: string | null;
  recordLabel: string;
  dimmed: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", dimmed && "opacity-60")}>
      <TeamLogo abbrev={team.teamCode} size="md" className="size-8" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium group-hover:text-link">
          {getTeamName(team.teamCode)}
        </div>
        {record && (
          <div className="text-xs text-muted-foreground">
            {record}
            {recordLabel && ` ${recordLabel}`}
          </div>
        )}
      </div>
      <span className="font-display text-2xl font-bold tabular-nums">
        {team.goals ?? ""}
      </span>
    </div>
  );
}

// Team colour for small marks on the page surface; lightened in dark mode so
// navy teams stay visible.
const teamFill = (abbrev: string) => teamMarkColour(getTeamColours(abbrev).primary);

/** Pregame win chances, as a bar split in the two teams' colours. */
function WinChance({ away, home, homeWinProbability }: { away: GameTeam; home: GameTeam; homeWinProbability: number }) {
  const awayPct = Math.round((1 - homeWinProbability) * 100);
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex justify-between tabular-nums">
        <span className={cn(awayPct > 50 && "font-semibold text-foreground")}>{awayPct}%</span>
        <span>Win chance</span>
        <span className={cn(awayPct < 50 && "font-semibold text-foreground")}>{100 - awayPct}%</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
        <div style={{ width: `${awayPct}%`, backgroundColor: teamFill(away.teamCode) }} />
        <div className="flex-1 border-l-2 border-card" style={{ backgroundColor: teamFill(home.teamCode) }} />
      </div>
    </div>
  );
}

/** Share of expected goals, as a bar split in the two teams' colours. */
function XgShare({ away, home }: { away: GameTeam; home: GameTeam }) {
  const awayXg = away.expectedGoals ?? 0;
  const homeXg = home.expectedGoals ?? 0;
  const total = awayXg + homeXg || 1;
  const awayPct = (awayXg / total) * 100;

  return (
    <CardFooter>
      <div className="mb-1.5 flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{awayXg.toFixed(1)} xG</span>
        <span>Expected goals</span>
        <span>{homeXg.toFixed(1)} xG</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          style={{ width: `${awayPct}%`, backgroundColor: teamFill(away.teamCode) }}
        />
        <div
          className="flex-1 border-l-2 border-card"
          style={{ backgroundColor: teamFill(home.teamCode) }}
        />
      </div>
    </CardFooter>
  );
}
