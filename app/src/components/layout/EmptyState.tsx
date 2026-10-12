import { cn } from "@/lib/utils";

/** Quiet "nothing here" message with a hint about what to change. */
export function EmptyState({
  title,
  hint,
  className,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
