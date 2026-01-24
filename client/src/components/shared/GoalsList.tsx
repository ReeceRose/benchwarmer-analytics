import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                {goal.teamCode === awayCode ? "A" : "H"}
              </Badge>
              <span className="font-medium">{goal.scorerName}</span>
              <span className="text-muted-foreground">
                {formatPeriod(goal.period)} {goal.timeInPeriod}
              </span>
              {goal.strength && goal.strength !== "ev" && (
                <Badge
                  variant="secondary"
                  className="text-xs px-1.5 py-0.5 uppercase"
                >
                  {goal.strength}
                </Badge>
              )}
              {goal.isGameWinningGoal && (
                <Badge className="text-xs px-1.5 py-0.5 bg-highlight/20 text-highlight border-highlight/30">
                  GWG
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
