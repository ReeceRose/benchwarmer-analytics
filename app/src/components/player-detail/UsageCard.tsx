import { Panel } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { StackedBar, Swatch } from "@/components/game-live/parts";
import { cn } from "@/lib/utils";

/** Small titled panel for one usage metric, with an optional how-to-read caption. */
export function UsageCard({
  title,
  caption,
  className,
  children,
}: {
  title: string;
  caption?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Panel className={cn("flex flex-col", className)}>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="flex-1 space-y-4">{children}</div>
      {caption && <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">{caption}</p>}
    </Panel>
  );
}

/** A labelled headline number. */
export function UsageNumber({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-display text-3xl leading-tight font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">
        {label}
        {note && <> · {note}</>}
      </div>
    </div>
  );
}

/** Proportional bar with a counted legend underneath. */
export function SplitBar({
  label,
  parts,
}: {
  label: string;
  parts: { label: string; value: number; colour: string }[];
}) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{total} total</span>
      </div>
      <StackedBar parts={parts} />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <Swatch colour={p.colour} />
            {p.label}
            <span className="font-medium text-foreground tabular-nums">
              {p.value}
              {total > 0 && ` (${Math.round((p.value / total) * 100)}%)`}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function UsageCardSkeleton() {
  return (
    <Panel className="space-y-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-2.5 w-full rounded-full" />
      <Skeleton className="h-3 w-3/4" />
    </Panel>
  );
}
