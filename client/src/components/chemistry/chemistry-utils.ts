import type { ChemistryPair } from "@/types";
import { getChemistryHeatColor } from "@/lib/chart-colors";

// Re-export for backwards compatibility
export const getHeatColor = getChemistryHeatColor;

export interface MatrixPlayer {
  id: number;
  name: string;
}

export interface MatrixData {
  players: MatrixPlayer[];
  pairLookup: Map<string, ChemistryPair>;
}

export function buildMatrixData(pairs: ChemistryPair[]): MatrixData | null {
  if (!pairs) return null;

  // Get unique players and build lookup
  const playerMap = new Map<number, MatrixPlayer>();
  for (const pair of pairs) {
    playerMap.set(pair.player1Id, {
      id: pair.player1Id,
      name: pair.player1Name,
    });
    playerMap.set(pair.player2Id, {
      id: pair.player2Id,
      name: pair.player2Name,
    });
  }

  // Sort players by total ice time
  const playerToi = new Map<number, number>();
  for (const pair of pairs) {
    playerToi.set(
      pair.player1Id,
      (playerToi.get(pair.player1Id) ?? 0) + pair.totalIceTimeSeconds
    );
    playerToi.set(
      pair.player2Id,
      (playerToi.get(pair.player2Id) ?? 0) + pair.totalIceTimeSeconds
    );
  }

  const players = Array.from(playerMap.values()).sort(
    (a, b) => (playerToi.get(b.id) ?? 0) - (playerToi.get(a.id) ?? 0)
  );

  // Build pair lookup
  const pairLookup = new Map<string, ChemistryPair>();
  for (const pair of pairs) {
    const key1 = `${pair.player1Id}-${pair.player2Id}`;
    const key2 = `${pair.player2Id}-${pair.player1Id}`;
    pairLookup.set(key1, pair);
    pairLookup.set(key2, pair);
  }

  return { players, pairLookup };
}
