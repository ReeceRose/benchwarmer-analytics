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
import type { SpecialTeamsPlayerLeader } from "@/types";

type SortField =
  | "gamesPlayed"
  | "iceTimeMinutes"
  | "goals"
  | "assists"
  | "points"
  | "pointsPer60"
  | "xgPer60"
  | "goalsDiff";
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
  players: SpecialTeamsPlayerLeader[],
  field: SortField,
  direction: SortDirection
): SpecialTeamsPlayerLeader[] {
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
      case "goals":
        aVal = a.goals;
        bVal = b.goals;
        break;
      case "assists":
        aVal = a.assists;
        bVal = b.assists;
        break;
      case "points":
        aVal = a.points;
        bVal = b.points;
        break;
      case "pointsPer60":
        aVal = a.pointsPer60;
        bVal = b.pointsPer60;
        break;
      case "xgPer60":
        aVal = a.xgPer60;
        bVal = b.xgPer60;
        break;
      case "goalsDiff":
        aVal = a.goalsDiff;
        bVal = b.goalsDiff;
        break;
    }

    return direction === "desc" ? bVal - aVal : aVal - bVal;
  });
}

interface PlayerLeadersTableProps {
  players: SpecialTeamsPlayerLeader[];
  situation: "5on4" | "4on5";
  season?: number;
}

export function PlayerLeadersTable({
  players,
  situation,
  season,
}: PlayerLeadersTableProps) {
  const isPP = situation === "5on4";
  const [sortField, setSortField] = useState<SortField>("points");
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
              tooltip={`Total ${isPP ? "power play" : "penalty kill"} ice time (minutes)`}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="goals"
              label="G"
              tooltip="Goals"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="assists"
              label="A"
              tooltip="Assists"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="points"
              label="P"
              tooltip="Points"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="pointsPer60"
              label="P/60"
              tooltip="Points per 60 minutes"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="xgPer60"
              label="xG/60"
              tooltip="Expected goals per 60 minutes"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="goalsDiff"
              label="G±xG"
              tooltip="Goals minus expected goals (positive = shooting above expected)"
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
              <TableCell className="text-right tabular-nums text-success">
                {player.goals}
              </TableCell>
              <TableCell className="text-right tabular-nums text-cold">
                {player.assists}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold text-warning">
                {player.points}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {player.pointsPer60.toFixed(2)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {player.xgPer60.toFixed(2)}
              </TableCell>
              <TableCell
                className={`text-right tabular-nums ${
                  player.goalsDiff > 0
                    ? "text-success"
                    : player.goalsDiff < 0
                      ? "text-error"
                      : ""
                }`}
              >
                {player.goalsDiff > 0 ? "+" : ""}
                {player.goalsDiff.toFixed(1)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
