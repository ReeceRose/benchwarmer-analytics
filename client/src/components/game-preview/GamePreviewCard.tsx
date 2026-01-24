import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HeadToHeadSection } from "@/components/game-preview/HeadToHeadSection";
import { TeamComparisonSection } from "@/components/game-preview/TeamComparisonSection";
import { HotPlayersSection } from "@/components/game-preview/HotPlayersSection";
import { GoalieMatchupSection } from "@/components/game-preview/GoalieMatchupSection";
import type { GamePreview, GoalieRecentFormResponse } from "@/types";

interface GamePreviewSectionsProps {
  preview: GamePreview;
  goalieRecentForm?: GoalieRecentFormResponse;
}

/**
 * Renders the preview sections (team comparison, goalie matchup, hot players, head-to-head).
 * Use with GameDetailHeader for a complete preview page.
 */
export function GamePreviewSections({
  preview,
  goalieRecentForm,
}: GamePreviewSectionsProps) {
  const { game, headToHead, teamComparison, hotPlayers, goalieMatchup } =
    preview;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <TeamComparisonSection data={teamComparison} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <GoalieMatchupSection
              data={goalieMatchup}
              homeTeam={game.homeTeam}
              awayTeam={game.awayTeam}
              recentForm={goalieRecentForm}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <HotPlayersSection
              data={hotPlayers}
              homeTeam={game.homeTeam}
              awayTeam={game.awayTeam}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4">
          <HeadToHeadSection
            data={headToHead}
            homeTeam={game.homeTeam}
            awayTeam={game.awayTeam}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function GamePreviewSectionsSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
