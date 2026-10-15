import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MirroredBar, TeamLabel } from "@/components/game-live/parts";
import { Badge } from "@/components/ui/badge";
import { StatItem } from "@/components/special-teams/StatItem";
import { formatOrdinal } from "@/lib/formatters";
import type { HomeAwayResponse, HomeAwaySide, PenaltySummary } from "@/types";

const signed = (v: number, digits: number) =>
  `${v > 0 ? "+" : ""}${v.toFixed(digits)}`;

const ROWS: {
  label: string;
  value: (s: HomeAwaySide) => number;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
  /** Totals depend on games played, so the league's figure means nothing. */
  league?: boolean;
}[] = [
  {
    label: "Drawn / 60",
    value: (s) => s.penaltiesDrawnPer60,
    format: (v) => v.toFixed(2),
    league: true,
  },
  {
    label: "Taken / 60",
    value: (s) => s.penaltiesTakenPer60,
    format: (v) => v.toFixed(2),
    lowerIsBetter: true,
    league: true,
  },
  { label: "Drawn", value: (s) => s.penaltiesDrawn, format: String },
  {
    label: "Taken",
    value: (s) => s.penaltiesTaken,
    format: String,
    lowerIsBetter: true,
  },
];

/** Road games against home games: is the team drawing its calls in its own rink? */
function HomeRoadSplit({
  data,
  abbrev,
}: {
  data: HomeAwayResponse;
  abbrev: string;
}) {
  const { home, away, league } = data;
  if (home.gamesPlayed + away.gamesPlayed === 0) return null;
  return (
    <div className="mt-5 border-t pt-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h4 className="text-sm font-semibold">Home and road</h4>
          <Link
            to="/teams/$abbrev/home-away"
            params={{ abbrev }}
            search={{ season: data.season, metric: "penaltiesDrawnPer60" }}
            className="text-xs text-link hover:underline"
          >
            Every season
          </Link>
        </div>
        {ROWS.map((row) => (
          <MirroredBar
            key={row.label}
            label={
              <>
                {row.label}
                {row.league && (
                  <span className="block text-[11px] text-muted-foreground/80">
                    League {row.format(row.value(league.away))} ·{" "}
                    {row.format(row.value(league.home))}
                  </span>
                )}
              </>
            }
            away={row.value(away)}
            home={row.value(home)}
            awayText={row.format(row.value(away))}
            homeText={row.format(row.value(home))}
            lowerIsBetter={row.lowerIsBetter}
          />
        ))}
        <p className="mt-2 text-center text-xs text-muted-foreground tabular-nums">
          Differential / 60: road {signed(away.netPenaltiesPer60, 2)} · home{" "}
          {signed(home.netPenaltiesPer60, 2)}
          <span className="text-muted-foreground/80">
            {" "}
            (league road {signed(league.away.netPenaltiesPer60, 2)} · home{" "}
            {signed(league.home.netPenaltiesPer60, 2)})
          </span>
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <TeamLabel side="away">Road · {away.gamesPlayed} GP</TeamLabel>
          <span>Bold = better side</span>
          <TeamLabel side="home">Home · {home.gamesPlayed} GP</TeamLabel>
        </div>
      </div>
    </div>
  );
}

/** Penalties drawn and taken per 60, all situations, against the league. */
export function PenaltiesCard({
  stats,
  homeAway,
  abbrev,
}: {
  stats: PenaltySummary;
  homeAway?: HomeAwayResponse;
  abbrev: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Penalties</CardTitle>
          {stats.netRank > 0 && (
            <Badge variant="secondary">
              #{stats.netRank} differential in NHL
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-3 gap-4">
          <StatItem
            label="Drawn/60"
            value={stats.drawnPer60.toFixed(2)}
            subValue={`${formatOrdinal(stats.drawnRank)} · league ${stats.leagueDrawnPer60.toFixed(2)}`}
          />
          <StatItem
            label="Taken/60"
            value={stats.takenPer60.toFixed(2)}
            subValue={`${formatOrdinal(stats.takenRank)} · league ${stats.leagueTakenPer60.toFixed(2)}`}
          />
          <StatItem
            label="Net/60"
            value={signed(stats.netPer60, 2)}
            subValue={formatOrdinal(stats.netRank)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 border-t pt-3 text-sm sm:grid-cols-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Drawn</span>
            <span className="font-medium tabular-nums">{stats.drawn}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taken</span>
            <span className="font-medium tabular-nums">{stats.taken}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Net</span>
            <span className="font-medium tabular-nums">
              {signed(stats.net, 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">PIM</span>
            <span className="font-medium tabular-nums">{stats.pimTaken}</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          All situations, per 60 minutes played. Ranks are among all 32 teams:
          1st draws the most, takes the fewest, or has the best differential.{" "}
          <Link
            to="/special-teams"
            search={{ teamView: "penalties", view: "charts" }}
            className="text-link hover:underline"
          >
            Compare every team
          </Link>
        </p>
        {homeAway && <HomeRoadSplit data={homeAway} abbrev={abbrev} />}
      </CardContent>
    </Card>
  );
}
