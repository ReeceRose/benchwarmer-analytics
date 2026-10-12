import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/layout";
import type { LineType } from "@/types";

interface LineFiltersProps {
  lineType: LineType;
  onLineTypeChange: (type: LineType) => void;
  minToi: number;
  onMinToiChange: (minToi: number) => void;
}

export function LineFilters({
  lineType,
  onLineTypeChange,
  minToi,
  onMinToiChange,
}: LineFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        aria-label="Line type"
        value={lineType}
        onValueChange={onLineTypeChange}
        options={[
          { value: "forward", label: "Forward lines" },
          { value: "defense", label: "Defense pairs" },
        ]}
      />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        At least
        <Input
          type="number"
          min={0}
          max={1000}
          step={5}
          value={minToi}
          onChange={(e) => onMinToiChange(parseInt(e.target.value, 10) || 0)}
          className="h-9 w-20"
        />
        minutes together
      </label>
    </div>
  );
}
