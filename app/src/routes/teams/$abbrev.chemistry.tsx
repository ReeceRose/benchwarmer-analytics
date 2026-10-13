import { useMemo, useState } from "react";
import { EmptyState, Panel, SegmentedControl } from "@/components/layout";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as z from "zod/mini";
import { Skeleton } from "@/components/ui/skeleton";
import { SeasonSelector, ErrorState } from "@/components/shared";
import { useChemistryMatrix, useTeamSeasons } from "@/hooks";
import {
  ChemistryLegend,
  ChemistryMatrix,
  ChemistryPairDetail,
  ChemistryRankedPairs,
  buildChemistryGroups,
  pairKey,
  type MatrixData,
} from "@/components/chemistry";
import type { ChemistryPair, PositionFilter } from "@/types";

type ChemistryView = "grid" | "ranked";

// `situation` is kept so old links still parse; line data, and so chemistry, is 5v5 only.
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

const POSITION_FILTERS = [
  { value: "all", label: "Everyone" },
  { value: "forward", label: "Forwards" },
  { value: "defense", label: "Defense" },
] as const;

function MatrixPanel({
  title,
  description,
  matrix,
  selectedKey,
  onSelect,
}: {
  title: string;
  description: string;
  matrix: MatrixData;
  selectedKey?: string;
  onSelect: (pair: ChemistryPair) => void;
}) {
  return (
    <Panel className="max-w-full min-w-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{description}</p>
      <ChemistryMatrix matrixData={matrix} selectedKey={selectedKey} onSelect={onSelect} />
    </Panel>
  );
}

function TeamChemistryPage() {
  const { abbrev } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [selected, setSelected] = useState<ChemistryPair | null>(null);

  const { data: seasonsData, isLoading: seasonsLoading } = useTeamSeasons(abbrev);
  const season = search.season ?? seasonsData?.seasons?.[0]?.year;
  const position: PositionFilter = search.position ?? "all";
  const display: ChemistryView = search.display ?? "grid";

  const { data, isLoading, error, refetch } = useChemistryMatrix(abbrev, {
    season: season!,
    situation: "5on5",
    position: position === "all" ? undefined : position,
  });

  const updateSearch = (updates: { season?: number; position?: PositionFilter; display?: ChemistryView }) => {
    setSelected(null);
    navigate({ search: (prev) => ({ ...prev, ...updates }) });
  };

  const pairs = useMemo(() => data?.pairs ?? [], [data]);
  const groups = useMemo(() => buildChemistryGroups(pairs), [pairs]);
  const selectedKey = selected ? pairKey(selected.player1Id, selected.player2Id) : undefined;
  const toggle = (pair: ChemistryPair) =>
    setSelected((prev) => (prev && pairKey(prev.player1Id, prev.player2Id) === pairKey(pair.player1Id, pair.player2Id) ? null : pair));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Chemistry</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Share of expected goals at 5v5 when two linemates or defense partners are on the ice together.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            aria-label="Display"
            value={display}
            onValueChange={(display) => updateSearch({ display })}
            options={[
              { value: "grid", label: "Grid" },
              { value: "ranked", label: "Ranked pairs" },
            ]}
          />
          <SeasonSelector value={season} onValueChange={(s) => updateSearch({ season: s })} teamAbbrev={abbrev} />
        </div>
      </div>
      <SegmentedControl
        aria-label="Positions"
        value={position}
        onValueChange={(position) => updateSearch({ position })}
        options={POSITION_FILTERS}
      />

      {error ? (
        <ErrorState
          title="Failed to load chemistry data"
          message="Could not fetch chemistry matrix. Please try again."
          onRetry={() => refetch()}
          variant="inline"
        />
      ) : isLoading || seasonsLoading ? (
        <div className="flex flex-wrap items-start gap-4">
          <Skeleton className="h-150 w-full max-w-180 rounded-2xl" />
          <Skeleton className="h-100 w-full max-w-115 rounded-2xl" />
        </div>
      ) : !season ? (
        <EmptyState title="No seasons recorded for this team" hint="Chemistry appears once the team has played." />
      ) : pairs.length === 0 ? (
        <EmptyState title="No lines or pairs for this season yet" hint="Try another season." />
      ) : (
        <div className="space-y-4">
          {display === "grid" ? (
            <>
              <div className="flex flex-wrap items-start gap-4">
                {groups.forwards.players.length > 1 && (
                  <MatrixPanel
                    title="Forwards"
                    description="Most ice time first."
                    matrix={groups.forwards}
                    selectedKey={selectedKey}
                    onSelect={toggle}
                  />
                )}
                {groups.defense.players.length > 1 && (
                  <MatrixPanel
                    title="Defense"
                    description="Most ice time first."
                    matrix={groups.defense}
                    selectedKey={selectedKey}
                    onSelect={toggle}
                  />
                )}
              </div>
              <ChemistryLegend />
            </>
          ) : (
            <ChemistryRankedPairs pairs={pairs} selectedKey={selectedKey} onSelect={toggle} />
          )}
          {selected && <ChemistryPairDetail pair={selected} onClose={() => setSelected(null)} />}
          {display === "grid" && !selected && (
            <p className="text-xs text-muted-foreground">Pick a square to see the pair's numbers.</p>
          )}
        </div>
      )}
    </div>
  );
}
