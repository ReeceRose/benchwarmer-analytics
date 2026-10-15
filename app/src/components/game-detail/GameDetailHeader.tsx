import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { Panel, Section } from "@/components/layout";
import {
  formatGameDateLong,
  formatGameTime,
  formatPeriod,
  getSeasonFromDate,
} from "@/lib/game-formatters";
import { coloursAreSimilar, getTeamColours } from "@/lib/team-colours";
import { getTeamName } from "@/lib/team-names";
import { cn } from "@/lib/utils";
import type { GameSummary, GamePreview } from "@/types";

interface GameDetailHeaderProps {
  game?: GameSummary;
  preview?: GamePreview;
  /** Shown after the date and series line, e.g. the share button. */
  action?: ReactNode;
}

function seriesSummary(
  game: GameSummary | undefined,
  preview: GamePreview | undefined,
  homeCode: string,
  awayCode: string,
): string {
  if (game?.seasonSeries) return game.seasonSeries;
  const season = preview?.headToHead.season;
  if (!season) return "";
  const { homeWins, awayWins, overtimeLosses } = season;
  if (homeWins + awayWins + overtimeLosses === 0) return "";
  const base =
    homeWins > awayWins
      ? `${homeCode} leads season series ${homeWins}–${awayWins}`
      : awayWins > homeWins
        ? `${awayCode} leads season series ${awayWins}–${homeWins}`
        : `Season series tied ${homeWins}–${awayWins}`;
  return overtimeLosses > 0 ? `${base} (${overtimeLosses} OT)` : base;
}

/**
 * Split scoreboard: the away team's colours on the left, the home team's on
 * the right, the score in the middle.
 */
export function GameDetailHeader({ game, preview, action }: GameDetailHeaderProps) {
  const gameState = game?.gameState ?? (preview ? "FUT" : null);
  const isFuture = gameState === "FUT" || gameState === "PRE";
  const isLive = gameState === "LIVE" || gameState === "CRIT";
  const isCompleted = gameState === "OFF";

  const homeCode = game?.home.teamCode ?? preview?.game.homeTeam ?? "";
  const awayCode = game?.away.teamCode ?? preview?.game.awayTeam ?? "";
  const gameDate = game?.gameDate ?? preview?.game.date ?? "";
  const season = gameDate ? getSeasonFromDate(gameDate) : undefined;
  const startTimeUtc = game?.startTimeUtc ?? preview?.game.startTimeUtc ?? null;

  const homeGoals = game?.home.goals;
  const awayGoals = game?.away.goals;
  const homeWins = isCompleted && (homeGoals ?? 0) > (awayGoals ?? 0);
  const awayWins = isCompleted && (awayGoals ?? 0) > (homeGoals ?? 0);

  const away = getTeamColours(awayCode);
  const home = getTeamColours(homeCode);
  // When the two colours blur together, a dark line marks the seam.
  const background = coloursAreSimilar(away.primary, home.primary)
    ? `linear-gradient(100deg, ${away.primary} 0 calc(50% - 1px), rgb(0 0 0 / 0.6) calc(50% - 1px) calc(50% + 1px), ${home.primary} calc(50% + 1px) 100%)`
    : `linear-gradient(100deg, ${away.primary} 0 49.9%, ${home.primary} 50.1% 100%)`;

  let status: string;
  if (isLive && game) {
    const clock =
      !game.inIntermission && game.timeRemaining ? ` ${game.timeRemaining}` : "";
    status = `${formatPeriod(game.currentPeriod, game.inIntermission)}${clock}`;
  } else if (isCompleted) {
    status =
      game?.periodType && game.periodType !== "REG"
        ? `Final/${game.periodType}`
        : "Final";
  } else {
    status = formatGameTime(startTimeUtc);
  }

  const series = seriesSummary(game, preview, homeCode, awayCode);

  const awaySide = {
    code: awayCode,
    lost: isCompleted && !awayWins,
    overallRecord: game?.away.overallRecord ?? preview?.teamComparison.away.overallRecord,
    record: game?.away.roadRecord ?? preview?.teamComparison.away.roadRecord,
    recordLabel: "away",
    streak: game?.away.streak ?? preview?.teamComparison.away.streak,
  };
  const homeSide = {
    code: homeCode,
    lost: isCompleted && !homeWins,
    overallRecord: game?.home.overallRecord ?? preview?.teamComparison.home.overallRecord,
    record: game?.home.homeRecord ?? preview?.teamComparison.home.homeRecord,
    recordLabel: "home",
    streak: game?.home.streak ?? preview?.teamComparison.home.streak,
  };

  return (
    <div
      className="text-white"
      style={{ backgroundImage: background }}
    >
      <div className="container py-6 sm:py-8">
        <div className="mb-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-white/80">
          <Link to="/games" search={gameDate ? { date: gameDate } : {}} className="hover:text-white">
            {gameDate ? formatGameDateLong(gameDate) : "Games"}
          </Link>
          {series && <span>{series}</span>}
          {action}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
          <TeamSide side={awaySide} season={season} align="end" />
          <div className="text-center">
            {isFuture ? (
              <div className="font-display text-3xl font-bold sm:text-4xl">@</div>
            ) : (
              <div className="flex items-center gap-2 font-display text-5xl leading-none font-bold tabular-nums sm:gap-4 sm:text-7xl">
                <span className={cn(awaySide.lost && "opacity-55")}>
                  {awayGoals ?? "–"}
                </span>
                <span className="text-2xl opacity-60 sm:text-4xl">–</span>
                <span className={cn(homeSide.lost && "opacity-55")}>
                  {homeGoals ?? "–"}
                </span>
              </div>
            )}
            <div
              className={cn(
                "mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-sm font-semibold",
              )}
            >
              {isLive && (
                <span className="size-2 animate-pulse rounded-full bg-strip-live" />
              )}
              {status}
            </div>
          </div>
          <TeamSide side={homeSide} season={season} align="start" />
        </div>
      </div>
    </div>
  );
}

