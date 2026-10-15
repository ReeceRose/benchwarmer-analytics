import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RankedBars, RankedTeamLabel, niceAxis } from "@/components/charts";
import type { StandingsWithAnalytics } from "@/types";

interface PDODistributionChartProps {
  teams: StandingsWithAnalytics[];
}

// PDO this far from 100 rarely lasts.
const UNSUSTAINABLE = 3;

/** PDO (Sh% + Sv%) per team, growing out from 100: right is running hot, left running cold. */
export function PDODistributionChart({ teams }: PDODistributionChartProps) {
  const rows = teams
    .filter((t) => t.analytics?.pdo != null)
    .map((t) => {
      const a = t.analytics!;
      const pdo = a.pdo!;
      return {
        key: t.abbreviation,
        abbrev: t.abbreviation,
        label: <RankedTeamLabel abbrev={t.abbreviation} />,
        value: pdo,
        display: pdo.toFixed(1),
        meta:
          a.shootingPct != null && a.savePct != null
            ? `${a.shootingPct.toFixed(1)} / ${a.savePct.toFixed(1)}`
            : "–",
        title: `${t.name}: PDO ${pdo.toFixed(1)}`,
      };
    })
    .sort((a, b) => b.value - a.value);

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PDO</CardTitle>
          <CardDescription>No shooting and save numbers yet this season.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const extent = Math.max(UNSUSTAINABLE + 1, ...rows.map((r) => Math.abs(r.value - 100)));
  const { domain, ticks } = niceAxis([100 - extent, 100 + extent]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">PDO</CardTitle>
        <CardDescription>
          Shooting % plus save %. Teams far above 100 are running hot; far
          below, cold. Both tend to drift back.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RankedBars
          rows={rows}
          headers={{ label: "Team", value: "PDO", meta: "Sh / Sv%" }}
          domain={domain}
          ticks={ticks}
          formatTick={(t) => String(t)}
          baseline={100}
          renderRow={(row, props) => (
            <Link key={row.key} to="/teams/$abbrev" params={{ abbrev: row.abbrev }} {...props} />
          )}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Bars grow from 100. Beyond {100 - UNSUSTAINABLE} or {100 + UNSUSTAINABLE} is
          rarely sustainable over a season.
        </p>
      </CardContent>
    </Card>
  );
}
