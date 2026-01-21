interface StatBarProps {
  label: string;
  value: number;
  average?: number;
  min?: number;
  max?: number;
  format?: (value: number) => string;
  higherIsBetter?: boolean;
  className?: string;
}

export function StatBar({
  label,
  value,
  average,
  min = 0,
  max = 100,
  format = (v) => v.toFixed(1),
  higherIsBetter = true,
  className = "",
}: StatBarProps) {
  // Calculate percentage position (clamped to 0-100)
  const range = max - min;
  const valuePercent =
    range > 0 ? Math.max(0, Math.min(100, ((value - min) / range) * 100)) : 50;
  const avgPercent =
    average != null && range > 0
      ? Math.max(0, Math.min(100, ((average - min) / range) * 100))
      : null;

  // Determine color based on comparison to average
  let barColor = "bg-primary";
  if (average != null) {
    const isAboveAvg = value > average;
    const isBelowAvg = value < average;

    if (higherIsBetter) {
      if (isAboveAvg) barColor = "bg-green-500";
      else if (isBelowAvg) barColor = "bg-red-500";
    } else {
      if (isBelowAvg) barColor = "bg-green-500";
      else if (isAboveAvg) barColor = "bg-red-500";
    }
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{format(value)}</span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${valuePercent}%` }}
        />
        {avgPercent != null && (
          <div
            className="absolute top-0 w-0.5 h-full bg-foreground/70"
            style={{ left: `${avgPercent}%` }}
            title={`Avg: ${format(average!)}`}
          />
        )}
      </div>
      {average != null && (
        <div className="text-xs text-muted-foreground">
          Avg: {format(average)}
        </div>
      )}
    </div>
  );
}
