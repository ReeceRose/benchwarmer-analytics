import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeaderWithTooltip, LoadingState } from "@/components/shared";
import { formatPosition, formatToi } from "@/lib/formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import { useSpecialTeamsPlayers } from "@/hooks";
import type { SpecialTeamsSituation, SpecialTeamsPlayer } from "@/types";

interface SpecialTeamsPlayerTableProps {
  abbrev: string;
  season?: number;
}

type SortField = "toi" | "goals" | "assists" | "points" | "shots" | "xGoals" | "xGoalsPer60" | "pointsPer60";
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
    <TableHead
      className="text-right cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center justify-end gap-1">
        <HeaderWithTooltip label={label} tooltip={tooltip} className="text-right" />
        {sortField === field && (
          <span className="text-xs">{sortDirection === "desc" ? "▼" : "▲"}</span>
        )}
      </div>
    </TableHead>
  );
}

function sortPlayers(
  players: SpecialTeamsPlayer[],
  field: SortField,
  direction: SortDirection
): SpecialTeamsPlayer[] {
  return [...players].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (field) {
      case "toi":
        aVal = a.iceTimeSeconds;
        bVal = b.iceTimeSeconds;
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
      case "shots":
        aVal = a.shots;
        bVal = b.shots;
        break;
      case "xGoals":
        aVal = a.xGoals ?? 0;
        bVal = b.xGoals ?? 0;
        break;
      case "xGoalsPer60":
        aVal = a.xGoalsPer60 ?? 0;
        bVal = b.xGoalsPer60 ?? 0;
        break;
      case "pointsPer60":
        aVal = a.pointsPer60 ?? 0;
        bVal = b.pointsPer60 ?? 0;
        break;
    }

    return direction === "desc" ? bVal - aVal : aVal - bVal;
  });
}

export function SpecialTeamsPlayerTable({
  abbrev,
  season,
}: SpecialTeamsPlayerTableProps) {
  const [situation, setSituation] = useState<SpecialTeamsSituation>("5on4");
  const [sortField, setSortField] = useState<SortField>("toi");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data, isLoading, error } = useSpecialTeamsPlayers(
    abbrev,
    situation,
    season,
    false
  );

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedPlayers = data?.players
    ? sortPlayers(data.players, sortField, sortDirection)
    : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg">Player Stats</CardTitle>
          <Tabs
            value={situation}
            onValueChange={(v) => setSituation(v as SpecialTeamsSituation)}
          >
            <TabsList className="h-8">
              <TabsTrigger value="5on4" className="text-xs px-3">
                Power Play
              </TabsTrigger>
              <TabsTrigger value="4on5" className="text-xs px-3">
                Penalty Kill
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {isLoading ? (
          <div className="p-6">
            <LoadingState variant="table" count={5} />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-muted-foreground">
            Failed to load player stats
          </div>
        ) : sortedPlayers.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No player stats available for this situation
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-50">Player</TableHead>
                <HeaderWithTooltip label="Pos" tooltip="Position" />
                <HeaderWithTooltip label="GP" tooltip="Games played" className="text-right" />
                <SortableHeader field="toi" label="TOI" tooltip="Total time on ice in situation" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader field="goals" label="G" tooltip="Goals" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader field="assists" label="A" tooltip="Assists" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader field="points" label="P" tooltip="Points" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader field="shots" label="S" tooltip="Shots on goal" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader field="xGoals" label="xG" tooltip="Expected goals" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader field="xGoalsPer60" label="xG/60" tooltip="Expected goals per 60 minutes" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader field="pointsPer60" label="P/60" tooltip="Points per 60 minutes" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player) => (
                <TableRow key={player.playerId}>
                  <TableCell>
                    <Link
                      to="/players/$id"
                      params={{ id: String(player.playerId) }}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={getPlayerHeadshotUrl(player.playerId, abbrev)}
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
                    {formatToi(player.iceTimeSeconds)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {player.goals}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {player.assists}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {player.points}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {player.shots}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {player.xGoals?.toFixed(1) ?? "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {player.xGoalsPer60?.toFixed(2) ?? "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {player.pointsPer60?.toFixed(2) ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
