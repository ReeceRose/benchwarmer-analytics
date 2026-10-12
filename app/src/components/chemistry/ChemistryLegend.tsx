import { getHeatColor } from "@/components/chemistry/chemistry-utils";

const STOPS = [35, 40, 45, 50, 55, 60, 65];

export function ChemistryLegend() {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Share of xG together</span>
        <span className="tabular-nums">35%</span>
        <div className="flex overflow-hidden rounded-full">
          {STOPS.map((stop) => (
            <span
              key={stop}
              className="h-3 w-6"
              style={{ backgroundColor: getHeatColor(stop, true) }}
            />
          ))}
        </div>
        <span className="tabular-nums">65%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="size-3 rounded-sm border border-dashed border-border" />
        <span>Not on the ice together enough</span>
      </div>
    </div>
  );
}
