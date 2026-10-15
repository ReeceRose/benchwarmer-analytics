import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { Unzip, UnzipInflate } from "fflate";
import { fetchWithRetry } from "@/server/ingestion/http";

const BASE_URL = "https://moneypuck.com/moneypuck/playerData";
const SHOTS_URL = "https://peter-tanner.com/moneypuck/downloads";

export type SeasonDataset = "teams" | "skaters" | "goalies" | "lines";

export function seasonSummaryUrl(dataset: SeasonDataset, season: number, playoffs: boolean): string {
  return `${BASE_URL}/seasonSummary/${season}/${playoffs ? "playoffs" : "regular"}/${dataset}.csv`;
}

export async function downloadSeasonSummary(
  dataset: SeasonDataset,
  season: number,
  playoffs: boolean,
): Promise<string | null> {
  const response = await fetchWithRetry(seasonSummaryUrl(dataset, season, playoffs));
  return response ? response.text() : null;
}

export async function downloadPlayerBios(): Promise<string> {
  const response = await fetchWithRetry(`${BASE_URL}/playerBios/allPlayersLookup.csv`);
  if (!response) throw new Error("player bios file not found");
  return response.text();
}

// Streams careers/gameByGame/all_teams.csv (every season, ~130 MB; served
// gzipped, which fetch decodes).
export async function streamTeamGamesCsv(): Promise<Readable> {
  const response = await fetchWithRetry(`${BASE_URL}/careers/gameByGame/all_teams.csv`);
  if (!response?.body) throw new Error("team game-by-game file not found");
  return Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>);
}

// Streams the CSV inside shots_<season>.zip without buffering the archive.
// Returns null if the season's file doesn't exist.
export async function streamShotsCsv(season: number): Promise<Readable | null> {
  const response = await fetchWithRetry(`${SHOTS_URL}/shots_${season}.zip`);
  if (!response?.body) return null;
  return Readable.from(unzipFirstCsv(Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>)));
}

export async function* unzipFirstCsv(body: AsyncIterable<Uint8Array>): AsyncGenerator<Uint8Array> {
  const queue: Uint8Array[] = [];
  let failure: Error | null = null;
  let found = false;
  let done = false;

  const unzip = new Unzip((file) => {
    if (found || !file.name.toLowerCase().endsWith(".csv")) return;
    found = true;
    file.ondata = (error, chunk, final) => {
      if (error) failure = error;
      else if (chunk.length > 0) queue.push(chunk);
      if (final) done = true;
    };
    file.start();
  });
  unzip.register(UnzipInflate);

  for await (const chunk of body) {
    unzip.push(chunk);
    if (failure) throw failure;
    while (queue.length > 0) yield queue.shift()!;
    if (done) return;
  }
  unzip.push(new Uint8Array(0), true);
  if (failure) throw failure;
  while (queue.length > 0) yield queue.shift()!;
  if (!found) throw new Error("no CSV file found in shots zip");
}
