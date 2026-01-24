import { ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SortableTableHeaderProps<T extends string> {
  label: string;
  tooltip: string;
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

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TableHead
          className={cn(
            "text-right cursor-pointer hover:bg-muted/50 transition-colors",
            isHighlighted && "bg-muted/30 font-semibold",
            className
          )}
          onClick={() => onSort(sortKey)}
        >
          <span className="flex items-center justify-end gap-1 whitespace-nowrap">
            {label}
            {isActive && (
              <ArrowUpDown
                className={cn("h-3 w-3 shrink-0", !showDescArrow && "rotate-180")}
              />
            )}
          </span>
        </TableHead>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
