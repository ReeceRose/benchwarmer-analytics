import type { ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getMetricTooltipContent } from "@/lib/metric-tooltips";

interface SortableTableHeaderProps<T extends string> {
  label: string;
  tooltip?: ReactNode;
  /** Optional metric key (e.g. "xG/60") to pull tooltip from glossary */
  metric?: string;
  sortKey: T;
  currentSort: T;
  sortDesc: boolean;
  onSort: (key: T) => void;
  isHighlighted?: boolean;
  className?: string;
  /** If true, the arrow direction is inverted to indicate "lower is better" semantics */
  lowerIsBetter?: boolean;
}

export function SortableTableHeader<T extends string>({
  label,
  tooltip,
  metric,
  sortKey,
  currentSort,
  sortDesc,
  onSort,
  isHighlighted = false,
  className,
  lowerIsBetter = false,
}: SortableTableHeaderProps<T>) {
  const isActive = currentSort === sortKey;
  // For "lower is better" stats like GAA, invert the arrow direction
  // so ascending (best values first) shows the down arrow
  const showDescArrow = lowerIsBetter ? !sortDesc : sortDesc;
  const tooltipContent = tooltip ?? (metric ? getMetricTooltipContent(metric) : null);

  const head = (
    <TableHead
      className={cn(
        "cursor-pointer text-right transition-colors select-none hover:text-foreground",
        isHighlighted && "bg-accent/60 font-semibold text-foreground",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center justify-end gap-1 whitespace-nowrap">
        {label}
        {isActive && (
          <ArrowDown
            className={cn("size-3 shrink-0 text-foreground", !showDescArrow && "rotate-180")}
          />
        )}
      </span>
    </TableHead>
  );

  if (!tooltipContent) return head;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{head}</TooltipTrigger>
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
