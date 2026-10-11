import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { LineExplorer } from "@/components/line-explorer";
import type { LineType, LineSortField, SortDirection } from "@/types";

const searchSchema = z.object({
  season: z.number().optional(),
  lineType: z.string().optional(),
  minToi: z.number().optional(),
  sortBy: z.string().optional(),
  sortDir: z.string().optional(),
  page: z.number().optional(),
  view: z.enum(["table", "charts"]).optional(),
});

export const Route = createFileRoute("/teams/$abbrev/lines")({
  component: TeamLinesPage,
  validateSearch: searchSchema,
});

function TeamLinesPage() {
  const { abbrev } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  // Derive state from URL params with defaults
  const lineType = (search.lineType as LineType) || "forward";
  const minToi = search.minToi ?? 60;
  const sortBy = (search.sortBy as LineSortField) || "toi";
  const sortDir = (search.sortDir as SortDirection) || "desc";
  const page = search.page ?? 1;
  const view = search.view ?? "table";

  const updateSearch = (updates: {
    season?: number;
    lineType?: LineType;
    minToi?: number;
    sortBy?: LineSortField;
    sortDir?: SortDirection;
    page?: number;
    view?: "table" | "charts";
  }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
        // Reset page when filters change (unless page itself is being updated)
        page: "page" in updates ? updates.page : 1,
      }),
    });
  };

  return (
    <LineExplorer
      teamAbbrev={abbrev}
      season={search.season}
      onSeasonChange={(season) => updateSearch({ season })}
      lineType={lineType}
      onLineTypeChange={(lineType) => updateSearch({ lineType })}
      minToi={minToi}
      onMinToiChange={(minToi) => updateSearch({ minToi })}
      sortBy={sortBy}
      onSortByChange={(sortBy) => updateSearch({ sortBy })}
      sortDir={sortDir}
      onSortDirChange={(sortDir) => updateSearch({ sortDir })}
      page={page}
      onPageChange={(page) => updateSearch({ page })}
      view={view}
      onViewChange={(view) => updateSearch({ view })}
    />
  );
}
