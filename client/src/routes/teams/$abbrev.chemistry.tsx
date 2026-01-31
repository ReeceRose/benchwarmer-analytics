import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Grid3X3, Filter, Info, ListOrdered } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeasonSelector, ErrorState } from "@/components/shared";
import { useChemistryMatrix, useTeamSeasons } from "@/hooks";
import {
  ChemistryMatrix,
  ChemistryTopPairsChart,
  ChemistryLegend,
  buildMatrixData,
} from "@/components/chemistry";
import type { Situation, PositionFilter } from "@/types";

type ChemistryView = "grid" | "ranked";

const searchSchema = z.object({
  season: z.number().optional(),
  situation: z.string().optional(),
  position: z.enum(["all", "forward", "defense"]).optional(),
  display: z.enum(["grid", "ranked"]).optional(),
});

export const Route = createFileRoute("/teams/$abbrev/chemistry")({
  component: TeamChemistryPage,
  validateSearch: searchSchema,
});

// Situation options
const SITUATIONS = [
  { value: "5on5", label: "5v5" },
  { value: "all", label: "All Situations" },
  { value: "5on4", label: "5v4 (PP)" },
  { value: "4on5", label: "4v5 (PK)" },
] as const;

// Position filter options
const POSITION_FILTERS = [
  { value: "all", label: "All Players" },
  { value: "forward", label: "Forwards Only" },
  { value: "defense", label: "Defense Only" },
] as const;

function TeamChemistryPage() {
  const { abbrev } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  // Get available seasons for this team
  const { data: seasonsData } = useTeamSeasons(abbrev);
  const defaultSeason = seasonsData?.seasons?.[0]?.year;

  // Derive state from URL
  const season = search.season ?? defaultSeason;
  const situation = (search.situation as Situation) || "5on5";
  const position = (search.position as PositionFilter) || "all";
  const display: ChemistryView = search.display || "grid";

  // Fetch chemistry data - only pass position if not "all" to avoid unnecessary filtering
  const {
    data: chemistryData,
    isLoading,
    error,
    refetch,
  } = useChemistryMatrix(abbrev, {
    season: season!,
    situation,
    position: position === "all" ? undefined : position,
  });

  // Update URL params
  const updateSearch = (updates: {
    season?: number;
    situation?: Situation;
    position?: PositionFilter;
    display?: ChemistryView;
  }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
      }),
    });
  };

  // Build matrix data from pairs
  const matrixData = useMemo(() => {
    if (!chemistryData?.pairs) return null;
    return buildMatrixData(chemistryData.pairs);
  }, [chemistryData]);

  return (
    <div className="container pb-8">
      <div className="mb-6 mt-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Chemistry Matrix
        </h1>
        <p className="text-muted-foreground">
          Player pair performance measured by xG% when playing together.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SeasonSelector
          value={season}
          onValueChange={(s) => updateSearch({ season: s })}
          teamAbbrev={abbrev}
        />
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={situation}
            onValueChange={(s) => updateSearch({ situation: s as Situation })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SITUATIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select
          value={position}
          onValueChange={(p) => updateSearch({ position: p as PositionFilter })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POSITION_FILTERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tabs
          value={display}
          onValueChange={(v) => updateSearch({ display: v as ChemistryView })}
        >
          <TabsList className="h-9">
            <TabsTrigger value="grid" className="text-xs px-3 gap-1.5">
              <Grid3X3 className="h-3.5 w-3.5" />
              Grid
            </TabsTrigger>
            <TabsTrigger value="ranked" className="text-xs px-3 gap-1.5">
              <ListOrdered className="h-3.5 w-3.5" />
              Ranked
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {error && (
        <ErrorState
          title="Failed to load chemistry data"
          message="Could not fetch chemistry matrix. Please try again."
          onRetry={() => refetch()}
          variant="inline"
        />
      )}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-125 w-full" />
        </div>
      )}
      {!season && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">
              Select a season to view chemistry data
            </p>
          </CardContent>
        </Card>
      )}
      {!isLoading && !error && matrixData && matrixData.players.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Grid3X3 className="h-5 w-5" />
              Player Pair xG%
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Expected goals percentage when two players are on ice
                    together. Green indicates the pair generates more offense
                    than defense, red indicates the opposite.
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ChemistryLegend />
            {display === "grid" ? (
              <ChemistryMatrix matrixData={matrixData} />
            ) : (
              <ChemistryTopPairsChart matrixData={matrixData} />
            )}
          </CardContent>
        </Card>
      )}
      {!isLoading &&
        !error &&
        season &&
        (!matrixData || matrixData.players.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="font-medium">No chemistry data available</p>
              <p className="text-sm text-muted-foreground mt-1">
                No player pair data found for this season and situation.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
