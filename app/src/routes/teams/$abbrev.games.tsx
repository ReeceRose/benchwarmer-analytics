import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod/mini";
import { TeamGamesDashboard } from "@/components/team-detail";
import { TeamSituations } from "@/components/team-detail/TeamSituations";

const searchSchema = z.object({
  season: z.optional(z.number()),
  situation: z.optional(z.enum(["fiveOnFive", "all"])),
  playoffs: z.optional(z.boolean()),
});

export const Route = createFileRoute("/teams/$abbrev/games")({
  component: TeamGamesPage,
  validateSearch: searchSchema,
});

function TeamGamesPage() {
  const { abbrev } = Route.useParams();
  const { season, situation, playoffs } = Route.useSearch();

  return (
    <div className="space-y-8">
      <TeamGamesDashboard abbrev={abbrev} season={season} situation={situation} playoffs={playoffs} />
      {!playoffs && <TeamSituations abbrev={abbrev.toUpperCase()} season={season} />}
    </div>
  );
}
