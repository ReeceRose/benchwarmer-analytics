import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getRankColour } from "@/lib/stat-colours";

interface RankBadgeProps {
  rank: number;
  value?: number | string;
  label?: string;
  format?: (value: number) => string;
  className?: string;
}

export function RankBadge({
  rank,
  value,
  label,
  format = (v) => v.toFixed(1),
  className,
}: RankBadgeProps) {
  const colorClass = getRankColour(rank);

  const content = (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-8 px-1.5 py-0.5 rounded text-sm font-medium tabular-nums",
        colorClass,
        className
      )}
    >
      {rank}
    </span>
  );

  if (value !== undefined || label) {
    const displayValue =
      typeof value === "number" ? format(value) : value;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            {label && <p className="font-medium">{label}</p>}
            {displayValue !== undefined && (
              <p className="opacity-80">
                Value: {displayValue}
              </p>
            )}
            <p className="opacity-80">Rank: {rank} of 32</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
