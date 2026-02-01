import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ScoreStateDashboard } from "@/components/team-detail";

const searchSchema = z.object({
  season: z.number().optional(),
});

export const Route = createFileRoute("/teams/$abbrev/score-state")({
  component: ScoreStatePage,
  validateSearch: searchSchema,
});

function ScoreStatePage() {
  const { abbrev } = Route.useParams();
  const { season } = Route.useSearch();

  return <ScoreStateDashboard abbrev={abbrev} season={season} />;
}
