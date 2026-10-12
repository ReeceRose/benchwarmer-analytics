import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeamHeading } from "@/components/game-preview/TeamHeading";
import { formatSavePct } from "@/lib/formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import { cn } from "@/lib/utils";
import type { GoalieMatchup, GoaliePreview, GoalieRecentForm } from "@/types";

interface GoalieMatchupSectionProps {
  data: GoalieMatchup;
  homeTeam: string;
  awayTeam: string;
  recentForm?: { home: GoalieRecentForm[]; away: GoalieRecentForm[] };
}

function GoalieRow({
  goalie,
  team,
  recentForm,
}: {
  goalie: GoaliePreview;
  team: string;
  recentForm?: GoalieRecentForm;
}) {
  // Recent form at least a point of save percentage away from the season mark.
  const delta =
    recentForm?.savePct != null && goalie.savePct != null
      ? recentForm.savePct - goalie.savePct
      : 0;
  const isHot = delta >= 0.01;
  const isCold = delta <= -0.01;
  const gsax = goalie.goalsSavedAboveExpected;

  return (
    <Link
      to="/players/$id"
      params={{ id: goalie.playerId.toString() }}
      className="group -mx-2 block rounded-xl px-2 py-2 transition-colors hover:bg-muted/60"
    >
      <div className="flex items-center gap-2.5">
        <Avatar className="size-9">
          <AvatarImage src={getPlayerHeadshotUrl(goalie.playerId, team)} alt={goalie.name} />
          <AvatarFallback className="text-xs">{getPlayerInitials(goalie.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium group-hover:text-link">{goalie.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{goalie.gamesPlayed} GP</span>
            {recentForm && recentForm.gamesPlayed > 0 && (
              <span className={cn("flex items-center gap-0.5", isHot && "text-hot", isCold && "text-cold")}>
                · {isHot && <Flame className="size-3" />}L{recentForm.gamesPlayed}{" "}
                {formatSavePct(recentForm.savePct)}
              </span>
            )}
          </div>
        </div>
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-1 text-center tabular-nums">
        <div>
          <dt className="text-[11px] text-muted-foreground">SV%</dt>
          <dd className="text-sm font-semibold">{formatSavePct(goalie.savePct)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">GAA</dt>
          <dd className="text-sm font-semibold">{goalie.goalsAgainstAvg?.toFixed(2) ?? "–"}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">GSAx</dt>
          <dd
            className={cn(
              "text-sm font-semibold",
              gsax != null && gsax > 0 && "text-success",
              gsax != null && gsax < 0 && "text-error",
            )}
          >
            {gsax != null ? `${gsax > 0 ? "+" : ""}${gsax.toFixed(1)}` : "–"}
          </dd>
        </div>
      </dl>
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
  const recentFormMap = new Map(recentForms?.map((rf) => [rf.playerId, rf]) ?? []);

  return (
    <div className="min-w-0">
      <TeamHeading team={team} />
      {goalies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No goalie data</p>
      ) : (
        <div className="space-y-1">
          {goalies.map((goalie) => (
            <GoalieRow
              key={goalie.playerId}
              goalie={goalie}
              team={team}
              recentForm={recentFormMap.get(goalie.playerId)}
            />
          ))}
        </div>
      )}
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
    <div className="grid grid-cols-2 gap-4 sm:gap-6">
      <TeamGoalies goalies={data.away} team={awayTeam} recentForms={recentForm?.away} />
      <TeamGoalies goalies={data.home} team={homeTeam} recentForms={recentForm?.home} />
    </div>
  );
}
