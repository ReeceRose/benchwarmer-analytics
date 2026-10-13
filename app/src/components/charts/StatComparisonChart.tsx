import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComparisonBars, type ComparisonRow } from "@/components/charts/ComparisonBars";
import type { SkaterStats } from "@/types";

interface PlayerData {
  name: string;
  stats: SkaterStats | null | undefined;
  color?: string;
}

interface StatComparisonChartProps {
  players: PlayerData[];
  title?: string;
  className?: string;
}

const perGame = (s: SkaterStats, v: number) => (s.gamesPlayed > 0 ? v / s.gamesPlayed : null);

/** Skaters side by side on the stats that matter most, one bar each. */
export function StatComparisonChart({ players, title = "Player comparison", className }: StatComparisonChartProps) {
  const valid = players.filter((p): p is PlayerData & { stats: SkaterStats } => p.stats != null);

  if (valid.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No stats for these players in this season.</p>
        </CardContent>
      </Card>
    );
  }

  const row = (
    label: string,
    get: (s: SkaterStats) => number | null,
    format: (v: number) => string,
    extra: Partial<ComparisonRow> = {},
  ): ComparisonRow => ({ label, values: valid.map((p) => get(p.stats)), format, ...extra });

  const rows: ComparisonRow[] = [
    row("Goals", (s) => s.goals, String),
    row("Assists", (s) => s.assists, String),
    row("Shots", (s) => s.shots, String),
    row("Expected goals", (s) => s.expectedGoals ?? null, (v) => v.toFixed(1)),
    row("Shot share (CF%)", (s) => (s.corsiForPct != null ? s.corsiForPct * 100 : null), (v) => `${v.toFixed(1)}%`, {
      domain: [35, 65],
      reference: { value: 50, label: "Even" },
    }),
    row("Ice time per game", (s) => perGame(s, s.iceTimeSeconds / 60), (v) => `${v.toFixed(1)}m`, { neutral: true }),
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ComparisonBars series={valid.map((p) => ({ name: p.name, colour: p.color }))} rows={rows} columns={2} />
      </CardContent>
    </Card>
  );
}
