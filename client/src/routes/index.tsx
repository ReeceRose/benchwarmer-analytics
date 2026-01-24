import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
  SeasonSelector,
  SituationSelector,
} from "@/components/shared";
import {
  LeaderStripSection,
  OutliersSectionWrapper,
  TopLinesSection,
  TeamGrid,
  GamesSection,
} from "@/components/home";
import { useSeasons } from "@/hooks";
import { formatSeason } from "@/lib/formatters";
import type { Situation } from "@/types";

const searchSchema = z.object({
  season: z.number().optional(),
  situation: z.string().optional(),
});

export const Route = createFileRoute("/")({
  component: HomePage,
  validateSearch: searchSchema,
});

function HomePage() {
  const { data: seasonsData } = useSeasons();
  const defaultSeason = seasonsData?.seasons?.[0]?.year;

  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  // Derive state from URL params with defaults
  const season = search.season;
  const situation = (search.situation as Situation) || "all";

  // Use default season from API if not set
  const effectiveSeason = season ?? defaultSeason;

  const updateSearch = (updates: {
    season?: number;
    situation?: Situation;
  }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
      }),
    });
  };

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">NHL Analytics</h1>
          <p className="text-muted-foreground">
            powered by advanced stats from MoneyPuck
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SeasonSelector
            value={effectiveSeason}
            onValueChange={(season) => updateSearch({ season })}
          />
          <SituationSelector
            value={situation}
            onValueChange={(situation) => updateSearch({ situation })}
            compact
          />
        </div>
      </div>

      {effectiveSeason && (
        <p className="text-sm text-muted-foreground">
          Showing {formatSeason(effectiveSeason)}{" "}
          {situation === "5on5" ? "5v5" : situation} stats
        </p>
      )}

      {/* Each section now fetches its own data independently */}
      {effectiveSeason === defaultSeason && <GamesSection />}

      <LeaderStripSection season={effectiveSeason} situation={situation} />

      <OutliersSectionWrapper season={effectiveSeason} situation={situation} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TopLinesSection season={effectiveSeason} />
        <TeamGrid />
      </div>
    </div>
  );
}
