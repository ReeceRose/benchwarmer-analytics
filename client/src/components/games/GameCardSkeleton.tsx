import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function GameCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-6" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
