import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/shared";
import { usePageTitle } from "@/hooks";
import { metrics, categoryInfo, categoryOrder } from "@/lib/glossary-data";

export const Route = createFileRoute("/glossary")({
  component: GlossaryPage,
});

function GlossaryPage() {
  usePageTitle("Metrics Glossary");

  return (
    <div className="container py-8 max-w-4xl">
      <BackButton />

      <div className="mb-8 mt-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Metrics Glossary</h1>
        <p className="text-muted-foreground">
          A guide to the hockey analytics terminology and statistics used throughout this site.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Understanding Modern Hockey Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Modern hockey analytics go beyond traditional stats like goals and assists to measure
              what actually drives winning. The key insight is that{" "}
              <strong className="text-foreground">shot attempts predict future success</strong>{" "}
              better than goals, because goals involve significant randomness (shooting percentage,
              goaltending, bounces).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The evolution of analytics has moved from{" "}
              <strong className="text-foreground">Corsi</strong> (all shot attempts) to{" "}
              <strong className="text-foreground">Fenwick</strong> (unblocked attempts) to{" "}
              <strong className="text-foreground">Expected Goals</strong> (probability-weighted
              shots). Each step adds more nuance by better accounting for shot quality.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Benchwarmer Calculations (Transparency)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Some metrics shown on this site are <strong className="text-foreground">calculated</strong>{" "}
              from other fields. Wherever possible we display the exact formula in the glossary entry.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-foreground">Per-60 rates</strong>:{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  Stat/60 = (Stat ÷ TOI) × 60
                </code>{" "}
                (TOI in minutes)
              </li>
              <li>
                <strong className="text-foreground">Power rankings record</strong>: when we don’t have
                official W/L/OTL in the dataset, we estimate via a goal-based Pythagorean expectation{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  Win% = GF²/(GF²+GA²)
                </code>{" "}
                and approximate OTL as ~10% of losses.
              </li>
              <li>
                <strong className="text-foreground">PDO</strong>:{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  PDO = Sh% + Sv%
                </code>
              </li>
              <li>
                <strong className="text-foreground">Expected points</strong>:{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  xWin% = xGF²/(xGF²+xGA²); xPts = round(xWin%×GP×2)
                </code>
              </li>
              <li>
                <strong className="text-foreground">Percentiles</strong>: thresholds are computed by sorting
                league values and using linear interpolation for the 1st–99th percentiles.
              </li>
            </ul>
          </CardContent>
        </Card>
        {categoryOrder.map((category) => {
          const info = categoryInfo[category];
          const categoryMetrics = metrics.filter((m) => m.category === category);

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{info.label}</CardTitle>
                <p className="text-sm text-muted-foreground">{info.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {categoryMetrics.map((metric) => (
                    <div
                      key={metric.name}
                      className="border-b border-border pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{metric.name}</h3>
                        {metric.abbreviation && (
                          <Badge variant="secondary" className="font-mono text-xs">
                            {metric.abbreviation}
                          </Badge>
                        )}
                        {metric.isCalculated && (
                          <Badge variant="outline" className="text-xs">
                            Calculated
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{metric.description}</p>
                      {metric.formula && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Formula: </span>
                          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                            {metric.formula}
                          </code>
                        </p>
                      )}
                      {metric.interpretation && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          {metric.interpretation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card>
          <CardHeader>
            <CardTitle>Data Source</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All statistics on this site are calculated from data provided by{" "}
              <a
                href="https://moneypuck.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                MoneyPuck
              </a>
              . Their expected goals model accounts for shot location, shot type, whether it's a
              rebound or rush, shooter and goalie information, and game context to produce
              probability estimates for each shot.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
