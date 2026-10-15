import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as z from "zod/mini";
import { PageHeader, SegmentedControl } from "@/components/layout";
import { ErrorState, TableSkeleton } from "@/components/shared";
import { usePageTitle, useMilestoneClub } from "@/hooks";
import { formatGameDate } from "@/lib/game-formatters";
import { MILESTONE_CLUBS, milestoneGame } from "@/lib/milestones";
import { cn } from "@/lib/utils";
import type { MilestoneKind } from "@/types";

const searchSchema = z.object({
  club: z.optional(z.enum(["points-1000", "goals-500", "season-points-100", "season-goals-50"])),
});

export const Route = createFileRoute("/milestone-clubs")({
  component: MilestoneClubsPage,
  validateSearch: searchSchema,
});

// Our game pages cover games from 2008-09 on.
const FIRST_GAME_PAGE_SEASON = 2008;

function MilestoneClubsPage() {
  usePageTitle("Milestone clubs");
  const { club = "points-1000" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data, isLoading, error, refetch } = useMilestoneClub(club);
  const seasonal = club.startsWith("season");

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Milestone clubs"
        description="Every 1,000-point and 500-goal career and every 100-point and 50-goal season, with the game it happened in."
      />
      <SegmentedControl
        aria-label="Milestone"
        value={club}
        onValueChange={(v) => navigate({ search: { club: v as MilestoneKind } })}
        options={MILESTONE_CLUBS.map((c) => ({
          value: c.kind,
          label: data?.counts[c.kind] ? `${c.short} · ${data.counts[c.kind]}` : c.short,
        }))}
      />

      {error ? (
        <ErrorState title="Couldn't load the milestone club" message="The records request failed." onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <TableSkeleton rows={12} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs">
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">Player</th>
                <th className="px-3 py-2 text-left font-medium">Team</th>
                <th className="px-3 py-2 text-left font-medium">Game</th>
                <th className="px-3 py-2 text-right font-medium">Age</th>
                <th className="px-3 py-2 text-right font-medium" title={seasonal ? "Games into the season" : "Career games"}>
                  {seasonal ? "Season GP" : "Career GP"}
                </th>
                {seasonal && <th className="px-3 py-2 text-right font-medium">Final total</th>}
                <th className="px-3 py-2 text-left font-medium">In net</th>
              </tr>
            </thead>
            <tbody>
              {data.moments.map((m) => (
                <tr key={`${m.gameId}-${m.playerId}`} className="border-b last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {m.season >= FIRST_GAME_PAGE_SEASON ? (
                      <Link to="/games/$gameId" params={{ gameId: m.gameId }} className="hover:text-link">
                        {formatGameDate(m.gameDate)}, {m.gameDate.slice(0, 4)}
                      </Link>
                    ) : (
                      `${formatGameDate(m.gameDate)}, ${m.gameDate.slice(0, 4)}`
                    )}
                  </td>
                  <td className={cn("sticky left-0 z-10 bg-card px-3 py-2 whitespace-nowrap", m.active && "font-medium")}>
                    {m.hasPlayerPage ? (
                      <Link to="/players/$id" params={{ id: String(m.playerId) }} className="hover:text-link">
                        {m.name}
                      </Link>
                    ) : (
                      m.name
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{m.team ?? "–"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground tabular-nums">{milestoneGame(m) ?? "–"}</td>
                  <td className="px-3 py-2 text-right">{m.ageYears ?? "–"}</td>
                  <td className="px-3 py-2 text-right">{m.gamesPlayed?.toLocaleString() ?? "–"}</td>
                  {seasonal && <td className="px-3 py-2 text-right font-semibold">{m.seasonTotal ?? "–"}</td>}
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{m.goalie ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && (
        <p className="text-xs text-muted-foreground">
          Newest first; active players in bold. For season clubs, the final total is where that season ended. The goalie is blank for
          empty-net goals and older games the NHL has no record of.
        </p>
      )}
    </div>
  );
}
