import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trophy, ArrowLeft } from "lucide-react";
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
import { z } from "zod";

const searchSchema = z.object({
  season: z.number().optional(),
});

export const Route = createFileRoute("/category-rankings")({
  component: CategoryRankingsPage,
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
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
          <Link to="/standings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Standings
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            Category Rankings
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          See where each team ranks (1-32) across key statistical categories.
          Green indicates top 10, red indicates bottom 10.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Select
          value={currentSeason?.toString() ?? ""}
          onValueChange={handleSeasonChange}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Select season" />
          </SelectTrigger>
          <SelectContent>
            {seasonsData?.seasons.map((s) => (
              <SelectItem key={s.year} value={s.year.toString()}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CategoryRankingsTable
        teams={data?.teams ?? []}
        isLoading={isLoading}
        isError={isError}
        season={currentSeason}
      />
    </div>
  );
}
