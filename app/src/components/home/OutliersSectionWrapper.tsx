import { Link } from "@tanstack/react-router";
import { ErrorState } from "@/components/shared";
import { Panel, Section } from "@/components/layout";
import { LuckBoard, LuckBoardSkeleton, type LuckRow } from "@/components/home/LuckBoard";
import { useOutliers } from "@/hooks";
import type { Situation } from "@/types";

interface OutliersSectionWrapperProps {
  season?: number;
  situation?: Situation;
}

export function OutliersSectionWrapper({ season, situation }: OutliersSectionWrapperProps) {
  const { data, isLoading, error, refetch } = useOutliers(season, situation);

  if (error) {
    return (
      <ErrorState
        title="Couldn't load finishing luck"
        message="The outliers request failed."
        onRetry={refetch}
      />
    );
  }

  const skaterRows: LuckRow[] = data
    ? [
        ...data.skaterOutliers.runningHot.slice(0, 5),
        ...data.skaterOutliers.runningCold.slice(0, 5).reverse(),
      ].map((p) => ({
        playerId: p.playerId,
        name: p.name,
        team: p.team,
        value: p.differential,
        detail: `${p.goals} goals on ${p.expectedGoals.toFixed(1)} expected`,
      }))
    : [];

  const goalieRows: LuckRow[] = data?.goalieOutliers
    ? [
        ...data.goalieOutliers.runningHot.slice(0, 5),
        ...data.goalieOutliers.runningCold.slice(0, 5).reverse(),
      ].map((g) => ({
        playerId: g.playerId,
        name: g.name,
        team: g.team,
        value: g.goalsSavedAboveExpected,
        detail: `${g.goalsAgainst} goals allowed on ${g.expectedGoalsAgainst.toFixed(1)} expected`,
      }))
    : [];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Section
        title="Finishing luck"
        description="Goals scored minus expected goals."
        action={
          <Link
            to="/leaderboards"
            search={{ view: "charts" }}
            className="font-semibold text-link hover:underline"
          >
            Full chart
          </Link>
        }
      >
        <Panel>
          {isLoading ? (
            <LuckBoardSkeleton />
          ) : (
            <LuckBoard
              rows={skaterRows}
              negativeLabel="Below expected"
              positiveLabel="Above expected"
              valueLabel="G − xG"
            />
          )}
        </Panel>
      </Section>
      <Section
        title="Goaltending luck"
        description="Goals saved above expected (GSAx)."
      >
        <Panel>
          {isLoading ? (
            <LuckBoardSkeleton />
          ) : (
            <LuckBoard
              rows={goalieRows}
              negativeLabel="Letting in more"
              positiveLabel="Stopping more"
              valueLabel="GSAx"
              goodBad
            />
          )}
        </Panel>
      </Section>
    </div>
  );
}
