import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { seasonsQueryOptions } from "@/hooks/useSeasons";
import { prefetchHomeLeaders } from "@/hooks/useHomeLeaders";
import { outliersQueryOptions } from "@/hooks/useOutliers";
import { topLinesQueryOptions } from "@/hooks/useTopLines";
import { teamsQueryOptions } from "@/hooks/useTeams";
import { nightlyGameScoresQueryOptions } from "@/hooks/useGameScores";
import { milestonesQueryOptions } from "@/hooks/useHistory";
import { prefetchForSsr } from "@/lib/ssr-prefetch";
import * as z from "zod/mini";
import { usePageTitle } from "@/hooks";
import { SeasonSelector } from "@/components/shared";
import { PageHeader, SegmentedControl } from "@/components/layout";
import {
  LastNightSection,
  LeaderStripSection,
  MilestoneSection,
  OutliersSectionWrapper,
  TopLinesSection,
  TeamGrid,
} from "@/components/home";
import { useSeasons } from "@/hooks";
import { formatSeason } from "@/lib/formatters";
import type { Situation } from "@/types";

const searchSchema = z.object({
  season: z.optional(z.number()),
  situation: z.optional(z.string()),
});

const SITUATION_OPTIONS: { value: Situation; label: string }[] = [
  { value: "all", label: "All" },
  { value: "5on5", label: "5v5" },
  { value: "5on4", label: "Power play" },
  { value: "4on5", label: "Penalty kill" },
];

export const Route = createFileRoute("/")({
  component: HomePage,
  ssr: true,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({
    season: search.season,
    situation: search.situation,
  }),
  // Same queries (and keys) as the sections below, so a server render
  // includes their data.
  loader: async ({ context: { queryClient }, deps }) => {
    await queryClient.prefetchQuery(seasonsQueryOptions);
    const season =
      deps.season ??
      queryClient.getQueryData(seasonsQueryOptions.queryKey)?.seasons?.[0]?.year;
    if (season === undefined) return;
    const situation = deps.situation || "all";
    await prefetchForSsr([
      ...prefetchHomeLeaders(queryClient, season, situation),
      queryClient.prefetchQuery(outliersQueryOptions(season, situation)),
      queryClient.prefetchQuery(topLinesQueryOptions(season, "5on5")),
      queryClient.prefetchQuery(teamsQueryOptions),
      queryClient.prefetchQuery(nightlyGameScoresQueryOptions()),
      queryClient.prefetchQuery(milestonesQueryOptions),
    ]);
  },
});

function HomePage() {
  usePageTitle("NHL Analytics");

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

  const isCurrentSeason = effectiveSeason === defaultSeason;

  return (
    <div className="container space-y-10 py-8">
      <PageHeader
        title={
          effectiveSeason
            ? `${formatSeason(effectiveSeason)} ${isCurrentSeason ? "so far" : "season"}`
            : "NHL analytics"
        }
        description="Advanced stats from MoneyPuck, updated every morning."
        actions={
          <>
            <SeasonSelector
              value={effectiveSeason}
              onValueChange={(season) => updateSearch({ season })}
            />
            <SegmentedControl
              aria-label="Game situation"
              value={situation}
              onValueChange={(situation) => updateSearch({ situation })}
              options={SITUATION_OPTIONS}
            />
          </>
        }
      />

      <LeaderStripSection season={effectiveSeason} situation={situation} />

      <OutliersSectionWrapper season={effectiveSeason} situation={situation} />

      {isCurrentSeason && <LastNightSection />}

      {isCurrentSeason && <MilestoneSection />}

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <TopLinesSection season={effectiveSeason} />
        <TeamGrid />
      </div>
    </div>
  );
}
