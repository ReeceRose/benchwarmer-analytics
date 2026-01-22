import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Info,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { usePowerRankings, useSeasons } from "@/hooks";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, HeaderWithTooltip } from "@/components/shared";
import { formatPercent } from "@/lib/formatters";
import type { TeamPowerRanking, RegressionCandidate } from "@/types";
import { z } from "zod";

const searchSchema = z.object({
  season: z.number().optional(),
});

export const Route = createFileRoute("/power-rankings")({
  component: PowerRankingsPage,
  validateSearch: searchSchema,
});

type SortKey = "points" | "xGoalsPct" | "pdo" | "pointsDiff" | "corsiPct";

function SortHeader({
  label,
  sortKeyName,
  tooltip,
  sortKey,
  sortDesc,
  onSort,
}: {
  label: string;
  sortKeyName: SortKey;
  tooltip?: string;
  sortKey: SortKey;
  sortDesc: boolean;
  onSort: (key: SortKey) => void;
}) {
  return (
    
      <Tooltip>
        <TooltipTrigger asChild>
          <TableHead className="text-right font-semibold cursor-pointer">
            <button
              onClick={() => onSort(sortKeyName)}
              className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
            >
              {label}
              {sortKey === sortKeyName && (
                <ArrowUpDown
                  className={`h-3 w-3 ${sortDesc ? "" : "rotate-180"}`}
                />
              )}
            </button>
          </TableHead>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltip || label}</p>
        </TooltipContent>
      </Tooltip>
    
  );
}

