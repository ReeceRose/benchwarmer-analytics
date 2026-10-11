import type { Queryable } from "@/server/ingestion/db";

export interface StepResult {
  rowsWritten: number;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
}

export const consoleLogger: Logger = {
  info: (message) => console.log(message),
  warn: (message) => console.warn(message),
};

// Records a sync step in sync_runs (running → succeeded/failed) around `fn`.
// Errors are recorded and rethrown.
export async function runStep(
  db: Queryable,
  step: string,
  season: number | null,
  fn: () => Promise<StepResult>,
  logger: Logger = consoleLogger,
): Promise<StepResult> {
  const label = season === null ? step : `${step} ${season}`;
  const started = Date.now();
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO sync_runs (step, season) VALUES ($1, $2) RETURNING id`,
    [step, season],
  );
  const id = rows[0].id;
  try {
    const result = await fn();
    await db.query(
      `UPDATE sync_runs SET status = 'succeeded', finished_at = now(), rows_written = $2 WHERE id = $1`,
      [id, result.rowsWritten],
    );
    logger.info(`${label}: ${result.rowsWritten} rows written in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    return result;
  } catch (error) {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    await db.query(
      `UPDATE sync_runs SET status = 'failed', finished_at = now(), error = $2 WHERE id = $1`,
      [id, message.slice(0, 10_000)],
    );
    logger.warn(`${label}: failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Whether a step/season pair has a successful run (backfill resumability).
export async function hasSucceeded(db: Queryable, step: string, season: number | null): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT 1 FROM sync_runs WHERE step = $1 AND season IS NOT DISTINCT FROM $2 AND status = 'succeeded' LIMIT 1`,
    [step, season],
  );
  return rows.length > 0;
}

// Runs left as 'running' by a crashed process are marked failed so they don't
// look in-progress forever.
export async function failStaleRuns(db: Queryable, olderThanMinutes: number): Promise<void> {
  await db.query(
    `UPDATE sync_runs SET status = 'failed', finished_at = now(), error = 'abandoned (process exited before finishing)'
     WHERE status = 'running' AND started_at < now() - make_interval(mins => $1)`,
    [olderThanMinutes],
  );
}
