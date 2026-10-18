import { Link } from "@tanstack/react-router";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { getTeamName } from "@/lib/team-names";
import { cn } from "@/lib/utils";
import type { ActiveGoalAlert } from "@/hooks/useGoalAlert";

interface ScorebarSide {
  code: string;
  goals?: number | null;
  lost: boolean;
}

interface GameStickyScorebarProps {
  visible: boolean;
  background: string;
  away: ScorebarSide;
  home: ScorebarSide;
  status: string;
  isLive: boolean;
  isFuture: boolean;
  season?: number;
  goalAlert?: ActiveGoalAlert | null;
}

/**
 * Compact copy of the GameDetailHeader scoreboard, pinned under the site
 * header once the big score scrolls out of view. Fed by the same live data,
 * so it updates (and pops on goals) along with the header.
 */
export function GameStickyScorebar({
  visible,
  background,
  away,
  home,
  status,
  isLive,
  isFuture,
  season,
  goalAlert,
}: GameStickyScorebarProps) {
  const scoreClass = (side: "home" | "away", lost: boolean) =>
    cn(lost && "opacity-55", goalAlert?.side === side && "motion-safe:animate-goal-pop");
  const scoreKey = (side: "home" | "away") =>
    goalAlert?.side === side ? goalAlert.key : side;

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "fixed inset-x-0 top-16 z-40 overflow-hidden border-b border-black/20 text-white transition-[translate,opacity] duration-200 motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0",
      )}
      style={{ backgroundImage: background }}
    >
      {goalAlert && (
        <div
          key={goalAlert.key}
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 motion-safe:animate-goal-flash"
          style={{
            backgroundImage: `linear-gradient(${goalAlert.side === "away" ? 100 : 280}deg, white 0 50%, transparent 50%)`,
          }}
        />
      )}
      <div className="relative container grid h-12 grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <ScorebarTeam side={away} season={season} align="end" />
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-3 rounded-full"
          aria-label="Back to top"
        >
          {isFuture ? (
            <span className="font-display text-lg font-bold">@</span>
          ) : (
            <span className="flex items-center gap-1.5 font-display text-2xl leading-none font-bold tabular-nums">
              <span key={scoreKey("away")} className={scoreClass("away", away.lost)}>
                {away.goals ?? "–"}
              </span>
              <span className="text-base opacity-60">–</span>
              <span key={scoreKey("home")} className={scoreClass("home", home.lost)}>
                {home.goals ?? "–"}
              </span>
            </span>
          )}
          <span className="hidden items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap sm:inline-flex">
            {isLive && <span className="size-1.5 animate-pulse rounded-full bg-strip-live" />}
            {status}
          </span>
        </button>
        <ScorebarTeam side={home} season={season} align="start" />
      </div>
      <div className="relative -mt-1 pb-1 text-center text-[11px] font-semibold sm:hidden">
        <span className="inline-flex items-center gap-1">
          {isLive && <span className="size-1.5 animate-pulse rounded-full bg-strip-live" />}
          {status}
        </span>
      </div>
    </div>
  );
}

function ScorebarTeam({
  side,
  season,
  align,
}: {
  side: ScorebarSide;
  season?: number;
  align: "start" | "end";
}) {
  return (
    <Link
      to="/teams/$abbrev"
      params={{ abbrev: side.code }}
      search={{ season }}
      className={cn(
        "flex min-w-0 items-center gap-2 hover:underline",
        align === "end" && "flex-row-reverse",
        side.lost && "opacity-70",
      )}
    >
      <TeamLogo abbrev={side.code} variant="dark" className="size-8 shrink-0 drop-shadow" />
      <span className="truncate font-display text-sm font-bold sm:text-base">
        <span className="hidden md:inline">{getTeamName(side.code)}</span>
        <span className="md:hidden">{side.code}</span>
      </span>
    </Link>
  );
}
