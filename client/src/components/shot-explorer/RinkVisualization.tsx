import { useMemo } from "react";
import type { Shot } from "@/types";
import {
  Tooltip,
  TooltipContent,
  
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RINK_COLOURS, getShotColour as getShotColourFromLib } from "@/lib/chart-colours";

interface RinkVisualizationProps {
  shots: Shot[];
  width?: number;
  showLegend?: boolean;
}

// NHL rink dimensions (in feet): 200ft long x 85ft wide
// Half-rink (offensive zone): 100ft x 85ft
// MoneyPuck coordinates: x from -100 to 100, y from -42.5 to 42.5
// Offensive shots have |x| typically from 0 to ~89 (goal line at 89)
//
// Our SVG uses feet as units for the half-rink, with goal on LEFT
// SVG coordinate system: x=0 is end boards, x=100 is center ice
//                        y=0 is top (one side), y=85 is bottom (other side)
const RINK_LENGTH = 100; // half-rink length (horizontal in SVG)
const RINK_HEIGHT = 85;  // rink width (vertical in SVG)
const GOAL_LINE_X = 11;  // 11ft from end boards
const BLUE_LINE_X = 75;  // 75ft from end boards (25ft from center)
const CREASE_DEPTH = 6;    // crease extends 6ft from goal line
const CREASE_WIDTH = 8;    // crease is 8ft wide (4ft each side of center)
const FACEOFF_CIRCLE_RADIUS = 15;
const FACEOFF_DOT_RADIUS = 1;
const FACEOFF_X = 31; // 20ft from goal line = 31ft from boards
const FACEOFF_Y_OFFSET = 22; // 22ft from center

function getShotColor(shot: Shot): string {
  return getShotColourFromLib(shot.isGoal, shot.xGoal ?? 0);
}

