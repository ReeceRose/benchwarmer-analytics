import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Shot } from "@/types";

interface PeriodBreakdownCardProps {
  shots: Shot[];
}

interface PeriodStats {
  period: number;
  periodLabel: string;
  totalShots: number;
  shotsOnGoal: number;
  goals: number;
  shootingPct: number;
  totalXGoal: number;
  goalsAboveExpected: number;
  highDangerShots: number;
  mediumDangerShots: number;
  lowDangerShots: number;
}

function getDangerLevel(xGoal: number | undefined): "high" | "medium" | "low" {
  if (xGoal === undefined) return "low";
  if (xGoal > 0.15) return "high";
  if (xGoal >= 0.06) return "medium";
  return "low";
}

function getPeriodLabel(period: number): string {
  switch (period) {
    case 1:
      return "1st";
    case 2:
      return "2nd";
    case 3:
      return "3rd";
    case 4:
      return "OT";
    default:
      return `OT${period - 3}`;
  }
}

function calculatePeriodStats(shots: Shot[], period: number): PeriodStats {
  const periodShots = shots.filter((s) => s.period === period);
  const totalShots = periodShots.length;
  const shotsOnGoal = periodShots.filter((s) => s.shotWasOnGoal).length;
  const goals = periodShots.filter((s) => s.isGoal).length;
  const totalXGoal = periodShots.reduce((sum, s) => sum + (s.xGoal ?? 0), 0);

  const highDangerShots = periodShots.filter(
    (s) => getDangerLevel(s.xGoal) === "high"
  ).length;
  const mediumDangerShots = periodShots.filter(
    (s) => getDangerLevel(s.xGoal) === "medium"
  ).length;
  const lowDangerShots = periodShots.filter(
    (s) => getDangerLevel(s.xGoal) === "low"
  ).length;

  return {
    period,
    periodLabel: getPeriodLabel(period),
    totalShots,
    shotsOnGoal,
    goals,
    shootingPct: shotsOnGoal > 0 ? (goals / shotsOnGoal) * 100 : 0,
    totalXGoal,
    goalsAboveExpected: goals - totalXGoal,
    highDangerShots,
    mediumDangerShots,
    lowDangerShots,
  };
}

export function PeriodBreakdownCard({ shots }: PeriodBreakdownCardProps) {
  const periodStats = useMemo(() => {
    const periods = [...new Set(shots.map((s) => s.period))].sort(
      (a, b) => a - b
    );
    return periods.map((period) => calculatePeriodStats(shots, period));
  }, [shots]);

  if (periodStats.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Period Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Period</TableHead>
                <TableHead className="text-right">Shots</TableHead>
                <TableHead className="text-right">On Goal</TableHead>
                <TableHead className="text-right">Goals</TableHead>
                <TableHead className="text-right">Sh%</TableHead>
                <TableHead className="text-right">xG</TableHead>
                <TableHead className="text-right">G-xG</TableHead>
                <TableHead className="text-right">High</TableHead>
                <TableHead className="text-right">Med</TableHead>
                <TableHead className="text-right">Low</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodStats.map((stats) => {
                const gaeHighlight =
                  stats.goalsAboveExpected > 0.5
                    ? "text-green-600 dark:text-green-400"
                    : stats.goalsAboveExpected < -0.5
                      ? "text-red-600 dark:text-red-400"
                      : "";

                return (
                  <TableRow key={stats.period}>
                    <TableCell className="font-medium">
                      {stats.periodLabel}
                    </TableCell>
                    <TableCell className="text-right">
                      {stats.totalShots}
                    </TableCell>
                    <TableCell className="text-right">
                      {stats.shotsOnGoal}
                    </TableCell>
                    <TableCell className="text-right">{stats.goals}</TableCell>
                    <TableCell className="text-right">
                      {stats.shootingPct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {stats.totalXGoal.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right ${gaeHighlight}`}>
                      {stats.goalsAboveExpected >= 0 ? "+" : ""}
                      {stats.goalsAboveExpected.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {stats.highDangerShots}
                    </TableCell>
                    <TableCell className="text-right">
                      {stats.mediumDangerShots}
                    </TableCell>
                    <TableCell className="text-right">
                      {stats.lowDangerShots}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
