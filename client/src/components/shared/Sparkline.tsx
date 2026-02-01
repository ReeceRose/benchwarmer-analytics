import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeColor?: string;
  showDots?: boolean;
  highlightLast?: boolean;
}

export function Sparkline({
  data,
  width = 60,
  height = 20,
  className,
  strokeColor,
  showDots = false,
  highlightLast = true,
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Padding for dots
  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  // Generate points
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * innerWidth;
    const y = padding + innerHeight - ((value - min) / range) * innerHeight;
    return { x, y, value };
  });

  // Create path
  const pathD = points
    .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  // Determine trend direction
  const firstHalf = data.slice(0, Math.ceil(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const isUptrend = secondAvg > firstAvg * 1.05;
  const isDowntrend = secondAvg < firstAvg * 0.95;

  const defaultColor = isUptrend
    ? "stroke-success"
    : isDowntrend
      ? "stroke-error"
      : "stroke-muted-foreground";

  return (
    <svg
      width={width}
      height={height}
      className={cn("inline-block", className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={pathD}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeColor ?? defaultColor}
      />

      {showDots &&
        points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={1.5}
            className={cn("fill-current", strokeColor ?? defaultColor)}
          />
        ))}

      {highlightLast && points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={2.5}
          className={cn("fill-current", strokeColor ?? defaultColor)}
        />
      )}
    </svg>
  );
}
