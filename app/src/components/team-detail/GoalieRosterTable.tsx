import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HeaderWithTooltip, InjuryBadge } from "@/components/shared";
import {
  formatHeight,
  formatWeight,
  formatToi,
  formatSavePct,
  formatPositionShort,
} from "@/lib/formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { RosterPlayer } from "@/types/player";

function formatGaa(value?: number): string {
  if (value === undefined || value === null) return "-";
  return value.toFixed(2);
}

function formatGsax(value?: number): string {
  if (value === undefined || value === null) return "-";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

interface GoalieRosterTableProps {
  title: string;
  players: RosterPlayer[];
  showStats?: boolean;
}

export function GoalieRosterTable({ title, players, showStats = false }: GoalieRosterTableProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn("sticky left-0 z-10 bg-card", showStats ? "w-[25%]" : "w-[40%]")}>Name</TableHead>
                <HeaderWithTooltip label="Pos" tooltip="Position" />
                {showStats ? (
                  <>
                    <HeaderWithTooltip label="GP" tooltip="Games played" className="text-right" />
                    <HeaderWithTooltip label="TOI" tooltip="Total time on ice" className="text-right" />
                    <HeaderWithTooltip label="GA" tooltip="Goals against" className="text-right" />
                    <HeaderWithTooltip label="SA" tooltip="Shots against" className="text-right" />
                    <HeaderWithTooltip label="SV%" tooltip="Save percentage" className="text-right" />
                    <HeaderWithTooltip label="GAA" tooltip="Goals against average per 60 minutes" className="text-right" />
                    <HeaderWithTooltip label="GSAx" tooltip="Goals saved above expected — positive is better" className="text-right" />
                  </>
                ) : (
                  <>
                    <TableHead>Height</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Catches</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="sticky left-0 z-10 bg-card">
                    <Link
                      to="/players/$id"
                      params={{ id: String(player.id) }}
                      className="flex items-center gap-2 transition-colors hover:text-link"
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
                      <InjuryBadge injury={player.injury} />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{formatPositionShort(player.position)}</span>
                  </TableCell>
                  {showStats ? (
                    <>
                      <TableCell className="text-right tabular-nums">{player.gamesPlayed ?? "–"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatToi(player.iceTimeSeconds)}</TableCell>
                      <TableCell className="text-right tabular-nums">{player.goalsAgainst ?? "–"}</TableCell>
                      <TableCell className="text-right tabular-nums">{player.shotsAgainst ?? "–"}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{formatSavePct(player.savePercentage)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatGaa(player.goalsAgainstAverage)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatGsax(player.goalsSavedAboveExpected)}</TableCell>
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
