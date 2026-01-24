import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatItem } from "@/components/special-teams/StatItem";
import { formatPercent, formatIceTimeLong } from "@/lib/formatters";
import type { PowerPlaySummary } from "@/types";

interface PowerPlayCardProps {
  stats: PowerPlaySummary;
}

export function PowerPlayCard({ stats }: PowerPlayCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Power Play</CardTitle>
          {stats.leagueRank && (
            <Badge variant="secondary">#{stats.leagueRank} in NHL</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <StatItem
            label="PP%"
            value={formatPercent(stats.percentage, false)}
          />
          <StatItem
            label="xG/60"
            value={stats.xGoalsPer60.toFixed(2)}
          />
          <StatItem
            label="Sh%"
            value={formatPercent(stats.shootingPct, false)}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Goals</span>
            <span className="font-medium tabular-nums">{stats.goals}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Opportunities</span>
            <span className="font-medium tabular-nums">{stats.opportunities}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">xGoals</span>
            <span className="font-medium tabular-nums">{stats.xGoals.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shots</span>
            <span className="font-medium tabular-nums">{stats.shotsFor}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">High Danger</span>
            <span className="font-medium tabular-nums">{stats.highDangerChances}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">HD Goals</span>
            <span className="font-medium tabular-nums">{stats.highDangerGoals}</span>
          </div>
          <div className="flex justify-between col-span-2">
            <span className="text-muted-foreground">PP Time</span>
            <span className="font-medium tabular-nums">{formatIceTimeLong(stats.iceTimeSeconds)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
