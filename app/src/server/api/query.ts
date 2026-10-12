import { ApiError, badRequest } from "@/server/api/errors";

const INT = /^[+-]?\d+$/;

// Query-string binding: names are case-insensitive, empty values count as missing, and values that don't
// parse are a 400 rather than being silently ignored.
export class QueryParams {
  private readonly values = new Map<string, string[]>();

  constructor(searchParams: URLSearchParams) {
    for (const [key, value] of searchParams) {
      if (value === "") continue;
      const name = key.toLowerCase();
      const list = this.values.get(name);
      if (list) list.push(value);
      else this.values.set(name, [value]);
    }
  }

  string(name: string): string | undefined {
    return this.values.get(name.toLowerCase())?.[0];
  }

  all(name: string): string[] {
    return this.values.get(name.toLowerCase()) ?? [];
  }

  int(name: string): number | undefined {
    const raw = this.string(name);
    if (raw === undefined) return undefined;
    return parseIntParam(name, raw);
  }

  requiredInt(name: string): number {
    const value = this.int(name);
    if (value === undefined) badRequest(ApiError.invalidParameter(name));
    return value;
  }

  number(name: string): number | undefined {
    const raw = this.string(name);
    if (raw === undefined) return undefined;
    const value = Number(raw);
    if (!Number.isFinite(value)) badRequest(ApiError.invalidParameter(name));
    return value;
  }

  bool(name: string): boolean | undefined {
    const raw = this.string(name)?.toLowerCase();
    if (raw === undefined) return undefined;
    if (raw === "true") return true;
    if (raw === "false") return false;
    badRequest(ApiError.invalidParameter(name));
  }

  // int[]: repeated keys (?ids=1&ids=2), each also allowed to be comma-separated.
  ints(name: string): number[] {
    return this.all(name)
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter((value) => value !== "")
      .map((value) => parseIntParam(name, value));
  }
}

function parseIntParam(name: string, raw: string): number {
  const value = Number(raw);
  if (!INT.test(raw.trim()) || !Number.isSafeInteger(value) || Math.abs(value) > 2 ** 31 - 1) {
    badRequest(ApiError.invalidParameter(name));
  }
  return value;
}

// Integer route params (`{id}`, `{age}`, `{season}`): anything else is a 404.
export function intRouteParam(raw: string | undefined): number | undefined {
  if (raw === undefined || !INT.test(raw)) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) && Math.abs(value) <= 2 ** 31 - 1 ? value : undefined;
}