function TeamSide({
  side,
  season,
  align,
}: {
  side: {
    code: string;
    lost: boolean;
    overallRecord?: string | null;
    record?: string | null;
    recordLabel: string;
    streak?: string | null;
  };
  season?: number;
  align: "start" | "end";
}) {
  return (
    <Link
      to="/teams/$abbrev"
      params={{ abbrev: side.code }}
      search={{ season }}
      className={cn(
        "group flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:gap-4",
        align === "end" ? "sm:flex-row-reverse sm:text-right" : "sm:text-left",
        side.lost && "opacity-70",
      )}
    >
      <TeamLogo
        abbrev={side.code}
        variant="dark"
        className="size-14 drop-shadow-lg sm:size-20"
      />
      <div className="min-w-0">
        <div className="font-display text-lg leading-tight font-bold group-hover:underline sm:text-2xl">
          <span className="hidden sm:inline">{getTeamName(side.code)}</span>
          <span className="sm:hidden">{side.code}</span>
        </div>
        {side.overallRecord && (
          <div className="mt-1 text-sm font-semibold tabular-nums sm:text-base">
            {side.overallRecord}
          </div>
        )}
        {(side.record || side.streak) && (
          <div className="hidden text-sm text-white/80 tabular-nums sm:block">
            {[side.record && `${side.record} ${side.recordLabel}`, side.streak && `streak ${side.streak}`]
              .filter(Boolean)
              .join(", ")}
          </div>
        )}
      </div>
    </Link>
  );
}

