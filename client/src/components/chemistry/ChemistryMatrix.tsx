import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { getHeatColor, type MatrixData } from "@/components/chemistry/chemistry-utils";
import { ChemistryTooltip } from "@/components/chemistry/ChemistryTooltip";
import type { ChemistryPair } from "@/types";

interface ChemistryMatrixProps {
  matrixData: MatrixData;
}

export function ChemistryMatrix({ matrixData }: ChemistryMatrixProps) {
  const [hoveredPair, setHoveredPair] = useState<ChemistryPair | null>(null);

  // Cell size for the matrix
  const cellSize = 32;
  const labelWidth = 130;
  const headerHeight = 80; // More space for rotated names

  return (
    <div className="relative">
      <svg
        width={labelWidth + matrixData.players.length * cellSize + 10}
        height={headerHeight + matrixData.players.length * cellSize + 10}
        className="text-xs"
      >
        {/* Row Labels (left side) */}
        {matrixData.players.map((player, i) => (
          <Link
            key={`row-${player.id}`}
            to="/players/$id"
            params={{ id: String(player.id) }}
          >
            <text
              x={labelWidth - 4}
              y={headerHeight + i * cellSize + cellSize / 2 + 4}
              textAnchor="end"
              className="fill-foreground hover:fill-primary cursor-pointer text-[11px]"
            >
              {player.name.length > 16
                ? player.name.slice(0, 14) + "..."
                : player.name}
            </text>
          </Link>
        ))}

        {/* Column Labels (top, rotated) */}
        {matrixData.players.map((player, i) => {
          const lastName = player.name.split(" ").pop() || player.name;
          return (
            <Link
              key={`col-${player.id}`}
              to="/players/$id"
              params={{ id: String(player.id) }}
            >
              <text
                x={labelWidth + i * cellSize + cellSize / 2}
                y={headerHeight - 4}
                textAnchor="start"
                transform={`rotate(-55, ${labelWidth + i * cellSize + cellSize / 2}, ${headerHeight - 4})`}
                className="fill-foreground hover:fill-primary cursor-pointer text-[10px]"
              >
                {lastName.length > 10 ? lastName.slice(0, 9) + "…" : lastName}
              </text>
            </Link>
          );
        })}

        {/* Matrix Cells */}
        {matrixData.players.map((rowPlayer, i) =>
          matrixData.players.map((colPlayer, j) => {
            if (i === j) {
              // Diagonal - self (grey)
              return (
                <rect
                  key={`cell-${i}-${j}`}
                  x={labelWidth + j * cellSize}
                  y={headerHeight + i * cellSize}
                  width={cellSize - 1}
                  height={cellSize - 1}
                  fill="hsl(0, 0%, 30%)"
                  rx={2}
                />
              );
            }

            const pair = matrixData.pairLookup.get(
              `${rowPlayer.id}-${colPlayer.id}`
            );
            const xgPct = pair?.expectedGoalsPct
              ? pair.expectedGoalsPct * 100
              : null;
            const hasData = pair != null;

            return (
              <g key={`cell-${i}-${j}`}>
                {/* Background rect for empty cells */}
                <rect
                  x={labelWidth + j * cellSize}
                  y={headerHeight + i * cellSize}
                  width={cellSize - 1}
                  height={cellSize - 1}
                  fill={hasData ? getHeatColor(xgPct, true) : "hsl(0, 0%, 15%)"}
                  stroke={hasData ? "none" : "hsl(0, 0%, 25%)"}
                  strokeWidth={hasData ? 0 : 1}
                  strokeDasharray={hasData ? "none" : "2,2"}
                  rx={2}
                  className={hasData ? "cursor-pointer transition-opacity hover:opacity-80" : ""}
                  onMouseEnter={() => hasData && setHoveredPair(pair || null)}
                  onMouseLeave={() => setHoveredPair(null)}
                />
                {xgPct != null && (
                  <text
                    x={labelWidth + j * cellSize + cellSize / 2}
                    y={headerHeight + i * cellSize + cellSize / 2 + 3}
                    textAnchor="middle"
                    className="fill-white text-[9px] font-medium pointer-events-none"
                    style={{ textShadow: "0 0 2px rgba(0,0,0,0.5)" }}
                  >
                    {xgPct.toFixed(0)}
                  </text>
                )}
              </g>
            );
          })
        )}
      </svg>

      {/* Hover Tooltip */}
      {hoveredPair && <ChemistryTooltip pair={hoveredPair} />}
    </div>
  );
}
