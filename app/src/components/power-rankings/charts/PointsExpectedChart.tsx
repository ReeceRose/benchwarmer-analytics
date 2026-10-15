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
/** The fields this chart needs; power rankings and standings rows both fit. */
export interface PointsExpectedTeam {
  abbreviation: string;
  name: string;
  points: number;
  expectedPoints: number;
  pointsDiff: number;
}

interface PointsExpectedChartProps {
  teams: readonly PointsExpectedTeam[];
  season?: number;
}

const ACTUAL_COLOUR = "var(--chart-1)";
const EXPECTED_COLOUR = "var(--muted-foreground)";
// A gap this size (points) is called out; smaller gaps are noise.
const NOTABLE_GAP = 5;
const GRID = "grid grid-cols-[4.5rem_1fr_2.25rem_2.25rem_2.75rem] items-center gap-x-3";

// Roughly five ticks on a round step that covers the values.
function axis(values: readonly number[]): { min: number; max: number; ticks: number[] } {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const step = [1, 2, 5, 10, 20, 25, 50].find((s) => (high - low) / s <= 5) ?? 50;
  const min = Math.max(0, Math.floor(low / step) * step);
  const max = Math.max(min + step, Math.ceil(high / step) * step);
  const ticks: number[] = [];
  for (let v = min; v <= max; v += step) ticks.push(v);
  return { min, max, ticks };
}

/** Points against expected points (from goals and xG), one row per team, biggest overperformers first. */
export function PointsExpectedChart({ teams, season }: PointsExpectedChartProps) {
  const rows = [...teams].sort((a, b) => b.pointsDiff - a.pointsDiff);
  const { min, max, ticks } = axis(rows.flatMap((t) => [t.points, t.expectedPoints]));
  const position = (value: number) => `${((value - min) / (max - min)) * 100}%`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Points vs expected points</CardTitle>
        <CardDescription>
          Teams at the top have more points than their goals and xG suggest;
          teams at the bottom, fewer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartLegend
          className="mb-3"
          items={[
            { label: "Points", colour: ACTUAL_COLOUR },
            { label: "Expected points", colour: EXPECTED_COLOUR },
          ]}
        />
        <div className={cn(GRID, "text-xs text-muted-foreground")}>
          <span>Team</span>
          <span />
          <span className="text-right">Pts</span>
          <span className="text-right">xPts</span>
          <span className="text-right">Diff</span>
        </div>
        <div className="mt-1 space-y-0.5">
          {rows.map((team) => {
            const expected = Math.round(team.expectedPoints);
            const left = Math.min(team.points, team.expectedPoints);
            const right = Math.max(team.points, team.expectedPoints);
            const notable = Math.abs(team.pointsDiff) >= NOTABLE_GAP;
            return (
              <Link
                key={team.abbreviation}
                to="/teams/$abbrev"
                params={{ abbrev: team.abbreviation }}
                search={{ season }}
                className={cn(GRID, "group -mx-2 rounded-xl px-2 py-1 hover:bg-muted/60")}
                title={`${team.name}: ${team.points} points, ${expected} expected`}
              >
                <span className="flex items-center gap-2 text-sm font-medium group-hover:text-link">
                  <TeamLogo abbrev={team.abbreviation} size="sm" />
                  {team.abbreviation}
                </span>
                <span className="relative h-5" aria-hidden>
                  <span
                    className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-border"
                    style={{ left: position(left), width: `calc(${position(right)} - ${position(left)})` }}
                  />
                  <span
                    className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
                    style={{ left: position(team.expectedPoints), background: EXPECTED_COLOUR }}
                  />
                  <span
                    className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
                    style={{ left: position(team.points), background: ACTUAL_COLOUR }}
                  />
                </span>
                <span className="text-right text-sm font-semibold tabular-nums">{team.points}</span>
                <span className="text-right text-sm text-muted-foreground tabular-nums">{expected}</span>
                <span
                  className={cn(
                    "text-right text-sm tabular-nums",
                    notable ? "font-semibold" : "text-muted-foreground",
                  )}
                >
                  {team.pointsDiff > 0 ? "+" : ""}
                  {team.pointsDiff}
                </span>
              </Link>
            );
          })}
        </div>
        <div className={cn(GRID, "mt-1")}>
          <span />
          <span className="relative h-4 text-[11px] text-muted-foreground tabular-nums">
            {ticks.map((t) => (
              <span key={t} className="absolute -translate-x-1/2" style={{ left: position(t) }}>
                {t}
              </span>
            ))}
          </span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Gaps of {NOTABLE_GAP} or more points are bold. Big gaps in either
          direction tend to close as the season goes on.
        </p>
      </CardContent>
    </Card>
  );
}
