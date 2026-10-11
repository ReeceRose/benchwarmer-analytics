import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getMetricTooltipContent } from "@/lib/metric-tooltips";

interface StatCellProps {
  // The stat value to display
  value: number | string | null | undefined;
  // Average or comparison value
  average?: number;
  // Whether higher is better for this stat
  higherIsBetter?: boolean;
  // Format function for display
  format?: (value: number) => string;
  // Tooltip content explaining the stat
  tooltip?: ReactNode;
  // Optional metric key (e.g. "xPts", "PDO") to pull tooltip from glossary
  metric?: string;
  // Show trend arrow relative to average
  showTrend?: boolean;
  // Threshold for considering a value "different" from average (as percentage)
  threshold?: number;
  className?: string;
}

export function StatCell({
  value,
  average,
  higherIsBetter = true,
  format = (v) => v.toFixed(1),
  tooltip,
  metric,
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
      colorClass = higherIsBetter ? "text-success" : "text-error";
    } else if (diff < -threshold) {
      trend = "down";
      colorClass = higherIsBetter ? "text-error" : "text-success";
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

  const tooltipContent = tooltip ?? (metric ? getMetricTooltipContent(metric) : null);

  if (tooltipContent) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          {typeof tooltipContent === "string" ? <p className="text-xs">{tooltipContent}</p> : tooltipContent}
          {average !== undefined && (
            <p className="text-xs text-muted-foreground mt-2">
              Avg: {format(average)}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
