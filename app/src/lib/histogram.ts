/**
 * Utility functions for building histogram data from arrays of values.
 */

export interface HistogramBin {
  range: string;
  count: number;
  min: number;
  max: number;
}

/**
 * Builds histogram bins from an array of numeric values.
 *
 * @param values - Array of numbers to bin
 * @param binCount - Number of bins to create (default: 15)
 * @returns Array of histogram bins with range labels and counts
 */
export function buildHistogramBins(
  values: number[],
  binCount = 15
): HistogramBin[] {
  if (values.length === 0) return [];

  const min = Math.floor(Math.min(...values));
  const max = Math.ceil(Math.max(...values));
  const binWidth = (max - min) / binCount || 1;

  const bins: HistogramBin[] = [];
  for (let i = 0; i < binCount; i++) {
    const binMin = min + i * binWidth;
    const binMax = min + (i + 1) * binWidth;
    bins.push({
      range: `${binMin.toFixed(1)}-${binMax.toFixed(1)}`,
      count: 0,
      min: binMin,
      max: binMax,
    });
  }

  for (const value of values) {
    const binIndex = Math.min(
      Math.floor((value - min) / binWidth),
      binCount - 1
    );
    if (binIndex >= 0 && binIndex < bins.length) {
      bins[binIndex].count++;
    }
  }

  return bins;
}
