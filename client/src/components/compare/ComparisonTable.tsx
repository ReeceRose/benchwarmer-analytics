import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatPosition } from "@/lib/formatters";
import { getMetricTooltipContent } from "@/lib/metric-tooltips";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import {
  SKATER_STAT_CONFIGS,
  GOALIE_STAT_CONFIGS,
  getSkaterStatValue,
  getGoalieStatValue,
  filterStatsByMode,
  type StatMode,
} from "@/components/compare/stat-configs";
import type { PlayerComparison } from "@/types";

interface ComparisonTableProps {
  players: PlayerComparison[];
  positionType: "goalie" | "skater" | null;
  statMode?: StatMode;
}

export function ComparisonTable({ players, positionType, statMode = "all" }: ComparisonTableProps) {
  if (players.length < 2) return null;

  const isGoalie = positionType === "goalie";
  const skaterConfigs = filterStatsByMode(SKATER_STAT_CONFIGS, statMode);
  const goalieConfigs = filterStatsByMode(GOALIE_STAT_CONFIGS, statMode);

  return (
    <Card className="py-0 gap-0">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold sticky left-0 bg-muted/50 z-10 border-r w-32 pl-4 py-4">
                Stat
              </TableHead>
              {players.map((player) => (
                <TableHead
                  key={player.playerId}
                  className="text-center font-semibold min-w-40 px-6 py-4"
                >
                  <div className="flex flex-col items-center gap-1">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={getPlayerHeadshotUrl(player.playerId, player.team)}
                        alt={player.name}
                      />
                      <AvatarFallback className="text-xs">
                        {getPlayerInitials(player.name)}
                      </AvatarFallback>
                    </Avatar>
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
            {isGoalie
              ? goalieConfigs.map((config) => (
                  <TableRow
                    key={config.key}
                    className="hover:bg-muted/30"
                  >
                    <TableCell className="font-medium sticky left-0 bg-inherit z-10 border-r pl-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{config.label}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {getMetricTooltipContent(config.metric ?? config.label) ?? (
                            <p className="text-xs">{config.tooltip}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    {players.map((player) => {
                      const { formatted, isBest, isWorst } = getGoalieStatValue(
                        config,
                        player,
                        players
                      );
                      return (
                        <TableCell
                          key={player.playerId}
                          className={`text-center tabular-nums px-6 ${
                            isBest
                              ? "text-success font-semibold"
                              : isWorst
                                ? "text-error"
                                : ""
                          }`}
                        >
                          {formatted}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              : skaterConfigs.map((config) => (
                  <TableRow
                    key={config.key}
                    className="hover:bg-muted/30"
                  >
                    <TableCell className="font-medium sticky left-0 bg-inherit z-10 border-r pl-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{config.label}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {getMetricTooltipContent(config.metric ?? config.label) ?? (
                            <p className="text-xs">{config.tooltip}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    {players.map((player) => {
                      const { formatted, isBest, isWorst } = getSkaterStatValue(
                        config,
                        player,
                        players
                      );
                      return (
                        <TableCell
                          key={player.playerId}
                          className={`text-center tabular-nums px-6 ${
                            isBest
                              ? "text-success font-semibold"
                              : isWorst
                                ? "text-error"
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
