import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { RosterPlayer } from "@/types/player";

interface PointsContributionChartProps {
  players: RosterPlayer[];
  teamAbbrev: string;
}

const SHOWN = 8;

function ShareBar({ share, max, muted = false }: { share: number; max: number; muted?: boolean }) {
  return (
    <div className="h-2 rounded-full bg-muted">
      <div
        className="h-full rounded-full"
        style={{
          width: `${max > 0 ? (share / max) * 100 : 0}%`,
          background: muted ? "var(--muted-foreground)" : "var(--chart-1)",
          opacity: muted ? 0.5 : 1,
        }}
      />
    </div>
  );
}

/** Each skater's share of the team's points, most first, with the rest grouped. */
export function PointsContributionChart({ players, teamAbbrev }: PointsContributionChartProps) {
  const skaters = players
    .filter((p) => p.position !== "G" && (p.points ?? 0) > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      team: p.currentTeamAbbreviation ?? teamAbbrev,
      points: p.points ?? 0,
      goals: p.goals ?? 0,
      assists: p.assists ?? 0,
    }))
    .sort((a, b) => b.points - a.points);

  const total = skaters.reduce((sum, p) => sum + p.points, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Points contribution</CardTitle>
          <CardDescription>No points yet this season.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const top = skaters.slice(0, SHOWN);
  const rest = skaters.slice(SHOWN);
  const restPoints = rest.reduce((sum, p) => sum + p.points, 0);
  const share = (points: number) => (points / total) * 100;
  const maxShare = share(Math.max(top[0].points, restPoints));
  const top3 = share(top.slice(0, 3).reduce((sum, p) => sum + p.points, 0));
  const depth = top3 > 50 ? "top-heavy" : top3 > 40 ? "moderate depth" : "deep scoring";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Points contribution</CardTitle>
        <CardDescription>
          {total} points; the top three have {top3.toFixed(0)}% ({depth}).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {top.map((p) => (
            <Link
              key={p.id}
              to="/players/$id"
              params={{ id: String(p.id) }}
              className="group -mx-2 grid grid-cols-[1.75rem_minmax(0,9rem)_minmax(0,1fr)_4.5rem] items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/60"
            >
              <Avatar className="size-7">
                <AvatarImage src={getPlayerHeadshotUrl(p.id, p.team)} alt={p.name} loading="lazy" />
                <AvatarFallback className="text-[10px]">{getPlayerInitials(p.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium group-hover:text-link">{p.name}</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {p.goals} G · {p.assists} A
                </div>
              </div>
              <ShareBar share={share(p.points)} max={maxShare} />
              <div className="text-right tabular-nums">
                <span className="text-sm font-semibold">{p.points}</span>
                <span className="ml-1 text-xs text-muted-foreground">{share(p.points).toFixed(0)}%</span>
              </div>
            </Link>
          ))}
          {restPoints > 0 && (
            <div className="-mx-2 grid grid-cols-[1.75rem_minmax(0,9rem)_minmax(0,1fr)_4.5rem] items-center gap-2.5 px-2 py-1.5">
              <span />
              <div className="text-sm text-muted-foreground">
                {rest.length} others
              </div>
              <ShareBar share={share(restPoints)} max={maxShare} muted />
              <div className="text-right tabular-nums">
                <span className="text-sm font-semibold">{restPoints}</span>
                <span className="ml-1 text-xs text-muted-foreground">{share(restPoints).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
