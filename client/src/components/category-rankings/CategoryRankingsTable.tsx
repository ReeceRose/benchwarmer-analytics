import { useState, useMemo } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RankBadge } from "@/components/category-rankings/RankBadge";
import { TeamLogo } from "@/components/team-detail";
import type { TeamCategoryRanks } from "@/types";

interface CategoryRankingsTableProps {
  teams: TeamCategoryRanks[];
  isLoading?: boolean;
  isError?: boolean;
  season?: number;
}

type SortField = keyof TeamCategoryRanks | "team";
type SortDirection = "asc" | "desc";

const columns = [
  // Overall
  { key: "overallRank" as const, label: "OVR", valueKey: "overallScore" as const, format: (v: number) => v.toFixed(1), tooltip: "Overall Rank (weighted composite of all categories)" },
  // Expected Goals
  { key: "xGoalsPctRank" as const, label: "xG%", valueKey: "xGoalsPct" as const, format: (v: number) => `${v.toFixed(1)}%`, tooltip: "Expected Goals %" },
  { key: "xGoalsForRank" as const, label: "xGF", valueKey: "xGoalsFor" as const, format: (v: number) => v.toFixed(1), tooltip: "Expected Goals For" },
  { key: "xGoalsAgainstRank" as const, label: "xGA", valueKey: "xGoalsAgainst" as const, format: (v: number) => v.toFixed(1), tooltip: "Expected Goals Against (lower is better)" },
  // Actual Goals
  { key: "goalsForRank" as const, label: "GF", valueKey: "goalsFor" as const, format: (v: number) => String(v), tooltip: "Goals For" },
  { key: "goalsAgainstRank" as const, label: "GA", valueKey: "goalsAgainst" as const, format: (v: number) => String(v), tooltip: "Goals Against (lower is better)" },
  { key: "goalDifferentialRank" as const, label: "DIFF", valueKey: "goalDifferential" as const, format: (v: number) => (v > 0 ? `+${v}` : String(v)), tooltip: "Goal Differential" },
  // Shooting & Goaltending
  { key: "shootingPctRank" as const, label: "Sh%", valueKey: "shootingPct" as const, format: (v: number) => `${v.toFixed(1)}%`, tooltip: "Shooting %" },
  { key: "savePctRank" as const, label: "Sv%", valueKey: "savePct" as const, format: (v: number) => `${v.toFixed(1)}%`, tooltip: "Team Save %" },
  // Possession
  { key: "corsiPctRank" as const, label: "CF%", valueKey: "corsiPct" as const, format: (v: number) => `${v.toFixed(1)}%`, tooltip: "Corsi % (shot attempts)" },
  { key: "fenwickPctRank" as const, label: "FF%", valueKey: "fenwickPct" as const, format: (v: number) => `${v.toFixed(1)}%`, tooltip: "Fenwick % (unblocked shot attempts)" },
  // Special Teams
  { key: "ppPctRank" as const, label: "PP%", valueKey: "ppPct" as const, format: (v: number) => `${v.toFixed(1)}%`, tooltip: "Power Play %" },
  { key: "pkPctRank" as const, label: "PK%", valueKey: "pkPct" as const, format: (v: number) => `${v.toFixed(1)}%`, tooltip: "Penalty Kill %" },
  // High Danger
  { key: "highDangerForRank" as const, label: "HDCF", valueKey: "highDangerChancesFor" as const, format: (v: number) => String(v), tooltip: "High Danger Chances For" },
  { key: "highDangerAgainstRank" as const, label: "HDCA", valueKey: "highDangerChancesAgainst" as const, format: (v: number) => String(v), tooltip: "High Danger Chances Against (lower is better)" },
  // Faceoffs
  { key: "faceoffPctRank" as const, label: "FO%", valueKey: "faceoffPct" as const, format: (v: number) => `${v.toFixed(1)}%`, tooltip: "Faceoff Win %" },
  // Discipline
  { key: "penaltiesDrawnRank" as const, label: "PenD", valueKey: "penaltiesDrawn" as const, format: (v: number) => String(v), tooltip: "Penalties Drawn (more is better)" },
  { key: "penaltiesTakenRank" as const, label: "PenT", valueKey: "penaltiesTaken" as const, format: (v: number) => String(v), tooltip: "Penalties Taken (fewer is better)" },
  { key: "penaltyDifferentialRank" as const, label: "Pen±", valueKey: "penaltyDifferential" as const, format: (v: number) => (v > 0 ? `+${v}` : String(v)), tooltip: "Penalty Differential (drawn - taken, higher is better)" },
  // Physical Play
  { key: "hitsRank" as const, label: "Hits", valueKey: "hits" as const, format: (v: number) => String(v), tooltip: "Hits" },
  { key: "hitsAgainstRank" as const, label: "HitA", valueKey: "hitsAgainst" as const, format: (v: number) => String(v), tooltip: "Hits Against (fewer is better)" },
  { key: "blockedShotsRank" as const, label: "Blk", valueKey: "blockedShots" as const, format: (v: number) => String(v), tooltip: "Blocked Shots" },
  // Puck Management
  { key: "takeawaysRank" as const, label: "TkA", valueKey: "takeaways" as const, format: (v: number) => String(v), tooltip: "Takeaways (more is better)" },
  { key: "giveawaysRank" as const, label: "GvA", valueKey: "giveaways" as const, format: (v: number) => String(v), tooltip: "Giveaways (fewer is better)" },
];

