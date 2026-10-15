import { Skeleton } from "@/components/ui/skeleton";
import { Panel, Section } from "@/components/layout";
import { HeadToHeadSection } from "@/components/game-preview/HeadToHeadSection";
import { TeamComparisonSection } from "@/components/game-preview/TeamComparisonSection";
import { HotPlayersSection } from "@/components/game-preview/HotPlayersSection";
import { GoalieMatchupSection } from "@/components/game-preview/GoalieMatchupSection";
import { WinChanceSection } from "@/components/game-preview/WinChanceSection";
import { TeamHeading } from "@/components/game-preview/TeamHeading";
import { InjuryList } from "@/components/injuries";
import type { GamePreview, GoalieRecentFormResponse } from "@/types";

interface GamePreviewSectionsProps {
  preview: GamePreview;
  goalieRecentForm?: GoalieRecentFormResponse;
}

/**
 * The preview sections for a game that hasn't started. Use under
 * GameDetailHeader; like the header, the away team is on the left.
 */
export function GamePreviewSections({
  preview,
  goalieRecentForm,
}: GamePreviewSectionsProps) {
  const { game, headToHead, teamComparison, hotPlayers, goalieMatchup, injuries } =
    preview;
  const { home, away } = teamComparison;
  // Browsers may hold a response from before injuries existed for a few minutes after a deploy.
  const injured = { away: injuries?.away ?? [], home: injuries?.home ?? [] };

  return (
    <div className="space-y-8">
      <WinChanceSection game={game} />

      <div className="grid gap-8 lg:grid-cols-2">
        <Section
          title="Team comparison"
          description={`Season to date: ${away.teamCode} ${away.gamesPlayed} GP, ${home.teamCode} ${home.gamesPlayed} GP`}
        >
          <Panel>
            <TeamComparisonSection data={teamComparison} />
          </Panel>
        </Section>

        <Section title="Goalies" description="Season numbers and recent form">
          <Panel>
            <GoalieMatchupSection
              data={goalieMatchup}
              homeTeam={game.homeTeam}
              awayTeam={game.awayTeam}
              recentForm={goalieRecentForm}
            />
          </Panel>
        </Section>
      </div>

      {(injured.away.length > 0 || injured.home.length > 0) && (
        <Section title="Injuries" description="Players on each team's injury list, most serious first. Updated twice a day.">
          <Panel>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="min-w-0">
                <TeamHeading team={game.awayTeam} />
                <InjuryList players={injured.away} team={game.awayTeam} empty="None reported." />
              </div>
              <div className="min-w-0">
                <TeamHeading team={game.homeTeam} />
                <InjuryList players={injured.home} team={game.homeTeam} empty="None reported." />
              </div>
            </div>
          </Panel>
        </Section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Hot and cold" description="Goals vs expected goals at 5v5">
          <Panel>
            <HotPlayersSection
              data={hotPlayers}
              homeTeam={game.homeTeam}
              awayTeam={game.awayTeam}
            />
          </Panel>
        </Section>

        <Section title="Head to head" description="All-time franchise records and this season's meetings">
          <Panel>
            <HeadToHeadSection data={headToHead} awayTeam={game.awayTeam} homeTeam={game.homeTeam} />
          </Panel>
        </Section>
      </div>
    </div>
  );
}

function SectionSkeleton({ height }: { height: string }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-7 w-48" />
      <Skeleton className={`w-full rounded-2xl ${height}`} />
    </div>
  );
}

export function GamePreviewSectionsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <SectionSkeleton height="h-64" />
        <SectionSkeleton height="h-64" />
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <SectionSkeleton height="h-48" />
        <SectionSkeleton height="h-48" />
      </div>
    </div>
  );
}
