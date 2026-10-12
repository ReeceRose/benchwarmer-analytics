import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { formatPeriod } from "@/lib/game-formatters";
import type { GameGoal } from "@/types";

interface GoalsListProps {
  goals: GameGoal[];
  awayCode: string;
  /** If true, shows expanded by default (for detail pages) */
  defaultExpanded?: boolean;
}

/**
 * Expandable list of goals scored in a game
 */
export function GoalsList({ goals, awayCode, defaultExpanded = false }: GoalsListProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!goals || goals.length === 0) return null;

  const displayGoals = expanded ? goals : goals.slice(0, 3);

  return (
    <div className="pt-2 border-t">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
      >
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        Goals ({goals.length})
      </button>
      {expanded && (
        <div className="space-y-1 text-xs">
          {displayGoals.map((goal, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <TeamLogo abbrev={goal.teamCode} size="sm" />
              <span className="sr-only">{goal.teamCode === awayCode ? "Away" : "Home"}</span>
              <span className="font-medium">{goal.scorerName}</span>
              <span className="text-muted-foreground">
                {formatPeriod(goal.period)} {goal.timeInPeriod}
              </span>
              {goal.strength && goal.strength !== "ev" && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase">
                  {goal.strength}
                </span>
              )}
              {goal.isGameWinningGoal && (
<span className="rounded-full bg-highlight/20 px-1.5 py-0.5 text-[11px] font-semibold">
                  GWG
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
