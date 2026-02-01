import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface GiveawayTakeawayCardSkeletonProps {
  className?: string;
}

export function GiveawayTakeawayCardSkeleton({
  className,
}: GiveawayTakeawayCardSkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-36" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Skeleton className="h-3 w-32 mb-1" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-full rounded-md" />
          <Skeleton className="h-3 w-48 mt-1" />
        </div>

        <div className="flex justify-between pt-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="flex gap-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}
