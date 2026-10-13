import { getHeatColor } from "@/components/chemistry/chemistry-utils";

const STOPS = [35, 40, 45, 50, 55, 60, 65];

/** The diverging xG-share scale used by the grid. */
export function ChemistryLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>xG share together</span>
        <span className="tabular-nums">35%</span>
        <div className="flex gap-0.5">
          {STOPS.map((stop) => (
            <span
              key={stop}
              className="h-2.5 w-5 rounded-[3px]"
              style={{ backgroundColor: getHeatColor(stop, true) }}
            />
          ))}
        </div>
        <span className="tabular-nums">65%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-5 rounded-[3px] opacity-45" style={{ backgroundColor: getHeatColor(62, true) }} />
        <span>Faded: little time together</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="size-1 rounded-full bg-border" />
        <span>Not a regular line or pair</span>
      </div>
    </div>
  );
}
