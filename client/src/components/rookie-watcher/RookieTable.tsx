import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SortableTableHeader } from "@/components/shared";
import { formatPercent, formatPosition, formatToi } from "@/lib/formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { Rookie } from "@/types";

export type RookieSortKey =
  | "points"
  | "goals"
  | "assists"
  | "gamesPlayed"
  | "expectedGoals"
  | "goalsDifferential"
  | "corsiForPct"
  | "shotsPer60"
  | "iceTimeSeconds"
  | "rookieScore"
  | "age";

interface RookieTableProps {
  rookies: Rookie[];
  sortKey: RookieSortKey;
  sortDesc: boolean;
  onSort: (key: RookieSortKey) => void;
}

export function RookieTable({
  rookies,
  sortKey,
  sortDesc,
  onSort,
}: RookieTableProps) {
  return (
    <Card className="py-0 gap-0">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Pos</TableHead>
                <TableHead>Team</TableHead>
                <SortableTableHeader
                  label="Age"
                  tooltip="Age as of September 15"
                  metric="Age"
                  sortKey="age"
                  currentSort={sortKey}
                  sortDesc={sortDesc}
                  onSort={onSort}
                />
                <SortableTableHeader
                  label="GP"
                  tooltip="Games played"
                  metric="GP"
                  sortKey="gamesPlayed"
                  currentSort={sortKey}
                  sortDesc={sortDesc}
                  onSort={onSort}
                />
                <SortableTableHeader
                  label="G"
                  tooltip="Goals"
                  metric="Goals"
                  sortKey="goals"
                  currentSort={sortKey}
                  sortDesc={sortDesc}
                  onSort={onSort}
                />
                <SortableTableHeader
                  label="A"
                  tooltip="Assists"
                  metric="Assists"
                  sortKey="assists"
                  currentSort={sortKey}
                  sortDesc={sortDesc}
                  onSort={onSort}
                />
                <SortableTableHeader
                  label="P"
                  tooltip="Total points (goals + assists)"
                  metric="Points"
                  sortKey="points"
                  currentSort={sortKey}
                  sortDesc={sortDesc}
                  onSort={onSort}
                />
                <SortableTableHeader
                  label="xG"
                  tooltip="Expected goals based on shot quality"
                  metric="xG"
                  sortKey="expectedGoals"
                  currentSort={sortKey}
                  sortDesc={sortDesc}
                  onSort={onSort}
                />
                <SortableTableHeader
                  label="G-xG"
                  tooltip="Goals minus expected goals. Positive = outperforming"
                  metric="G-xG"
                  sortKey="goalsDifferential"
                  currentSort={sortKey}
                  sortDesc={sortDesc}
                  onSort={onSort}
                />
                <SortableTableHeader
                  label="CF%"
                  tooltip="Corsi For % (shot attempt share)"
                  metric="CF%"
                  sortKey="corsiForPct"
                  currentSort={sortKey}
                  sortDesc={sortDesc}
                  onSort={onSort}
                />
                <SortableTableHeader
                  label="Sh/60"
                  tooltip="Shots per 60 minutes of ice time"
                  metric="Sh/60"
                  sortKey="shotsPer60"
                  currentSort={sortKey}
                  sortDesc={sortDesc}
                  onSort={onSort}
                />
                <SortableTableHeader
                  label="TOI"
                  tooltip="Total ice time"
                  metric="TOI"
                  sortKey="iceTimeSeconds"
                  currentSort={sortKey}
                  sortDesc={sortDesc}
                  onSort={onSort}
                />
                <SortableTableHeader
                  label="Score"
                  tooltip="Rookie score combining production and underlying metrics"
                  metric="Rookie Score"
                  sortKey="rookieScore"
                  currentSort={sortKey}
                  sortDesc={sortDesc}
                  onSort={onSort}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rookies.map((rookie, index) => (
                <RookieRow key={rookie.playerId} rookie={rookie} rank={index + 1} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function RookieRow({ rookie, rank }: { rookie: Rookie; rank: number }) {
  const diffColor =
    rookie.goalsDifferential > 2
      ? "text-success"
      : rookie.goalsDifferential > 0
        ? "text-success/70"
        : rookie.goalsDifferential < -2
          ? "text-error"
          : "text-warning";

  const corsiColor =
    (rookie.corsiForPct ?? 0.5) >= 0.52
      ? "text-success"
      : (rookie.corsiForPct ?? 0.5) >= 0.48
        ? "text-foreground"
        : "text-error";

  const scoreColor =
    rookie.rookieScore >= 50
      ? "bg-success/10 text-success border-success/20"
      : rookie.rookieScore >= 30
        ? "bg-warning/10 text-warning border-warning/20"
        : "bg-muted";

  return (
    <TableRow>
      <TableCell className="font-medium text-muted-foreground">{rank}</TableCell>
      <TableCell>
        <Link
          to="/players/$id"
          params={{ id: String(rookie.playerId) }}
          className="flex items-center gap-2 hover:underline"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={getPlayerHeadshotUrl(rookie.playerId, rookie.team)}
              alt={rookie.name}
              loading="lazy"
            />
            <AvatarFallback className="text-[10px]">
              {getPlayerInitials(rookie.name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{rookie.name}</span>
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-normal">
          {formatPosition(rookie.position)}
        </Badge>
      </TableCell>
      <TableCell>
        <Link
          to="/teams/$abbrev"
          params={{ abbrev: rookie.team }}
          className="hover:underline text-muted-foreground"
        >
          {rookie.team}
        </Link>
      </TableCell>
      <TableCell className="text-right">{rookie.age}</TableCell>
      <TableCell className="text-right">{rookie.gamesPlayed}</TableCell>
      <TableCell className="text-right">{rookie.goals}</TableCell>
      <TableCell className="text-right">{rookie.assists}</TableCell>
      <TableCell className="text-right font-semibold">{rookie.points}</TableCell>
      <TableCell className="text-right">{rookie.expectedGoals.toFixed(1)}</TableCell>
      <TableCell className={`text-right font-medium ${diffColor}`}>
        {rookie.goalsDifferential > 0 ? "+" : ""}
        {rookie.goalsDifferential.toFixed(1)}
      </TableCell>
      <TableCell className={`text-right ${corsiColor}`}>
        {formatPercent(rookie.corsiForPct)}
      </TableCell>
      <TableCell className="text-right">{rookie.shotsPer60.toFixed(1)}</TableCell>
      <TableCell className="text-right text-muted-foreground">
        {formatToi(rookie.iceTimeSeconds)}
      </TableCell>
      <TableCell className="text-right">
        <Badge variant="outline" className={scoreColor}>
          {rookie.rookieScore.toFixed(1)}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
