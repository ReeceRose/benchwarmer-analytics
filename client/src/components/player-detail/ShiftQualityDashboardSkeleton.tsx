import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ShiftQualityDashboardSkeletonProps {
  className?: string;
}

export function ShiftQualityDashboardSkeleton({
  className,
}: ShiftQualityDashboardSkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-full rounded-md" />
          <div className="flex justify-between mt-1">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div>
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}
