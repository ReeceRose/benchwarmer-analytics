import { Panel, Section } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamSituations } from "@/hooks";
import { formatOrdinal, formatSeason } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { SituationRecord } from "@/types";

const pts = (v: number | null) => (v == null ? "–" : v.toFixed(3).replace(/^0/, ""));

function SituationTable({ title, rows }: { title: string; rows: SituationRecord[] }) {
  return (
    <Panel>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs">
            <th className="pb-2 text-left font-medium">Situation</th>
            <th className="pb-2 text-right font-medium" title="Wins–losses–overtime losses">Record</th>
            <th className="pb-2 text-right font-medium">Pts%</th>
            <th className="pb-2 text-right font-medium">League</th>
            <th className="pb-2 text-right font-medium">Rank</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const beats = r.pointsPct != null && r.leaguePointsPct != null && r.pointsPct > r.leaguePointsPct;
            const none = r.gamesPlayed === 0;
            return (
              <tr key={r.key} className={cn(none && "text-muted-foreground")}>
                <td className="py-1.5 pr-3">{r.label}</td>
                <td className="py-1.5 text-right whitespace-nowrap">{none ? "–" : `${r.wins}–${r.losses}–${r.otLosses}`}</td>
                <td className={cn("py-1.5 text-right", beats && "font-semibold")}>{pts(r.pointsPct)}</td>
                <td className="py-1.5 text-right text-muted-foreground">{pts(r.leaguePointsPct)}</td>
                <td className="py-1.5 text-right text-muted-foreground">{r.rank != null ? formatOrdinal(r.rank) : "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

/**
 * Records by game situation (scoring first, leading after two, one-goal
 * games, outshooting) and by days of rest, against the league.
 */
export function TeamSituations({ abbrev, season }: { abbrev: string; season?: number }) {
  const { data, isLoading, error } = useTeamSituations(abbrev, season);
  if (error) return null;

  return (
    <Section
      title="Records by situation"
      description={`How results change with the score and the schedule${data ? `, ${formatSeason(data.season)} regular season` : ""}. Points % is bold where it beats the league's in the same situation; rank is among all 32 teams.`}
    >
      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <SituationTable title="Game situations" rows={data.results} />
          <SituationTable title="Days of rest" rows={data.rest} />
        </div>
      )}
    </Section>
  );
}
