import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Users, UserSearch, GitCompare } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SeasonSelector, SituationSelector, ErrorState } from "@/components/shared";
import { LeaderStrip, LuckChart, OutliersSection, TopLinesCard, TeamGrid, GamesSection } from "@/components/home";
import { useHomepageData, useSeasons } from "@/hooks";
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

const quickLinks = [
  {
    title: "Teams",
    description: "Browse all 32 NHL teams and explore rosters.",
    icon: Users,
    href: "/teams" as const,
    color: "text-blue-500",
  },
  {
    title: "Players",
    description: "Search players and view detailed stats.",
    icon: UserSearch,
    href: "/players" as const,
    color: "text-green-500",
  },
  {
    title: "Compare",
    description: "Compare multiple players side-by-side.",
    icon: GitCompare,
    href: "/compare" as const,
    color: "text-purple-500",
  },
];

function HomePage() {
  const { data: seasonsData } = useSeasons();
  const defaultSeason = seasonsData?.seasons?.[0]?.year;

  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  // Derive state from URL params with defaults
  const season = search.season;
  const situation = (search.situation as Situation) || "5on5";

  // Use default season from API if not set
  const effectiveSeason = season ?? defaultSeason;

  const updateSearch = (updates: { season?: number; situation?: Situation }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
      }),
    });
  };

  const { data, isLoading, error, refetch } = useHomepageData(effectiveSeason, situation);

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
          Showing {formatSeason(effectiveSeason)} {situation === "5on5" ? "5v5" : situation} stats
        </p>
      )}

      {error && (
        <ErrorState
          title="Failed to load data"
          message="Could not fetch homepage data. Make sure the API is running."
          onRetry={() => refetch()}
        />
      )}

      {!error && (
        <>
          <section>
            <h2 className="text-lg font-semibold mb-3">League Leaders</h2>
            {isLoading ? (
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-70 shrink-0 rounded-lg" />
                ))}
              </div>
            ) : data ? (
              <LeaderStrip leaders={data.leaders} goalieLeaders={data.goalieLeaders} />
            ) : null}
          </section>

          <section className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-64 rounded-lg" />
                <div className="grid gap-6 lg:grid-cols-2">
                  <Skeleton className="h-80 rounded-lg" />
                  <Skeleton className="h-80 rounded-lg" />
                </div>
              </>
            ) : data?.outliers ? (
              <>
                <LuckChart
                  runningHot={data.outliers.runningHot}
                  runningCold={data.outliers.runningCold}
                />
                <OutliersSection
                  runningHot={data.outliers.runningHot}
                  runningCold={data.outliers.runningCold}
                  goalieRunningHot={data.goalieOutliers?.runningHot}
                  goalieRunningCold={data.goalieOutliers?.runningCold}
                />
              </>
            ) : null}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {isLoading ? (
              <>
                <Skeleton className="h-64 rounded-lg" />
                <Skeleton className="h-64 rounded-lg" />
              </>
            ) : data ? (
              <>
                <TopLinesCard lines={data.topLines} season={effectiveSeason} />
                <TeamGrid />
              </>
            ) : null}
          </div>

          <GamesSection />
        </>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Explore</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickLinks.map(({ title, description, icon: Icon, href, color }) => (
            <Link key={title} to={href}>
              <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className={`${color} mb-2`}>
                    <Icon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-center text-sm text-muted-foreground pt-8">
        Data sourced from{" "}
        <a
          href="https://moneypuck.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          MoneyPuck
        </a>
      </p>
    </div>
  );
}
