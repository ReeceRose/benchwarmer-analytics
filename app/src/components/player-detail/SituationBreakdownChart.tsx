import { useMemo } from "react";
import { Panel, Section } from "@/components/layout";
import { cn } from "@/lib/utils";
import type { SkaterStats } from "@/types";

/** Below this much ice time a rate is too noisy to read much into. */
const MIN_TOI_MINUTES = 20;

const SITUATIONS = [
  { key: "all", label: "All situations" },
  { key: "5on5", label: "5v5" },
  { key: "5on4", label: "Power play" },
  { key: "4on5", label: "Shorthanded" },
] as const;

type Row = {
  key: string;
  label: string;
  toiMinutes: number;
  goals: number;
  assists: number;
  points: number;
};

const per60 = (value: number, minutes: number) => (minutes > 0 ? (value / minutes) * 60 : 0);

/**
 * Scoring rates by situation for one regular season, with ice time and each
 * situation's share of the player's points.
 */
export function SituationBreakdownChart({
  stats,
  season,
}: {
  stats: SkaterStats[];
  season: number;
}) {
  const rows = useMemo<Row[]>(() => {
    const seasonStats = stats.filter((s) => !s.isPlayoffs && s.season === season);
    return SITUATIONS.map(({ key, label }) => {
      const row: Row = { key, label, toiMinutes: 0, goals: 0, assists: 0, points: 0 };
      for (const s of seasonStats) {
        if (s.situation !== key) continue;
        row.toiMinutes += s.iceTimeSeconds / 60;
        row.goals += s.goals;
        row.assists += s.assists;
        row.points += s.points;
      }
      return row;
    });
  }, [stats, season]);

  const total = rows[0];
  if (total.toiMinutes === 0) return null;

  return (
    <Section
      title="By situation"
      description={`Scoring rates per 60 minutes this regular season. Rates from under ${MIN_TOI_MINUTES} minutes are muted.`}
    >
      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs">
              <th className="pb-2 text-left font-medium">Situation</th>
              <th className="pb-2 pl-3 text-right font-medium">TOI</th>
              <th className="pb-2 pl-3 text-right font-medium">G/60</th>
              <th className="pb-2 pl-3 text-right font-medium">A/60</th>
              <th className="pb-2 pl-3 text-right font-medium">P/60</th>
              <th className="hidden pb-2 pl-6 text-left font-medium sm:table-cell">Share of points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const none = r.toiMinutes === 0;
              const small = r.toiMinutes < MIN_TOI_MINUTES;
              const share = i > 0 && total.points > 0 ? r.points / total.points : null;
              const rate = (v: number) => (none ? "–" : per60(v, r.toiMinutes).toFixed(2));
              return (
                <tr
                  key={r.key}
                  className={cn(
                    none && "text-muted-foreground",
                    i === 0 && "[&>td]:border-b [&>td]:pb-2",
                    i === 1 && "[&>td]:pt-2",
                  )}
                >
                  <td className={cn("py-1.5 pr-3 whitespace-nowrap", i === 0 && "font-medium")}>{r.label}</td>
                  <td className="py-1.5 pl-3 text-right text-muted-foreground">
                    {none ? "–" : `${Math.round(r.toiMinutes).toLocaleString()} min`}
                  </td>
                  <td className={cn("py-1.5 pl-3 text-right", small && "text-muted-foreground")}>{rate(r.goals)}</td>
                  <td className={cn("py-1.5 pl-3 text-right", small && "text-muted-foreground")}>{rate(r.assists)}</td>
                  <td className={cn("py-1.5 pl-3 text-right font-semibold", small && "font-normal text-muted-foreground")}>
                    {rate(r.points)}
                  </td>
                  <td className="hidden py-1.5 pl-6 sm:table-cell">
                    {share != null && (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-chart-1" style={{ width: `${share * 100}%` }} />
                        </div>
                        <span className="w-20 text-xs text-muted-foreground tabular-nums">
                          {Math.round(share * 100)}% · {r.points} P
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </Section>
  );
}
