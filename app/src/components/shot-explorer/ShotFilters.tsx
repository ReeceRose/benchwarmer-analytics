import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/layout";
import { DANGER_LEVEL_OPTIONS } from "@/components/shot-explorer/shot-utils";
import type { RosterPlayer, DangerLevel, ScoreState } from "@/types";

interface ShotFiltersProps {
  period?: number;
  onPeriodChange: (period: number | undefined) => void;
  shotType?: string;
  onShotTypeChange: (type: string | undefined) => void;
  playerId?: number;
  onPlayerIdChange: (id: number | undefined) => void;
  goalsOnly: boolean;
  onGoalsOnlyChange: (goalsOnly: boolean) => void;
  players?: RosterPlayer[];
  limit?: number;
  onLimitChange: (limit: number | undefined) => void;
  dangerLevel: DangerLevel;
  onDangerLevelChange: (level: DangerLevel) => void;
  scoreState: ScoreState;
  onScoreStateChange: (state: ScoreState) => void;
  onClear: () => void;
}

const SHOT_TYPES = [
  { value: "WRIST", label: "Wrist shot" },
  { value: "SLAP", label: "Slap shot" },
  { value: "SNAP", label: "Snap shot" },
  { value: "BACKHAND", label: "Backhand" },
  { value: "TIP", label: "Tip-in" },
  { value: "WRAP", label: "Wraparound" },
  { value: "DEFLECTED", label: "Deflected" },
];

const PERIODS = [
  { value: "1", label: "1st period" },
  { value: "2", label: "2nd period" },
  { value: "3", label: "3rd period" },
  { value: "4", label: "OT" },
];

// Shots come back in game order, so a limit keeps the season's first N.
const LIMITS = [
  { value: "all", label: "No shot limit" },
  { value: "100", label: "First 100 shots" },
  { value: "250", label: "First 250 shots" },
  { value: "500", label: "First 500 shots" },
  { value: "1000", label: "First 1,000 shots" },
];

const SCORE_STATES = [
  { value: "all", label: "All game states" },
  { value: "leading", label: "Leading" },
  { value: "trailing", label: "Trailing" },
  { value: "tied", label: "Tied" },
];

/** One row of compact filters for the team shot map. Values live in the URL. */
export function ShotFilters({
  period,
  onPeriodChange,
  shotType,
  onShotTypeChange,
  playerId,
  onPlayerIdChange,
  goalsOnly,
  onGoalsOnlyChange,
  players = [],
  limit,
  onLimitChange,
  dangerLevel,
  onDangerLevelChange,
  scoreState,
  onScoreStateChange,
  onClear,
}: ShotFiltersProps) {
  const skaters = players.filter((p) => p.position !== "G");
  const hasFilters =
    period !== undefined ||
    shotType !== undefined ||
    playerId !== undefined ||
    goalsOnly ||
    limit !== undefined ||
    dangerLevel !== "all" ||
    scoreState !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        aria-label="Shots or goals"
        value={goalsOnly ? "goals" : "all"}
        onValueChange={(v) => onGoalsOnlyChange(v === "goals")}
        options={[
          { value: "all", label: "All shots" },
          { value: "goals", label: "Goals" },
        ]}
      />
      {skaters.length > 0 && (
        <Select
          value={playerId?.toString() ?? "all"}
          onValueChange={(value) =>
            onPlayerIdChange(value === "all" ? undefined : parseInt(value))
          }
        >
          <SelectTrigger aria-label="Player">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All players</SelectItem>
            {skaters.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select
        value={period?.toString() ?? "all"}
        onValueChange={(value) =>
          onPeriodChange(value === "all" ? undefined : parseInt(value))
        }
      >
        <SelectTrigger aria-label="Period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All periods</SelectItem>
          {PERIODS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={shotType ?? "all"}
        onValueChange={(value) =>
          onShotTypeChange(value === "all" ? undefined : value)
        }
      >
        <SelectTrigger aria-label="Shot type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All shot types</SelectItem>
          {SHOT_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={dangerLevel}
        onValueChange={(value) => onDangerLevelChange(value as DangerLevel)}
      >
        <SelectTrigger aria-label="Danger level">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DANGER_LEVEL_OPTIONS.map((d) => (
            <SelectItem key={d.value} value={d.value}>
              {d.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={scoreState}
        onValueChange={(value) => onScoreStateChange(value as ScoreState)}
      >
        <SelectTrigger aria-label="Game state">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SCORE_STATES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={limit?.toString() ?? "all"}
        onValueChange={(value) =>
          onLimitChange(value === "all" ? undefined : parseInt(value))
        }
      >
        <SelectTrigger aria-label="Shot limit">
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
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
          Clear filters
        </Button>
      )}
    </div>
  );
}
