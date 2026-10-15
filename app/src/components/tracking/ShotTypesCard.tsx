import { UsageCard } from "@/components/player-detail/UsageCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useShotTypes } from "@/hooks";
import { formatPercent, formatSeason } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/**
 * Shots on goal by shot type, each with its shooting % beside the league's
 * on that type (bold when it beats it). For a player or a whole team.
 */
export function ShotTypesCard({ target }: { target: { playerId: number } | { team: string } }) {
  const { data, isLoading, error } = useShotTypes(target);
  if (error || (data && data.types.length === 0)) return null;
  const total = data?.types.reduce((sum, t) => sum + t.shots, 0) ?? 0;
  const max = Math.max(1, ...(data?.types.map((t) => t.shots) ?? []));

  return (
    <UsageCard
      title="Shot types"
      caption={
        data?.season != null
          ? `Shots on goal and goals by shot type, ${formatSeason(data.season)} regular season. Shooting % is bold where it beats the league's on that type.`
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
              <th className="pb-2 text-left font-medium">Type</th>
              <th className="pb-2 text-left font-medium">Share of shots</th>
              <th className="pb-2 pl-3 text-right font-medium">SOG</th>
              <th className="pb-2 pl-3 text-right font-medium">G</th>
              <th className="pb-2 pl-3 text-right font-medium">Sh%</th>
              <th className="pb-2 pl-3 text-right font-medium">League</th>
            </tr>
          </thead>
          <tbody>
            {data.types.map((t) => {
              const beats = t.shootingPct != null && t.leagueShootingPct != null && t.shootingPct > t.leagueShootingPct;
              return (
                <tr key={t.type}>
                  <td className="py-1 pr-3 whitespace-nowrap">{t.label}</td>
                  <td className="w-full py-1 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-chart-1" style={{ width: `${(100 * t.shots) / max}%` }} />
                      </div>
                      <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
                        {total > 0 ? `${Math.round((100 * t.shots) / total)}%` : "–"}
                      </span>
                    </div>
                  </td>
                  <td className="py-1 pl-3 text-right">{t.shots}</td>
                  <td className="py-1 pl-3 text-right">{t.goals}</td>
                  <td className={cn("py-1 pl-3 text-right", beats && "font-semibold")}>{formatPercent(t.shootingPct)}</td>
                  <td className="py-1 pl-3 text-right text-muted-foreground">{formatPercent(t.leagueShootingPct)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </UsageCard>
  );
}
