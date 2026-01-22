import { TableHead } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HeaderWithTooltipProps {
  label: string;
  tooltip: string;
  className?: string;
}

export function HeaderWithTooltip({
  label,
  tooltip,
  className,
}: HeaderWithTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TableHead className={cn("font-semibold cursor-help", className)}>
          {label}
        </TableHead>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
