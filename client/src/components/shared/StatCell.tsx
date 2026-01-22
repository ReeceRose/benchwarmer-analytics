import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface StatCellProps {
  /** The stat value to display */
  value: number | string | null | undefined;
  /** Average or comparison value */
  average?: number;
  /** Whether higher is better for this stat */
  higherIsBetter?: boolean;
  /** Format function for display */
  format?: (value: number) => string;
  /** Tooltip text explaining the stat */
  tooltip?: string;
  /** Show trend arrow relative to average */
  showTrend?: boolean;
  /** Threshold for considering a value "different" from average (as percentage) */
  threshold?: number;
  className?: string;
}

export function StatCell({
  value,
  average,
  higherIsBetter = true,
  format = (v) => v.toFixed(1),
  tooltip,
  showTrend = true,
  threshold = 0.05,
  className,
}: StatCellProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  const displayValue = typeof value === "string" ? value : format(numValue);

  // Determine trend relative to average
  let trend: "up" | "down" | "neutral" = "neutral";
  let colorClass = "";

  if (average !== undefined && showTrend && !isNaN(numValue)) {
    const diff = (numValue - average) / Math.abs(average || 1);

    if (diff > threshold) {
      trend = "up";
      colorClass = higherIsBetter ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
    } else if (diff < -threshold) {
      trend = "down";
      colorClass = higherIsBetter ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400";
    }
  }

  const content = (
    <span className={cn("inline-flex items-center gap-1", colorClass, className)}>
      <span className="tabular-nums">{displayValue}</span>
      {showTrend && average !== undefined && (
        <span className="w-3">
          {trend === "up" && <ArrowUp className="h-3 w-3" />}
          {trend === "down" && <ArrowDown className="h-3 w-3" />}
          {trend === "neutral" && <Minus className="h-3 w-3 text-muted-foreground" />}
        </span>
      )}
    </span>
  );

  if (tooltip) {
    return (
      
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
            {average !== undefined && (
              <p className="text-xs text-muted-foreground">
                Avg: {format(average)}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      
    );
  }

  return content;
}
