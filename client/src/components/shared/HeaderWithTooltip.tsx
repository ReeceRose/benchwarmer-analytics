import type { ReactNode } from "react";
import { TableHead } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getMetricTooltipContent } from "@/lib/metric-tooltips";

interface HeaderWithTooltipProps {
  label: string;
  tooltip?: ReactNode;
  /** Optional metric key (e.g. "PDO", "xPts") to pull tooltip from glossary */
  metric?: string;
  className?: string;
}

export function HeaderWithTooltip({
  label,
  tooltip,
  metric,
  className,
}: HeaderWithTooltipProps) {
  const tooltipContent = tooltip ?? (metric ? getMetricTooltipContent(metric) : null);

  if (!tooltipContent) {
    return <TableHead className={cn(className)}>{label}</TableHead>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TableHead className={cn("font-semibold cursor-help", className)}>
          {label}
        </TableHead>
      </TooltipTrigger>
      <TooltipContent>
        {typeof tooltipContent === "string" ? (
          <p className="text-xs">{tooltipContent}</p>
        ) : (
          tooltipContent
        )}
      </TooltipContent>
    </Tooltip>
  );
}
