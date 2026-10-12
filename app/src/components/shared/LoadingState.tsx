import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  // Type of loading skeleton to display
  variant?: "card" | "table" | "list" | "page";
  // Number of items to show for list/table variants
  count?: number;
  className?: string;
}

export function LoadingState({
  variant = "card",
  count = 3,
  className,
}: LoadingStateProps) {
  if (variant === "page") {
    return (
      <div className={cn("space-y-6 p-6", className)}>
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-100" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-75" />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("space-y-2", className)}>
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-50" />
              <Skeleton className="h-3 w-38" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: card variant
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-lg" />
      ))}
    </div>
  );
}

/** Placeholder for a data table: same frame and row rhythm as the real thing. */
export function TableSkeleton({
  rows = 8,
  columns = 8,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card", className)}>
      <div className="flex items-center gap-4 border-b px-4 py-3">
        <Skeleton className="h-3 w-32" />
        {Array.from({ length: columns - 1 }).map((_, i) => (
          <Skeleton key={i} className="ml-auto h-3 w-8" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-3.5 w-36" />
          {Array.from({ length: columns - 1 }).map((_, i) => (
            <Skeleton key={i} className="ml-auto h-3.5 w-8" />
          ))}
        </div>
      ))}
    </div>
  );
}
