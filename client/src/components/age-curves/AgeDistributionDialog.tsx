import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_COLORS, CHART_AXIS_COLORS } from "@/lib/chart-colors";

export interface HistogramBin {
  range: string;
  count: number;
  min: number;
  max: number;
}

interface AgeDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAge: number | null;
  metricLabel: string;
  histogramData: HistogramBin[];
  totalDataPoints: number;
  isLoading: boolean;
}

export function AgeDistributionDialog({
  open,
  onOpenChange,
  selectedAge,
  metricLabel,
  histogramData,
  totalDataPoints,
  isLoading,
}: AgeDistributionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {metricLabel} Distribution at Age {selectedAge}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : histogramData.length > 0 ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={histogramData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART_AXIS_COLORS.grid}
                      strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                    />
                    <XAxis
                      dataKey="range"
                      tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={1}
                      stroke={CHART_AXIS_COLORS.grid}
                      strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                    />
                    <YAxis
                      tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 12 }}
                      width={40}
                      label={{
                        value: "Players",
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 12,
                        fill: CHART_AXIS_COLORS.tick,
                      }}
                      stroke={CHART_AXIS_COLORS.grid}
                      strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload as {
                          range: string;
                          count: number;
                        };
                        return (
                          <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-2 text-sm">
                            <p className="font-medium">
                              {metricLabel}: {data.range}
                            </p>
                            <p className="text-muted-foreground">
                              {data.count} player-seasons
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill={CHART_COLORS[0]}
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Distribution of {totalDataPoints.toLocaleString()} player-seasons
                at age {selectedAge}. This shows why older ages can have
                misleading averages — only elite players remain in the league.
              </p>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No data available for age {selectedAge}.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
