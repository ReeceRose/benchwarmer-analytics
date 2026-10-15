import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
/**
 * One-hue heat map: `chart-1` strongest at 1st, fading to nothing by 11th.
 * The bottom 10 are muted rather than red, so the table doesn't become a
 * traffic light.
 */
function rankTint(rank: number): string | undefined {
  if (rank > 10) return undefined;
  const strength = (11 - rank) / 10;
  return `color-mix(in oklab, var(--chart-1) ${Math.round(6 + strength * 24)}%, transparent)`;
}

function rankText(rank: number): string {
  if (rank <= 10) return "font-semibold text-foreground";
  if (rank >= 23) return "text-muted-foreground";
  return "";
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

  const content = (
    <span
      className={cn(
        "inline-flex min-w-9 items-center justify-center rounded-full px-1.5 py-1 text-sm font-medium tabular-nums",
        rankText(rank),
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
