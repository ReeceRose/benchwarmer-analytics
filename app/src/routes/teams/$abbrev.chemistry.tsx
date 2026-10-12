import { useMemo } from "react";
import { EmptyState, SegmentedControl } from "@/components/layout";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as z from "zod/mini";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
  season: z.optional(z.number()),
  situation: z.optional(z.string()),
  position: z.optional(z.enum(["all", "forward", "defense"])),
  display: z.optional(z.enum(["grid", "ranked"])),
});

export const Route = createFileRoute("/teams/$abbrev/chemistry")({
  component: TeamChemistryPage,
  validateSearch: searchSchema,
});

// Situation options
const SITUATIONS = [
  { value: "5on5", label: "5v5" },
  { value: "all", label: "All situations" },
  { value: "5on4", label: "5v4 (PP)" },
  { value: "4on5", label: "4v5 (PK)" },
] as const;

// Position filter options
const POSITION_FILTERS = [
  { value: "all", label: "Everyone" },
  { value: "forward", label: "Forwards" },
  { value: "defense", label: "Defense" },
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Chemistry</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Share of expected goals when each pair of players is on the ice together.
          </p>
        </div>
        <SegmentedControl
          aria-label="Display"
          value={display}
          onValueChange={(display) => updateSearch({ display })}
          options={[
            { value: "grid", label: "Grid" },
            { value: "ranked", label: "Ranked pairs" },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SeasonSelector
          value={season}
          onValueChange={(s) => updateSearch({ season: s })}
          teamAbbrev={abbrev}
        />
        <Select
          value={situation}
          onValueChange={(s) => updateSearch({ situation: s as Situation })}
        >
          <SelectTrigger className="w-36" aria-label="Situation">
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
        <SegmentedControl
          aria-label="Positions"
          value={position}
          onValueChange={(position) => updateSearch({ position })}
          options={POSITION_FILTERS}
        />
      </div>
      {error && (
        <ErrorState
          title="Failed to load chemistry data"
          message="Could not fetch chemistry matrix. Please try again."
          onRetry={() => refetch()}
          variant="inline"
        />
      )}
      {isLoading && <Skeleton className="h-125 w-full rounded-2xl" />}
      {!season && !isLoading && (
        <EmptyState
          title="No seasons recorded for this team"
          hint="Chemistry appears once the team has played."
        />
      )}
      {!isLoading && !error && matrixData && matrixData.players.length > 0 && (
        <div className="space-y-4 overflow-x-auto rounded-2xl border bg-card p-5">
          <ChemistryLegend />
          {display === "grid" ? (
            <ChemistryMatrix matrixData={matrixData} />
          ) : (
            <ChemistryTopPairsChart matrixData={matrixData} />
          )}
        </div>
      )}
      {!isLoading &&
        !error &&
        season &&
        (!matrixData || matrixData.players.length === 0) && (
          <EmptyState
            title="No pairs for this season and situation"
            hint="Try all situations, or another season."
          />
        )}
    </div>
  );
}