function getShotSize(shot: Shot, totalShots: number): number {
  const xg = shot.xGoal ?? 0;
  // Scale size based on shot count - smaller dots when many shots
  // Made smaller overall per user feedback
  const baseMin = totalShots > 300 ? 1.2 : totalShots > 150 ? 1.5 : 1.8;
  const baseMax = totalShots > 300 ? 3 : totalShots > 150 ? 3.5 : 4;
  return Math.max(baseMin, Math.min(baseMax, baseMin + xg * 12));
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function ShotTooltipContent({ shot }: { shot: Shot }) {
  return (
    <div className="space-y-1 text-sm">
      <div className="font-semibold">
        {shot.shooterName || "Unknown"}{" "}
        {shot.shooterPosition && (
          <span className="text-muted-foreground">({shot.shooterPosition})</span>
        )}
      </div>
      <div className="flex gap-3 text-muted-foreground">
        <span>P{shot.period}</span>
        <span>{formatTime(shot.gameTimeSeconds)}</span>
        <span>{shot.shotType || "Shot"}</span>
      </div>
      <div className="flex gap-3">
        <span>
          xG: <span className="font-medium">{((shot.xGoal ?? 0) * 100).toFixed(1)}%</span>
        </span>
        <span>
          {shot.shotDistance?.toFixed(0)}ft @ {shot.shotAngle?.toFixed(0)}°
        </span>
      </div>
      <div
        className={`font-semibold ${shot.isGoal ? "text-success" : "text-muted-foreground"}`}
      >
        {shot.isGoal ? "GOAL" : shot.shotWasOnGoal ? "Save" : "Missed"}
      </div>
      {(shot.shotRebound || shot.shotRush || shot.shotOnEmptyNet) && (
        <div className="flex gap-2 text-xs">
          {shot.shotRebound && (
            <span className="bg-hot/20 text-hot px-1.5 py-0.5 rounded font-medium">
              Rebound
            </span>
          )}
          {shot.shotRush && (
            <span className="bg-cold/20 text-cold px-1.5 py-0.5 rounded font-medium">
              Rush
            </span>
          )}
          {shot.shotOnEmptyNet && (
            <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
              Empty Net
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function RinkVisualization({
  shots,
  width = 480,
  showLegend = true,
}: RinkVisualizationProps) {
  // Calculate height to maintain proper NHL rink aspect ratio (100:85)
  const height = Math.round(width * (RINK_HEIGHT / RINK_LENGTH));

  // Transform shot coordinates to SVG coordinates
  // MoneyPuck arena-adjusted coords: x from -100 to 100, y from -42.5 to 42.5
  // For offensive shots (team shooting), |x| is typically 0-89 (goal line at ~89)
  // Our SVG: half-rink 100x85 feet, goal on LEFT at x=11
  const transformedShots = useMemo(() => {
    const validShots = shots.filter(
      (s) => s.arenaAdjustedXCoord != null && s.arenaAdjustedYCoord != null
    );
    const totalCount = validShots.length;

    return validShots.map((shot) => {
      // Use absolute X coordinate (shots are normalized to offensive end)
      const rawX = Math.abs(shot.arenaAdjustedXCoord ?? 0);
      const rawY = shot.arenaAdjustedYCoord ?? 0;

      // Transform MoneyPuck coords to SVG coords
      // MoneyPuck: |x|=89 is at goal line, |x|=0 is center ice
      // SVG: x=11 is goal line, x=100 is center ice (right edge)
      // Clamp rawX to [0, 100] to handle edge cases
      const clampedX = Math.min(Math.max(rawX, 0), 100);
      // Linear map: rawX 0->100 maps to svgX 100->0 (flip direction)
      // Then offset by GOAL_LINE_X since goal line is at x=11, not x=0
      const svgX = GOAL_LINE_X + ((89 - clampedX) / 89) * (RINK_LENGTH - GOAL_LINE_X);

      // Y: MoneyPuck -42.5 to 42.5 maps to SVG 0 to 85
      // Clamp to valid range
      const clampedY = Math.min(Math.max(rawY, -42.5), 42.5);
      const svgY = clampedY + 42.5;

      return {
        shot,
        x: svgX,
        y: svgY,
        color: getShotColor(shot),
        size: getShotSize(shot, totalCount),
      };
    });
  }, [shots]);

  return (
    <div className="relative">
      
        <svg
          viewBox={`0 0 ${RINK_LENGTH} ${RINK_HEIGHT}`}
          width={width}
          height={height}
          className="bg-slate-100 dark:bg-slate-900 rounded-lg border border-border"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="goal-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
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
          <line
            x1={GOAL_LINE_X}
            y1="0"
            x2={GOAL_LINE_X}
            y2={RINK_HEIGHT}
            stroke={RINK_COLOURS.goalLine}
            strokeWidth="0.5"
          />
          <line
            x1={BLUE_LINE_X}
            y1="0"
            x2={BLUE_LINE_X}
            y2={RINK_HEIGHT}
            stroke={RINK_COLOURS.blueLine}
            strokeWidth="1"
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
          />
          <circle
            cx={FACEOFF_X}
            cy={RINK_HEIGHT / 2 - FACEOFF_Y_OFFSET}
            r={FACEOFF_CIRCLE_RADIUS}
            fill="none"
            stroke={RINK_COLOURS.goalLine}
            strokeWidth="0.3"
          />
          <circle
            cx={FACEOFF_X}
            cy={RINK_HEIGHT / 2 - FACEOFF_Y_OFFSET}
            r={FACEOFF_DOT_RADIUS}
            fill={RINK_COLOURS.goalLine}
          />
          <circle
            cx={FACEOFF_X}
            cy={RINK_HEIGHT / 2 + FACEOFF_Y_OFFSET}
            r={FACEOFF_CIRCLE_RADIUS}
            fill="none"
            stroke={RINK_COLOURS.goalLine}
            strokeWidth="0.3"
          />
          <circle
            cx={FACEOFF_X}
            cy={RINK_HEIGHT / 2 + FACEOFF_Y_OFFSET}
            r={FACEOFF_DOT_RADIUS}
            fill={RINK_COLOURS.goalLine}
          />
          {transformedShots
            .filter(({ shot }) => !shot.isGoal)
            .map(({ shot, x, y, color, size }) => {
              // Lower opacity when many shots
              const baseOpacity =
                transformedShots.length > 500
                  ? 0.4
                  : transformedShots.length > 200
                    ? 0.5
                    : 0.7;
              return (
                <Tooltip key={shot.shotId}>
                  <TooltipTrigger asChild>
                    <circle
                      cx={x}
                      cy={y}
                      r={size}
                      fill={color}
                      fillOpacity={baseOpacity}
                      className="cursor-pointer transition-all hover:opacity-100"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <ShotTooltipContent shot={shot} />
                  </TooltipContent>
                </Tooltip>
              );
            })}
          {transformedShots
            .filter(({ shot }) => shot.isGoal)
            .map(({ shot, x, y, color, size }) => (
            <Tooltip key={shot.shotId}>
              <TooltipTrigger asChild>
                <circle
                  cx={x}
                  cy={y}
                  r={size}
                  fill={color}
                  fillOpacity={1}
                  stroke="white"
                  strokeWidth={1}
                  filter="url(#goal-glow)"
                  className="cursor-pointer transition-all hover:opacity-100"
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <ShotTooltipContent shot={shot} />
              </TooltipContent>
            </Tooltip>
          ))}
        </svg>
      
      {showLegend && (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-success ring-2 ring-white" />
            <span>Goal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-error" />
            <span>High Danger (xG &gt; 15%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span>Medium Danger (6-15%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cold" />
            <span>Low Danger (&lt; 6%)</span>
          </div>
          <div className="text-xs ml-auto">Dot size = xG probability</div>
        </div>
      )}
    </div>
  );
}
