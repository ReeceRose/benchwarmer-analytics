import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HeaderWithTooltip } from "@/components/shared";
import { formatPosition, formatHeight, formatWeight, formatToi, formatPercent } from "@/lib/formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { RosterPlayer } from "@/types/player";

interface RosterTableProps {
  title: string;
  players: RosterPlayer[];
  showStats?: boolean;
}

export function RosterTable({ title, players, showStats = false }: RosterTableProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <Card className="py-0 gap-0">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={showStats ? "w-[25%]" : "w-[40%]"}>Name</TableHead>
                <HeaderWithTooltip label="Pos" tooltip="Position" />
                {showStats ? (
                  <>
                    <HeaderWithTooltip label="GP" tooltip="Games played" className="text-right" />
                    <HeaderWithTooltip label="TOI" tooltip="Total time on ice" className="text-right" />
                    <HeaderWithTooltip label="G" tooltip="Goals" className="text-right" />
                    <HeaderWithTooltip label="A" tooltip="Assists" className="text-right" />
                    <HeaderWithTooltip label="P" tooltip="Points (Goals + Assists)" className="text-right" />
                    <HeaderWithTooltip label="S" tooltip="Shots on goal" className="text-right" />
                    <HeaderWithTooltip label="xG" tooltip="Expected goals based on shot quality" className="text-right" />
                    <HeaderWithTooltip label="CF%" tooltip="Corsi For % — shot attempt share while on ice" className="text-right" />
                  </>
                ) : (
                  <>
                    <TableHead>Height</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Shoots</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>
                    <Link
                      to="/players/$id"
                      params={{ id: String(player.id) }}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={player.headshotUrl || getPlayerHeadshotUrl(player.id, player.currentTeamAbbreviation)}
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
                    <Badge variant="outline" className="font-normal">
                      {formatPosition(player.position)}
                    </Badge>
                  </TableCell>
                  {showStats ? (
                    <>
                      <TableCell className="text-right tabular-nums">{player.gamesPlayed ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatToi(player.iceTimeSeconds)}</TableCell>
                      <TableCell className="text-right tabular-nums">{player.goals ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{player.assists ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{player.points ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{player.shots ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{player.expectedGoals?.toFixed(1) ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPercent(player.corsiForPct, false)}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-muted-foreground">
                        {formatHeight(player.heightInches)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatWeight(player.weightLbs)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {player.shoots || "-"}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
