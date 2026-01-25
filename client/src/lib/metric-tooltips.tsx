import type { ReactNode } from "react";
import { metrics } from "@/lib/glossary-data";

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

export function findMetricDefinition(key: string) {
  const k = normalizeKey(key);
  return metrics.find((m) => {
    if (normalizeKey(m.name) === k) return true;
    if (m.abbreviation && normalizeKey(m.abbreviation) === k) return true;
    return (m.aliases ?? []).some((a) => normalizeKey(a) === k);
  });
}

export function getMetricTooltipContent(metricKey: string): ReactNode | null {
  const metric = findMetricDefinition(metricKey);
  if (!metric) return null;

  return (
    <div className="max-w-xs space-y-1">
      <div className="text-xs font-medium">
        {metric.name}
        {metric.abbreviation ? (
          <span className="text-muted-foreground font-normal"> ({metric.abbreviation})</span>
        ) : null}
        {metric.isCalculated ? (
          <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            Calculated
          </span>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">{metric.description}</p>

      {metric.formula ? (
        <div className="text-xs">
          <span className="text-muted-foreground">Formula: </span>
          <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">
            {metric.formula}
          </code>
        </div>
      ) : null}

      {metric.interpretation ? (
        <p className="text-xs text-muted-foreground italic">{metric.interpretation}</p>
      ) : null}
    </div>
  );
}

