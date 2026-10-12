import { cn } from "@/lib/utils";

/** A labelled headline number on a neutral surface. */
export function StatTile({
  label,
  value,
  note,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card px-4 py-3.5", className)}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-3xl font-bold tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}
