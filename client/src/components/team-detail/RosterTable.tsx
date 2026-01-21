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
import { formatPosition, formatHeight, formatWeight } from "@/lib/formatters";
import type { RosterPlayer } from "@/types/player";

function formatToi(seconds?: number): string {
  if (!seconds) return "-";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatPct(value?: number): string {
  if (value === undefined || value === null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

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
                <TableHead>Pos</TableHead>
                {showStats ? (
                  <>
                    <TableHead className="text-right">GP</TableHead>
                    <TableHead className="text-right">TOI</TableHead>
                    <TableHead className="text-right">G</TableHead>
                    <TableHead className="text-right">A</TableHead>
                    <TableHead className="text-right">P</TableHead>
                    <TableHead className="text-right">S</TableHead>
                    <TableHead className="text-right">xG</TableHead>
                    <TableHead className="text-right">CF%</TableHead>
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
                      <TableCell className="text-right tabular-nums">{player.goals ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{player.assists ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{player.points ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{player.shots ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{player.expectedGoals?.toFixed(1) ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPct(player.corsiForPct)}</TableCell>
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
