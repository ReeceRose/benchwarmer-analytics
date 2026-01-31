import type { LineCombination } from "@/types";

/**
 * Get a compact label for a line combination using player last names.
 * @example "McDavid / Draisaitl / Hyman"
 */
export function getLineLabel(line: LineCombination): string {
  const lastName = (name: string) => name.split(" ").pop() || name;
  const names = [lastName(line.player1.name), lastName(line.player2.name)];
  if (line.player3) {
    names.push(lastName(line.player3.name));
  }
  return names.join(" / ");
}

/**
 * Base data point interface shared across line charts.
 */
export interface LineChartDataPoint {
  id: number;
  label: string;
  toi: number;
  toiFormatted: string;
  gf: number;
  ga: number;
}
