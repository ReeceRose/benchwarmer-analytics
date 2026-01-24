import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SpecialTeamsDashboard } from "@/components/special-teams";

const searchSchema = z.object({
  season: z.number().optional(),
});

export const Route = createFileRoute("/teams/$abbrev/special-teams")({
  component: SpecialTeamsPage,
  validateSearch: searchSchema,
});

function SpecialTeamsPage() {
  const { abbrev } = Route.useParams();
  const { season } = Route.useSearch();

  return <SpecialTeamsDashboard abbrev={abbrev} season={season} />;
}
