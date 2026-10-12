import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTodaysGames } from "@/hooks";
import { ThemedImages } from "@/components/team-detail/TeamLogo";
import { formatGameTime, formatPeriod } from "@/lib/game-formatters";
import { cn } from "@/lib/utils";
import type { GameSummary, GameTeam } from "@/types";

/**
 * Broadcast-style strip of today's games under the header. Hidden on days
 * without games; reserves its height while loading so the page doesn't jump.
 */
export function ScoresStrip() {
  const { data, isLoading } = useTodaysGames();
  const games = data?.games ?? [];

  if (!isLoading && games.length === 0) return null;

  return (
    <div className="border-b bg-strip text-strip-foreground">
      <div className="container flex items-stretch">
        <div className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-19 w-40 shrink-0 animate-pulse border-r border-strip-border py-2.5"
                >
                  <div className="mx-4 mt-1 h-2.5 w-12 rounded-full bg-strip-border" />
                  <div className="mx-4 mt-2 h-2.5 w-24 rounded-full bg-strip-border" />
                  <div className="mx-4 mt-2 h-2.5 w-24 rounded-full bg-strip-border" />
                </div>
              ))
            : games.map((game) => <StripGame key={game.gameId} game={game} />)}
        </div>
        <Link
          to="/games"
          className="hidden shrink-0 items-center gap-1 pl-4 text-sm font-semibold text-strip-link hover:text-strip-foreground sm:flex"
        >
          All games
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function gameStatus(game: GameSummary) {
  const state = game.gameState;
  if (state === "LIVE" || state === "CRIT") {
    const period = formatPeriod(game.currentPeriod, game.inIntermission);
    const clock =
      !game.inIntermission && game.timeRemaining ? ` ${game.timeRemaining}` : "";
    return { live: true, label: `${period}${clock}` };
  }
  if (state === "OFF" || state === "FINAL") {
    const suffix =
      game.periodType && game.periodType !== "REG" ? `/${game.periodType}` : "";
    return { live: false, label: `Final${suffix}` };
  }
  return { live: false, label: formatGameTime(game.startTimeUtc) };
}

function StripGame({ game }: { game: GameSummary }) {
  const status = gameStatus(game);
  const started = game.away.goals !== null && game.home.goals !== null;
  const final = game.gameState === "OFF" || game.gameState === "FINAL";
  const awayLost = final && (game.away.goals ?? 0) < (game.home.goals ?? 0);
  const homeLost = final && (game.home.goals ?? 0) < (game.away.goals ?? 0);

  return (
    <Link
      to="/games/$gameId"
      params={{ gameId: game.gameId }}
      className="block w-40 shrink-0 border-r border-strip-border px-4 py-2.5 transition-colors first:border-l hover:bg-muted"
    >
      <div
        className={cn(
          "flex h-4 items-center gap-1.5 text-[11px] text-strip-muted",
          status.live && "font-semibold text-strip-live",
        )}
      >
        {status.live && (
          <span className="size-1.5 animate-pulse rounded-full bg-strip-live" />
        )}
        {status.label}
      </div>
      <StripTeam team={game.away} dimmed={awayLost} showScore={started} />
      <StripTeam team={game.home} dimmed={homeLost} showScore={started} />
    </Link>
  );
}

function StripTeam({
  team,
  dimmed,
  showScore,
}: {
  team: GameTeam;
  dimmed: boolean;
  showScore: boolean;
}) {
  return (
    <div
      className={cn(
        "mt-0.5 flex items-center gap-2 text-[13px] leading-[18px]",
        dimmed && "opacity-55",
      )}
    >
      <ThemedImages
        abbrev={team.teamCode}
        alt=""
        className="size-4 object-contain"
      />
      <span className="font-medium">{team.teamCode}</span>
      {showScore && (
        <span className="ml-auto font-display font-bold tabular-nums">
          {team.goals}
        </span>
      )}
    </div>
  );
}
