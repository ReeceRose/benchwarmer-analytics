import { Link } from "@tanstack/react-router";
import { EntityHero, HeroBadge, HeroStat } from "@/components/layout";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { formatOrdinal, formatSeason } from "@/lib/formatters";
import { getTeamName } from "@/lib/team-names";
import type { OfficialStandings, Team, TeamCategoryRanks } from "@/types";

interface TeamHeroProps {
  abbrev: string;
  team?: Team;
  season?: number;
  /** Only passed for the current season: the standings API has no history. */
  standings?: OfficialStandings;
  ranks?: TeamCategoryRanks;
}

const record = (s: OfficialStandings) => `${s.wins}–${s.losses}–${s.otLosses}`;

export function TeamHero({ abbrev, team, season, standings, ranks }: TeamHeroProps) {
  const division = standings?.division ?? team?.division;

  return (
    <EntityHero
      teamAbbrev={abbrev}
      crumb={
        <>
          <Link to="/teams" className="hover:text-white">
            Teams
          </Link>
          {division && ` / ${division}`}
        </>
      }
      media={
        <TeamLogo
          abbrev={abbrev}
          variant="dark"
          className="mb-5 size-20 drop-shadow-lg sm:size-28"
        />
      }
      badges={
        standings?.divisionRank && division ? (
          <HeroBadge>
            {formatOrdinal(standings.divisionRank)} in {division}
          </HeroBadge>
        ) : undefined
      }
      title={getTeamName(abbrev)}
      meta={
        standings ? (
          <>
            <span>
              {record(standings)}, {standings.points} pts
            </span>
            {standings.streak && <span>Streak {standings.streak}</span>}
            <span>Last 10: {standings.last10Record}</span>
            <span>
              Home {standings.homeRecord}, away {standings.awayRecord}
            </span>
          </>
        ) : (
          team?.conference && <span>{team.conference} Conference</span>
        )
      }
      statsCaption={ranks && season && `${formatSeason(season)} league rank`}
      stats={
        ranks && (
          <>
            <HeroStat label="Overall" value={formatOrdinal(ranks.overallRank)} />
            <HeroStat label="xG share" value={formatOrdinal(ranks.xGoalsPctRank)} />
            <HeroStat label="Power play" value={formatOrdinal(ranks.ppPctRank)} />
            <HeroStat label="Penalty kill" value={formatOrdinal(ranks.pkPctRank)} />
          </>
        )
      }
    />
  );
}
