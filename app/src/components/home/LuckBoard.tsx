import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { cn } from "@/lib/utils";

export interface LuckRow {
  playerId: number;
  name: string;
  team?: string;
  /** Positive = better than expected. */
  value: number;
  /** Shown on hover, e.g. "6 G on 0.9 xG". */
  detail: string;
}

/**
 * Diverging bar list: positive values extend right, negative left. Names sit
 * on the side opposite their bar so both halves stay readable. With `goodBad`
 * (GSAx) the sides are success/error; otherwise (goals vs xG, which is
 * neither good nor bad) right is `chart-1` and left muted ink.
 */
export function LuckBoard({
  rows,
  negativeLabel,
  positiveLabel,
  valueLabel,
  goodBad = false,
}: {
  rows: LuckRow[];
  negativeLabel: string;
  positiveLabel: string;
  valueLabel: string;
  goodBad?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Not enough games played yet.
      </p>
    );
  }

  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);

  return (
    <div>
      <div className="grid grid-cols-[1.25rem_1fr_3.5rem_1fr] gap-2.5 pb-1.5 text-[11px] text-muted-foreground">
        <span />
        <span className="text-right">{negativeLabel}</span>
        <span className="text-center">{valueLabel}</span>
        <span>{positiveLabel}</span>
      </div>
      {rows.map((row) => {
        const positive = row.value >= 0;
        const width = `${(Math.abs(row.value) / max) * 100}%`;
        const bar = (
          <div
            className={cn(
              "h-2.5 rounded-full",
              goodBad
                ? positive ? "bg-success" : "bg-error"
                : positive ? "bg-chart-1" : "bg-muted-foreground",
            )}
            style={{ width }}
          />
        );
        const name = (
          <span className="truncate group-hover:text-link">{row.name}</span>
        );
        return (
          <Link
            key={row.playerId}
            to="/players/$id"
            params={{ id: String(row.playerId) }}
            title={row.detail}
            className="group grid grid-cols-[1.25rem_1fr_3.5rem_1fr] items-center gap-2.5 border-t py-2 text-sm"
          >
            {row.team ? (
              <TeamLogo abbrev={row.team} size="sm" />
            ) : (
              <span />
            )}
            <div className="flex min-w-0 justify-end">{positive ? name : bar}</div>
            <span
              className={cn(
                "text-center font-semibold tabular-nums",
                goodBad && (positive ? "text-success" : "text-error"),
              )}
            >
              {positive ? "+" : "−"}
              {Math.abs(row.value).toFixed(1)}
            </span>
            <div className="flex min-w-0">{positive ? bar : name}</div>
          </Link>
        );
      })}
    </div>
  );
}

export function LuckBoardSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-[1.25rem_1fr_3.5rem_1fr] items-center gap-2.5">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="ml-auto h-3 w-24" />
          <Skeleton className="mx-auto h-3 w-8" />
          <Skeleton className="h-2.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}
