import type { ChemistryPair } from "@/types";
import { getChemistryHeatColour } from "@/lib/chart-colours";

export const getHeatColor = getChemistryHeatColour;

export interface MatrixPlayer {
  id: number;
  name: string;
  position?: string;
}

export interface MatrixData {
  players: MatrixPlayer[];
  pairLookup: Map<string, ChemistryPair>;
  /** The most time any pair in the group has spent together. */
  maxToi: number;
}

/** Pairs with under this share of the group's most-used pair's time are faded as small samples. */
export const SMALL_SAMPLE_SHARE = 0.2;

export const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export const lastName = (name: string) => name.split(" ").slice(1).join(" ") || name;

const isDefence = (position?: string) => position === "D";

/** Most-used players first, by total ice time across their pairs. */
function orderByIceTime(players: MatrixPlayer[], pairs: ChemistryPair[]): MatrixPlayer[] {
  const toi = new Map<number, number>();
  for (const p of pairs) {
    toi.set(p.player1Id, (toi.get(p.player1Id) ?? 0) + p.totalIceTimeSeconds);
    toi.set(p.player2Id, (toi.get(p.player2Id) ?? 0) + p.totalIceTimeSeconds);
  }
  return [...players].sort((a, b) => (toi.get(b.id) ?? 0) - (toi.get(a.id) ?? 0));
}

function toMatrix(pairs: ChemistryPair[]): MatrixData {
  const players = new Map<number, MatrixPlayer>();
  const pairLookup = new Map<string, ChemistryPair>();
  for (const p of pairs) {
    players.set(p.player1Id, { id: p.player1Id, name: p.player1Name, position: p.player1Position });
    players.set(p.player2Id, { id: p.player2Id, name: p.player2Name, position: p.player2Position });
    pairLookup.set(pairKey(p.player1Id, p.player2Id), p);
  }
  return {
    players: orderByIceTime([...players.values()], pairs),
    pairLookup,
    maxToi: Math.max(0, ...pairs.map((p) => p.totalIceTimeSeconds)),
  };
}

/**
 * Pairs come from line combinations, so forwards only pair with forwards and
 * defencemen with defencemen. Each group gets its own matrix rather than one
 * grid with an always-empty forward × defence block.
 */
export function buildChemistryGroups(pairs: ChemistryPair[]): { forwards: MatrixData; defense: MatrixData } {
  return {
    forwards: toMatrix(pairs.filter((p) => !isDefence(p.player1Position) && !isDefence(p.player2Position))),
    defense: toMatrix(pairs.filter((p) => isDefence(p.player1Position) && isDefence(p.player2Position))),
  };
}
