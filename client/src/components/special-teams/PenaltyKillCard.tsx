import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatItem } from "./StatItem";
import { formatPercent, formatSavePct, formatIceTimeLong } from "@/lib/formatters";
import type { PenaltyKillSummary } from "@/types";

interface PenaltyKillCardProps {
  stats: PenaltyKillSummary;
}

export function PenaltyKillCard({ stats }: PenaltyKillCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Penalty Kill</CardTitle>
          {stats.leagueRank && (
            <Badge variant="secondary">#{stats.leagueRank} in NHL</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <StatItem
            label="PK%"
            value={formatPercent(stats.percentage, false)}
          />
          <StatItem
            label="xGA/60"
            value={stats.xGoalsAgainstPer60.toFixed(2)}
          />
          <StatItem
            label="Sv%"
            value={formatSavePct(stats.savePct)}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Goals Against</span>
            <span className="font-medium tabular-nums">{stats.goalsAgainst}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Times Short</span>
            <span className="font-medium tabular-nums">{stats.timesShorthanded}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">xGoals Against</span>
            <span className="font-medium tabular-nums">{stats.xGoalsAgainst.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shots Against</span>
            <span className="font-medium tabular-nums">{stats.shotsAgainst}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">HD Against</span>
            <span className="font-medium tabular-nums">{stats.highDangerAgainst}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">HD Goals Against</span>
            <span className="font-medium tabular-nums">{stats.highDangerGoalsAgainst}</span>
          </div>
          <div className="flex justify-between col-span-2">
            <span className="text-muted-foreground">PK Time</span>
            <span className="font-medium tabular-nums">{formatIceTimeLong(stats.iceTimeSeconds)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
