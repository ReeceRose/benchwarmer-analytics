import { useMemo } from "react";
import type { Shot } from "@/types";
import {
  Tooltip,
  TooltipContent,
  
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RINK_COLOURS, getHeatmapColour } from "@/lib/chart-colours";

interface ShotHeatMapProps {
  shots: Shot[];
  width?: number;
  mode?: "xg" | "volume";
  title?: string;
}

// NHL rink dimensions
const RINK_LENGTH = 100;
const RINK_HEIGHT = 85;
const GOAL_LINE_X = 11;
const BLUE_LINE_X = 75;
const CREASE_DEPTH = 6;
const CREASE_WIDTH = 8;

// Grid configuration for heat map
const GRID_COLS = 10;
const GRID_ROWS = 8;
const CELL_WIDTH = (RINK_LENGTH - GOAL_LINE_X) / GRID_COLS;
const CELL_HEIGHT = RINK_HEIGHT / GRID_ROWS;

interface HeatZone {
  row: number;
  col: number;
  x: number;
  y: number;
  shots: number;
  goals: number;
  totalXg: number;
  avgXg: number;
  shootingPct: number;
}

function getZoneColor(
  value: number,
  max: number,
  mode: "xg" | "volume"
): string {
  if (value === 0) return "transparent";
  const intensity = Math.min(value / max, 1);
  return getHeatmapColour(intensity, mode);
}

