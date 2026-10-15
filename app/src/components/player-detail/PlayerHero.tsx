import { Link } from "@tanstack/react-router";
import { EntityHero, HeroBadge, HeroStat } from "@/components/layout";
import {
  formatHeight,
  formatOrdinal,
  formatPosition,
  formatSavePct,
  formatSeason,
  formatPercent,
} from "@/lib/formatters";
import { getTeamName } from "@/lib/team-names";
import { shortTrophyName } from "@/lib/trophies";

// Most-won trophies shown on the hero; the career tab lists them all.
const MAX_AWARD_BADGES = 3;
import type { GoalieStats, PlayerDetail, SkaterStats } from "@/types";

interface PlayerHeroProps {
  player: PlayerDetail;
  /** Regular-season, all-situations row for the latest season, if any. */
  season?: SkaterStats | GoalieStats;
}

function ageFrom(birthDate: string): number {
  const born = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

const signed = (v: number, digits = 1) =>
  `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

export function PlayerHero({ player, season }: PlayerHeroProps) {
  const isGoalie = player.position === "G";
  const teamAbbrev = player.currentTeamAbbreviation;
  const teamName = teamAbbrev ? getTeamName(teamAbbrev) : undefined;

  return (
    <EntityHero
      teamAbbrev={teamAbbrev}
      crumb={
        <>
          <Link to="/players" className="hover:text-white">
            Players
          </Link>
          {teamAbbrev && (
            <>
              {" / "}
              <Link
                to="/teams/$abbrev"
                params={{ abbrev: teamAbbrev }}
                className="hover:text-white"
              >
                {teamName}
              </Link>
            </>
          )}
        </>
      }
      media={
        <img
          src={player.headshotUrl}
          alt=""
          className="block size-24 rounded-t-2xl bg-white/10 object-cover object-top sm:size-36"
        />
      }
      badges={
        <>
          {player.position && <HeroBadge>{formatPosition(player.position)}</HeroBadge>}
          {player.hallOfFame && (
            <HeroBadge>Hall of Fame{player.hallOfFame.inductedYear ? ` ${player.hallOfFame.inductedYear}` : ""}</HeroBadge>
          )}
          {(player.awards ?? [])
            .filter((a) => a.wins.length > 0)
            .slice(0, MAX_AWARD_BADGES)
            .map((a) => (
              <HeroBadge key={a.slug}>
                {a.wins.length > 1 ? `${a.wins.length}× ` : ""}
                {shortTrophyName(a.slug, a.trophy)}
              </HeroBadge>
            ))}
        </>
      }
      title={player.name}
      meta={
        <>
          {teamName && <span>{teamName}</span>}
          {player.birthDate && <span>Age {ageFrom(player.birthDate)}</span>}
          {player.heightInches && player.weightLbs && (
            <span>
              {formatHeight(player.heightInches)}, {player.weightLbs} lb
            </span>
          )}
          {player.shoots && (
            <span>
              {isGoalie ? "Catches" : "Shoots"}{" "}
              {player.shoots === "L" ? "left" : "right"}
            </span>
          )}
          {player.draft && (
            <span>
              Drafted {player.draft.year}, {formatOrdinal(player.draft.overallPick)} overall ({player.draft.team})
            </span>
          )}
        </>
      }
      statsCaption={
        season &&
        `${formatSeason(season.season)} regular season, ${season.gamesPlayed} ${
          season.gamesPlayed === 1 ? "game" : "games"
        }`
      }
      stats={season && <SeasonStats season={season} />}
    />
  );
}

function SeasonStats({ season }: { season: SkaterStats | GoalieStats }) {
  if ("goalsAgainst" in season) {
    return (
      <>
        <HeroStat label="Games" value={season.gamesPlayed} />
        <HeroStat
          label="Save %"
          value={
            season.savePercentage != null ? formatSavePct(season.savePercentage) : "–"
          }
        />
        <HeroStat
          label="GAA"
          value={season.goalsAgainstAverage?.toFixed(2) ?? "–"}
        />
        <HeroStat
          label="GSAx"
          value={
            season.goalsSavedAboveExpected != null
              ? signed(season.goalsSavedAboveExpected)
              : "–"
          }
        />
      </>
    );
  }

  const xg = season.expectedGoals ?? 0;
  const luck = season.goals - xg;

  return (
    <>
      <HeroStat
        label="Goals"
        value={season.goals}
        note={xg > 0 ? `${signed(luck)} vs xG` : undefined}
      />
      <HeroStat label="Assists" value={season.assists} />
      <HeroStat label="Points" value={season.goals + season.assists} />
      <HeroStat label="xG" value={xg.toFixed(1)} />
      <HeroStat
        label="CF%"
        value={
          season.corsiForPct != null ? formatPercent(season.corsiForPct) : "–"
        }
      />
    </>
  );
}
