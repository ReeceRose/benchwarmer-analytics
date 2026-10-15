import { TeamTag } from "@/components/shared";
import { PickName } from "@/components/draft/DraftPickRows";
import { careerSpan } from "@/components/draft/draft-format";
import { cn } from "@/lib/utils";
import type { DraftPick } from "@/types";

const n = (v: number | null | undefined) => (v == null ? "–" : v.toLocaleString());

/**
 * Every pick in a draft class with its NHL career. Picks by a team that has
 * since moved show the code at the time, with today's team on hover.
 */
export function DraftTable({ picks }: { picks: DraftPick[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs">
            <th className="px-3 py-2 text-right font-medium">Pick</th>
            <th className="px-3 py-2 text-left font-medium">Team</th>
            <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">Player</th>
            <th className="px-3 py-2 text-left font-medium">Pos</th>
            <th className="px-3 py-2 text-left font-medium">Drafted from</th>
            <th className="px-3 py-2 text-right font-medium" title="NHL regular-season games">GP</th>
            <th className="px-3 py-2 text-right font-medium">G</th>
            <th className="px-3 py-2 text-right font-medium">A</th>
            <th className="px-3 py-2 text-right font-medium" title="Points (skaters) or wins (goalies)">P / W</th>
            <th className="px-3 py-2 text-left font-medium">NHL career</th>
          </tr>
        </thead>
        <tbody>
          {picks.map((p) => {
            const c = p.career;
            const goalie = c?.wins != null;
            return (
              <tr key={p.overallPick} className="border-b last:border-0">
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {p.overallPick}
                  <span className="ml-1 text-[11px]">R{p.round}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {p.franchiseTeam && p.franchiseTeam === p.team ? (
                    <TeamTag abbrev={p.team} />
                  ) : (
                    <span className="text-muted-foreground" title={p.franchiseTeam ? `Now ${p.franchiseTeam}` : undefined}>
                      {p.team}
                    </span>
                  )}
                </td>
                <td className="sticky left-0 z-10 bg-card px-3 py-2 whitespace-nowrap">
                  <PickName pick={p} />
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.position ?? "–"}</td>
                <td className="max-w-56 truncate px-3 py-2 text-muted-foreground" title={[p.amateurClub, p.amateurLeague].filter(Boolean).join(", ")}>
                  {[p.amateurClub, p.amateurLeague].filter(Boolean).join(", ") || "–"}
                </td>
                <td className={cn("px-3 py-2 text-right", !c && "text-muted-foreground")}>{c ? n(c.gamesPlayed) : "0"}</td>
                <td className="px-3 py-2 text-right">{goalie ? "–" : n(c?.goals)}</td>
                <td className="px-3 py-2 text-right">{goalie ? "–" : n(c?.assists)}</td>
                <td className="px-3 py-2 text-right font-semibold">{goalie ? n(c?.wins) : n(c?.points)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{careerSpan(p) ?? "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
