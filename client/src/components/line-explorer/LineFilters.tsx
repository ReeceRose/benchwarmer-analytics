import { Clock, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LineType, LineSortField, SortDirection } from "@/types";

const SORT_OPTIONS: { value: LineSortField; label: string }[] = [
  { value: "toi", label: "Ice Time" },
  { value: "gf", label: "Goals For" },
  { value: "ga", label: "Goals Against" },
  { value: "xgpct", label: "xG%" },
  { value: "cfpct", label: "CF%" },
  { value: "gp", label: "Games Played" },
];

interface LineFiltersProps {
  lineType: LineType;
  onLineTypeChange: (type: LineType) => void;
  minToi: number;
  onMinToiChange: (minToi: number) => void;
  sortBy: LineSortField;
  onSortByChange: (sortBy: LineSortField) => void;
  sortDir: SortDirection;
  onSortDirChange: (sortDir: SortDirection) => void;
}

export function LineFilters({
  lineType,
  onLineTypeChange,
  minToi,
  onMinToiChange,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
}: LineFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Line Type Toggle */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Line Type</Label>
        <Select value={lineType} onValueChange={(v) => onLineTypeChange(v as LineType)}>
          <SelectTrigger className="w-35">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="forward">Forward Lines</SelectItem>
            <SelectItem value="defense">Defense Pairs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Min TOI Filter */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Min TOI (minutes)
        </Label>
        <Input
          type="number"
          min={0}
          max={1000}
          step={5}
          value={minToi}
          onChange={(e) => onMinToiChange(parseInt(e.target.value, 10) || 0)}
          className="w-25"
        />
      </div>

      {/* Sort By */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <ArrowUpDown className="h-3 w-3" />
          Sort By
        </Label>
        <Select value={sortBy} onValueChange={(v) => onSortByChange(v as LineSortField)}>
          <SelectTrigger className="w-30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort Direction */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Order</Label>
        <Select value={sortDir} onValueChange={(v) => onSortDirChange(v as SortDirection)}>
          <SelectTrigger className="w-25">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">High → Low</SelectItem>
            <SelectItem value="asc">Low → High</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
