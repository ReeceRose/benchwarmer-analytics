export { PlayerHeader } from "@/components/player-detail/PlayerHeader";
export { PlayerHeaderSkeleton } from "@/components/player-detail/PlayerHeaderSkeleton";
export { SkaterStatsTable } from "@/components/player-detail/SkaterStatsTable";
export { GoalieStatsTable } from "@/components/player-detail/GoalieStatsTable";
export { StatsTableSkeleton } from "@/components/player-detail/StatsTableSkeleton";
export { PlayerShotMap } from "@/components/player-detail/PlayerShotMap";

export {
  buildSkaterSeasonRows,
  calculateSkaterTotals,
  type SkaterSeasonRow,
  type SkaterCareerTotals,
} from "@/components/player-detail/skater-stats";

export {
  buildGoalieSeasonRows,
  calculateGoalieTotals,
  type GoalieSeasonRow,
  type GoalieCareerTotals,
} from "@/components/player-detail/goalie-stats";
