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
    <Card className="py-0 gap-0">
      <CardContent className="p-0 overflow-x-auto">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold sticky left-0 bg-muted/50 z-10 border-r w-32 pl-4 py-4">
                Stat
              </TableHead>
              {players.map((player) => (
                <TableHead
                  key={player.playerId}
                  className="text-center font-semibold min-w-40 px-6 py-4"
                >
                  <div className="flex flex-col items-center gap-1">
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
            {statConfigs.map((config, index) => (
              <TableRow
                key={config.key}
                className={index % 2 === 0 ? "bg-muted/20" : ""}
              >
                <TableCell className="font-medium sticky left-0 bg-inherit z-10 border-r pl-4">
                  {config.label}
                </TableCell>
                {players.map((player) => {
                  const { formatted, isBest, isWorst } = isGoalie
                    ? getGoalieStatValue(config as GoalieStatConfig, player, players)
                    : getSkaterStatValue(config as SkaterStatConfig, player, players);
                  return (
                    <TableCell
                      key={player.playerId}
                      className={`text-center tabular-nums px-6 ${
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
