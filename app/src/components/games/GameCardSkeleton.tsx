import { Skeleton } from "@/components/ui/skeleton";

export function GameCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card p-4">
      <div className="mb-3 flex justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="mt-2 flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-7 w-6" />
        </div>
      ))}
      <div className="mt-auto pt-3">
        <div className="space-y-2 border-t pt-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
