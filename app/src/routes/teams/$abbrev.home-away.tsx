import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as z from "zod/mini";
import { SegmentedControl } from "@/components/layout";
import { SeasonSelector } from "@/components/shared";
import { HomeAwayHistory } from "@/components/team-detail/HomeAwayHistory";
import { TeamHomeAway } from "@/components/team-detail/TeamHomeAway";
import { HOME_AWAY_METRIC_KEYS } from "@/components/team-detail/home-away-metrics";
import { useTeamSeasons } from "@/hooks";

const searchSchema = z.object({
  season: z.optional(z.number()),
  playoffs: z.optional(z.boolean()),
  metric: z.optional(z.enum(HOME_AWAY_METRIC_KEYS)),
});

export const Route = createFileRoute("/teams/$abbrev/home-away")({
  component: HomeAwayPage,
  validateSearch: searchSchema,
});

function HomeAwayPage() {
  const { abbrev } = Route.useParams();
  const { season, playoffs, metric } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const team = abbrev.toUpperCase();
  const { data: seasons } = useTeamSeasons(team);
  const effectiveSeason = season ?? seasons?.seasons[0]?.year;

  const updateSearch = (updates: Partial<z.infer<typeof searchSchema>>) =>
    navigate({ search: (prev) => ({ ...prev, ...updates }), resetScroll: false });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <SeasonSelector teamAbbrev={team} value={effectiveSeason} onValueChange={(v) => updateSearch({ season: v })} />
        <SegmentedControl
          aria-label="Season type"
          value={playoffs ? "playoffs" : "regular"}
          onValueChange={(v) => updateSearch({ playoffs: v === "playoffs" || undefined })}
          options={[
            { value: "regular", label: "Regular season" },
            { value: "playoffs", label: "Playoffs" },
          ]}
        />
      </div>
      {effectiveSeason != null && <TeamHomeAway abbrev={team} season={effectiveSeason} playoffs={playoffs} />}
      <HomeAwayHistory
        abbrev={team}
        playoffs={playoffs}
        metric={metric ?? "pointsPct"}
        onMetricChange={(m) => updateSearch({ metric: m })}
        onSeasonSelect={(s) => {
          updateSearch({ season: s });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
