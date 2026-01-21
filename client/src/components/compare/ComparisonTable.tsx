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
import { formatPosition } from "@/lib/formatters";
import {
  SKATER_STAT_CONFIGS,
  GOALIE_STAT_CONFIGS,
  getSkaterStatValue,
  getGoalieStatValue,
  type SkaterStatConfig,
  type GoalieStatConfig,
} from "@/components/compare/stat-configs";
import type { PlayerComparison } from "@/types";

interface ComparisonTableProps {
  players: PlayerComparison[];
  positionType: "goalie" | "skater" | null;
}

export function ComparisonTable({ players, positionType }: ComparisonTableProps) {
  if (players.length < 2) return null;

  const isGoalie = positionType === "goalie";
  const statConfigs = isGoalie ? GOALIE_STAT_CONFIGS : SKATER_STAT_CONFIGS;

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold sticky left-0 bg-muted/50 z-10">
                Stat
              </TableHead>
              {players.map((player) => (
                <TableHead
                  key={player.playerId}
                  className="text-center font-semibold min-w-30"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{player.name}</span>
                    {player.position && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {formatPosition(player.position)}
                      </Badge>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {statConfigs.map((config) => (
              <TableRow key={config.key}>
                <TableCell className="font-medium sticky left-0 bg-background z-10">
                  {config.label}
                </TableCell>
                {players.map((player) => {
                  const { formatted, isBest, isWorst } = isGoalie
                    ? getGoalieStatValue(config as GoalieStatConfig, player, players)
                    : getSkaterStatValue(config as SkaterStatConfig, player, players);
                  return (
                    <TableCell
                      key={player.playerId}
                      className={`text-center tabular-nums ${
                        isBest
                          ? "text-green-600 dark:text-green-400 font-semibold"
                          : isWorst
                            ? "text-red-600 dark:text-red-400"
                            : ""
                      }`}
                    >
                      {formatted}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
