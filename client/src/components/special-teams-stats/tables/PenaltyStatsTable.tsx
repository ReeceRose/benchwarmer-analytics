import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeamLogo } from "@/components/shared";
import { formatPosition } from "@/lib/formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { PlayerPenaltyStats } from "@/types";

type SortField =
  | "gamesPlayed"
  | "iceTimeMinutes"
  | "penaltiesDrawn"
  | "penaltiesTaken"
  | "netPenalties"
  | "penaltiesDrawnPer60"
  | "penaltiesTakenPer60"
  | "netPenaltiesPer60";
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

function sortPlayers(
  players: PlayerPenaltyStats[],
  field: SortField,
  direction: SortDirection
): PlayerPenaltyStats[] {
  return [...players].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (field) {
      case "gamesPlayed":
        aVal = a.gamesPlayed;
        bVal = b.gamesPlayed;
        break;
      case "iceTimeMinutes":
        aVal = a.iceTimeMinutes;
        bVal = b.iceTimeMinutes;
        break;
      case "penaltiesDrawn":
        aVal = a.penaltiesDrawn;
        bVal = b.penaltiesDrawn;
        break;
      case "penaltiesTaken":
        aVal = a.penaltiesTaken;
        bVal = b.penaltiesTaken;
        break;
      case "netPenalties":
        aVal = a.netPenalties;
        bVal = b.netPenalties;
        break;
      case "penaltiesDrawnPer60":
        aVal = a.penaltiesDrawnPer60;
        bVal = b.penaltiesDrawnPer60;
        break;
      case "penaltiesTakenPer60":
        aVal = a.penaltiesTakenPer60;
        bVal = b.penaltiesTakenPer60;
        break;
      case "netPenaltiesPer60":
        aVal = a.netPenaltiesPer60;
        bVal = b.netPenaltiesPer60;
        break;
    }

    return direction === "desc" ? bVal - aVal : aVal - bVal;
  });
}

interface PenaltyStatsTableProps {
  players: PlayerPenaltyStats[];
  season?: number;
}

export function PenaltyStatsTable({ players, season }: PenaltyStatsTableProps) {
  const [sortField, setSortField] = useState<SortField>("netPenaltiesPer60");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedPlayers = sortPlayers(players, sortField, sortDirection);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead className="w-64">Player</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Pos</TableHead>
            <SortableHeader
              field="gamesPlayed"
              label="GP"
              tooltip="Games played"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="iceTimeMinutes"
              label="TOI"
              tooltip="Total ice time (minutes)"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="penaltiesDrawn"
              label="Drawn"
              tooltip="Penalties drawn"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="penaltiesTaken"
              label="Taken"
              tooltip="Penalties taken"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="netPenalties"
              label="Net"
              tooltip="Net penalties (drawn - taken)"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="penaltiesDrawnPer60"
              label="PD/60"
              tooltip="Penalties drawn per 60 minutes"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="penaltiesTakenPer60"
              label="PT/60"
              tooltip="Penalties taken per 60 minutes"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="netPenaltiesPer60"
              label="Net/60"
              tooltip="Net penalties per 60 minutes"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPlayers.map((player, index) => (
            <TableRow key={player.playerId}>
              <TableCell className="text-muted-foreground tabular-nums">
                {index + 1}
              </TableCell>
              <TableCell>
                <Link
                  to="/players/$id"
                  params={{ id: String(player.playerId) }}
                  className="flex items-center gap-2 hover:underline"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={getPlayerHeadshotUrl(player.playerId, player.team)}
                      alt={player.name}
                    />
                    <AvatarFallback className="text-[10px]">
                      {getPlayerInitials(player.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{player.name}</span>
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  to="/teams/$abbrev"
                  params={{ abbrev: player.team }}
                  search={season ? { season } : undefined}
                  className="flex items-center gap-2"
                >
                  <TeamLogo abbrev={player.team} size="xs" />
                  <span className="text-muted-foreground">{player.team}</span>
                </Link>
              </TableCell>
              <TableCell>
                {player.position && (
                  <Badge variant="outline" className="font-normal">
                    {formatPosition(player.position)}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {player.gamesPlayed}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {player.iceTimeMinutes.toFixed(0)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-green-600 dark:text-green-400">
                {player.penaltiesDrawn}
              </TableCell>
              <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">
                {player.penaltiesTaken}
              </TableCell>
              <TableCell
                className={`text-right tabular-nums font-medium ${
                  player.netPenalties > 0
                    ? "text-green-600 dark:text-green-400"
                    : player.netPenalties < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                }`}
              >
                {player.netPenalties > 0 ? "+" : ""}
                {player.netPenalties}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {player.penaltiesDrawnPer60.toFixed(2)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {player.penaltiesTakenPer60.toFixed(2)}
              </TableCell>
              <TableCell
                className={`text-right tabular-nums ${
                  player.netPenaltiesPer60 > 0
                    ? "text-green-600 dark:text-green-400"
                    : player.netPenaltiesPer60 < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                }`}
              >
                {player.netPenaltiesPer60 > 0 ? "+" : ""}
                {player.netPenaltiesPer60.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
