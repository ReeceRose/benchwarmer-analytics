import { describeInjury, injuryShortLabel, isOut } from "@/lib/injuries";
import { cn } from "@/lib/utils";
import type { PlayerInjury } from "@/types";

/**
 * A player's injury status as a small chip: red when they won't play (IR,
 * out, suspended), amber when day-to-day. Hover text says why, and the
 * earliest they can return.
 */
export function InjuryBadge({ injury, className }: { injury: PlayerInjury | null | undefined; className?: string }) {
  if (!injury) return null;
  const description = describeInjury(injury);
  return (
    <span
      title={description}
      aria-label={description}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none uppercase",
        isOut(injury) ? "bg-error/15 text-error" : "bg-warning/15 text-warning",
        className,
      )}
    >
      {injuryShortLabel(injury)}
    </span>
  );
}
