import { useEffect, useLayoutEffect, useRef } from "react";
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
 * Games stay in schedule order, but the strip starts scrolled past finished
 * games to the first live or upcoming one.
 */
export function ScoresStrip() {
  const { data, isLoading } = useTodaysGames();
  const games = data?.games ?? [];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const hidden = !isLoading && games.length === 0;
  const firstUnfinishedId = games.find((g) => !isFinal(g))?.gameId;

  // Re-runs only when the first unfinished game changes (a game ends), not on
  // every live poll, so a manual scroll isn't undone.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || firstUnfinishedId === undefined) return;
    const target = scroller.querySelector<HTMLElement>(
      `[data-game-id="${firstUnfinishedId}"]`,
    );
    if (target) scroller.scrollLeft = target.offsetLeft;
  }, [firstUnfinishedId]);

  // The scrollbar is hidden, so a mouse can scroll the strip by dragging it
  // or with a plain wheel (at either end the wheel falls through to the page).
  // Touch already scrolls natively.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = scroller.scrollWidth - scroller.clientWidth;
      const atEnd =
        e.deltaY > 0 ? scroller.scrollLeft >= max - 1 : scroller.scrollLeft <= 0;
      if (atEnd) return;
      e.preventDefault();
      scroller.scrollLeft += e.deltaY;
    };

    let drag: { startX: number; startScroll: number; moved: boolean } | null =
      null;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { startX: e.clientX, startScroll: scroller.scrollLeft, moved: false };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      if (!drag.moved && Math.abs(dx) < 5) return;
      drag.moved = true;
      scroller.style.cursor = "grabbing";
      scroller.scrollLeft = drag.startScroll - dx;
    };
    const onPointerUp = () => {
      if (drag?.moved) {
        // Swallow the click that ends a drag so it doesn't open a game.
        scroller.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
          },
          { capture: true, once: true },
        );
        // If no click follows (released outside a link), drop the listener.
        setTimeout(() => scroller.dispatchEvent(new Event("click")), 0);
      }
      scroller.style.cursor = "";
      drag = null;
    };
    // Stop the browser's native link/image drag from taking over.
    const onDragStart = (e: DragEvent) => e.preventDefault();

    scroller.addEventListener("wheel", onWheel, { passive: false });
    scroller.addEventListener("pointerdown", onPointerDown);
    scroller.addEventListener("dragstart", onDragStart);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("pointerdown", onPointerDown);
      scroller.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <div className="border-b bg-strip text-strip-foreground">
      <div className="container flex items-stretch">
        <div
          ref={scrollerRef}
          className="relative flex min-w-0 flex-1 overflow-x-auto select-none [scrollbar-width:none]"
        >
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

function isFinal(game: GameSummary) {
  return game.gameState === "OFF" || game.gameState === "FINAL";
}

function gameStatus(game: GameSummary) {
  const state = game.gameState;
  if (state === "LIVE" || state === "CRIT") {
    const period = formatPeriod(game.currentPeriod, game.inIntermission);
    const clock =
      !game.inIntermission && game.timeRemaining ? ` ${game.timeRemaining}` : "";
    return { live: true, label: `${period}${clock}` };
  }
  if (isFinal(game)) {
    const suffix =
      game.periodType && game.periodType !== "REG" ? `/${game.periodType}` : "";
    return { live: false, label: `Final${suffix}` };
  }
  return { live: false, label: formatGameTime(game.startTimeUtc) };
}

function StripGame({ game }: { game: GameSummary }) {
  const status = gameStatus(game);
  const started = game.away.goals !== null && game.home.goals !== null;
  const final = isFinal(game);
  const awayLost = final && (game.away.goals ?? 0) < (game.home.goals ?? 0);
  const homeLost = final && (game.home.goals ?? 0) < (game.away.goals ?? 0);

  return (
    <Link
      to="/games/$gameId"
      params={{ gameId: game.gameId }}
      data-game-id={game.gameId}
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
