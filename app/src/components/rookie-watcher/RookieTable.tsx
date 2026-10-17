import { Link } from "@tanstack/react-router";
import { TeamTag } from "@/components/shared/TeamTag";
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
import {
  formatPercent,
  formatToi,
  formatPositionShort,
} from "@/lib/formatters";
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
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="sticky left-0 z-10 bg-card">Player</TableHead>
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
  const diff = Math.round(rookie.goalsDifferential * 10) / 10;
  const diffColor =
    diff >= 1 ? "text-success" : diff <= -1 ? "text-error" : "text-foreground";

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
        ? "font-semibold"
        : "border-transparent text-muted-foreground";

  return (
    <TableRow>
      <TableCell className="font-medium text-muted-foreground">{rank}</TableCell>
      <TableCell className="sticky left-0 z-10 bg-card">
        <Link
          to="/players/$id"
          params={{ id: String(rookie.playerId) }}
          className="flex items-center gap-2 transition-colors hover:text-link"
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
        <span className="text-muted-foreground">{formatPositionShort(rookie.position)}</span>
      </TableCell>
      <TableCell>
        <TeamTag abbrev={rookie.team} />
      </TableCell>
      <TableCell className="text-right">{rookie.age}</TableCell>
      <TableCell className="text-right">{rookie.gamesPlayed}</TableCell>
      <TableCell className="text-right">{rookie.goals}</TableCell>
      <TableCell className="text-right">{rookie.assists}</TableCell>
      <TableCell className="text-right font-semibold">{rookie.points}</TableCell>
      <TableCell className="text-right">{rookie.expectedGoals.toFixed(1)}</TableCell>
      <TableCell className={`text-right font-medium ${diffColor}`}>
        {diff > 0 ? "+" : ""}
        {diff === 0 ? "0.0" : diff.toFixed(1)}
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
