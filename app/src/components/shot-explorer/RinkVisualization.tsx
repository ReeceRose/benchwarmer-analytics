import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import type { Shot } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipTitle } from "@/components/game-live/ChartTooltip";
import { useChartTooltip } from "@/components/game-live/useChartTooltip";
import { mmss, periodName } from "@/components/game-live/live-utils";
import { Swatch } from "@/components/game-live/parts";
import { HalfRink } from "@/components/shot-explorer/HalfRink";
import { toHalfRink } from "@/components/shot-explorer/shot-utils";
import { SHOT_DANGER_COLOURS, getShotColour } from "@/lib/chart-colours";
import { MONEYPUCK_DANGER_THRESHOLDS } from "@/lib/danger-zones";
import {
  getPlayerHeadshotUrl,
  getPlayerInitials,
} from "@/lib/player-headshots";
import { cn } from "@/lib/utils";

interface RinkVisualizationProps {
  shots: Shot[];
  showLegend?: boolean;
  teamAbbreviation?: string;
  className?: string;
}

const SHOT_TYPE_LABEL: Record<string, string> = {
  WRIST: "Wrist shot",
  SLAP: "Slap shot",
  SNAP: "Snap shot",
  BACKHAND: "Backhand",
  TIP: "Tip-in",
  WRAP: "Wraparound",
  DEFLECTED: "Deflection",
};

/** "2nd 4:15": the period and the time elapsed in it. */
function shotClock(shot: Shot): string {
  const intoPeriod =
    shot.gameTimeSeconds - (Math.min(shot.period, 4) - 1) * 1200;
  return `${periodName(shot.period)} ${mmss(intoPeriod)}`;
}

function resultLabel(shot: Shot): string {
  if (shot.isGoal) return shot.shotOnEmptyNet ? "Empty-net goal" : "Goal";
  return shot.shotWasOnGoal ? "Saved" : "Missed the net";
}

/** Area-proportional radius: a shot with 4× the xG gets 2× the radius. */
function radius(xg: number, scale: number): number {
  return (0.35 + Math.sqrt(Math.max(xg, 0)) * 1.8) * scale;
}

interface PlacedShot {
  shot: Shot;
  x: number;
  y: number;
  r: number;
  colour: string;
}

function ShotMark({
  placed,
  highlighted,
}: {
  placed: PlacedShot;
  highlighted: boolean;
}) {
  const { shot, x, y, r, colour } = placed;
  const ring = highlighted ? "var(--foreground)" : "var(--card)";
  if (shot.isGoal) {
    return (
      <circle
        cx={x}
        cy={y}
        r={r + 0.15}
        fill={colour}
        stroke={ring}
        strokeWidth={highlighted ? 0.4 : 0.25}
      />
    );
  }
  // Low-danger shots are most of any map, so they sit back.
  const low = (shot.xGoal ?? 0) < MONEYPUCK_DANGER_THRESHOLDS.medium;
  if (shot.shotWasOnGoal) {
    return (
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={colour}
        fillOpacity={low ? 0.55 : 0.85}
        stroke={ring}
        strokeWidth={highlighted ? 0.4 : 0.2}
      />
    );
  }
  return (
    <circle
      cx={x}
      cy={y}
      r={Math.max(r - 0.15, 0.35)}
      fill="none"
      stroke={highlighted ? "var(--foreground)" : colour}
      strokeOpacity={highlighted ? 1 : low ? 0.5 : 0.8}
      strokeWidth={0.3}
    />
  );
}

function ShotTooltip({ shot }: { shot: Shot }) {
  return (
    <>
      <TooltipTitle colour={getShotColour(shot.isGoal, shot.xGoal ?? 0)}>
        {shot.shooterName ?? "Unknown shooter"} · {resultLabel(shot)}
      </TooltipTitle>
      <div className="text-muted-foreground">
        {shotClock(shot)} · {SHOT_TYPE_LABEL[shot.shotType ?? ""] ?? "Shot"}
      </div>
      <div className="tabular-nums">
        xG <b>{((shot.xGoal ?? 0) * 100).toFixed(1)}%</b>
        {shot.shotDistance != null && ` · ${shot.shotDistance.toFixed(0)} ft`}
        {shot.shotRebound && " · rebound"}
        {shot.shotRush && " · rush"}
      </div>
    </>
  );
}