/** Period-by-period line score and the goal list, for live and final games. */
export function GameScoringSummary({ game }: { game: GameSummary }) {
  const goals = game.goals ?? [];
  if (game.periods.length === 0 && goals.length === 0) return null;

  // Period totals come from shot data when we have it, otherwise from the
  // goal list (which every live/final game has).
  const lastPeriod = Math.max(
    3,
    ...game.periods.map((p) => p.period),
    ...goals.map((g) => g.period),
  );
  const periodNumbers = Array.from({ length: lastPeriod }, (_, i) => i + 1);
  const goalsIn = (teamCode: string, homeSide: boolean, period: number) => {
    const fromShots = game.periods.find((p) => p.period === period);
    if (fromShots) return homeSide ? fromShots.homeGoals : fromShots.awayGoals;
    return goals.filter((g) => g.period === period && g.teamCode === teamCode)
      .length;
  };

  const periodLabel = (p: number) => (p <= 3 ? String(p) : p === 4 ? "OT" : `${p - 3}OT`);
  const rows = [
    { code: game.away.teamCode, home: false, total: game.away.goals, shots: game.away.shotsOnGoal },
    { code: game.home.teamCode, home: true, total: game.home.goals, shots: game.home.shotsOnGoal },
  ];

  return (
    <Section title="Scoring">
      <Panel className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <table className="h-fit text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="pr-6 pb-2 text-left font-medium">Team</th>
                {periodNumbers.map((p) => (
                  <th key={p} className="w-10 pb-2 text-center font-medium">
                    {periodLabel(p)}
                  </th>
                ))}
                <th className="w-10 pb-2 text-center font-semibold text-foreground">T</th>
                <th className="w-12 pb-2 text-center font-medium">SOG</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.code} className="border-t">
                  <td className="py-2 pr-6">
                    <span className="flex items-center gap-2 font-medium">
                      <TeamLogo abbrev={row.code} size="sm" />
                      {row.code}
                    </span>
                  </td>
                  {periodNumbers.map((p) => (
                    <td key={p} className="text-center">
                      {goalsIn(row.code, row.home, p)}
                    </td>
                  ))}
                  <td className="text-center font-display text-base font-bold">
                    {row.total ?? "–"}
                  </td>
                  <td className="text-center text-muted-foreground">
                    {row.shots ?? "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        {goals.length > 0 && (
          <div className="grid content-start gap-x-8 gap-y-4 text-sm sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] lg:border-l lg:pl-6">
            {periodNumbers
              .filter((p) => goals.some((g) => g.period === p))
              .map((p) => (
                <div key={p}>
                  <h3 className="mb-2 text-xs font-medium text-muted-foreground">
                    {p <= 3 ? `${formatPeriod(p)} period` : periodLabel(p)}
                  </h3>
                  <ol className="space-y-2.5">
                    {goals
                      .filter((g) => g.period === p)
                      .map((goal, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="w-12 shrink-0 text-muted-foreground tabular-nums">
                            {goal.timeInPeriod}
                          </span>
                          <TeamLogo abbrev={goal.teamCode} size="sm" />
                          <span className="min-w-0">
                            <Link
                              to="/players/$id"
                              params={{ id: String(goal.scorerId) }}
                              className="font-medium hover:text-link"
                            >
                              {goal.scorerName}
                            </Link>
                            {goal.strength && goal.strength !== "ev" && (
                              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase">
                                {goal.strength}
                              </span>
                            )}
                            {goal.isGameWinningGoal && (
                              <span className="ml-1.5 rounded-full bg-highlight/20 px-1.5 py-0.5 text-[11px] font-semibold">
                                GWG
                              </span>
                            )}
                            {goal.highlightUrl && (
                              <a
                                href={goal.highlightUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 text-xs text-link hover:underline"
                                aria-label={`Watch ${goal.scorerName}'s goal on NHL.com`}
                              >
                                Watch
                              </a>
                            )}
                            {goal.assists.length > 0 && (
                              <span className="block text-xs text-muted-foreground">
                                Assists: {goal.assists.join(", ")}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                  </ol>
                </div>
              ))}
          </div>
        )}
      </Panel>
    </Section>
  );
}

export function GameDetailHeaderSkeleton() {
  return (
    <div className="bg-muted">
      <div className="container py-6 sm:py-8">
        <Skeleton className="mx-auto mb-5 h-4 w-56 bg-background/60" />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-8">
          <div className="flex items-center justify-end gap-4">
            <Skeleton className="hidden h-7 w-40 bg-background/60 sm:block" />
            <Skeleton className="size-14 rounded-full bg-background/60 sm:size-20" />
          </div>
          <Skeleton className="h-16 w-40 bg-background/60" />
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-full bg-background/60 sm:size-20" />
            <Skeleton className="hidden h-7 w-40 bg-background/60 sm:block" />
          </div>
        </div>
      </div>
    </div>
  );
}
