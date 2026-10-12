import { TeamLogo } from "@/components/team-detail/TeamLogo";

/** Logo and code above one team's column in a two-team section. */
export function TeamHeading({ team }: { team: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
      <TeamLogo abbrev={team} size="sm" />
      {team}
    </div>
  );
}