function PowerRankingsPage() {
  const { data: seasonsData } = useSeasons();
  const currentSeason = seasonsData?.seasons?.[0]?.year;
  const navigate = useNavigate({ from: Route.fullPath });
  const { season } = Route.useSearch();

  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDesc, setSortDesc] = useState(true);

  const effectiveSeason = season ?? currentSeason;
  const isCurrentSeason = effectiveSeason === currentSeason;
  const { data, isLoading, error, refetch } = usePowerRankings(effectiveSeason);

  const sortedTeams = [...(data?.teams ?? [])].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    return sortDesc ? bVal - aVal : aVal - bVal;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Power Rankings</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          League-wide team rankings combining traditional standings with
          advanced analytics. Identify teams that are over or underperforming
          their underlying metrics.
        </p>
      </div>

      <Card className="mb-6 py-3 px-4">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Key Metrics: </span>
            <strong>xG%</strong> (expected goals share - team&apos;s scoring
            chance quality), <strong>CF%</strong> (Corsi - shot attempt share),{" "}
            <strong>PDO</strong> (shooting% + save% - values near 100 are
            sustainable, extreme values regress).
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={String(effectiveSeason ?? "")}
            onValueChange={(v) => navigate({ search: { season: parseInt(v) } })}
          >
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              {seasonsData?.seasons?.map((s) => (
                <SelectItem key={s.year} value={String(s.year)}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isCurrentSeason &&
        data?.insights &&
        (data.insights.likelyToImprove.length > 0 ||
          data.insights.likelyToRegress.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {data.insights.likelyToImprove.length > 0 && (
              <Card className="py-3">
                <CardContent className="py-0">
                  <div className="flex items-center gap-2 font-medium mb-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Likely to Improve
                  </div>
                  <ul className="space-y-1">
                    {data.insights.likelyToImprove.map((candidate) => (
                      <RegressionItem
                        key={candidate.abbreviation}
                        candidate={candidate}
                        season={effectiveSeason}
                      />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {data.insights.likelyToRegress.length > 0 && (
              <Card className="py-3">
                <CardContent className="py-0">
                  <div className="flex items-center gap-2 font-medium mb-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    Likely to Regress
                  </div>
                  <ul className="space-y-1">
                    {data.insights.likelyToRegress.map((candidate) => (
                      <RegressionItem
                        key={candidate.abbreviation}
                        candidate={candidate}
                        season={effectiveSeason}
                      />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

      {error && (
        <ErrorState
          title="Failed to load rankings"
          message="Could not fetch power rankings. Please try again."
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : data?.teams && data.teams.length > 0 ? (
        <>
        <Card className="py-0 gap-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Team</TableHead>
                    <HeaderWithTooltip
                      label="GP"
                      tooltip="Games played"
                      className="text-right"
                    />
                    <HeaderWithTooltip
                      label="W"
                      tooltip="Wins"
                      className="text-right"
                    />
                    <HeaderWithTooltip
                      label="L"
                      tooltip="Losses"
                      className="text-right"
                    />
                    <HeaderWithTooltip
                      label="OTL"
                      tooltip="Overtime losses"
                      className="text-right"
                    />
                    <SortHeader
                      label="Pts"
                      sortKeyName="points"
                      tooltip="Points (W×2 + OTL)"
                      sortKey={sortKey}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                    />
                    <HeaderWithTooltip
                      label="GF"
                      tooltip="Goals for"
                      className="text-right"
                    />
                    <HeaderWithTooltip
                      label="GA"
                      tooltip="Goals against"
                      className="text-right"
                    />
                    <SortHeader
                      label="xG%"
                      sortKeyName="xGoalsPct"
                      tooltip="Expected goals percentage (share of expected goals)"
                      sortKey={sortKey}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="CF%"
                      sortKeyName="corsiPct"
                      tooltip="Corsi percentage (shot attempt share)"
                      sortKey={sortKey}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="PDO"
                      sortKeyName="pdo"
                      tooltip="Shooting% + Save% (values near 100 are sustainable)"
                      sortKey={sortKey}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Pts±"
                      sortKeyName="pointsDiff"
                      tooltip="Points above/below expected (positive = overperforming)"
                      sortKey={sortKey}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTeams.map((team, index) => (
                    <TeamRow
                      key={team.abbreviation}
                      team={team}
                      rank={index + 1}
                      season={effectiveSeason}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-600 dark:bg-green-400" />
            <span className="text-muted-foreground">Strong / Underperforming (room to improve)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-muted-foreground" />
            <span className="text-muted-foreground">Average / Sustainable</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-600 dark:bg-red-400" />
            <span className="text-muted-foreground">Weak / Overperforming (likely to regress)</span>
          </div>
        </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try selecting a different season.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TeamRow({
  team,
  rank,
  season,
}: {
  team: TeamPowerRanking;
  rank: number;
  season?: number;
}) {
  const pdoColor = team.pdo
    ? team.pdo > 102
      ? "text-red-500"
      : team.pdo < 98
        ? "text-green-500"
        : "text-foreground"
    : "text-muted-foreground";

  const pointsDiffColor =
    team.pointsDiff > 5
      ? "text-red-500"
      : team.pointsDiff < -5
        ? "text-green-500"
        : "text-muted-foreground";

  const xgPctColor = team.xGoalsPct
    ? team.xGoalsPct > 52
      ? "text-green-500"
      : team.xGoalsPct < 48
        ? "text-red-500"
        : "text-foreground"
    : "text-muted-foreground";

  const corsiColor = team.corsiPct
    ? team.corsiPct > 52
      ? "text-green-500"
      : team.corsiPct < 48
        ? "text-red-500"
        : "text-foreground"
    : "text-muted-foreground";

  return (
    <TableRow>
      <TableCell className="font-medium text-muted-foreground">
        {rank}
      </TableCell>
      <TableCell>
        <Link
          to="/teams/$abbrev"
          params={{ abbrev: team.abbreviation }}
          search={{ season }}
          className="hover:underline font-medium"
        >
          {team.name}
        </Link>
        <span className="text-muted-foreground text-xs ml-2">
          {team.abbreviation}
        </span>
      </TableCell>
      <TableCell className="text-right">{team.gamesPlayed}</TableCell>
      <TableCell className="text-right">{team.wins}</TableCell>
      <TableCell className="text-right">{team.losses}</TableCell>
      <TableCell className="text-right">{team.otLosses}</TableCell>
      <TableCell className="text-right font-semibold">{team.points}</TableCell>
      <TableCell className="text-right">{team.goalsFor}</TableCell>
      <TableCell className="text-right">{team.goalsAgainst}</TableCell>
      <TableCell className={`text-right ${xgPctColor}`}>
        {team.xGoalsPct != null ? formatPercent(team.xGoalsPct) : "-"}
      </TableCell>
      <TableCell className={`text-right ${corsiColor}`}>
        {team.corsiPct != null ? formatPercent(team.corsiPct) : "-"}
      </TableCell>
      <TableCell className={`text-right font-medium ${pdoColor}`}>
        {team.pdo != null ? team.pdo.toFixed(1) : "-"}
      </TableCell>
      <TableCell className={`text-right font-medium ${pointsDiffColor}`}>
        {team.pointsDiff > 0 ? "+" : ""}
        {team.pointsDiff}
      </TableCell>
    </TableRow>
  );
}

function RegressionItem({
  candidate,
  season,
}: {
  candidate: RegressionCandidate;
  season?: number;
}) {
  return (
    <li className="text-sm">
      <Link
        to="/teams/$abbrev"
        params={{ abbrev: candidate.abbreviation }}
        search={{ season }}
        className="font-medium hover:underline"
      >
        {candidate.abbreviation}
      </Link>
      <span className="text-muted-foreground">: {candidate.reason}</span>
    </li>
  );
}
