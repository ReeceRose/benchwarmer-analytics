import type { TeamComparison } from "@/types";

interface TeamComparisonSectionProps {
  data: TeamComparison;
}

function ComparisonBar({
  label,
  homeValue,
  awayValue,
  format = "decimal",
  higherIsBetter = true,
}: {
  label: string;
  homeValue: number | null;
  awayValue: number | null;
  format?: "decimal" | "percent";
  higherIsBetter?: boolean;
}) {
  const home = homeValue ?? 0;
  const away = awayValue ?? 0;
  const total = home + away;
  const homePercent = total > 0 ? (home / total) * 100 : 50;

  const formatValue = (val: number | null) => {
    if (val === null) return "-";
    if (format === "percent") return `${val.toFixed(1)}%`;
    return val.toFixed(2);
  };

  const homeBetter = higherIsBetter ? home > away : home < away;
  const awayBetter = higherIsBetter ? away > home : away < home;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span
          className={homeBetter ? "font-semibold text-green-600" : "text-muted-foreground"}
        >
          {formatValue(homeValue)}
        </span>
        <span className="text-muted-foreground">{label}</span>
        <span
          className={awayBetter ? "font-semibold text-green-600" : "text-muted-foreground"}
        >
          {formatValue(awayValue)}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
        <div
          className={`transition-all ${homeBetter ? "bg-green-500" : "bg-muted-foreground/30"}`}
          style={{ width: `${homePercent}%` }}
        />
        <div
          className={`transition-all ${awayBetter ? "bg-green-500" : "bg-muted-foreground/30"}`}
          style={{ width: `${100 - homePercent}%` }}
        />
      </div>
    </div>
  );
}

export function TeamComparisonSection({ data }: TeamComparisonSectionProps) {
  const { home, away } = data;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{home.teamCode}</span>
        <h3 className="text-sm font-medium text-muted-foreground">Team Comparison</h3>
        <span className="font-medium">{away.teamCode}</span>
      </div>

      <div className="space-y-3">
        <ComparisonBar
          label="xGF/GP"
          homeValue={home.xGoalsFor}
          awayValue={away.xGoalsFor}
          higherIsBetter={true}
        />
        <ComparisonBar
          label="xGA/GP"
          homeValue={home.xGoalsAgainst}
          awayValue={away.xGoalsAgainst}
          higherIsBetter={false}
        />
        <ComparisonBar
          label="xG%"
          homeValue={home.xGoalsPct}
          awayValue={away.xGoalsPct}
          format="percent"
          higherIsBetter={true}
        />
        <ComparisonBar
          label="CF%"
          homeValue={home.corsiPct}
          awayValue={away.corsiPct}
          format="percent"
          higherIsBetter={true}
        />
        {(home.powerPlayPct !== null || away.powerPlayPct !== null) && (
          <ComparisonBar
            label="PP%"
            homeValue={home.powerPlayPct}
            awayValue={away.powerPlayPct}
            format="percent"
            higherIsBetter={true}
          />
        )}
        {(home.penaltyKillPct !== null || away.penaltyKillPct !== null) && (
          <ComparisonBar
            label="PK%"
            homeValue={home.penaltyKillPct}
            awayValue={away.penaltyKillPct}
            format="percent"
            higherIsBetter={true}
          />
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Based on {home.gamesPlayed} GP (home) / {away.gamesPlayed} GP (away)
      </div>
    </div>
  );
}
