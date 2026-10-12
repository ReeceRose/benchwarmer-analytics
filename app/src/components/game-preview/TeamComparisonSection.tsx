import { MirroredBar, TeamLabel } from "@/components/game-live/parts";
import { formatPercent } from "@/lib/formatters";
import type { TeamComparison, TeamPreviewStats } from "@/types";

type Row = {
  label: string;
  value: (t: TeamPreviewStats) => number | null;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
};

const ROWS: Row[] = [
  { label: "xGF/GP", value: (t) => t.xGoalsFor, format: (v) => v.toFixed(2) },
  { label: "xGA/GP", value: (t) => t.xGoalsAgainst, format: (v) => v.toFixed(2), lowerIsBetter: true },
  { label: "xG%", value: (t) => t.xGoalsPct, format: (v) => formatPercent(v) },
  { label: "Corsi%", value: (t) => t.corsiPct, format: (v) => formatPercent(v) },
  { label: "Power play", value: (t) => t.powerPlayPct, format: (v) => formatPercent(v, false) },
  { label: "Penalty kill", value: (t) => t.penaltyKillPct, format: (v) => formatPercent(v, false) },
];

/** Season-to-date team rates, away on the left like the header. */
export function TeamComparisonSection({ data }: { data: TeamComparison }) {
  const { home, away } = data;

  return (
    <>
      {ROWS.map((row) => {
        const a = row.value(away);
        const h = row.value(home);
        if (a == null && h == null) return null;
        return (
          <MirroredBar
            key={row.label}
            label={row.label}
            away={a ?? 0}
            home={h ?? 0}
            awayText={a == null ? "–" : row.format(a)}
            homeText={h == null ? "–" : row.format(h)}
            lowerIsBetter={row.lowerIsBetter}
          />
        );
      })}
      <div className="mt-3 flex justify-between gap-2 text-xs text-muted-foreground">
        <TeamLabel side="away">{away.teamCode}</TeamLabel>
        <span>Bold = better side</span>
        <TeamLabel side="home">{home.teamCode}</TeamLabel>
      </div>
    </>
  );
}
