import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TeamLogo } from "@/components/shared";
import { ChartLegend } from "@/components/charts/ChartLegend";
import { cn } from "@/lib/utils";
import type { TeamPowerRanking } from "@/types";

interface FormShiftChartProps {
  teams: TeamPowerRanking[];
  season?: number;
}

const RECENT_GAMES = 10;
const LAST_10_COLOUR = "var(--chart-1)";
const SEASON_COLOUR = "var(--muted-foreground)";
// A change this size (percentage points) is called out as better or worse form.
const NOTABLE_CHANGE = 3;

interface FormRow {
  team: TeamPowerRanking;
  season: number;
  recent: number;
  change: number;
}

// Axis range in fives around the values, always including 50%.
function domain(rows: readonly FormRow[]): [number, number] {
  const values = rows.flatMap((r) => [r.season, r.recent]);
  const low = Math.floor(Math.min(45, ...values) / 5) * 5;
  const high = Math.ceil(Math.max(55, ...values) / 5) * 5;
  return [low, high];
}

function changeClass(change: number): string {
  if (change >= NOTABLE_CHANGE) return "text-success";
  if (change <= -NOTABLE_CHANGE) return "text-error";
  return "text-muted-foreground";
}

/** Season 5-on-5 xG share against the last 10 games, one row per team, biggest risers first. */
export function FormShiftChart({ teams, season }: FormShiftChartProps) {
  const rows: FormRow[] = teams
    .filter((t) => t.fiveOnFiveXGoalsPct != null && t.recentXGoalsPct != null)
    .map((t) => ({
      team: t,
      season: t.fiveOnFiveXGoalsPct! * 100,
      recent: t.recentXGoalsPct! * 100,
      change: (t.recentXGoalsPct! - t.fiveOnFiveXGoalsPct!) * 100,
    }))
    .sort((a, b) => b.change - a.change);
  const enoughGames = teams.some((t) => t.gamesPlayed > RECENT_GAMES);

  const [min, max] = domain(rows);
  const position = (value: number) => `${((value - min) / (max - min)) * 100}%`;
  const ticks: number[] = [];
  for (let v = min; v <= max; v += 5) ticks.push(v);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Form: last {RECENT_GAMES} games vs season</CardTitle>
        <CardDescription>
          5-on-5 share of expected goals. Teams at the top are playing better
          lately than their season; teams at the bottom, worse.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!enoughGames || rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Form needs more than {RECENT_GAMES} games. Until then the last{" "}
            {RECENT_GAMES} games are the whole season.
          </p>
        ) : (
          <>
            <ChartLegend
              className="mb-3"
              items={[
                { label: `Last ${RECENT_GAMES} games`, colour: LAST_10_COLOUR },
                { label: "Season", colour: SEASON_COLOUR },
                { label: "50%", colour: SEASON_COLOUR, dashed: true },
              ]}
            />
            <div className="grid grid-cols-[4.5rem_1fr_3.5rem_3.5rem] items-center gap-x-3 text-xs text-muted-foreground">
              <span>Team</span>
              <span />
              <span className="text-right">L10</span>
              <span className="text-right">Change</span>
            </div>
            <div className="mt-1 space-y-0.5">
              {rows.map((row) => {
                const left = Math.min(row.season, row.recent);
                const right = Math.max(row.season, row.recent);
                return (
                  <Link
                    key={row.team.abbreviation}
                    to="/teams/$abbrev/games"
                    params={{ abbrev: row.team.abbreviation }}
                    search={{ season }}
                    className="group -mx-2 grid grid-cols-[4.5rem_1fr_3.5rem_3.5rem] items-center gap-x-3 rounded-xl px-2 py-1 hover:bg-muted/60"
                    title={`${row.team.name}: ${row.recent.toFixed(1)}% last ${RECENT_GAMES}, ${row.season.toFixed(1)}% season`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium group-hover:text-link">
                      <TeamLogo abbrev={row.team.abbreviation} size="sm" />
                      {row.team.abbreviation}
                    </span>
                    <span className="relative h-5" aria-hidden>
                      <span
                        className="absolute inset-y-0 border-l border-dashed border-muted-foreground/60"
                        style={{ left: position(50) }}
                      />
                      <span
                        className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-border"
                        style={{ left: position(left), width: `calc(${position(right)} - ${position(left)})` }}
                      />
                      <span
                        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
                        style={{ left: position(row.season), background: SEASON_COLOUR }}
                      />
                      <span
                        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
                        style={{ left: position(row.recent), background: LAST_10_COLOUR }}
                      />
                    </span>
                    <span className="text-right text-sm font-semibold tabular-nums">
                      {row.recent.toFixed(1)}%
                    </span>
                    <span className={cn("text-right text-sm tabular-nums", changeClass(row.change))}>
                      {row.change > 0 ? "+" : ""}
                      {row.change.toFixed(1)}
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-1 grid grid-cols-[4.5rem_1fr_3.5rem_3.5rem] gap-x-3">
              <span />
              <span className="relative h-4 text-[11px] text-muted-foreground tabular-nums">
                {ticks.map((t) => (
                  <span key={t} className="absolute -translate-x-1/2" style={{ left: position(t) }}>
                    {t}%
                  </span>
                ))}
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Change is in percentage points. Ten games is a small sample: treat moves under {NOTABLE_CHANGE} points as noise.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
