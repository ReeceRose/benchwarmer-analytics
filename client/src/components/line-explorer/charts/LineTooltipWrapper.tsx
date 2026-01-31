import type { LineChartDataPoint } from "@/components/line-explorer/charts/line-chart-utils";

interface LineTooltipWrapperProps {
  active?: boolean;
  children: (data: LineChartDataPoint) => React.ReactNode;
  payload?: Array<{ payload: LineChartDataPoint }>;
}

export function LineTooltipWrapper({ active, payload, children }: LineTooltipWrapperProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="font-semibold mb-2">{data.label}</div>
      <div className="space-y-1 text-xs">{children(data)}</div>
    </div>
  );
}
