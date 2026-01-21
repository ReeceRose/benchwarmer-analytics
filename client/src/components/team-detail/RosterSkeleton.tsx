import { Skeleton } from "@/components/ui/skeleton";

export function RosterSkeleton() {
  return (
    <div className="space-y-6">
      {/* Forwards skeleton */}
      <div>
        <Skeleton className="h-5 w-24 mb-3" />
        <div className="rounded-md border">
          <div className="p-3 border-b">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-3 border-b last:border-0">
              <div className="flex gap-4 items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-8 rounded-full" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Defensemen skeleton */}
      <div>
        <Skeleton className="h-5 w-28 mb-3" />
        <div className="rounded-md border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 border-b last:border-0">
              <div className="flex gap-4 items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-8 rounded-full" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Goalies skeleton */}
      <div>
        <Skeleton className="h-5 w-20 mb-3" />
        <div className="rounded-md border">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-3 border-b last:border-0">
              <div className="flex gap-4 items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-8 rounded-full" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
