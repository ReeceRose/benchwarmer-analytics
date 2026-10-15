// Shared HTTP for ingestion: one User-Agent, a timeout, and retries with
// exponential backoff on network errors, 429 and 5xx.

export const USER_AGENT = "benchwarmer-analytics (personal hockey analytics project)";

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface FetchOptions {
  attempts?: number;
  timeoutMs?: number;
}

// GET with retries. Returns null on 404 (e.g. playoff files for seasons
// without playoffs yet); any other 4xx fails at once.
export async function fetchWithRetry(url: string, attempts = 4, timeoutMs = 120_000): Promise<Response | null> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status === 404) return null;
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status} for ${url}`);
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await sleep(1000 * 2 ** attempt);
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

// GET and parse JSON; null on 404.
export async function fetchJson(url: string, options: FetchOptions = {}): Promise<unknown> {
  const response = await fetchWithRetry(url, options.attempts, options.timeoutMs);
  return response === null ? null : response.json();
}
