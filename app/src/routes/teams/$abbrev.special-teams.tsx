import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod/mini";
import { SpecialTeamsDashboard } from "@/components/special-teams";

const searchSchema = z.object({
  season: z.optional(z.number()),
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