export function ShotHeatMap({
  shots,
  width = 480,
  mode = "xg",
  title,
}: ShotHeatMapProps) {
  const height = Math.round(width * (RINK_HEIGHT / RINK_LENGTH));

  // Calculate heat zones from shots
  const { zones, maxValue } = useMemo(() => {
    const zoneMap = new Map<string, HeatZone>();

    // Initialize zones
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const key = `${row}-${col}`;
        zoneMap.set(key, {
          row,
          col,
          x: GOAL_LINE_X + col * CELL_WIDTH,
          y: row * CELL_HEIGHT,
          shots: 0,
          goals: 0,
          totalXg: 0,
          avgXg: 0,
          shootingPct: 0,
        });
      }
    }

    // Populate zones with shot data
    for (const shot of shots) {
      if (shot.arenaAdjustedXCoord == null || shot.arenaAdjustedYCoord == null)
        continue;

      const rawX = Math.abs(shot.arenaAdjustedXCoord);
      const rawY = shot.arenaAdjustedYCoord;

      // Transform to SVG coordinates
      const clampedX = Math.min(Math.max(rawX, 0), 100);
      const svgX =
        GOAL_LINE_X + ((89 - clampedX) / 89) * (RINK_LENGTH - GOAL_LINE_X);
      const clampedY = Math.min(Math.max(rawY, -42.5), 42.5);
      const svgY = clampedY + 42.5;

      // Find which zone this shot belongs to
      const col = Math.min(
        Math.floor((svgX - GOAL_LINE_X) / CELL_WIDTH),
        GRID_COLS - 1
      );
      const row = Math.min(Math.floor(svgY / CELL_HEIGHT), GRID_ROWS - 1);

      if (col < 0 || row < 0) continue;

      const key = `${row}-${col}`;
      const zone = zoneMap.get(key);
      if (zone) {
        zone.shots++;
        zone.totalXg += shot.xGoal ?? 0;
        if (shot.isGoal) zone.goals++;
      }
    }

    // Calculate averages and find max
    let max = 0;
    for (const zone of zoneMap.values()) {
      if (zone.shots > 0) {
        zone.avgXg = zone.totalXg / zone.shots;
        zone.shootingPct = (zone.goals / zone.shots) * 100;
        const value = mode === "xg" ? zone.avgXg : zone.shots;
        max = Math.max(max, value);
      }
    }

    return { zones: Array.from(zoneMap.values()), maxValue: max };
  }, [shots, mode]);

  const totalShots = shots.length;
  const totalGoals = shots.filter((s) => s.isGoal).length;
  const totalXg = shots.reduce((sum, s) => sum + (s.xGoal ?? 0), 0);

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      )}
      
        <svg
          viewBox={`0 0 ${RINK_LENGTH} ${RINK_HEIGHT}`}
          width={width}
          height={height}
          className="bg-slate-100 dark:bg-slate-900 rounded-lg border border-border"
          preserveAspectRatio="xMidYMid meet"
        >
          <path
            d={`
              M ${RINK_LENGTH} 0
              L 10 0
              Q 0 0 0 10
              L 0 ${RINK_HEIGHT - 10}
              Q 0 ${RINK_HEIGHT} 10 ${RINK_HEIGHT}
              L ${RINK_LENGTH} ${RINK_HEIGHT}
              L ${RINK_LENGTH} 0
              Z
            `}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-slate-300 dark:text-slate-700"
          />
          <path
            d={`
              M ${RINK_LENGTH - 1} 1
              L 10 1
              Q 1 1 1 10
              L 1 ${RINK_HEIGHT - 10}
              Q 1 ${RINK_HEIGHT - 1} 10 ${RINK_HEIGHT - 1}
              L ${RINK_LENGTH - 1} ${RINK_HEIGHT - 1}
              L ${RINK_LENGTH - 1} 1
              Z
            `}
            fill="white"
            className="dark:fill-slate-800"
          />

          {zones.map((zone) => {
            const value = mode === "xg" ? zone.avgXg : zone.shots;
            const color = getZoneColor(value, maxValue, mode);

            return (
              <Tooltip key={`${zone.row}-${zone.col}`}>
                <TooltipTrigger asChild>
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width={CELL_WIDTH}
                    height={CELL_HEIGHT}
                    fill={color}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-sm">
                  <div className="space-y-1">
                    <div className="font-semibold">{zone.shots} shots</div>
                    <div className="grid grid-cols-2 gap-x-3">
                      <span className="opacity-70">Goals:</span>
                      <span className="font-medium">{zone.goals}</span>
                      <span className="opacity-70">Avg xG:</span>
                      <span className="font-medium">
                        {(zone.avgXg * 100).toFixed(1)}%
                      </span>
                      <span className="opacity-70">Sh%:</span>
                      <span className="font-medium">
                        {zone.shootingPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          <line
            x1={GOAL_LINE_X}
            y1="0"
            x2={GOAL_LINE_X}
            y2={RINK_HEIGHT}
            stroke={RINK_COLOURS.goalLine}
            strokeWidth="0.5"
            opacity="0.6"
          />
          <line
            x1={BLUE_LINE_X}
            y1="0"
            x2={BLUE_LINE_X}
            y2={RINK_HEIGHT}
            stroke={RINK_COLOURS.blueLine}
            strokeWidth="1"
            opacity="0.6"
          />
          <rect
            x={GOAL_LINE_X}
            y={RINK_HEIGHT / 2 - CREASE_WIDTH / 2}
            width={CREASE_DEPTH}
            height={CREASE_WIDTH}
            fill={RINK_COLOURS.creaseFill}
            fillOpacity="0.3"
            stroke={RINK_COLOURS.goalLine}
            strokeWidth="0.3"
            rx="1"
          />
          <rect
            x={GOAL_LINE_X - 4}
            y={RINK_HEIGHT / 2 - 3}
            width="4"
            height="6"
            fill="none"
            stroke={RINK_COLOURS.goalLine}
            strokeWidth="0.5"
            opacity="0.6"
          />
        </svg>
      

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">{totalShots}</span>{" "}
          shots
        </div>
        <div>
          <span className="font-medium text-foreground">{totalGoals}</span>{" "}
          goals
        </div>
        <div>
          <span className="font-medium text-foreground">
            {totalXg.toFixed(1)}
          </span>{" "}
          xG
        </div>
        <div>
          <span className="font-medium text-foreground">
            {totalShots > 0 ? ((totalGoals / totalShots) * 100).toFixed(1) : 0}%
          </span>{" "}
          Sh%
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{mode === "xg" ? "Low xG" : "Few shots"}</span>
        <div className="flex h-3 w-24 rounded overflow-hidden">
          <div className="flex-1 bg-cold/30" />
          <div className="flex-1 bg-warning/50" />
          <div className="flex-1 bg-error/70" />
        </div>
        <span>{mode === "xg" ? "High xG" : "Many shots"}</span>
      </div>
    </div>
  );
}
