import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeaderWithTooltip } from "@/components/shared";
import type {
  GameBoxscoreResponse,
  BoxscoreSkater,
  BoxscoreGoalie,
  GameGoal,
} from "@/types";

interface GameBoxscoreTableProps {
  boxscoreData: GameBoxscoreResponse;
  season: number;
  goals?: GameGoal[] | null;
}

function SkaterRow({
  skater,
  season,
  hasGwg,
}: {
  skater: BoxscoreSkater;
  season: number;
  hasGwg?: boolean;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate({
      to: "/players/$id",
      params: { id: String(skater.playerId) },
      search: { season },
    });
  };

  return (
    <TableRow
      className="hover:bg-muted/50 cursor-pointer"
      onClick={handleClick}
    >
      <TableCell className="font-medium">
        <span className="text-muted-foreground text-xs mr-2">
          #{skater.jerseyNumber}
        </span>
        {skater.name}
        <span className="ml-2 text-xs text-muted-foreground">
          ({skater.position})
        </span>
        {hasGwg && (
          <Badge className="ml-2 text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
            GWG
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-center font-mono font-bold">
        {skater.goals}
      </TableCell>
      <TableCell className="text-center font-mono">{skater.assists}</TableCell>
      <TableCell className="text-center font-mono font-semibold">
        {skater.points}
      </TableCell>
      <TableCell
        className={`text-center font-mono ${skater.plusMinus > 0 ? "text-green-500" : skater.plusMinus < 0 ? "text-red-500" : ""}`}
      >
        {skater.plusMinus > 0 ? `+${skater.plusMinus}` : skater.plusMinus}
      </TableCell>
      <TableCell className="text-center font-mono">
        {skater.shotsOnGoal}
      </TableCell>
      <TableCell className="text-center font-mono">{skater.hits}</TableCell>
      <TableCell className="text-center font-mono">
        {skater.blockedShots}
      </TableCell>
      <TableCell className="text-center font-mono text-muted-foreground">
        {skater.timeOnIce}
      </TableCell>
    </TableRow>
  );
}

function GoalieRow({
  goalie,
  season,
}: {
  goalie: BoxscoreGoalie;
  season: number;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate({
      to: "/players/$id",
      params: { id: String(goalie.playerId) },
      search: { season },
    });
  };

  return (
    <TableRow
      className="hover:bg-muted/50 cursor-pointer"
      onClick={handleClick}
    >
      <TableCell className="font-medium">
        <span className="text-muted-foreground text-xs mr-2">
          #{goalie.jerseyNumber}
        </span>
        {goalie.name}
        {goalie.starter && (
          <span className="ml-2 text-xs text-primary">(Starter)</span>
        )}
      </TableCell>
      <TableCell className="text-center font-mono">{goalie.saves}</TableCell>
      <TableCell className="text-center font-mono">
        {goalie.shotsAgainst}
      </TableCell>
      <TableCell className="text-center font-mono">
        {goalie.goalsAgainst}
      </TableCell>
      <TableCell className="text-center font-mono font-semibold">
        {goalie.savePct !== null
          ? (goalie.savePct * 100).toFixed(1) + "%"
          : "-"}
      </TableCell>
      <TableCell className="text-center font-mono text-muted-foreground">
        {goalie.timeOnIce}
      </TableCell>
      <TableCell className="text-center font-mono">
        {goalie.decision && (
          <span
            className={
              goalie.decision === "W"
                ? "text-green-500"
                : goalie.decision === "L"
                  ? "text-red-500"
                  : ""
            }
          >
            {goalie.decision}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

function TeamSkatersTable({
  skaters,
  goalies,
  teamCode,
  season,
  gwgScorerId,
}: {
  skaters: BoxscoreSkater[];
  goalies: BoxscoreGoalie[];
  teamCode: string;
  season: number;
  gwgScorerId?: number;
}) {
  if (skaters.length === 0 && goalies.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No player data available for {teamCode}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <HeaderWithTooltip label="G" tooltip="Goals" className="text-center" />
            <HeaderWithTooltip label="A" tooltip="Assists" className="text-center" />
            <HeaderWithTooltip label="P" tooltip="Points" className="text-center" />
            <HeaderWithTooltip label="+/-" tooltip="Plus/minus rating" className="text-center" />
            <HeaderWithTooltip label="SOG" tooltip="Shots on goal" className="text-center" />
            <HeaderWithTooltip label="HIT" tooltip="Hits" className="text-center" />
            <HeaderWithTooltip label="BLK" tooltip="Blocked shots" className="text-center" />
            <HeaderWithTooltip label="TOI" tooltip="Time on ice" className="text-center" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {skaters.map((skater) => (
            <SkaterRow
              key={skater.playerId}
              skater={skater}
              season={season}
              hasGwg={skater.playerId === gwgScorerId}
            />
          ))}
        </TableBody>
      </Table>

      {goalies.length > 0 && (
        <>
          <div className="text-sm font-semibold text-muted-foreground pt-2">
            Goalies
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <HeaderWithTooltip label="SV" tooltip="Saves" className="text-center" />
                <HeaderWithTooltip label="SA" tooltip="Shots against" className="text-center" />
                <HeaderWithTooltip label="GA" tooltip="Goals against" className="text-center" />
                <HeaderWithTooltip label="SV%" tooltip="Save percentage" className="text-center" />
                <HeaderWithTooltip label="TOI" tooltip="Time on ice" className="text-center" />
                <HeaderWithTooltip label="DEC" tooltip="Decision (W/L/OTL)" className="text-center" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {goalies.map((goalie) => (
                <GoalieRow
                  key={goalie.playerId}
                  goalie={goalie}
                  season={season}
                />
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}

export function GameBoxscoreTable({
  boxscoreData,
  season,
  goals,
}: GameBoxscoreTableProps) {
  const hasData =
    boxscoreData.homeSkaters.length > 0 || boxscoreData.awaySkaters.length > 0;

  // Find the GWG scorer's player ID
  const gwgGoal = goals?.find((g) => g.isGameWinningGoal);
  const gwgScorerId = gwgGoal?.scorerId;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Box Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Box score not available for this game.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Box Score</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="away">
          <TabsList className="mb-4">
            <TabsTrigger value="away">{boxscoreData.awayTeamCode}</TabsTrigger>
            <TabsTrigger value="home">{boxscoreData.homeTeamCode}</TabsTrigger>
          </TabsList>
          <TabsContent value="away">
            <TeamSkatersTable
              skaters={boxscoreData.awaySkaters}
              goalies={boxscoreData.awayGoalies}
              teamCode={boxscoreData.awayTeamCode}
              season={season}
              gwgScorerId={gwgScorerId}
            />
          </TabsContent>
          <TabsContent value="home">
            <TeamSkatersTable
              skaters={boxscoreData.homeSkaters}
              goalies={boxscoreData.homeGoalies}
              teamCode={boxscoreData.homeTeamCode}
              season={season}
              gwgScorerId={gwgScorerId}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function GameBoxscoreTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
