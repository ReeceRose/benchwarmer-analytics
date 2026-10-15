import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RankedBars, RankedTeamLabel, niceAxis } from "@/components/charts";
import { useTravel } from "@/hooks";
import { getTeamName } from "@/lib/team-names";

/**
 * Every team's travel for the whole regular season, most first, with
 * back-to-backs and the longest road trip as the muted column.
 */
export function TravelChart({ season }: { season?: number }) {
  const { data, isLoading } = useTravel(season);

  if (isLoading || !data) return <Skeleton className="h-208 rounded-2xl" />;
  if (data.teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Travel and back-to-backs</CardTitle>
          <CardDescription>The schedule isn't out yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const average = data.teams.reduce((sum, t) => sum + t.seasonMiles, 0) / data.teams.length;
  const { domain, ticks } = niceAxis([0, Math.max(...data.teams.map((t) => t.seasonMiles))]);
  const rows = data.teams.map((t) => ({
    key: t.team,
    abbrev: t.team,
    label: <RankedTeamLabel abbrev={t.team} />,
    value: t.seasonMiles,
    display: `${Math.round(t.seasonMiles / 1000)}k`,
    meta: `${t.backToBacks} · ${t.longestRoadTrip}`,
    title: `${getTeamName(t.team)}: ${t.seasonMiles.toLocaleString()} miles (${t.milesSoFar.toLocaleString()} so far), ${t.backToBacks} back-to-backs, longest road trip ${t.longestRoadTrip} games`,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Travel and back-to-backs</CardTitle>
        <CardDescription>
          Miles between game cities over the whole regular season, most first. The dashed line is the league average.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RankedBars
          rows={rows}
          headers={{ label: "Team", value: "Miles", meta: "B2B · trip" }}
          domain={domain}
          ticks={ticks}
          formatTick={(t) => (t === 0 ? "0" : `${t / 1000}k`)}
          reference={average}
          renderRow={(row, props) => <Link key={row.key} to="/teams/$abbrev" params={{ abbrev: row.abbrev }} {...props} />}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Straight-line miles from arena to arena, starting at home; every game counts as played in the home team's arena, so neutral-site games are off. B2B is games on back-to-back nights; trip is the longest run of road games.
        </p>
      </CardContent>
    </Card>
  );
}
