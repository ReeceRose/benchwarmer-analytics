import { getHeatColor } from "@/components/chemistry/chemistry-utils";

export function ChemistryLegend() {
  return (
    <div className="flex items-center gap-4 mb-4 text-sm">
      <span className="text-muted-foreground">xG%:</span>
      <div className="flex items-center gap-1">
        <div
          className="w-4 h-4 rounded"
          style={{ backgroundColor: getHeatColor(35, true) }}
        />
        <span>35%</span>
      </div>
      <div className="flex items-center gap-1">
        <div
          className="w-4 h-4 rounded"
          style={{ backgroundColor: getHeatColor(50, true) }}
        />
        <span>50%</span>
      </div>
      <div className="flex items-center gap-1">
        <div
          className="w-4 h-4 rounded"
          style={{ backgroundColor: getHeatColor(65, true) }}
        />
        <span>65%</span>
      </div>
      <div className="flex items-center gap-2 ml-4 border-l pl-4">
        <div className="w-4 h-4 rounded border border-dashed border-muted-foreground/50" />
        <span className="text-muted-foreground">No data</span>
      </div>
    </div>
  );
}
