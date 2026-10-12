import { useMemo } from "react";
import { DivisionGroup } from "@/components/standings/DivisionGroup";
import type { StandingsGrouping, StandingsWithAnalytics } from "@/types";

interface StandingsTableProps {
  teams: StandingsWithAnalytics[];
  grouping: StandingsGrouping;
  analyticsLoading?: boolean;
  season?: number;
}

// Division order within each conference
const DIVISION_ORDER: Record<string, string[]> = {
  Eastern: ["Atlantic", "Metropolitan"],
  Western: ["Central", "Pacific"],
};

const CONFERENCE_ORDER = ["Eastern", "Western"];

export function StandingsTable({
  teams,
  grouping,
  analyticsLoading,
  season,
}: StandingsTableProps) {
  // Group teams by division or conference
  const groupedTeams = useMemo(() => {
    if (grouping === "league") {
      return null; // No grouping, will render flat table
    }

    const groups = new Map<string, StandingsWithAnalytics[]>();

    if (grouping === "division") {
      teams.forEach((team) => {
        const division = team.division ?? "Unknown";
        if (!groups.has(division)) {
          groups.set(division, []);
        }
        groups.get(division)!.push(team);
      });

      // Sort each division by division rank
      groups.forEach((divisionTeams) => {
        divisionTeams.sort((a, b) => a.divisionRank - b.divisionRank);
      });
    } else if (grouping === "conference") {
      teams.forEach((team) => {
        const conference = team.conference ?? "Unknown";
        if (!groups.has(conference)) {
          groups.set(conference, []);
        }
        groups.get(conference)!.push(team);
      });

      // Sort by points (not conferenceRank) to match league view and ensure
      // consistent playoff cutoff positioning across all grouping modes
      groups.forEach((conferenceTeams) => {
        conferenceTeams.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.wins !== a.wins) return b.wins - a.wins;
          return a.gamesPlayed - b.gamesPlayed;
        });
      });
    }

    return groups;
  }, [teams, grouping]);

  // Division view - full width tables stacked vertically
  if (grouping === "division" && groupedTeams) {
    return (
      <div className="space-y-10">
        {CONFERENCE_ORDER.map((conference) => (
          <div key={conference} className="space-y-5">
            <h2 className="text-xl font-semibold">{conference} Conference</h2>
            <div className="space-y-4">
              {DIVISION_ORDER[conference]?.map((division) => {
                const divisionTeams = groupedTeams.get(division) ?? [];
                if (divisionTeams.length === 0) return null;
                return (
                  <DivisionGroup
                    key={division}
                    title={division}
                    teams={divisionTeams}
                    analyticsLoading={analyticsLoading}
                    season={season}
                    grouping="division"
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Conference view - full width tables
  if (grouping === "conference" && groupedTeams) {
    return (
      <div className="space-y-6">
        {CONFERENCE_ORDER.map((conference) => {
          const conferenceTeams = groupedTeams.get(conference) ?? [];
          if (conferenceTeams.length === 0) return null;
          return (
            <DivisionGroup
              key={conference}
              title={`${conference} Conference`}
              teams={conferenceTeams}
              analyticsLoading={analyticsLoading}
              season={season}
              grouping="conference"
            />
          );
        })}
      </div>
    );
  }

  // League-wide view (flat table sorted by points)
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.gamesPlayed - b.gamesPlayed;
  });

  return (
    <DivisionGroup
      teams={sortedTeams}
      analyticsLoading={analyticsLoading}
      season={season}
      grouping="league"
    />
  );
}
