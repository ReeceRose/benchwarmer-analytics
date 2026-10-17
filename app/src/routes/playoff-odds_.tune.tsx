import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as z from "zod/mini";
import { usePageTitle, useSandboxInputs } from "@/hooks";
import { useSandboxOdds } from "@/hooks/useSandbox";
import { ErrorState, TableSkeleton } from "@/components/shared";
import { EmptyState, PageHeader, ViewToggle } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayoffOddsRings } from "@/components/projections/PlayoffOddsRings";
import { SandboxResults } from "@/components/projections/sandbox/SandboxResults";
import { SandboxSettingsPanel } from "@/components/projections/sandbox/SandboxSettingsPanel";
import { formatGameDateLong } from "@/lib/game-formatters";
import { modelSettings, SANDBOX_SIMS, type SandboxSettings } from "@/lib/projections/sandbox";
import type { TeamOdds } from "@/lib/projections/simulate";
import type { SandboxInputs, TeamPlayoffOdds } from "@/types";

// Settings live in the URL, so a tuned model can be shared. Anything left
// out is our model's value.
const searchSchema = z.object({
  hi: z.optional(z.number()),
  xg: z.optional(z.number()),
  gd: z.optional(z.number()),
  ro: z.optional(z.number()),
  go: z.optional(z.number()),
  re: z.optional(z.number()),
  ly: z.optional(z.number()),
  pg: z.optional(z.number()),
  u: z.optional(z.number()),
  inj: z.optional(z.boolean()),
  /** "NYR:5,WPG:-2.5": points of win chance against an average team. */
  take: z.optional(z.string()),
  view: z.optional(z.enum(["table", "charts"])),
});
type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/playoff-odds_/tune")({
  component: SandboxPage,
  validateSearch: searchSchema,
});

const KEYS = [
  ["hi", "homeIce"],
  ["xg", "xg"],
  ["gd", "goals"],
  ["ro", "roster"],
  ["go", "goalie"],
  ["re", "rest"],
  ["ly", "carryOver"],
  ["pg", "priorGames"],
  ["u", "uncertainty"],
] as const;

function fromSearch(search: Search, model: SandboxSettings): SandboxSettings {
  const s: SandboxSettings = { ...model, nudges: {} };
  for (const [param, key] of KEYS) if (search[param] !== undefined) s[key] = search[param]!;
  s.injuries = search.inj ?? false;
  for (const part of (search.take ?? "").split(",")) {
    const [team, value] = part.split(":");
    if (team && Number(value)) s.nudges[team] = Number(value);
  }
  return s;
}

function toSearch(s: SandboxSettings, model: SandboxSettings, view: Search["view"]): Search {
  const search: Search = { view };
  for (const [param, key] of KEYS) if (Math.abs(s[key] - model[key]) > 1e-9) search[param] = Number(s[key].toFixed(2));
  if (s.injuries) search.inj = true;
  const take = Object.entries(s.nudges)
    .filter(([, v]) => v)
    .map(([t, v]) => `${t}:${v}`)
    .join(",");
  if (take) search.take = take;
  return search;
}

/** Sandbox odds in the shape the ring chart reads. */
function asPlayoffOdds(odds: TeamOdds[], inputs: SandboxInputs): TeamPlayoffOdds[] {
  const teams = new Map(inputs.teams.map((t) => [t.team, t]));
  return odds.map((o) => {
    const t = teams.get(o.abbrev)!;
    return { ...o, team: o.abbrev, conference: t.conference, division: t.division, gamesPlayed: t.gamesPlayed, points: t.points, makePlayoffsChange: null };
  });
}

function SandboxPage() {
  usePageTitle("Tune your own playoff odds");
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const { data, isLoading, error, refetch } = useSandboxInputs();
  const inputs = data?.inputs ?? null;
  const model = useMemo(() => (inputs ? modelSettings(inputs) : null), [inputs]);
  const settings = inputs && model ? fromSearch(search, model) : null;
  const ours = useSandboxOdds(inputs, model);
  const yours = useSandboxOdds(inputs, settings);
  const view = search.view ?? "table";

  const update = (next: SandboxSettings, nextView = search.view) => {
    if (!model) return;
    navigate({ search: toSearch(next, model, nextView), replace: true, resetScroll: false });
  };

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Tune your own playoff odds"
        description={
          inputs
            ? `Change what the model weighs and replay the rest of the season ${SANDBOX_SIMS.toLocaleString()} times in your browser, from the standings as of ${formatGameDateLong(inputs.runDate)}.`
            : "Change what the model weighs and replay the rest of the season in your browser."
        }
        actions={
          <Button asChild variant="outline">
            <Link to="/playoff-odds">Our playoff odds</Link>
          </Button>
        }
      />
      {error ? (
        <ErrorState title="Couldn't load the sandbox" message="The projections request failed." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-160 rounded-2xl" />
          <div className="lg:col-span-2">
            <TableSkeleton rows={12} columns={7} />
          </div>
        </div>
      ) : !inputs || !settings ? (
        <EmptyState title="Nothing to tune yet" hint="The sandbox starts from the daily playoff odds run, which happens every morning during the regular season." />
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <SandboxSettingsPanel inputs={inputs} settings={settings} onChange={(s) => update(s)} />
          <div className="min-w-0 space-y-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ViewToggle value={view} onValueChange={(v) => update(settings, v === "table" ? undefined : v)} />
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {yours.running ? "Simulating…" : `${SANDBOX_SIMS.toLocaleString()} simulations`}
              </span>
            </div>
            {!yours.odds ? (
              <TableSkeleton rows={12} columns={7} />
            ) : view === "charts" ? (
              <PlayoffOddsRings teams={asPlayoffOdds(yours.odds, inputs)} season={inputs.season} />
            ) : (
              <SandboxResults
                odds={yours.odds}
                model={ours.odds}
                season={inputs.season}
                nudges={settings.nudges}
                onNudge={(team, value) => update({ ...settings, nudges: { ...settings.nudges, [team]: value } })}
                running={yours.running}
              />
            )}
            <p className="text-xs text-muted-foreground">
              "vs ours" compares with our model run the same way here, so the difference is only your settings. Only our
              model's weights have been tested against past seasons; everything else is your call.{" "}
              <Link to="/glossary" hash="Playoff odds" className="text-link">How the model works</Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
