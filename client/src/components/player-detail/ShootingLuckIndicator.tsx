import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ShootingLuckIndicatorProps {
  goals: number;
  expectedGoals: number;
  shots: number;
  className?: string;
}

export function ShootingLuckIndicator({
  goals,
  expectedGoals,
  shots,
  className,
}: ShootingLuckIndicatorProps) {
  if (expectedGoals === 0 || shots === 0) return null;

  const diff = goals - expectedGoals;
  const shootingPct = (goals / shots) * 100;
  const expectedShootingPct = (expectedGoals / shots) * 100;

  // Determine luck status
  const isLucky = diff > 1;
  const isUnlucky = diff < -1;
  const isNeutral = !isLucky && !isUnlucky;

  // Calculate bar width (capped at reasonable values)
  const maxDiff = 15; // Cap the visual at +/- 15 goals
  const normalizedDiff = Math.max(-maxDiff, Math.min(maxDiff, diff));
  const barWidth = Math.abs(normalizedDiff / maxDiff) * 50; // 50% max width each direction

  return (
    <Tooltip>
      <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 cursor-help",
              className
            )}
          >
            <span className="text-xs font-medium text-muted-foreground">
              Luck
            </span>
            <div className="relative w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border z-10" />
              <div
                className={cn(
                  "absolute top-0 bottom-0 transition-all duration-300",
                  isLucky && "bg-success/70 right-1/2",
                  isUnlucky && "bg-error/70 left-1/2",
                  isNeutral && "bg-warning/70 left-1/2"
                )}
                style={{
                  width: `${barWidth}%`,
                  ...(isLucky && { transform: "translateX(100%)" }),
                }}
              />
            </div>

            {isLucky && <TrendingUp className="h-3.5 w-3.5 text-success" />}
            {isUnlucky && <TrendingDown className="h-3.5 w-3.5 text-error" />}
            {isNeutral && <Minus className="h-3.5 w-3.5 text-warning" />}

            <span
              className={cn(
                "text-xs font-semibold tabular-nums min-w-12 text-right",
                isLucky && "text-success",
                isUnlucky && "text-error",
                isNeutral && "text-warning"
              )}
            >
              {diff > 0 ? "+" : ""}
              {diff.toFixed(1)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">
              {isLucky && "Running hot! 🔥"}
              {isUnlucky && "Due for regression 📈"}
              {isNeutral && "Shooting as expected"}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">Goals:</span>
              <span className="font-medium">{goals}</span>
              <span className="text-muted-foreground">Expected Goals:</span>
              <span className="font-medium">{expectedGoals.toFixed(1)}</span>
              <span className="text-muted-foreground">Difference:</span>
              <span
                className={cn(
                  "font-medium",
                  isLucky && "text-success",
                  isUnlucky && "text-error"
                )}
              >
                {diff > 0 ? "+" : ""}
                {diff.toFixed(1)} goals
              </span>
              <span className="text-muted-foreground">Shooting %:</span>
              <span className="font-medium">{formatPercent(shootingPct, false)}</span>
              <span className="text-muted-foreground">Expected Sh%:</span>
              <span className="font-medium">
                {formatPercent(expectedShootingPct, false)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground pt-1 border-t">
              {isLucky &&
                "Player has scored more than expected based on shot quality. May regress."}
              {isUnlucky &&
                "Player has scored fewer than expected. Due for positive regression."}
              {isNeutral &&
                "Player is scoring in line with expected goal models."}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
  );
}
