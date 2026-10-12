import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { findMetricDefinition } from "@/lib/metric-tooltips";
import { cn } from "@/lib/utils";

/**
 * Collapsible "how to read these numbers" panel. Definitions come from the
 * glossary, looked up by abbreviation or alias (e.g. "xG%", "PDO").
 */
export function MetricGuide({
  metrics,
  children,
  className,
}: {
  metrics: string[];
  /** Extra content shown above the definitions, e.g. a legend. */
  children?: React.ReactNode;
  className?: string;
}) {
  const definitions = metrics
    .map((key) => ({ key, def: findMetricDefinition(key) }))
    .filter((m) => m.def);

  return (
    <details className={cn("group rounded-2xl border bg-card", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
        How to read these numbers
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t px-4 py-4 text-sm">
        {children}
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {definitions.map(({ key, def }) => (
            <div key={key}>
              <dt className="font-semibold">
                {key}
                {def!.name !== key && (
                  <span className="font-normal text-muted-foreground"> · {def!.name}</span>
                )}
              </dt>
              <dd className="text-muted-foreground">{def!.description}</dd>
            </div>
          ))}
        </dl>
        <Link to="/glossary" className="inline-block font-medium text-link hover:underline">
          Full glossary
        </Link>
      </div>
    </details>
  );
}
