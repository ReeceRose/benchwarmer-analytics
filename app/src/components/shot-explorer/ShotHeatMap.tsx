import { useMemo } from "react";
import type { Shot } from "@/types";
import { TooltipTitle } from "@/components/game-live/ChartTooltip";
import { useChartTooltip } from "@/components/game-live/useChartTooltip";
import { HalfRink } from "@/components/shot-explorer/HalfRink";
import { toHalfRink } from "@/components/shot-explorer/shot-utils";
import { cn } from "@/lib/utils";

interface ShotHeatMapProps {
  shots: Shot[];
  mode?: "xg" | "volume";
  className?: string;
}

// 10 ft × 8.5 ft cells over the whole half rink (the boards clip the corners).
const COLS = 10;
const ROWS = 10;
const CELL_W = 100 / COLS;
const CELL_H = 85 / ROWS;
/** Below this many shots a cell's average xG is mostly noise, so it isn't shaded in xG mode. */
const MIN_SHOTS_FOR_XG = 3;
const HUE = "var(--chart-1)";

/** One hue from clear to full strength: sequential, so no rainbow. */
function shade(intensity: number): string {
  return `color-mix(in oklab, ${HUE} ${Math.round(8 + intensity * 82)}%, transparent)`;
}

interface Zone {
  key: string;
  x: number;
  y: number;
  shots: number;
  goals: number;
  xg: number;
}

/**
 * Shots binned into a grid on one offensive zone, shaded by average xG per
 * shot (where the good chances come from) or by shot count (where the
 * shots come from).
 */
export function ShotHeatMap({ shots, mode = "xg", className }: ShotHeatMapProps) {
  const { bind, tooltip } = useChartTooltip();

  const { zones, max } = useMemo(() => {
    const grid = new Map<string, Zone>();
    for (const shot of shots) {
      if (shot.arenaAdjustedXCoord == null || shot.arenaAdjustedYCoord == null) continue;
      // Empty-net shots from distance have huge xG and would light up the neutral zone.
      if (mode === "xg" && shot.shotOnEmptyNet) continue;
      const { x, y } = toHalfRink(shot.arenaAdjustedXCoord, shot.arenaAdjustedYCoord, shot.shotDistance);
      if (x >= 100) continue;
      const col = Math.min(Math.floor(x / CELL_W), COLS - 1);
      const row = Math.min(Math.floor((y + 42.5) / CELL_H), ROWS - 1);
      const key = `${row}-${col}`;
      let zone = grid.get(key);
      if (!zone) {
        zone = { key, x: col * CELL_W, y: row * CELL_H - 42.5, shots: 0, goals: 0, xg: 0 };
        grid.set(key, zone);
      }
      zone.shots++;
      zone.xg += shot.xGoal ?? 0;
      if (shot.isGoal) zone.goals++;
    }
    const list = [...grid.values()];
    const value = (z: Zone) => (mode === "xg" ? (z.shots >= MIN_SHOTS_FOR_XG ? z.xg / z.shots : 0) : z.shots);
    return { zones: list.map((z) => ({ ...z, value: value(z) })), max: Math.max(0, ...list.map(value)) };
  }, [shots, mode]);

  const format = (v: number) => (mode === "xg" ? `${(v * 100).toFixed(0)}%` : String(Math.round(v)));

  return (
    <div className={cn("w-full max-w-140 space-y-3", className)}>
      <HalfRink label={mode === "xg" ? "Heat map of average xG per shot" : "Heat map of shot volume"} showSlot={false} underlay>
        {zones.map((z) => (
          <rect
            key={z.key}
            x={z.x + 0.15}
            y={z.y + 0.15}
            width={CELL_W - 0.3}
            height={CELL_H - 0.3}
            rx={0.8}
            fill={z.value > 0 && max > 0 ? shade(z.value / max) : "transparent"}
            {...bind(
              <>
                <TooltipTitle>
                  {z.shots} {z.shots === 1 ? "shot" : "shots"}, {z.goals} {z.goals === 1 ? "goal" : "goals"}
                </TooltipTitle>
                <div className="tabular-nums">
                  {z.xg.toFixed(1)} xG · {((z.xg / z.shots) * 100).toFixed(1)}% per shot
                </div>
                {mode === "xg" && z.shots < MIN_SHOTS_FOR_XG && (
                  <div className="text-muted-foreground">Too few shots to shade</div>
                )}
              </>,
            )}
          />
        ))}
      </HalfRink>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span>{mode === "xg" ? "xG per shot" : "Shots"}</span>
          <span className="tabular-nums">{format(0)}</span>
          <span
            aria-hidden
            className="h-2.5 w-24 rounded-full"
            style={{ background: `linear-gradient(to right, ${shade(0)}, ${shade(1)})`, boxShadow: "inset 0 0 0 1px var(--border)" }}
          />
          <span className="tabular-nums">{format(max)}</span>
        </span>
        {mode === "xg" && <span>Zones with fewer than {MIN_SHOTS_FOR_XG} shots are left blank; empty-net shots are left out</span>}
      </div>
      {tooltip}
    </div>
  );
}
