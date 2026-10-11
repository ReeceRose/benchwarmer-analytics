import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HeaderWithTooltip, TeamLogo } from "@/components/shared";
import type { TeamSpecialTeamsRanking } from "@/types";

type SortField =
  | "ppPct"
  | "ppRank"
  | "pkPct"
  | "pkRank"
  | "specialTeamsPct"
  | "overallRank";
type SortDirection = "asc" | "desc";

interface SortableHeaderProps {
  field: SortField;
  label: string;
  tooltip: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

function SortableHeader({
  field,
  label,
  tooltip,
  sortField,
  sortDirection,
  onSort,
}: SortableHeaderProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TableHead
          className="text-right cursor-pointer hover:bg-muted/50 select-none"
          onClick={() => onSort(field)}
        >
          <div className="flex items-center justify-end gap-1">
            <span>{label}</span>
            {sortField === field && (
              <span className="text-xs">
                {sortDirection === "desc" ? "▼" : "▲"}
              </span>
            )}
          </div>
        </TableHead>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function sortTeams(
  teams: TeamSpecialTeamsRanking[],
  field: SortField,
  direction: SortDirection
): TeamSpecialTeamsRanking[] {
  return [...teams].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (field) {
      case "ppPct":
        aVal = a.ppPct;
        bVal = b.ppPct;
        break;
      case "ppRank":
        aVal = a.ppRank;
        bVal = b.ppRank;
        // Lower rank is better, so flip direction
        return direction === "desc" ? aVal - bVal : bVal - aVal;
      case "pkPct":
        aVal = a.pkPct;
        bVal = b.pkPct;
        break;
      case "pkRank":
        aVal = a.pkRank;
        bVal = b.pkRank;
        // Lower rank is better, so flip direction
        return direction === "desc" ? aVal - bVal : bVal - aVal;
      case "specialTeamsPct":
        aVal = a.specialTeamsPct;
        bVal = b.specialTeamsPct;
        break;
      case "overallRank":
        aVal = a.overallRank;
        bVal = b.overallRank;
        // Lower rank is better, so flip direction
        return direction === "desc" ? aVal - bVal : bVal - aVal;
    }

    return direction === "desc" ? bVal - aVal : aVal - bVal;
  });
}

interface TeamRankingsTableProps {
  teams: TeamSpecialTeamsRanking[];
  season?: number;
}

// Color based on rank (1-32): top 10 = green, bottom 10 = red
function getRankColor(rank: number): string {
  if (rank <= 10) return "text-success";
  if (rank >= 23) return "text-error";
  return "";
}

// Color based on percentage thresholds
function getPctColor(pct: number, isHighGood: boolean): string {
  if (isHighGood) {
    if (pct >= 25) return "text-success";
    if (pct <= 18) return "text-error";
  } else {
    if (pct >= 85) return "text-success";
    if (pct <= 75) return "text-error";
  }
  return "";
}

export function TeamRankingsTable({ teams, season }: TeamRankingsTableProps) {
  const [sortField, setSortField] = useState<SortField>("overallRank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedTeams = sortTeams(teams, sortField, sortDirection);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead className="w-64">Team</TableHead>
            <SortableHeader
              field="ppPct"
              label="PP%"
              tooltip="Power play percentage"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="ppRank"
              label="PP Rank"
              tooltip="Power play league rank (1-32)"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <HeaderWithTooltip
              label="PPG"
              tooltip="Power play goals"
              className="text-right"
            />
            <HeaderWithTooltip
              label="PP Opp"
              tooltip="Power play opportunities"
              className="text-right"
            />
            <SortableHeader
              field="pkPct"
              label="PK%"
              tooltip="Penalty kill percentage"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="pkRank"
              label="PK Rank"
              tooltip="Penalty kill league rank (1-32)"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <HeaderWithTooltip
              label="PKGA"
              tooltip="Penalty kill goals against"
              className="text-right"
            />
            <HeaderWithTooltip
              label="PK Times"
              tooltip="Times shorthanded"
              className="text-right"
            />
            <SortableHeader
              field="specialTeamsPct"
              label="ST%"
              tooltip="Combined special teams % (PP% + PK%)"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="overallRank"
              label="Overall"
              tooltip="Overall special teams rank (1-32)"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTeams.map((team, index) => (
            <TableRow key={team.teamAbbreviation}>
              <TableCell className="text-muted-foreground tabular-nums">
                {index + 1}
              </TableCell>
              <TableCell>
                <Link
                  to="/teams/$abbrev/special-teams"
                  params={{ abbrev: team.teamAbbreviation }}
                  search={season ? { season } : undefined}
                  className="flex items-center gap-3 hover:underline"
                >
                  <TeamLogo abbrev={team.teamAbbreviation} size="sm" />
                  <span className="font-medium">{team.teamName}</span>
                </Link>
              </TableCell>
              <TableCell
                className={`text-right tabular-nums font-medium ${getPctColor(team.ppPct, true)}`}
              >
                {team.ppPct.toFixed(1)}%
              </TableCell>
              <TableCell
                className={`text-right tabular-nums ${getRankColor(team.ppRank)}`}
              >
                {team.ppRank}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {team.ppGoals}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {team.ppOpportunities}
              </TableCell>
              <TableCell
                className={`text-right tabular-nums font-medium ${getPctColor(team.pkPct, false)}`}
              >
                {team.pkPct.toFixed(1)}%
              </TableCell>
              <TableCell
                className={`text-right tabular-nums ${getRankColor(team.pkRank)}`}
              >
                {team.pkRank}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {team.pkGoalsAgainst}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {team.pkTimesShort}
              </TableCell>
              <TableCell
                className={`text-right tabular-nums font-semibold ${getRankColor(team.overallRank)}`}
              >
                {team.specialTeamsPct.toFixed(1)}%
              </TableCell>
              <TableCell
                className={`text-right tabular-nums font-semibold ${getRankColor(team.overallRank)}`}
              >
                {team.overallRank}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
