import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RankedBars, niceAxis } from "@/components/charts";
import { getLineLabel } from "@/components/line-explorer/charts/line-chart-utils";
import type { LineCombination } from "@/types";

interface GoalsForAgainstChartProps {
  lines: LineCombination[];
  isForwardLine: boolean;
}

const LIMIT = 15;

/** Goal differential per line, best first, with goals for and against alongside. */
export function GoalsForAgainstChart({ lines, isForwardLine }: GoalsForAgainstChartProps) {
  const rows = lines
    .filter((l) => l.goalsFor + l.goalsAgainst > 0)
    .slice(0, LIMIT)
    .map((l) => {
      const diff = l.goalsFor - l.goalsAgainst;
      const label = getLineLabel(l);
      return {
        key: String(l.id),
        label: <span className="truncate">{label}</span>,
        value: diff,
        display: `${diff > 0 ? "+" : ""}${diff}`,
        meta: `${l.goalsFor}–${l.goalsAgainst}`,
        title: `${label}: ${l.goalsFor} for, ${l.goalsAgainst} against`,
      };
    })
    .sort((a, b) => b.value - a.value);

  const title = `Goals by ${isForwardLine ? "forward line" : "defence pair"}`;
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>None of these lines have scored or allowed a goal yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const extent = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const { domain, ticks } = niceAxis([-extent, extent]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Goals for minus against while together, best first.</CardDescription>
      </CardHeader>
      <CardContent>
        <RankedBars
          variant="line"
          rows={rows}
          headers={{ label: isForwardLine ? "Line" : "Pair", value: "Diff", meta: "GF–GA" }}
          domain={domain}
          ticks={ticks}
          formatTick={(t) => (t > 0 ? `+${t}` : String(t))}
          baseline={0}
          linked={false}
          renderRow={(row, props) => <div key={row.key} {...props} />}
        />
      </CardContent>
    </Card>
  );
}
