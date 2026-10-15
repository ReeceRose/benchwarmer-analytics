import { UsageCard } from "@/components/player-detail/UsageCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoalieRest } from "@/hooks";
import { formatSavePct, formatSeason } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/** A goalie's save % by days of rest before the game, beside the league's. */
export function GoalieRestCard({ playerId }: { playerId: number }) {
  const { data, isLoading, error } = useGoalieRest(playerId);
  if (error || (data && data.splits.length === 0)) return null;

  return (
    <UsageCard
      title="Save % by rest"
      caption={
        data?.season != null
          ? `Days off before each game, ${formatSeason(data.season)} regular season. Bold beats the league on the same rest; the league figure weights each goalie by games.`
          : undefined
      }
    >
      {isLoading || !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs">
              <th className="pb-2 text-left font-medium">Rest</th>
              <th className="pb-2 text-right font-medium">GP</th>
              <th className="pb-2 text-right font-medium">Sv%</th>
              <th className="pb-2 text-right font-medium">League</th>
            </tr>
          </thead>
          <tbody>
            {data.splits.map((s) => {
              const beats = s.savePct != null && s.leagueSavePct != null && s.savePct > s.leagueSavePct;
              return (
                <tr key={s.daysRest} className={cn(s.gamesPlayed === 0 && "text-muted-foreground")}>
                  <td className="py-1.5">{s.label}</td>
                  <td className="py-1.5 text-right">{s.gamesPlayed}</td>
                  <td className={cn("py-1.5 text-right", beats && "font-semibold")}>{s.savePct != null ? formatSavePct(s.savePct) : "–"}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{s.leagueSavePct != null ? formatSavePct(s.leagueSavePct) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </UsageCard>
  );
}
