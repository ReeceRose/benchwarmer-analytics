import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComparisonBars, type ComparisonRow } from "@/components/charts/ComparisonBars";
import { fitDomain, symmetricDomain } from "@/components/charts/comparison-utils";
import type { GoalieStats } from "@/types";

interface GoalieData {
  name: string;
  stats: GoalieStats | null | undefined;
}

interface GoalieComparisonProps {
  players: GoalieData[];
  title?: string;
  className?: string;
}

const savePct = (v: number) => (v >= 1 ? v.toFixed(3) : v.toFixed(3).replace(/^0/, ""));

function highDangerSavePct(s: GoalieStats): number | null {
  if (!s.highDangerShots) return null;
  return (s.highDangerShots - s.highDangerGoals) / s.highDangerShots;
}

/** Goalies side by side on the headline numbers. */
export function GoalieComparison({ players, title = "Goalie comparison", className }: GoalieComparisonProps) {
  const valid = players.filter((p): p is GoalieData & { stats: GoalieStats } => p.stats != null);

  if (valid.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No stats for these goalies in this season.</p>
        </CardContent>
      </Card>
    );
  }

  const svPct = valid.map((p) => p.stats.savePercentage ?? null);
  const gaa = valid.map((p) => p.stats.goalsAgainstAverage ?? null);
  const gsax = valid.map((p) => p.stats.goalsSavedAboveExpected ?? null);
  const hdSvPct = valid.map((p) => highDangerSavePct(p.stats));

  const rows: ComparisonRow[] = [
    { label: "Save %", values: svPct, format: savePct, domain: fitDomain(svPct, { step: 0.005, max: 1 }) },
    { label: "Goals against average", values: gaa, format: (v) => v.toFixed(2), lowerIsBetter: true },
    {
      label: "Goals saved above expected",
      values: gsax,
      format: (v) => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)),
      domain: symmetricDomain(gsax, 5),
    },
    { label: "High-danger save %", values: hdSvPct, format: savePct, domain: fitDomain(hdSvPct, { max: 1 }) },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ComparisonBars series={valid.map((p) => ({ name: p.name }))} rows={rows} columns={2} />
        <p className="mt-3 text-xs text-muted-foreground">
          Save percentages are dots on a range fitted to these goalies; goals saved above expected grows from zero.
        </p>
      </CardContent>
    </Card>
  );
}
