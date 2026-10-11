import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatsTableSkeleton() {
  return (
    <Card className="py-0 gap-0">
      <CardContent className="p-0 overflow-hidden">
      <div className="bg-muted/50 p-3 border-b">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-14 hidden md:block" />
          <Skeleton className="h-4 w-10 hidden md:block" />
          <Skeleton className="h-4 w-12 hidden lg:block" />
          <Skeleton className="h-4 w-12 hidden lg:block" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-3 border-b last:border-0">
          <div className="flex gap-4 items-center">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-14 hidden md:block" />
            <Skeleton className="h-4 w-8 hidden md:block" />
            <Skeleton className="h-4 w-10 hidden lg:block" />
            <Skeleton className="h-4 w-12 hidden lg:block" />
          </div>
        </div>
      ))}
      <div className="bg-muted/50 p-3 border-t-2">
        <div className="flex gap-4 items-center">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
      </CardContent>
    </Card>
  );
}
