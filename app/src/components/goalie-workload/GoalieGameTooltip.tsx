import { formatSavePct } from "@/lib/formatters";

interface GoalieGameData {
  opponent: string;
  isB2B: boolean;
  shotsAgainst: number;
  savePercentage: number;
  gsax: number;
}

interface GoalieGameTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: GoalieGameData }>;
  primaryStat?: "shotsAgainst" | "savePercentage";
}

export function GoalieGameTooltip({
  active,
  payload,
  primaryStat = "shotsAgainst",
}: GoalieGameTooltipProps) {
  if (!active || !payload?.length) return null;

  const d = payload[0].payload;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold">
        vs {d.opponent} {d.isB2B && "(B2B)"}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs">
        {primaryStat === "savePercentage" ? (
          <>
            <span className="text-muted-foreground">SV%:</span>
            <span className="font-medium">{formatSavePct(d.savePercentage)}</span>
            <span className="text-muted-foreground">SA:</span>
            <span>{d.shotsAgainst}</span>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">SA:</span>
            <span>{d.shotsAgainst}</span>
            <span className="text-muted-foreground">SV%:</span>
            <span>{formatSavePct(d.savePercentage)}</span>
          </>
        )}
        <span className="text-muted-foreground">GSAx:</span>
        <span>{d.gsax.toFixed(2)}</span>
      </div>
    </div>
  );
}
