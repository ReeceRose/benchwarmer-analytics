import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, Info, Filter, ArrowUpDown } from "lucide-react";
import { useBreakoutCandidates, useSeasons } from "@/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { formatPosition } from "@/lib/formatters";
import type { BreakoutCandidate } from "@/types";

export const Route = createFileRoute("/breakout-candidates")({
  component: BreakoutCandidatesPage,
});

type SortKey = "breakoutScore" | "goalsDifferential" | "corsiForPct" | "shotsPer60";

function SortHeader({
  label,
  sortKeyName,
  sortKey,
  sortDesc,
  onSort,
}: {
  label: string;
  sortKeyName: SortKey;
  sortKey: SortKey;
  sortDesc: boolean;
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      onClick={() => onSort(sortKeyName)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {sortKey === sortKeyName && (
        <ArrowUpDown className={`h-3 w-3 ${sortDesc ? "" : "rotate-180"}`} />
      )}
    </button>
  );
}

function BreakoutCandidatesPage() {
  const { data: seasonsData } = useSeasons();
  const currentSeason = seasonsData?.seasons?.[0]?.year;

  const [season, setSeason] = useState<number | undefined>(undefined);
  const [minGames, setMinGames] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("breakoutScore");
  const [sortDesc, setSortDesc] = useState(true);

  const effectiveSeason = season ?? currentSeason;
  const { data, isLoading, error, refetch } = useBreakoutCandidates(
    effectiveSeason,
    minGames,
    50
  );

  const sortedCandidates = [...(data?.candidates ?? [])].sort((a, b) => {
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
          <TrendingUp className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Breakout Candidates</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Players with strong underlying metrics who may be poised for a breakout.
          These players have high expected goals (xG), good possession numbers, but
          have scored fewer goals than expected.
        </p>
      </div>

      <Card className="mb-6 py-3 px-4">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Breakout Score</span> combines:{" "}
            <strong>Goals Differential</strong> (xG - G, positive = unlucky),{" "}
            <strong>Corsi For %</strong> (shot attempt share, above 50% = driving play),{" "}
            <strong>Shots/60</strong> (higher = more opportunities).
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={String(effectiveSeason ?? "")}
            onValueChange={(v) => setSeason(parseInt(v))}
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Min Games:</span>
          <Select value={String(minGames)} onValueChange={(v) => setMinGames(parseInt(v))}>
            <SelectTrigger className="w-20 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10+</SelectItem>
              <SelectItem value="20">20+</SelectItem>
              <SelectItem value="30">30+</SelectItem>
              <SelectItem value="40">40+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Failed to load candidates"
          message="Could not fetch breakout candidates. Please try again."
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
      ) : data?.candidates && data.candidates.length > 0 ? (
        <Card className="py-0 gap-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Pos</TableHead>
                    <TableHead>Team</TableHead>
                    <HeaderWithTooltip label="GP" tooltip="Games played" className="text-right" />
                    <HeaderWithTooltip label="G" tooltip="Goals" className="text-right" />
                    <HeaderWithTooltip label="xG" tooltip="Expected goals based on shot quality" className="text-right" />
                    <TableHead className="text-right">
                      
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <SortHeader label="G Diff" sortKeyName="goalsDifferential" sortKey={sortKey} sortDesc={sortDesc} onSort={handleSort} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Goals below expected (xG - G). Positive = unlucky
                          </TooltipContent>
                        </Tooltip>
                      
                    </TableHead>
                    <TableHead className="text-right">
                      
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <SortHeader label="CF%" sortKeyName="corsiForPct" sortKey={sortKey} sortDesc={sortDesc} onSort={handleSort} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Corsi For % (shot attempt share)</TooltipContent>
                        </Tooltip>
                      
                    </TableHead>
                    <TableHead className="text-right">
                      
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <SortHeader label="Sh/60" sortKeyName="shotsPer60" sortKey={sortKey} sortDesc={sortDesc} onSort={handleSort} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Shots per 60 minutes</TooltipContent>
                        </Tooltip>
                      
                    </TableHead>
                    <TableHead className="text-right">
                      
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <SortHeader label="Score" sortKeyName="breakoutScore" sortKey={sortKey} sortDesc={sortDesc} onSort={handleSort} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Combined breakout score (higher = more likely to break out)
                          </TooltipContent>
                        </Tooltip>
                      
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCandidates.map((candidate, index) => (
                    <CandidateRow
                      key={candidate.playerId}
                      candidate={candidate}
                      rank={index + 1}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No candidates found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting the filters or selecting a different season.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CandidateRow({ candidate, rank }: { candidate: BreakoutCandidate; rank: number }) {
  const diffColor =
    candidate.goalsDifferential > 2
      ? "text-red-500"
      : candidate.goalsDifferential > 0
        ? "text-orange-500"
        : "text-green-500";

  const corsiColor =
    (candidate.corsiForPct ?? 50) >= 52
      ? "text-green-500"
      : (candidate.corsiForPct ?? 50) >= 48
        ? "text-foreground"
        : "text-red-500";

  const scoreColor =
    candidate.breakoutScore >= 5
      ? "bg-green-500/10 text-green-600 border-green-500/20"
      : candidate.breakoutScore >= 3
        ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
        : "bg-muted";

  return (
    <TableRow>
      <TableCell className="font-medium text-muted-foreground">{rank}</TableCell>
      <TableCell>
        <Link
          to="/players/$id"
          params={{ id: String(candidate.playerId) }}
          className="hover:underline font-medium"
        >
          {candidate.name}
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-normal">
          {formatPosition(candidate.position)}
        </Badge>
      </TableCell>
      <TableCell>
        <Link
          to="/teams/$abbrev"
          params={{ abbrev: candidate.team }}
          className="hover:underline text-muted-foreground"
        >
          {candidate.team}
        </Link>
      </TableCell>
      <TableCell className="text-right">{candidate.gamesPlayed}</TableCell>
      <TableCell className="text-right">{candidate.goals}</TableCell>
      <TableCell className="text-right">{candidate.expectedGoals.toFixed(1)}</TableCell>
      <TableCell className={`text-right font-medium ${diffColor}`}>
        +{candidate.goalsDifferential.toFixed(1)}
      </TableCell>
      <TableCell className={`text-right ${corsiColor}`}>
        {candidate.corsiForPct?.toFixed(1) ?? "-"}%
      </TableCell>
      <TableCell className="text-right">{candidate.shotsPer60.toFixed(1)}</TableCell>
      <TableCell className="text-right">
        <Badge variant="outline" className={scoreColor}>
          {candidate.breakoutScore.toFixed(1)}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
