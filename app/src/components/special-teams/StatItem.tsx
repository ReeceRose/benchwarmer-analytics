interface StatItemProps {
  label: string;
  value: string | number;
  subValue?: string;
}

export function StatItem({ label, value, subValue }: StatItemProps) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {subValue && (
        <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>
      )}
    </div>
  );
}
