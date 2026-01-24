import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { formatSavePct } from "@/lib/formatters";
import type { GoalieMatchup, GoaliePreview, GoalieRecentForm } from "@/types";

interface GoalieMatchupSectionProps {
  data: GoalieMatchup;
  homeTeam: string;
  awayTeam: string;
  recentForm?: { home: GoalieRecentForm[]; away: GoalieRecentForm[] };
}

function GoalieCard({
  goalie,
  recentForm,
}: {
  goalie: GoaliePreview;
  recentForm?: GoalieRecentForm;
}) {
  // Compare recent form to season average (1% threshold)
  const isHot =
    recentForm &&
    goalie.savePct != null &&
    recentForm.savePct != null &&
    recentForm.savePct >= goalie.savePct + 0.01;
  const isCold =
    recentForm &&
    goalie.savePct != null &&
    recentForm.savePct != null &&
    recentForm.savePct <= goalie.savePct - 0.01;

  return (
    <Link
      to="/players/$id"
      params={{ id: goalie.playerId.toString() }}
      className="block p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors"
    >
      <div className="text-center space-y-1">
        <div className="font-medium text-sm">{goalie.name}</div>
        <div className="flex items-center justify-center gap-3 text-xs">
          <span>
            <span className="text-muted-foreground">SV%</span>{" "}
            <span className="font-mono">{formatSavePct(goalie.savePct)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">GAA</span>{" "}
            <span className="font-mono">
              {goalie.goalsAgainstAvg?.toFixed(2) ?? "-"}
            </span>
          </span>
          <span>
            <span className="text-muted-foreground">GSAX</span>{" "}
            <span
              className={`font-mono ${
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
            </span>
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>{goalie.gamesPlayed} GP</span>
          {recentForm && recentForm.gamesPlayed > 0 && (
            <span
              className={`flex items-center gap-1 ${
                isHot ? "text-orange-500" : isCold ? "text-blue-500" : ""
              }`}
            >
              {isHot && <Flame className="h-3 w-3" />}L{recentForm.gamesPlayed}:{" "}
              {formatSavePct(recentForm.savePct)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function TeamGoalies({
  goalies,
  team,
  recentForms,
}: {
  goalies: GoaliePreview[];
  team: string;
  recentForms?: GoalieRecentForm[];
}) {
  if (goalies.length === 0) {
    return (
      <div className="text-center p-4 bg-muted/30 rounded">
        <p className="text-sm text-muted-foreground">{team}</p>
        <p className="text-xs text-muted-foreground mt-1">No goalie data</p>
      </div>
    );
  }

  // Create a lookup map for recent form by player ID
  const recentFormMap = new Map(
    recentForms?.map((rf) => [rf.playerId, rf]) ?? []
  );

  return (
    <div className="space-y-1.5">
      <div className="text-xs text-muted-foreground uppercase tracking-wide text-center">
        {team}
      </div>
      <div className="space-y-1.5">
        {goalies.map((goalie) => (
          <GoalieCard
            key={goalie.playerId}
            goalie={goalie}
            recentForm={recentFormMap.get(goalie.playerId)}
          />
        ))}
      </div>
    </div>
  );
}

export function GoalieMatchupSection({
  data,
  homeTeam,
  awayTeam,
  recentForm,
}: GoalieMatchupSectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Goalies</h3>

      <div className="grid grid-cols-2 gap-3">
        <TeamGoalies
          goalies={data.home}
          team={homeTeam}
          recentForms={recentForm?.home}
        />
        <TeamGoalies
          goalies={data.away}
          team={awayTeam}
          recentForms={recentForm?.away}
        />
      </div>
    </div>
  );
}
