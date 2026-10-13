import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { TooltipTitle } from "@/components/game-live/ChartTooltip";
import { useChartTooltip } from "@/components/game-live/useChartTooltip";
import {
  SMALL_SAMPLE_SHARE,
  getHeatColor,
  lastName,
  pairKey,
  type MatrixData,
} from "@/components/chemistry/chemistry-utils";
import { getChemistryTextColour } from "@/lib/chart-colours";
import { formatIceTimeLong } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { ChemistryPair } from "@/types";

interface ChemistryMatrixProps {
  matrixData: MatrixData;
  selectedKey?: string;
  onSelect: (pair: ChemistryPair) => void;
}

/**
 * One triangle of the pair matrix (the other half would repeat it), most-used
 * players first. Small samples are faded. Hover a cell for the numbers;
 * click it to pin the pair below.
 */
export function ChemistryMatrix({ matrixData, selectedKey, onSelect }: ChemistryMatrixProps) {
  const { bind, tooltip } = useChartTooltip();
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const { players, pairLookup, maxToi } = matrixData;
  const rows = players.slice(1);
  const cols = players.slice(0, -1);

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0.5" onMouseLeave={() => setHover(null)}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card" />
            {cols.map((player, c) => (
              <th key={player.id} scope="col" className="h-24 w-9 p-0 text-center align-bottom">
                <Link
                  to="/players/$id"
                  params={{ id: String(player.id) }}
                  className={cn(
                    "inline-block max-h-24 truncate pb-1 text-xs font-normal [writing-mode:vertical-rl] rotate-180 hover:text-link",
                    hover?.col === c ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {lastName(player.name)}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((rowPlayer, r) => (
            <tr key={rowPlayer.id}>
              <th scope="row" className="sticky left-0 z-10 bg-card pr-2 text-right">
                <Link
                  to="/players/$id"
                  params={{ id: String(rowPlayer.id) }}
                  className={cn(
                    "block max-w-36 truncate text-xs font-normal hover:text-link",
                    hover?.row === r ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {rowPlayer.name}
                </Link>
              </th>
              {cols.map((colPlayer, c) => {
                if (c > r) return <td key={colPlayer.id} />;
                const key = pairKey(rowPlayer.id, colPlayer.id);
                const pair = pairLookup.get(key);
                if (!pair || pair.expectedGoalsPct == null) {
                  return (
                    <td key={colPlayer.id} className="size-9 p-0">
                      <div className="mx-auto size-1 rounded-full bg-border" />
                    </td>
                  );
                }
                const xg = pair.expectedGoalsPct;
                const small = pair.totalIceTimeSeconds < maxToi * SMALL_SAMPLE_SHARE;
                const handlers = bind(
                  <>
                    <TooltipTitle>
                      {lastName(pair.player1Name)} & {lastName(pair.player2Name)}
                    </TooltipTitle>
                    <div className="tabular-nums">
                      xG share <b>{xg.toFixed(1)}%</b>
                      {pair.corsiPct != null && ` · CF ${pair.corsiPct.toFixed(1)}%`}
                    </div>
                    <div className="text-muted-foreground tabular-nums">
                      {formatIceTimeLong(pair.totalIceTimeSeconds)} together · {pair.gamesPlayed} GP
                      {small && " · small sample"}
                    </div>
                  </>,
                );
                return (
                  <td key={colPlayer.id} className="size-9 p-0">
                    <button
                      type="button"
                      aria-label={`${pair.player1Name} and ${pair.player2Name}: ${xg.toFixed(1)}% xG share`}
                      aria-pressed={selectedKey === key}
                      onClick={() => onSelect(pair)}
                      onMouseMove={(e) => {
                        setHover({ row: r, col: c });
                        handlers.onMouseMove(e);
                      }}
                      onMouseLeave={handlers.onMouseLeave}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring",
                        small && "opacity-45",
                        (selectedKey === key || (hover?.row === r && hover?.col === c)) &&
                          "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                      )}
                      style={{ background: getHeatColor(xg, true), color: getChemistryTextColour(xg) }}
                    >
                      {xg.toFixed(0)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {tooltip}
    </div>
  );
}
