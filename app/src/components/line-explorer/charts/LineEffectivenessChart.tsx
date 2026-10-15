import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RankedBars, niceAxis } from "@/components/charts";
import { getLineLabel } from "@/components/line-explorer/charts/line-chart-utils";
import { formatToi } from "@/lib/formatters";
import type { LineCombination } from "@/types";

interface LineEffectivenessChartProps {
  lines: LineCombination[];
  isForwardLine: boolean;
}

const LIMIT = 15;

/** xG share per line, growing out from an even 50%: right for lines that out-chance opponents. */
export function LineEffectivenessChart({ lines, isForwardLine }: LineEffectivenessChartProps) {
  const rows = lines
    .filter((l) => l.expectedGoalsPct != null)
    .slice(0, LIMIT)
    .map((l) => {
      const raw = l.expectedGoalsPct!;
      const xgPct = raw <= 1 ? raw * 100 : raw;
      const label = getLineLabel(l);
      return {
        key: String(l.id),
        label: <span className="truncate">{label}</span>,
        value: xgPct,
        display: `${xgPct.toFixed(1)}%`,
        meta: formatToi(l.iceTimeSeconds),
        title: `${label}: ${xgPct.toFixed(1)}% xG in ${formatToi(l.iceTimeSeconds)}`,
      };
    })
    .sort((a, b) => b.value - a.value);

  const title = `${isForwardLine ? "Forward line" : "Defence pair"} xG share`;
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>No lines with expected goals yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const extent = Math.max(5, ...rows.map((r) => Math.abs(r.value - 50)));
  const { domain, ticks } = niceAxis([50 - extent, 50 + extent]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          Share of expected goals while together. Right of 50% out-chances the
          opposition; left is out-chanced.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RankedBars
          variant="line"
          rows={rows}
          headers={{ label: isForwardLine ? "Line" : "Pair", value: "xG%", meta: "TOI" }}
          domain={domain}
          ticks={ticks}
          formatTick={(t) => `${t}%`}
          baseline={50}
          linked={false}
          renderRow={(row, props) => <div key={row.key} {...props} />}
        />
      </CardContent>
    </Card>
  );
}
