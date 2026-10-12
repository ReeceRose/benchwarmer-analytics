import { Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="flex flex-wrap items-end gap-4">
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
          className="w-20"
        />
      </div>
    </div>
  );
}
