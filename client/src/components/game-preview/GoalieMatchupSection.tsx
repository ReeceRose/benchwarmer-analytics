import { Link } from "@tanstack/react-router";
import type { GoalieMatchup, GoaliePreview } from "@/types";

interface GoalieMatchupSectionProps {
  data: GoalieMatchup;
  homeTeam: string;
  awayTeam: string;
}

function GoalieCard({ goalie }: { goalie: GoaliePreview }) {
  return (
    <Link
      to="/players/$id"
      params={{ id: goalie.playerId.toString() }}
      className="block p-3 bg-muted/30 rounded hover:bg-muted/50 transition-colors"
    >
      <div className="text-center space-y-1.5">
        <div className="font-medium text-sm">{goalie.name}</div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">SV%</div>
            <div className="font-mono text-xs">
              {goalie.savePct != null
                ? (goalie.savePct * 100).toFixed(1)
                : "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">GAA</div>
            <div className="font-mono text-xs">
              {goalie.goalsAgainstAvg?.toFixed(2) ?? "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">GSAX</div>
            <div
              className={`font-mono text-xs ${
                goalie.goalsSavedAboveExpected != null &&
                goalie.goalsSavedAboveExpected > 0
                  ? "text-green-600"
                  : goalie.goalsSavedAboveExpected != null &&
                      goalie.goalsSavedAboveExpected < 0
                    ? "text-red-500"
                    : ""
              }`}
            >
              {goalie.goalsSavedAboveExpected != null
                ? `${goalie.goalsSavedAboveExpected > 0 ? "+" : ""}${goalie.goalsSavedAboveExpected.toFixed(1)}`
                : "-"}
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {goalie.gamesPlayed} GP
        </div>
      </div>
    </Link>
  );
}

function TeamGoalies({
  goalies,
  team,
}: {
  goalies: GoaliePreview[];
  team: string;
}) {
  if (goalies.length === 0) {
    return (
      <div className="text-center p-4 bg-muted/30 rounded">
        <p className="text-sm text-muted-foreground">{team}</p>
        <p className="text-xs text-muted-foreground mt-1">No goalie data</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground uppercase tracking-wide text-center">
        {team}
      </div>
      <div className="space-y-2">
        {goalies.map((goalie) => (
          <GoalieCard key={goalie.playerId} goalie={goalie} />
        ))}
      </div>
    </div>
  );
}

export function GoalieMatchupSection({
  data,
  homeTeam,
  awayTeam,
}: GoalieMatchupSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Goalies</h3>

      <div className="grid grid-cols-2 gap-4">
        <TeamGoalies goalies={data.home} team={homeTeam} />
        <TeamGoalies goalies={data.away} team={awayTeam} />
      </div>
    </div>
  );
}
