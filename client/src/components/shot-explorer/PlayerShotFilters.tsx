import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { DangerLevel } from "@/types";
import { formatSeason } from "@/lib/formatters";

interface PlayerShotFiltersProps {
  season: number;
  onSeasonChange: (season: number) => void;
  availableSeasons?: number[];
  period?: number;
  onPeriodChange: (period: number | undefined) => void;
  shotType?: string;
  onShotTypeChange: (type: string | undefined) => void;
  goalsOnly: boolean;
  onGoalsOnlyChange: (goalsOnly: boolean) => void;
  limit?: number;
  onLimitChange: (limit: number | undefined) => void;
  dangerLevel: DangerLevel;
  onDangerLevelChange: (level: DangerLevel) => void;
}

const SHOT_TYPES = [
  { value: "WRIST", label: "Wrist Shot" },
  { value: "SLAP", label: "Slap Shot" },
  { value: "SNAP", label: "Snap Shot" },
  { value: "BACKHAND", label: "Backhand" },
  { value: "TIP", label: "Tip-In" },
  { value: "WRAP", label: "Wrap Around" },
  { value: "DEFLECTED", label: "Deflected" },
];

const PERIODS = [
  { value: "1", label: "1st Period" },
  { value: "2", label: "2nd Period" },
  { value: "3", label: "3rd Period" },
  { value: "4", label: "OT" },
];

const LIMITS = [
  { value: "100", label: "100 shots" },
  { value: "250", label: "250 shots" },
  { value: "500", label: "500 shots" },
  { value: "all", label: "All shots" },
];

const DANGER_LEVELS = [
  { value: "all", label: "All Shots" },
  { value: "high", label: "High Danger (xG > 15%)" },
  { value: "medium-high", label: "Medium+ (xG > 6%)" },
  { value: "low", label: "Low Danger (xG < 6%)" },
];

export function PlayerShotFilters({
  season,
  onSeasonChange,
  availableSeasons = [],
  period,
  onPeriodChange,
  shotType,
  onShotTypeChange,
  goalsOnly,
  onGoalsOnlyChange,
  limit,
  onLimitChange,
  dangerLevel,
  onDangerLevelChange,
}: PlayerShotFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Season Filter */}
      {availableSeasons.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="season-filter" className="text-sm">
            Season
          </Label>
          <Select
            value={season.toString()}
            onValueChange={(value) => onSeasonChange(parseInt(value))}
          >
            <SelectTrigger id="season-filter" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableSeasons.map((s) => (
                <SelectItem key={s} value={s.toString()}>
                  {formatSeason(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Period Filter */}
      <div className="space-y-1.5">
        <Label htmlFor="period-filter" className="text-sm">
          Period
        </Label>
        <Select
          value={period?.toString() ?? "all"}
          onValueChange={(value) =>
            onPeriodChange(value === "all" ? undefined : parseInt(value))
          }
        >
          <SelectTrigger id="period-filter" className="w-32">
            <SelectValue placeholder="All Periods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Shot Type Filter */}
      <div className="space-y-1.5">
        <Label htmlFor="shot-type-filter" className="text-sm">
          Shot Type
        </Label>
        <Select
          value={shotType ?? "all"}
          onValueChange={(value) =>
            onShotTypeChange(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger id="shot-type-filter" className="w-35">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {SHOT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Danger Level Filter */}
      <div className="space-y-1.5">
        <Label htmlFor="danger-filter" className="text-sm">
          Danger Level
        </Label>
        <Select
          value={dangerLevel}
          onValueChange={(value) => onDangerLevelChange(value as DangerLevel)}
        >
          <SelectTrigger id="danger-filter" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DANGER_LEVELS.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Limit Filter */}
      <div className="space-y-1.5">
        <Label htmlFor="limit-filter" className="text-sm">
          Show
        </Label>
        <Select
          value={limit?.toString() ?? "all"}
          onValueChange={(value) =>
            onLimitChange(value === "all" ? undefined : parseInt(value))
          }
        >
          <SelectTrigger id="limit-filter" className="w-30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIMITS.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Goals Only Toggle */}
      <div className="flex items-center space-x-2 pb-0.5">
        <Switch
          id="goals-only"
          checked={goalsOnly}
          onCheckedChange={onGoalsOnlyChange}
        />
        <Label htmlFor="goals-only" className="text-sm cursor-pointer">
          Goals Only
        </Label>
      </div>
    </div>
  );
}
