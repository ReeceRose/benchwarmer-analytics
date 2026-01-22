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
import { HeaderWithTooltip } from "@/components/shared";
import { formatPosition, formatHeight, formatWeight } from "@/lib/formatters";
import type { RosterPlayer } from "@/types/player";

function formatToi(seconds?: number): string {
  if (!seconds) return "-";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatSavePct(value?: number): string {
  if (value === undefined || value === null) return "-";
  return `.${(value * 1000).toFixed(0).padStart(3, "0")}`;
}

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
                  <TableCell>
                    <Link
                      to="/players/$id"
                      params={{ id: String(player.id) }}
                      className="hover:underline font-medium"
                    >
                      {player.name}
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
                      <TableCell className="text-right tabular-nums">{player.goalsAgainst ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{player.shotsAgainst ?? "-"}</TableCell>
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