interface RankDiffBadgeProps {
  pointsRank: number;
  overallRank: number;
  points?: number;
}

function RankDiffBadge({ pointsRank, overallRank, points }: RankDiffBadgeProps) {
  const diff = overallRank - pointsRank;
  if (diff === 0) return null;

  const isOverperforming = diff > 0;
  const colorClass = isOverperforming
    ? "text-emerald-500"
    : "text-red-500";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`text-xs font-medium cursor-help ${colorClass}`}>
          {isOverperforming ? `+${diff}` : diff}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs font-medium">
          {isOverperforming ? "Overperforming" : "Underperforming"} by {Math.abs(diff)} {Math.abs(diff) === 1 ? "spot" : "spots"}
        </p>
        <p className="text-xs text-muted-foreground">
          #{pointsRank} in points ({points?.toLocaleString()}) vs #{overallRank} in analytics
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

interface SortableHeaderProps {
  field: SortField;
  label: string;
  tooltip: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  align?: "left" | "center" | "right";
}

function SortableHeader({
  field,
  label,
  tooltip,
  sortField,
  sortDirection,
  onSort,
  align = "center",
}: SortableHeaderProps) {
  const alignClass = align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TableHead
          className={`cursor-pointer hover:bg-muted/50 select-none ${align === "left" ? "text-left" : "text-center"}`}
          onClick={() => onSort(field)}
        >
          <div className={`flex items-center gap-1 ${alignClass}`}>
            <span>{label}</span>
            {sortField === field && (
              <span className="text-xs">
                {sortDirection === "desc" ? "▼" : "▲"}
              </span>
            )}
          </div>
        </TableHead>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function CategoryRankingsTable({ teams, isLoading, isError, season }: CategoryRankingsTableProps) {
  const [sortField, setSortField] = useState<SortField>("overallRank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const hasPointsData = teams.length > 0 && teams[0].pointsRank != null;

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      // Ascending is the default for all columns (1 is best for ranks, A-Z for team name)
      setSortDirection("asc");
    }
  };

  const sortedTeams = useMemo(() => {
    if (!teams.length) return teams;

    return [...teams].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortField === "team") {
        aVal = a.name;
        bVal = b.name;
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      aVal = (a[sortField] as number) ?? 999;
      bVal = (b[sortField] as number) ?? 999;

      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [teams, sortField, sortDirection]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-error">Failed to load rankings data. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                field="team"
                label="Team"
                tooltip="Sort by team name"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="left"
              />
              {columns.map(({ key, label, tooltip }) => (
                <SortableHeader
                  key={key}
                  field={key}
                  label={label}
                  tooltip={`${tooltip} (click to sort)`}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTeams.map((team) => (
              <TableRow key={team.abbreviation}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/teams/$abbrev"
                      params={{ abbrev: team.abbreviation }}
                      search={{ season }}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <TeamLogo abbrev={team.abbreviation} size="sm" />
                      <span className="font-medium">{team.name}</span>
                    </Link>
                    {hasPointsData && team.pointsRank != null && (
                      <RankDiffBadge
                        pointsRank={team.pointsRank}
                        overallRank={team.overallRank}
                        points={team.points}
                      />
                    )}
                  </div>
                </TableCell>
                {columns.map(({ key, valueKey, format, tooltip }) => {
                  const rank = team[key] as number;
                  const value = team[valueKey] as number | undefined;

                  return (
                    <TableCell key={key} className="text-center">
                      <RankBadge
                        rank={rank}
                        value={value}
                        label={tooltip}
                        format={format}
                      />
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
