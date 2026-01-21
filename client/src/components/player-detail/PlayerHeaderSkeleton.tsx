import { Skeleton } from "@/components/ui/skeleton";

export function PlayerHeaderSkeleton() {
  return (
    <div className="flex gap-6 mb-6">
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  );
}