function ShotDetail({
  shot,
  team,
  onClose,
}: {
  shot: Shot;
  team?: string;
  onClose: () => void;
}) {
  const tags = [
    shot.shotRebound && "Rebound",
    shot.shotRush && "Rush",
    shot.shotOnEmptyNet && "Empty net",
  ].filter(Boolean);
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
      {shot.shooterPlayerId && (
        <Avatar className="size-9">
          <AvatarImage
            src={getPlayerHeadshotUrl(shot.shooterPlayerId, team)}
            alt={shot.shooterName ?? ""}
          />
          <AvatarFallback className="text-[10px]">
            {getPlayerInitials(shot.shooterName ?? "?")}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium">
          {shot.shooterPlayerId ? (
            <Link
              to="/players/$id"
              params={{ id: String(shot.shooterPlayerId) }}
              className="hover:text-link"
            >
              {shot.shooterName}
            </Link>
          ) : (
            "Unknown shooter"
          )}
          <span
            className={cn(
              "ml-2 font-semibold",
              shot.isGoal ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {resultLabel(shot)}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
          {shotClock(shot)} · {SHOT_TYPE_LABEL[shot.shotType ?? ""] ?? "Shot"}
          {shot.shotDistance != null && ` · ${shot.shotDistance.toFixed(0)} ft`}
          {" · "}xG {((shot.xGoal ?? 0) * 100).toFixed(1)}%
        </div>
        {tags.length > 0 && (
          <div className="mt-1.5 flex gap-1.5">
            {tags.map((tag) => (
              <span
                key={String(tag)}
                className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Clear selected shot"
        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function ResultKey({ kind }: { kind: "saved" | "missed" }) {
  return (
    <svg width={14} height={14} aria-hidden>
      {kind === "saved" && (
        <circle cx={7} cy={7} r={4.5} fill="var(--muted-foreground)" />
      )}
      {kind === "missed" && (
        <circle
          cx={7}
          cy={7}
          r={4}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth={1.6}
        />
      )}
    </svg>
  );
}

/**
 * Unblocked shots on one offensive zone. Size is xG, colour is danger
 * (goals in green), and shape is the result. Hover for details; click (or
 * tap) a shot to pin it below the rink.
 */
export function RinkVisualization({
  shots,
  showLegend = true,
  teamAbbreviation,
  className,
}: RinkVisualizationProps) {
  const { bind, tooltip } = useChartTooltip();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const placed = useMemo<PlacedShot[]>(() => {
    const onIce = shots.filter(
      (s) => s.arenaAdjustedXCoord != null && s.arenaAdjustedYCoord != null,
    );
    // Shrink the dots a little on busy maps so the shape of the zone still shows.
    const scale = onIce.length > 1500 ? 0.85 : 1;
    return (
      onIce
        .map((shot) => {
          const { x, y } = toHalfRink(
            shot.arenaAdjustedXCoord!,
            shot.arenaAdjustedYCoord!,
            shot.shotDistance,
          );
          return {
            shot,
            x,
            y,
            r: radius(shot.xGoal ?? 0, scale),
            colour: getShotColour(shot.isGoal, shot.xGoal ?? 0),
          };
        })
        // Small chances underneath, goals on top.
        .sort(
          (a, b) =>
            Number(a.shot.isGoal) - Number(b.shot.isGoal) ||
            (a.shot.xGoal ?? 0) - (b.shot.xGoal ?? 0),
        )
    );
  }, [shots]);

  const marks = useMemo(
    () =>
      placed.map((p) => (
        <ShotMark key={p.shot.shotId} placed={p} highlighted={false} />
      )),
    [placed],
  );
  const selected = placed.find((p) => p.shot.shotId === selectedId)?.shot;
  const focus = new Set([hoveredId, selectedId]);

  return (
    <div className={cn("w-full max-w-140 space-y-3", className)}>
      <div onClick={() => setSelectedId(null)}>
        <HalfRink label={`Shot map, ${placed.length} shots`}>
          {marks}
          {placed
            .filter((p) => focus.has(p.shot.shotId))
            .map((p) => (
              <ShotMark key={`focus-${p.shot.shotId}`} placed={p} highlighted />
            ))}
          {placed.map((p) => {
            const handlers = bind(<ShotTooltip shot={p.shot} />);
            return (
              <circle
                key={`hit-${p.shot.shotId}`}
                cx={p.x}
                cy={p.y}
                r={Math.max(p.r, 1.6)}
                fill="transparent"
                className="cursor-pointer"
                onMouseMove={(e) => {
                  setHoveredId(p.shot.shotId);
                  handlers.onMouseMove(e);
                }}
                onMouseLeave={() => {
                  setHoveredId(null);
                  handlers.onMouseLeave();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId((id) =>
                    id === p.shot.shotId ? null : p.shot.shotId,
                  );
                }}
              />
            );
          })}
        </HalfRink>
      </div>
      {selected && (
        <ShotDetail
          shot={selected}
          team={teamAbbreviation}
          onClose={() => setSelectedId(null)}
        />
      )}
      {showLegend && <ShotMapLegend />}
      {tooltip}
    </div>
  );
}

/** Colour, shape and size key for `RinkVisualization`. */
export function ShotMapLegend() {
  return (
    <div className="space-y-1.5 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5">
          <Swatch colour={SHOT_DANGER_COLOURS.goal} />
          Goal
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Swatch colour={SHOT_DANGER_COLOURS.highDanger} />
          High danger (xG 20%+)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Swatch colour={SHOT_DANGER_COLOURS.mediumDanger} />
          Medium (8–20%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Swatch colour={SHOT_DANGER_COLOURS.lowDanger} />
          Low (under 8%)
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="inline-flex items-center gap-1">
          <ResultKey kind="saved" />
          On goal
        </span>
        <span className="inline-flex items-center gap-1">
          <ResultKey kind="missed" />
          Missed
        </span>
        <span>Size = xG · dashed box = the slot</span>
      </div>
    </div>
  );
}
