import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getRankColour } from "@/lib/stat-colours";

/**
 * Heatmap fill: strongest at 1st and 32nd, fading to nothing by 11th / 22nd.
 */
function rankTint(rank: number): string | undefined {
  const strength =
    rank <= 10 ? (11 - rank) / 10 : rank >= 23 ? (rank - 22) / 10 : 0;
  if (strength === 0) return undefined;
  const colour = rank <= 10 ? "var(--chart-3)" : "var(--chart-2)";
  return `color-mix(in oklab, ${colour} ${Math.round(6 + strength * 22)}%, transparent)`;
}

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
        "inline-flex min-w-9 items-center justify-center rounded-full px-1.5 py-1 text-sm font-medium tabular-nums",
        colorClass,
        className
      )}
      style={{ backgroundColor: rankTint(rank) }}
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
