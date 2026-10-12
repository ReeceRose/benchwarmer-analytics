import { Link } from "@tanstack/react-router";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatPositionShort } from "@/lib/formatters";
import { getMetricTooltipContent } from "@/lib/metric-tooltips";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import { cn } from "@/lib/utils";
import {
  SKATER_STAT_CONFIGS,
  GOALIE_STAT_CONFIGS,
  getSkaterStatValue,
  getGoalieStatValue,
  filterStatsByMode,
  type StatMode,
  type StatValueResult,
} from "@/components/compare/stat-configs";
import type { PlayerComparison } from "@/types";

interface ComparisonTableProps {
  players: PlayerComparison[];
  positionType: "goalie" | "skater" | null;
  statMode?: StatMode;
}

interface Row {
  key: string;
  label: string;
  metric?: string;
  tooltip: string;
  /** Games played and ice time give context; they aren't better or worse. */
  context: boolean;
  value: (player: PlayerComparison) => StatValueResult;
}

/** One column per player, best value in each row in bold. */
export function ComparisonTable({ players, positionType, statMode = "all" }: ComparisonTableProps) {
  if (players.length < 2) return null;

  const rows: Row[] =
    positionType === "goalie"
      ? filterStatsByMode(GOALIE_STAT_CONFIGS, statMode).map((config) => ({
          key: config.key,
          label: config.label,
          metric: config.metric,
          tooltip: config.tooltip,
          context: config.mode === "context",
          value: (player) => getGoalieStatValue(config, player, players),
        }))
      : filterStatsByMode(SKATER_STAT_CONFIGS, statMode).map((config) => ({
          key: config.key,
          label: config.label,
          metric: config.metric,
          tooltip: config.tooltip,
          context: config.mode === "context",
          value: (player) => getSkaterStatValue(config, player, players),
        }));

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="sticky left-0 z-10 w-28 bg-card pl-4">Stat</TableHead>
            {players.map((player) => (
              <TableHead key={player.playerId} className="h-auto min-w-36 px-4 py-3 text-center">
                <Link
                  to="/players/$id"
                  params={{ id: String(player.playerId) }}
                  className="group inline-flex flex-col items-center gap-1.5"
                >
                  <Avatar className="size-10">
                    <AvatarImage
                      src={getPlayerHeadshotUrl(player.playerId, player.team)}
                      alt={player.name}
                    />
                    <AvatarFallback className="text-xs">
                      {getPlayerInitials(player.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold text-foreground group-hover:text-link">
                    {player.name}
                  </span>
                  <span className="text-xs font-normal">
                    {[player.position && formatPositionShort(player.position), player.team].filter(Boolean).join(" · ")}
                  </span>
                </Link>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="sticky left-0 z-10 bg-card pl-4 font-medium">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help underline decoration-muted-foreground/40 decoration-dotted underline-offset-4">
                      {row.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {getMetricTooltipContent(row.metric ?? row.label) ?? (
                      <p className="text-xs">{row.tooltip}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              {players.map((player) => {
                const { formatted, isBest, isWorst } = row.value(player);
                return (
                  <TableCell
                    key={player.playerId}
                    className={cn(
                      "px-4 text-center tabular-nums",
                      !row.context && isBest && "font-bold",
                      !row.context && isWorst && "text-muted-foreground",
                    )}
                  >
                    {formatted}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
