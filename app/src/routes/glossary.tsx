import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/layout";
import { usePageTitle } from "@/hooks";
import { metrics, categoryInfo, categoryOrder } from "@/lib/glossary-data";

export const Route = createFileRoute("/glossary")({
  component: GlossaryPage,
});

function GlossaryPage() {
  usePageTitle("Metrics glossary");
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();
  const matches = (m: (typeof metrics)[number]) =>
    !q ||
    m.name.toLowerCase().includes(q) ||
    (m.abbreviation?.toLowerCase().includes(q) ?? false) ||
    (m.aliases ?? []).some((a) => a.toLowerCase().includes(q)) ||
    m.description.toLowerCase().includes(q);

  return (
    <div className="container space-y-8 py-8">
      <PageHeader
        title="Metrics glossary"
        description="What every stat on this site measures, and how the calculated ones are worked out."
      />

      <div className="grid gap-10 lg:grid-cols-[14rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Input
            type="search"
            placeholder="Filter metrics"
            value={filter}
            onChange={(e) => setFilter(e.currentTarget.value)}
            className="mb-4 rounded-full"
          />
          <nav
            aria-label="Glossary sections"
            className="hidden space-y-1 text-sm lg:block"
          >
            <a
              href="#basics"
              className="block rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              The basics
            </a>
            {categoryOrder.map((category) => (
              <a
                key={category}
                href={`#${category}`}
                className="block rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {categoryInfo[category].label}
              </a>
            ))}
            <a
              href="#calculations"
              className="block rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Our calculations
            </a>
          </nav>
        </aside>

        <div className="min-w-0 max-w-3xl space-y-12">
          {!q && (
            <section id="basics" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold">The basics</h2>
              <p className="text-muted-foreground leading-relaxed">
                Modern hockey analytics go beyond traditional stats like goals
                and assists to measure what actually drives winning. The key
                insight is that{" "}
                <strong className="text-foreground">
                  shot attempts predict future success
                </strong>{" "}
                better than goals, because goals involve significant randomness
                (shooting percentage, goaltending, bounces).
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The evolution of analytics has moved from{" "}
                <strong className="text-foreground">Corsi</strong> (all shot
                attempts) to{" "}
                <strong className="text-foreground">Fenwick</strong> (unblocked
                attempts) to{" "}
                <strong className="text-foreground">Expected goals</strong>{" "}
                (probability-weighted shots). Each step adds more nuance by
                better accounting for shot quality.
              </p>
            </section>
          )}

          {categoryOrder.map((category) => {
            const info = categoryInfo[category];
            const categoryMetrics = metrics.filter(
              (m) => m.category === category && matches(m),
            );
            if (categoryMetrics.length === 0) return null;

            return (
              <section
                key={category}
                id={category}
                className="scroll-mt-24 space-y-4"
              >
                <div>
                  <h2 className="text-xl font-semibold">{info.label}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {info.description}
                  </p>
                </div>
                <dl className="divide-y rounded-2xl border bg-card">
                  {categoryMetrics.map((metric) => (
                    <div
                      key={metric.name}
                      id={metric.abbreviation ?? metric.name}
                      className="scroll-mt-24 px-5 py-4"
                    >
                      <dt className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{metric.name}</span>
                        {metric.abbreviation && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                            {metric.abbreviation}
                          </span>
                        )}
                        {metric.isCalculated && (
                          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                            Calculated here
                          </span>
                        )}
                      </dt>
                      <dd className="mt-1.5 space-y-1.5 text-sm text-muted-foreground">
                        <p>{metric.description}</p>
                        {metric.formula && (
                          <p>
                            <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-foreground">
                              {metric.formula}
                            </code>
                          </p>
                        )}
                        {metric.interpretation && (
                          <p>{metric.interpretation}</p>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}

          {q && metrics.every((m) => !matches(m)) && (
            <EmptyState
              title={`No metrics match "${filter.trim()}"`}
              hint="Try an abbreviation like xG or CF%."
            />
          )}

          {!q && (
            <section id="calculations" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold">Our calculations</h2>
              <div className="space-y-3 rounded-2xl border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
                <p>
                  Some metrics shown on this site are{" "}
                  <strong className="text-foreground">calculated</strong> from
                  other fields. Wherever possible we display the exact formula
                  in the glossary entry.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong className="text-foreground">Per-60 rates</strong>:{" "}
                    <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
                      Stat/60 = (Stat ÷ TOI) × 60
                    </code>{" "}
                    (TOI in minutes)
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Power rankings record
                    </strong>
                    : when we don’t have official W/L/OTL in the dataset, we
                    estimate via a goal-based Pythagorean expectation{" "}
                    <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
                      Win% = GF²/(GF²+GA²)
                    </code>{" "}
                    and approximate OTL as ~10% of losses.
                  </li>
                  <li>
                    <strong className="text-foreground">PDO</strong>:{" "}
                    <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
                      PDO = Sh% + Sv%
                    </code>
                  </li>
                  <li>
                    <strong className="text-foreground">Expected points</strong>
                    :{" "}
                    <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
                      xWin% = xGF²/(xGF²+xGA²); xPts = round(xWin%×GP×2)
                    </code>
                  </li>
                  <li>
                    <strong className="text-foreground">Percentiles</strong>:
                    thresholds are computed by sorting league values and using
                    linear interpolation for the 1st–99th percentiles.
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Season and shot data, including expected goals, come from{" "}
                  <a
                    href="https://moneypuck.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link hover:underline"
                  >
                    MoneyPuck
                  </a>
                  . Their expected goals model accounts for shot location, shot
                  type, whether it's a rebound or rush, shooter and goalie
                  information, and game context to produce probability estimates
                  for each shot. Live games, tracking, the draft, trophies and
                  career records come from the NHL's own APIs. Injuries and
                  transactions come from ESPN.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
