import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HeaderWithTooltip } from "@/components/shared";
import { DivisionGroup } from "@/components/standings/DivisionGroup";
import { StandingsRow } from "@/components/standings/StandingsRow";
import { getPlayoffStatus } from "@/lib/playoff";
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
      <div className="space-y-6">
        {CONFERENCE_ORDER.map((conference) => (
          <div key={conference} className="space-y-4">
            <h2 className="text-lg font-semibold text-muted-foreground">
              {conference} Conference
            </h2>
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
    <Card className="py-0 gap-0">
      <CardContent className="p-0">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead className="w-48">Team</TableHead>
              <HeaderWithTooltip
                label="GP"
                tooltip="Games played"
                className="text-right w-11"
              />
              <HeaderWithTooltip
                label="W"
                tooltip="Wins"
                className="text-right w-10"
              />
              <HeaderWithTooltip
                label="L"
                tooltip="Losses"
                className="text-right w-10"
              />
              <HeaderWithTooltip
                label="OT"
                tooltip="Overtime losses"
                className="text-right w-10"
              />
              <HeaderWithTooltip
                label="Pts"
                tooltip="Points (W×2 + OT)"
                className="text-right font-semibold w-11"
              />
              <HeaderWithTooltip
                label="Pts%"
                tooltip="Points percentage"
                metric="Pts%"
                className="text-right w-13"
              />
              <HeaderWithTooltip
                label="GF"
                tooltip="Goals for"
                className="text-right w-11"
              />
              <HeaderWithTooltip
                label="GA"
                tooltip="Goals against"
                className="text-right w-11"
              />
              <HeaderWithTooltip
                label="Diff"
                tooltip="Goal differential"
                metric="Diff"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="Home"
                tooltip="Home record"
                className="text-right w-16"
              />
              <HeaderWithTooltip
                label="Away"
                tooltip="Away record"
                className="text-right w-16"
              />
              <HeaderWithTooltip
                label="L10"
                tooltip="Last 10 games"
                className="text-right w-14"
              />
              <HeaderWithTooltip
                label="Strk"
                tooltip="Current streak"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="xGF"
                tooltip="Expected goals for"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="xGA"
                tooltip="Expected goals against"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="xG±"
                tooltip="Expected goal differential"
                metric="xG±"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="xPts"
                tooltip="Expected points"
                metric="xPts"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="xG%"
                tooltip="Expected goals percentage"
                metric="xG%"
                className="text-right w-13"
              />
              <HeaderWithTooltip
                label="CF%"
                tooltip="Corsi percentage"
                metric="CF%"
                className="text-right w-13"
              />
              <HeaderWithTooltip
                label="FF%"
                tooltip="Fenwick percentage"
                metric="FF%"
                className="text-right w-13"
              />
              <HeaderWithTooltip
                label="Sh%"
                tooltip="Team shooting percentage"
                metric="Sh%"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="Sv%"
                tooltip="Team save percentage"
                metric="Sv%"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="PDO"
                tooltip="Sh% + Sv% (luck indicator)"
                metric="PDO"
                className="text-right w-13"
              />
              <HeaderWithTooltip
                label="Pts±"
                tooltip="Points vs expected"
                metric="Pts±"
                className="text-right w-12"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTeams.map((team, index) => (
              <StandingsRow
                key={team.abbreviation}
                team={team}
                analyticsLoading={analyticsLoading}
                season={season}
                playoffStatus={getPlayoffStatus(team, "league")}
                displayRank={index + 1}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
