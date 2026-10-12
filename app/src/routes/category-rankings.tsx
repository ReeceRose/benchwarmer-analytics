import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { seasonsQueryOptions } from "@/hooks/useSeasons";
import { useCategoryRankings, useSeasons, usePageTitle } from "@/hooks";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryRankingsTable } from "@/components/category-rankings";
import { PageHeader } from "@/components/layout";
import * as z from "zod/mini";

const searchSchema = z.object({
  season: z.optional(z.number()),
});

export const Route = createFileRoute("/category-rankings")({
  component: CategoryRankingsPage,
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(seasonsQueryOptions),
  validateSearch: searchSchema,
});

function CategoryRankingsPage() {
  usePageTitle("Category Rankings");

  const navigate = useNavigate({ from: Route.fullPath });
  const { season } = Route.useSearch();
  const { data: seasonsData } = useSeasons();

  const currentSeason = season ?? seasonsData?.seasons?.[0]?.year;

  const { data, isLoading, isError } = useCategoryRankings(currentSeason);

  const handleSeasonChange = (value: string) => {
    const newSeason = parseInt(value, 10);
    navigate({ search: { season: newSeason } });
  };

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Category rankings"
        description="Where every team ranks, 1 to 32, in each category. Top 10 are green, bottom 10 red."
        actions={
          <>
            <Select
              value={currentSeason?.toString() ?? ""}
              onValueChange={handleSeasonChange}
            >
              <SelectTrigger className="w-32" aria-label="Season">
                <SelectValue placeholder="Season" />
              </SelectTrigger>
              <SelectContent>
                {seasonsData?.seasons.map((s) => (
                  <SelectItem key={s.year} value={s.year.toString()}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" asChild>
              <Link to="/standings">Standings</Link>
            </Button>
          </>
        }
      />

      <CategoryRankingsTable
        teams={data?.teams ?? []}
        isLoading={isLoading}
        isError={isError}
        season={currentSeason}
      />
    </div>
  );
}
