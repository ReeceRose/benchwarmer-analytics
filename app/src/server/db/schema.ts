// Benchwarmer Analytics database schema.
//
// Table and column names are snake_case (with some odd spellings that raw SQL
// relies on); TS keys use the same camelCase as the API's JSON. Design
// decisions are in docs/SCHEMA_NOTES.md.
//
// Materialized views are declared with .existing(): their DDL lives as custom
// SQL in drizzle/0000_init.sql, so drizzle-kit never tries to manage them.
import { sql } from "drizzle-orm";
import type { SandboxInputs } from "@/types";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgMaterializedView,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const teams = pgTable(
  "teams",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    abbreviation: text("abbreviation").notNull().unique(),
    name: text("name").notNull(),
    division: text("division"),
    conference: text("conference"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const players = pgTable(
  "players",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    position: text("position"),
    currentTeamAbbreviation: text("current_team_abbreviation"),
    headshotUrl: text("headshot_url"),
    birthDate: date("birth_date"),
    heightInches: integer("height_inches"),
    weightLbs: integer("weight_lbs"),
    shoots: text("shoots"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ix_players_current_team_abbreviation").on(t.currentTeamAbbreviation),
    index("ix_players_name").on(t.name),
  ],
);

export const skaterSeasons = pgTable(
  "skater_seasons",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    season: integer("season").notNull(),
    team: text("team").notNull(),
    situation: text("situation").notNull(),
    isPlayoffs: boolean("is_playoffs").notNull(),
    gamesPlayed: integer("games_played").notNull(),
    iceTimeSeconds: integer("ice_time_seconds").notNull(),
    goals: integer("goals").notNull(),
    assists: integer("assists").notNull(),
    shots: integer("shots").notNull(),
    expectedGoals: numeric("expected_goals", { mode: "number" }),
    expectedGoalsPer60: numeric("expected_goals_per60", { mode: "number" }),
    onIceShootingPct: numeric("on_ice_shooting_pct", { mode: "number" }),
    onIceSavePct: numeric("on_ice_save_pct", { mode: "number" }),
    corsiForPct: numeric("corsi_for_pct", { mode: "number" }),
    fenwickForPct: numeric("fenwick_for_pct", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ix_skater_seasons_season_team").on(t.season, t.team),
    index("ix_skater_seasons_situation_season_is_playoffs").on(t.situation, t.season, t.isPlayoffs),
    uniqueIndex("ix_skater_seasons_player_id_season_team_situation_is_playoffs").on(t.playerId, t.season, t.team, t.situation, t.isPlayoffs),
  ],
);

export const skaterSeasonAdvanced = pgTable(
  "skater_season_advanced",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    season: integer("season").notNull(),
    team: text("team").notNull(),
    situation: text("situation").notNull(),
    isPlayoffs: boolean("is_playoffs").notNull(),
    onIceGoalsFor: numeric("on_ice_goals_for", { mode: "number" }),
    onIceShotsOnGoalFor: numeric("on_ice_shots_on_goal_for", { mode: "number" }),
    onIceGoalsAgainst: numeric("on_ice_goals_against", { mode: "number" }),
    onIceShotsOnGoalAgainst: numeric("on_ice_shots_on_goal_against", { mode: "number" }),
    shifts: numeric("shifts", { mode: "number" }),
    gameScore: numeric("game_score", { mode: "number" }),
    onIceXGoalsPercentage: numeric("on_ice_x_goals_percentage", { mode: "number" }),
    offIceXGoalsPercentage: numeric("off_ice_x_goals_percentage", { mode: "number" }),
    offIceCorsiPercentage: numeric("off_ice_corsi_percentage", { mode: "number" }),
    offIceFenwickPercentage: numeric("off_ice_fenwick_percentage", { mode: "number" }),
    iceTimeRank: numeric("ice_time_rank", { mode: "number" }),
    ifxOnGoal: numeric("i_f_x_on_goal", { mode: "number" }),
    ifxRebounds: numeric("i_f_x_rebounds", { mode: "number" }),
    ifxFreeze: numeric("i_f_x_freeze", { mode: "number" }),
    ifxPlayStopped: numeric("i_f_x_play_stopped", { mode: "number" }),
    ifxPlayContinuedInZone: numeric("i_f_x_play_continued_in_zone", { mode: "number" }),
    ifxPlayContinuedOutsideZone: numeric("i_f_x_play_continued_outside_zone", { mode: "number" }),
    ifFlurryAdjustedxGoals: numeric("i_f_flurry_adjustedx_goals", { mode: "number" }),
    ifScoreVenueAdjustedxGoals: numeric("i_f_score_venue_adjustedx_goals", { mode: "number" }),
    ifFlurryScoreVenueAdjustedxGoals: numeric("i_f_flurry_score_venue_adjustedx_goals", { mode: "number" }),
    ifMissedShots: numeric("i_f_missed_shots", { mode: "number" }),
    ifBlockedShotAttempts: numeric("i_f_blocked_shot_attempts", { mode: "number" }),
    ifShotAttempts: numeric("i_f_shot_attempts", { mode: "number" }),
    ifPoints: numeric("i_f_points", { mode: "number" }),
    ifRebounds: numeric("i_f_rebounds", { mode: "number" }),
    ifReboundGoals: numeric("i_f_rebound_goals", { mode: "number" }),
    ifFreeze: numeric("i_f_freeze", { mode: "number" }),
    ifPlayStopped: numeric("i_f_play_stopped", { mode: "number" }),
    ifPlayContinuedInZone: numeric("i_f_play_continued_in_zone", { mode: "number" }),
    ifPlayContinuedOutsideZone: numeric("i_f_play_continued_outside_zone", { mode: "number" }),
    ifSavedShotsOnGoal: numeric("i_f_saved_shots_on_goal", { mode: "number" }),
    ifSavedUnblockedShotAttempts: numeric("i_f_saved_unblocked_shot_attempts", { mode: "number" }),
    penalties: numeric("penalties", { mode: "number" }),
    ifPenalityMinutes: numeric("i_f_penality_minutes", { mode: "number" }),
    ifFaceOffsWon: numeric("i_f_face_offs_won", { mode: "number" }),
    ifHits: numeric("i_f_hits", { mode: "number" }),
    ifTakeaways: numeric("i_f_takeaways", { mode: "number" }),
    ifGiveaways: numeric("i_f_giveaways", { mode: "number" }),
    ifLowDangerShots: numeric("i_f_low_danger_shots", { mode: "number" }),
    ifMediumDangerShots: numeric("i_f_medium_danger_shots", { mode: "number" }),
    ifHighDangerShots: numeric("i_f_high_danger_shots", { mode: "number" }),
    ifLowDangerxGoals: numeric("i_f_low_dangerx_goals", { mode: "number" }),
    ifMediumDangerxGoals: numeric("i_f_medium_dangerx_goals", { mode: "number" }),
    ifHighDangerxGoals: numeric("i_f_high_dangerx_goals", { mode: "number" }),
    ifLowDangerGoals: numeric("i_f_low_danger_goals", { mode: "number" }),
    ifMediumDangerGoals: numeric("i_f_medium_danger_goals", { mode: "number" }),
    ifHighDangerGoals: numeric("i_f_high_danger_goals", { mode: "number" }),
    ifScoreAdjustedShotsAttempts: numeric("i_f_score_adjusted_shots_attempts", { mode: "number" }),
    ifUnblockedShotAttempts: numeric("i_f_unblocked_shot_attempts", { mode: "number" }),
    ifScoreAdjustedUnblockedShotAttempts: numeric("i_f_score_adjusted_unblocked_shot_attempts", { mode: "number" }),
    ifdZoneGiveaways: numeric("i_f_d_zone_giveaways", { mode: "number" }),
    ifxGoalsFromxReboundsOfShots: numeric("i_f_x_goals_fromx_rebounds_of_shots", { mode: "number" }),
    ifxGoalsFromActualReboundsOfShots: numeric("i_f_x_goals_from_actual_rebounds_of_shots", { mode: "number" }),
    ifReboundxGoals: numeric("i_f_reboundx_goals", { mode: "number" }),
    ifxGoalsWithEarnedRebounds: numeric("i_f_x_goals_with_earned_rebounds", { mode: "number" }),
    ifxGoalsWithEarnedReboundsScoreAdjusted: numeric("i_f_x_goals_with_earned_rebounds_score_adjusted", { mode: "number" }),
    ifxGoalsWithEarnedReboundsScoreFlurryAdjusted: numeric("i_f_x_goals_with_earned_rebounds_score_flurry_adjusted", { mode: "number" }),
    ifShifts: numeric("i_f_shifts", { mode: "number" }),
    ifoZoneShiftStarts: numeric("i_f_o_zone_shift_starts", { mode: "number" }),
    ifdZoneShiftStarts: numeric("i_f_d_zone_shift_starts", { mode: "number" }),
    ifNeutralZoneShiftStarts: numeric("i_f_neutral_zone_shift_starts", { mode: "number" }),
    ifFlyShiftStarts: numeric("i_f_fly_shift_starts", { mode: "number" }),
    ifoZoneShiftEnds: numeric("i_f_o_zone_shift_ends", { mode: "number" }),
    ifdZoneShiftEnds: numeric("i_f_d_zone_shift_ends", { mode: "number" }),
    ifNeutralZoneShiftEnds: numeric("i_f_neutral_zone_shift_ends", { mode: "number" }),
    ifFlyShiftEnds: numeric("i_f_fly_shift_ends", { mode: "number" }),
    faceoffsWon: numeric("faceoffs_won", { mode: "number" }),
    faceoffsLost: numeric("faceoffs_lost", { mode: "number" }),
    timeOnBench: numeric("time_on_bench", { mode: "number" }),
    penalityMinutes: numeric("penality_minutes", { mode: "number" }),
    penalityMinutesDrawn: numeric("penality_minutes_drawn", { mode: "number" }),
    penaltiesDrawn: numeric("penalties_drawn", { mode: "number" }),
    shotsBlockedByPlayer: numeric("shots_blocked_by_player", { mode: "number" }),
    onIceFXOnGoal: numeric("on_ice_f_x_on_goal", { mode: "number" }),
    onIceFXGoals: numeric("on_ice_f_x_goals", { mode: "number" }),
    onIceFFlurryAdjustedxGoals: numeric("on_ice_f_flurry_adjustedx_goals", { mode: "number" }),
    onIceFScoreVenueAdjustedxGoals: numeric("on_ice_f_score_venue_adjustedx_goals", { mode: "number" }),
    onIceFFlurryScoreVenueAdjustedxGoals: numeric("on_ice_f_flurry_score_venue_adjustedx_goals", { mode: "number" }),
    onIceFMissedShots: numeric("on_ice_f_missed_shots", { mode: "number" }),
    onIceFBlockedShotAttempts: numeric("on_ice_f_blocked_shot_attempts", { mode: "number" }),
    onIceFShotAttempts: numeric("on_ice_f_shot_attempts", { mode: "number" }),
    onIceFRebounds: numeric("on_ice_f_rebounds", { mode: "number" }),
    onIceFReboundGoals: numeric("on_ice_f_rebound_goals", { mode: "number" }),
    onIceFLowDangerShots: numeric("on_ice_f_low_danger_shots", { mode: "number" }),
    onIceFMediumDangerShots: numeric("on_ice_f_medium_danger_shots", { mode: "number" }),
    onIceFHighDangerShots: numeric("on_ice_f_high_danger_shots", { mode: "number" }),
    onIceFLowDangerxGoals: numeric("on_ice_f_low_dangerx_goals", { mode: "number" }),
    onIceFMediumDangerxGoals: numeric("on_ice_f_medium_dangerx_goals", { mode: "number" }),
    onIceFHighDangerxGoals: numeric("on_ice_f_high_dangerx_goals", { mode: "number" }),
    onIceFLowDangerGoals: numeric("on_ice_f_low_danger_goals", { mode: "number" }),
    onIceFMediumDangerGoals: numeric("on_ice_f_medium_danger_goals", { mode: "number" }),
    onIceFHighDangerGoals: numeric("on_ice_f_high_danger_goals", { mode: "number" }),
    onIceFScoreAdjustedShotsAttempts: numeric("on_ice_f_score_adjusted_shots_attempts", { mode: "number" }),
    onIceFUnblockedShotAttempts: numeric("on_ice_f_unblocked_shot_attempts", { mode: "number" }),
    onIceFScoreAdjustedUnblockedShotAttempts: numeric("on_ice_f_score_adjusted_unblocked_shot_attempts", { mode: "number" }),
    onIceFXGoalsFromxReboundsOfShots: numeric("on_ice_f_x_goals_fromx_rebounds_of_shots", { mode: "number" }),
    onIceFXGoalsFromActualReboundsOfShots: numeric("on_ice_f_x_goals_from_actual_rebounds_of_shots", { mode: "number" }),
    onIceFReboundxGoals: numeric("on_ice_f_reboundx_goals", { mode: "number" }),
    onIceFXGoalsWithEarnedRebounds: numeric("on_ice_f_x_goals_with_earned_rebounds", { mode: "number" }),
    onIceFXGoalsWithEarnedReboundsScoreAdjusted: numeric("on_ice_f_x_goals_with_earned_rebounds_score_adjusted", { mode: "number" }),
    onIceFXGoalsWithEarnedReboundsScoreFlurryAdjusted: numeric("on_ice_f_x_goals_with_earned_rebounds_score_flurry_adjusted", { mode: "number" }),
    onIceAXOnGoal: numeric("on_ice_a_x_on_goal", { mode: "number" }),
    onIceAXGoals: numeric("on_ice_a_x_goals", { mode: "number" }),
    onIceAFlurryAdjustedxGoals: numeric("on_ice_a_flurry_adjustedx_goals", { mode: "number" }),
    onIceAScoreVenueAdjustedxGoals: numeric("on_ice_a_score_venue_adjustedx_goals", { mode: "number" }),
    onIceAFlurryScoreVenueAdjustedxGoals: numeric("on_ice_a_flurry_score_venue_adjustedx_goals", { mode: "number" }),
    onIceAMissedShots: numeric("on_ice_a_missed_shots", { mode: "number" }),
    onIceABlockedShotAttempts: numeric("on_ice_a_blocked_shot_attempts", { mode: "number" }),
    onIceAShotAttempts: numeric("on_ice_a_shot_attempts", { mode: "number" }),
    onIceARebounds: numeric("on_ice_a_rebounds", { mode: "number" }),
    onIceAReboundGoals: numeric("on_ice_a_rebound_goals", { mode: "number" }),
    onIceALowDangerShots: numeric("on_ice_a_low_danger_shots", { mode: "number" }),
    onIceAMediumDangerShots: numeric("on_ice_a_medium_danger_shots", { mode: "number" }),
    onIceAHighDangerShots: numeric("on_ice_a_high_danger_shots", { mode: "number" }),
    onIceALowDangerxGoals: numeric("on_ice_a_low_dangerx_goals", { mode: "number" }),
    onIceAMediumDangerxGoals: numeric("on_ice_a_medium_dangerx_goals", { mode: "number" }),
    onIceAHighDangerxGoals: numeric("on_ice_a_high_dangerx_goals", { mode: "number" }),
    onIceALowDangerGoals: numeric("on_ice_a_low_danger_goals", { mode: "number" }),
    onIceAMediumDangerGoals: numeric("on_ice_a_medium_danger_goals", { mode: "number" }),
    onIceAHighDangerGoals: numeric("on_ice_a_high_danger_goals", { mode: "number" }),
    onIceAScoreAdjustedShotsAttempts: numeric("on_ice_a_score_adjusted_shots_attempts", { mode: "number" }),
    onIceAUnblockedShotAttempts: numeric("on_ice_a_unblocked_shot_attempts", { mode: "number" }),
    onIceAScoreAdjustedUnblockedShotAttempts: numeric("on_ice_a_score_adjusted_unblocked_shot_attempts", { mode: "number" }),
    onIceAXGoalsFromxReboundsOfShots: numeric("on_ice_a_x_goals_fromx_rebounds_of_shots", { mode: "number" }),
    onIceAXGoalsFromActualReboundsOfShots: numeric("on_ice_a_x_goals_from_actual_rebounds_of_shots", { mode: "number" }),
    onIceAReboundxGoals: numeric("on_ice_a_reboundx_goals", { mode: "number" }),
    onIceAXGoalsWithEarnedRebounds: numeric("on_ice_a_x_goals_with_earned_rebounds", { mode: "number" }),
    onIceAXGoalsWithEarnedReboundsScoreAdjusted: numeric("on_ice_a_x_goals_with_earned_rebounds_score_adjusted", { mode: "number" }),
    onIceAXGoalsWithEarnedReboundsScoreFlurryAdjusted: numeric("on_ice_a_x_goals_with_earned_rebounds_score_flurry_adjusted", { mode: "number" }),
    offIceFXGoals: numeric("off_ice_f_x_goals", { mode: "number" }),
    offIceAXGoals: numeric("off_ice_a_x_goals", { mode: "number" }),
    offIceFShotAttempts: numeric("off_ice_f_shot_attempts", { mode: "number" }),
    offIceAShotAttempts: numeric("off_ice_a_shot_attempts", { mode: "number" }),
    xGoalsForAfterShifts: numeric("x_goals_for_after_shifts", { mode: "number" }),
    xGoalsAgainstAfterShifts: numeric("x_goals_against_after_shifts", { mode: "number" }),
    corsiForAfterShifts: numeric("corsi_for_after_shifts", { mode: "number" }),
    corsiAgainstAfterShifts: numeric("corsi_against_after_shifts", { mode: "number" }),
    fenwickForAfterShifts: numeric("fenwick_for_after_shifts", { mode: "number" }),
    fenwickAgainstAfterShifts: numeric("fenwick_against_after_shifts", { mode: "number" }),
  },
  (t) => [
    index("ix_skater_season_advanced_season_team").on(t.season, t.team),
    uniqueIndex("ix_skater_season_advanced_unique").on(t.playerId, t.season, t.team, t.situation, t.isPlayoffs),
  ],
);

export const goalieSeasons = pgTable(
  "goalie_seasons",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    season: integer("season").notNull(),
    team: text("team").notNull(),
    situation: text("situation").notNull(),
    isPlayoffs: boolean("is_playoffs").notNull(),
    gamesPlayed: integer("games_played").notNull(),
    iceTimeSeconds: integer("ice_time_seconds").notNull(),
    goalsAgainst: integer("goals_against").notNull(),
    shotsAgainst: integer("shots_against").notNull(),
    expectedGoalsAgainst: numeric("expected_goals_against", { mode: "number" }),
    savePercentage: numeric("save_percentage", { mode: "number" }),
    goalsAgainstAverage: numeric("goals_against_average", { mode: "number" }),
    goalsSavedAboveExpected: numeric("goals_saved_above_expected", { mode: "number" }),
    lowDangerShots: integer("low_danger_shots").notNull(),
    mediumDangerShots: integer("medium_danger_shots").notNull(),
    highDangerShots: integer("high_danger_shots").notNull(),
    lowDangerGoals: integer("low_danger_goals").notNull(),
    mediumDangerGoals: integer("medium_danger_goals").notNull(),
    highDangerGoals: integer("high_danger_goals").notNull(),
    expectedRebounds: numeric("expected_rebounds", { mode: "number" }),
    rebounds: integer("rebounds").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ix_goalie_seasons_season_team").on(t.season, t.team),
    index("ix_goalie_seasons_situation_season_is_playoffs").on(t.situation, t.season, t.isPlayoffs),
    uniqueIndex("ix_goalie_seasons_player_id_season_team_situation_is_playoffs").on(t.playerId, t.season, t.team, t.situation, t.isPlayoffs),
  ],
);

// Team stat columns shared by team_seasons and team_games (same MoneyPuck
// fields, season totals vs one game).
function teamStatColumns() {
  return {
    iceTime: numeric("ice_time", { mode: "number" }).notNull(),
    xGoalsPercentage: numeric("x_goals_percentage", { mode: "number" }),
    corsiPercentage: numeric("corsi_percentage", { mode: "number" }),
    fenwickPercentage: numeric("fenwick_percentage", { mode: "number" }),
    xOnGoalFor: numeric("x_on_goal_for", { mode: "number" }).notNull(),
    xGoalsFor: numeric("x_goals_for", { mode: "number" }).notNull(),
    xReboundsFor: numeric("x_rebounds_for", { mode: "number" }).notNull(),
    xFreezeFor: numeric("x_freeze_for", { mode: "number" }).notNull(),
    xPlayStoppedFor: numeric("x_play_stopped_for", { mode: "number" }).notNull(),
    xPlayContinuedInZoneFor: numeric("x_play_continued_in_zone_for", { mode: "number" }).notNull(),
    xPlayContinuedOutsideZoneFor: numeric("x_play_continued_outside_zone_for", { mode: "number" }).notNull(),
    flurryAdjustedXGoalsFor: numeric("flurry_adjusted_x_goals_for", { mode: "number" }).notNull(),
    scoreVenueAdjustedXGoalsFor: numeric("score_venue_adjusted_x_goals_for", { mode: "number" }).notNull(),
    flurryScoreVenueAdjustedXGoalsFor: numeric("flurry_score_venue_adjusted_x_goals_for", { mode: "number" }).notNull(),
    shotsOnGoalFor: integer("shots_on_goal_for").notNull(),
    missedShotsFor: integer("missed_shots_for").notNull(),
    blockedShotAttemptsFor: integer("blocked_shot_attempts_for").notNull(),
    shotAttemptsFor: integer("shot_attempts_for").notNull(),
    goalsFor: integer("goals_for").notNull(),
    reboundsFor: integer("rebounds_for").notNull(),
    reboundGoalsFor: integer("rebound_goals_for").notNull(),
    freezeFor: integer("freeze_for").notNull(),
    playStoppedFor: integer("play_stopped_for").notNull(),
    playContinuedInZoneFor: integer("play_continued_in_zone_for").notNull(),
    playContinuedOutsideZoneFor: integer("play_continued_outside_zone_for").notNull(),
    savedShotsOnGoalFor: integer("saved_shots_on_goal_for").notNull(),
    savedUnblockedShotAttemptsFor: integer("saved_unblocked_shot_attempts_for").notNull(),
    penaltiesFor: integer("penalties_for").notNull(),
    penaltyMinutesFor: integer("penalty_minutes_for").notNull(),
    faceOffsWonFor: integer("face_offs_won_for").notNull(),
    hitsFor: integer("hits_for").notNull(),
    takeawaysFor: integer("takeaways_for").notNull(),
    giveawaysFor: integer("giveaways_for").notNull(),
    lowDangerShotsFor: integer("low_danger_shots_for").notNull(),
    mediumDangerShotsFor: integer("medium_danger_shots_for").notNull(),
    highDangerShotsFor: integer("high_danger_shots_for").notNull(),
    lowDangerXGoalsFor: numeric("low_danger_x_goals_for", { mode: "number" }).notNull(),
    mediumDangerXGoalsFor: numeric("medium_danger_x_goals_for", { mode: "number" }).notNull(),
    highDangerXGoalsFor: numeric("high_danger_x_goals_for", { mode: "number" }).notNull(),
    lowDangerGoalsFor: integer("low_danger_goals_for").notNull(),
    mediumDangerGoalsFor: integer("medium_danger_goals_for").notNull(),
    highDangerGoalsFor: integer("high_danger_goals_for").notNull(),
    scoreAdjustedShotAttemptsFor: numeric("score_adjusted_shot_attempts_for", { mode: "number" }).notNull(),
    unblockedShotAttemptsFor: numeric("unblocked_shot_attempts_for", { mode: "number" }).notNull(),
    scoreAdjustedUnblockedShotAttemptsFor: numeric("score_adjusted_unblocked_shot_attempts_for", { mode: "number" }).notNull(),
    dZoneGiveawaysFor: integer("d_zone_giveaways_for").notNull(),
    xGoalsFromXReboundsOfShotsFor: numeric("x_goals_from_x_rebounds_of_shots_for", { mode: "number" }).notNull(),
    xGoalsFromActualReboundsOfShotsFor: numeric("x_goals_from_actual_rebounds_of_shots_for", { mode: "number" }).notNull(),
    reboundXGoalsFor: numeric("rebound_x_goals_for", { mode: "number" }).notNull(),
    totalShotCreditFor: numeric("total_shot_credit_for", { mode: "number" }).notNull(),
    scoreAdjustedTotalShotCreditFor: numeric("score_adjusted_total_shot_credit_for", { mode: "number" }).notNull(),
    scoreFlurryAdjustedTotalShotCreditFor: numeric("score_flurry_adjusted_total_shot_credit_for", { mode: "number" }).notNull(),
    xOnGoalAgainst: numeric("x_on_goal_against", { mode: "number" }).notNull(),
    xGoalsAgainst: numeric("x_goals_against", { mode: "number" }).notNull(),
    xReboundsAgainst: numeric("x_rebounds_against", { mode: "number" }).notNull(),
    xFreezeAgainst: numeric("x_freeze_against", { mode: "number" }).notNull(),
    xPlayStoppedAgainst: numeric("x_play_stopped_against", { mode: "number" }).notNull(),
    xPlayContinuedInZoneAgainst: numeric("x_play_continued_in_zone_against", { mode: "number" }).notNull(),
    xPlayContinuedOutsideZoneAgainst: numeric("x_play_continued_outside_zone_against", { mode: "number" }).notNull(),
    flurryAdjustedXGoalsAgainst: numeric("flurry_adjusted_x_goals_against", { mode: "number" }).notNull(),
    scoreVenueAdjustedXGoalsAgainst: numeric("score_venue_adjusted_x_goals_against", { mode: "number" }).notNull(),
    flurryScoreVenueAdjustedXGoalsAgainst: numeric("flurry_score_venue_adjusted_x_goals_against", { mode: "number" }).notNull(),
    shotsOnGoalAgainst: integer("shots_on_goal_against").notNull(),
    missedShotsAgainst: integer("missed_shots_against").notNull(),
    blockedShotAttemptsAgainst: integer("blocked_shot_attempts_against").notNull(),
    shotAttemptsAgainst: integer("shot_attempts_against").notNull(),
    goalsAgainst: integer("goals_against").notNull(),
    reboundsAgainst: integer("rebounds_against").notNull(),
    reboundGoalsAgainst: integer("rebound_goals_against").notNull(),
    freezeAgainst: integer("freeze_against").notNull(),
    playStoppedAgainst: integer("play_stopped_against").notNull(),
    playContinuedInZoneAgainst: integer("play_continued_in_zone_against").notNull(),
    playContinuedOutsideZoneAgainst: integer("play_continued_outside_zone_against").notNull(),
    savedShotsOnGoalAgainst: integer("saved_shots_on_goal_against").notNull(),
    savedUnblockedShotAttemptsAgainst: integer("saved_unblocked_shot_attempts_against").notNull(),
    penaltiesAgainst: integer("penalties_against").notNull(),
    penaltyMinutesAgainst: integer("penalty_minutes_against").notNull(),
    faceOffsWonAgainst: integer("face_offs_won_against").notNull(),
    hitsAgainst: integer("hits_against").notNull(),
    takeawaysAgainst: integer("takeaways_against").notNull(),
    giveawaysAgainst: integer("giveaways_against").notNull(),
    lowDangerShotsAgainst: integer("low_danger_shots_against").notNull(),
    mediumDangerShotsAgainst: integer("medium_danger_shots_against").notNull(),
    highDangerShotsAgainst: integer("high_danger_shots_against").notNull(),
    lowDangerXGoalsAgainst: numeric("low_danger_x_goals_against", { mode: "number" }).notNull(),
    mediumDangerXGoalsAgainst: numeric("medium_danger_x_goals_against", { mode: "number" }).notNull(),
    highDangerXGoalsAgainst: numeric("high_danger_x_goals_against", { mode: "number" }).notNull(),
    lowDangerGoalsAgainst: integer("low_danger_goals_against").notNull(),
    mediumDangerGoalsAgainst: integer("medium_danger_goals_against").notNull(),
    highDangerGoalsAgainst: integer("high_danger_goals_against").notNull(),
    scoreAdjustedShotAttemptsAgainst: numeric("score_adjusted_shot_attempts_against", { mode: "number" }).notNull(),
    unblockedShotAttemptsAgainst: numeric("unblocked_shot_attempts_against", { mode: "number" }).notNull(),
    scoreAdjustedUnblockedShotAttemptsAgainst: numeric("score_adjusted_unblocked_shot_attempts_against", { mode: "number" }).notNull(),
    dZoneGiveawaysAgainst: integer("d_zone_giveaways_against").notNull(),
    xGoalsFromXReboundsOfShotsAgainst: numeric("x_goals_from_x_rebounds_of_shots_against", { mode: "number" }).notNull(),
    xGoalsFromActualReboundsOfShotsAgainst: numeric("x_goals_from_actual_rebounds_of_shots_against", { mode: "number" }).notNull(),
    reboundXGoalsAgainst: numeric("rebound_x_goals_against", { mode: "number" }).notNull(),
    totalShotCreditAgainst: numeric("total_shot_credit_against", { mode: "number" }).notNull(),
    scoreAdjustedTotalShotCreditAgainst: numeric("score_adjusted_total_shot_credit_against", { mode: "number" }).notNull(),
    scoreFlurryAdjustedTotalShotCreditAgainst: numeric("score_flurry_adjusted_total_shot_credit_against", { mode: "number" }).notNull(),
  };
}

export const teamSeasons = pgTable(
  "team_seasons",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    teamAbbreviation: text("team_abbreviation").notNull().references(() => teams.abbreviation, { onDelete: "cascade" }),
    season: integer("season").notNull(),
    situation: text("situation").notNull(),
    isPlayoffs: boolean("is_playoffs").notNull(),
    gamesPlayed: integer("games_played").notNull(),
    ...teamStatColumns(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ix_team_seasons_season").on(t.season),
    uniqueIndex("ix_team_seasons_team_abbreviation_season_situation_is_playoffs").on(t.teamAbbreviation, t.season, t.situation, t.isPlayoffs),
  ],
);

export const teamGames = pgTable(
  "team_games",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    gameId: text("game_id").notNull(),
    season: integer("season").notNull(),
    gameDate: date("game_date").notNull(),
    teamAbbreviation: text("team_abbreviation").notNull().references(() => teams.abbreviation, { onDelete: "cascade" }),
    opponentAbbreviation: text("opponent_abbreviation").notNull(),
    isHome: boolean("is_home").notNull(),
    isPlayoffs: boolean("is_playoffs").notNull(),
    situation: text("situation").notNull(),
    ...teamStatColumns(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ix_team_games_game_id_team_abbreviation_situation").on(t.gameId, t.teamAbbreviation, t.situation),
    index("ix_team_games_team_abbreviation_season_situation").on(t.teamAbbreviation, t.season, t.situation),
    index("ix_team_games_season").on(t.season),
  ],
);

export const lineCombinations = pgTable(
  "line_combinations",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    season: integer("season").notNull(),
    team: text("team").notNull(),
    situation: text("situation").notNull(),
    player1Id: integer("player1_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    player2Id: integer("player2_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    player3Id: integer("player3_id").references(() => players.id),
    iceTimeSeconds: integer("ice_time_seconds").notNull(),
    gamesPlayed: integer("games_played").notNull(),
    goalsFor: integer("goals_for").notNull(),
    goalsAgainst: integer("goals_against").notNull(),
    expectedGoalsFor: numeric("expected_goals_for", { mode: "number" }),
    expectedGoalsAgainst: numeric("expected_goals_against", { mode: "number" }),
    expectedGoalsPct: numeric("expected_goals_pct", { mode: "number" }),
    corsiFor: integer("corsi_for").notNull(),
    corsiAgainst: integer("corsi_against").notNull(),
    corsiPct: numeric("corsi_pct", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ix_line_combinations_player1_id").on(t.player1Id),
    index("ix_line_combinations_player2_id").on(t.player2Id),
    index("ix_line_combinations_player3_id").on(t.player3Id),
    // player3_id is NULL for defense pairs, so NULLs must compare equal for
    // ON CONFLICT upserts to match them.
    unique("ix_line_combinations_unique")
      .on(t.season, t.team, t.situation, t.player1Id, t.player2Id, t.player3Id)
      .nullsNotDistinct(),
  ],
);

export const shots = pgTable(
  "shots",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    shotId: text("shot_id").notNull(),
    gameId: text("game_id").notNull(),
    eventId: integer("event_id").notNull(),
    season: integer("season").notNull(),
    isPlayoffGame: boolean("is_playoff_game").notNull(),
    homeTeamCode: text("home_team_code").notNull(),
    awayTeamCode: text("away_team_code").notNull(),
    team: text("team").notNull(),
    teamCode: text("team_code").notNull(),
    isHomeTeam: boolean("is_home_team").notNull(),
    homeTeamWon: boolean("home_team_won").notNull(),
    shooterPlayerId: integer("shooter_player_id"),
    shooterName: text("shooter_name"),
    shooterLeftRight: text("shooter_left_right"),
    shooterPosition: text("shooter_position"),
    shooterJerseyNumber: integer("shooter_jersey_number"),
    goaliePlayerId: integer("goalie_player_id"),
    goalieName: text("goalie_name"),
    lastEventPlayerNumber: integer("last_event_player_number"),
    event: text("event").notNull(),
    isGoal: boolean("is_goal").notNull(),
    shotType: text("shot_type"),
    period: integer("period").notNull(),
    gameTimeSeconds: integer("game_time_seconds").notNull(),
    timeLeft: integer("time_left"),
    xCoord: numeric("x_coord", { mode: "number" }),
    yCoord: numeric("y_coord", { mode: "number" }),
    location: text("location"),
    xCoordAdjusted: numeric("x_coord_adjusted", { mode: "number" }),
    yCoordAdjusted: numeric("y_coord_adjusted", { mode: "number" }),
    arenaAdjustedXCoord: numeric("arena_adjusted_x_coord", { mode: "number" }),
    arenaAdjustedYCoord: numeric("arena_adjusted_y_coord", { mode: "number" }),
    arenaAdjustedXCoordAbs: numeric("arena_adjusted_x_coord_abs", { mode: "number" }),
    arenaAdjustedYCoordAbs: numeric("arena_adjusted_y_coord_abs", { mode: "number" }),
    shotDistance: numeric("shot_distance", { mode: "number" }),
    shotAngle: numeric("shot_angle", { mode: "number" }),
    shotAngleAdjusted: numeric("shot_angle_adjusted", { mode: "number" }),
    arenaAdjustedShotDistance: numeric("arena_adjusted_shot_distance", { mode: "number" }),
    shotOnEmptyNet: boolean("shot_on_empty_net").notNull(),
    shotRebound: boolean("shot_rebound").notNull(),
    shotRush: boolean("shot_rush").notNull(),
    offWing: boolean("off_wing").notNull(),
    shotWasOnGoal: boolean("shot_was_on_goal").notNull(),
    shotPlayContinued: boolean("shot_play_continued").notNull(),
    shotPlayContinuedInZone: boolean("shot_play_continued_in_zone").notNull(),
    shotPlayContinuedOutsideZone: boolean("shot_play_continued_outside_zone").notNull(),
    shotGoalieFroze: boolean("shot_goalie_froze").notNull(),
    shotPlayStopped: boolean("shot_play_stopped").notNull(),
    shotGeneratedRebound: boolean("shot_generated_rebound").notNull(),
    timeUntilNextEvent: numeric("time_until_next_event", { mode: "number" }),
    timeSinceLastEvent: numeric("time_since_last_event", { mode: "number" }),
    timeBetweenEvents: numeric("time_between_events", { mode: "number" }),
    timeSinceFaceoff: numeric("time_since_faceoff", { mode: "number" }),
    shooterTimeOnIce: numeric("shooter_time_on_ice", { mode: "number" }),
    shooterTimeOnIceSinceFaceoff: numeric("shooter_time_on_ice_since_faceoff", { mode: "number" }),
    timeDifferenceSinceChange: numeric("time_difference_since_change", { mode: "number" }),
    homeTeamGoals: integer("home_team_goals").notNull(),
    awayTeamGoals: integer("away_team_goals").notNull(),
    homeTeamScore: integer("home_team_score"),
    roadTeamScore: integer("road_team_score"),
    homeEmptyNet: boolean("home_empty_net").notNull(),
    awayEmptyNet: boolean("away_empty_net").notNull(),
    gameOver: boolean("game_over"),
    wentToOT: boolean("went_to_o_t"),
    wentToShootout: boolean("went_to_shootout"),
    homeWinProbability: numeric("home_win_probability", { mode: "number" }),
    homeSkatersOnIce: integer("home_skaters_on_ice").notNull(),
    awaySkatersOnIce: integer("away_skaters_on_ice").notNull(),
    shootingTeamForwardsOnIce: integer("shooting_team_forwards_on_ice").notNull(),
    shootingTeamDefencemenOnIce: integer("shooting_team_defencemen_on_ice").notNull(),
    defendingTeamForwardsOnIce: integer("defending_team_forwards_on_ice").notNull(),
    defendingTeamDefencemenOnIce: integer("defending_team_defencemen_on_ice").notNull(),
    shootingTeamAverageTimeOnIce: numeric("shooting_team_average_time_on_ice", { mode: "number" }),
    shootingTeamMaxTimeOnIce: numeric("shooting_team_max_time_on_ice", { mode: "number" }),
    shootingTeamMinTimeOnIce: numeric("shooting_team_min_time_on_ice", { mode: "number" }),
    shootingTeamAverageTimeOnIceOfForwards: numeric("shooting_team_average_time_on_ice_of_forwards", { mode: "number" }),
    shootingTeamMaxTimeOnIceOfForwards: numeric("shooting_team_max_time_on_ice_of_forwards", { mode: "number" }),
    shootingTeamMinTimeOnIceOfForwards: numeric("shooting_team_min_time_on_ice_of_forwards", { mode: "number" }),
    shootingTeamAverageTimeOnIceOfDefencemen: numeric("shooting_team_average_time_on_ice_of_defencemen", { mode: "number" }),
    shootingTeamMaxTimeOnIceOfDefencemen: numeric("shooting_team_max_time_on_ice_of_defencemen", { mode: "number" }),
    shootingTeamMinTimeOnIceOfDefencemen: numeric("shooting_team_min_time_on_ice_of_defencemen", { mode: "number" }),
    shootingTeamAverageTimeOnIceSinceFaceoff: numeric("shooting_team_average_time_on_ice_since_faceoff", { mode: "number" }),
    shootingTeamMaxTimeOnIceSinceFaceoff: numeric("shooting_team_max_time_on_ice_since_faceoff", { mode: "number" }),
    shootingTeamMinTimeOnIceSinceFaceoff: numeric("shooting_team_min_time_on_ice_since_faceoff", { mode: "number" }),
    shootingTeamAverageTimeOnIceSinceFaceoffOfForwards: numeric("shooting_team_average_time_on_ice_since_faceoff_of_forwards", { mode: "number" }),
    shootingTeamMaxTimeOnIceSinceFaceoffOfForwards: numeric("shooting_team_max_time_on_ice_since_faceoff_of_forwards", { mode: "number" }),
    shootingTeamMinTimeOnIceSinceFaceoffOfForwards: numeric("shooting_team_min_time_on_ice_since_faceoff_of_forwards", { mode: "number" }),
    shootingTeamAverageTimeOnIceSinceFaceoffOfDefencemen: numeric("shooting_team_average_time_on_ice_since_faceoff_of_defencemen", { mode: "number" }),
    shootingTeamMaxTimeOnIceSinceFaceoffOfDefencemen: numeric("shooting_team_max_time_on_ice_since_faceoff_of_defencemen", { mode: "number" }),
    shootingTeamMinTimeOnIceSinceFaceoffOfDefencemen: numeric("shooting_team_min_time_on_ice_since_faceoff_of_defencemen", { mode: "number" }),
    defendingTeamAverageTimeOnIce: numeric("defending_team_average_time_on_ice", { mode: "number" }),
    defendingTeamMaxTimeOnIce: numeric("defending_team_max_time_on_ice", { mode: "number" }),
    defendingTeamMinTimeOnIce: numeric("defending_team_min_time_on_ice", { mode: "number" }),
    defendingTeamAverageTimeOnIceOfForwards: numeric("defending_team_average_time_on_ice_of_forwards", { mode: "number" }),
    defendingTeamMaxTimeOnIceOfForwards: numeric("defending_team_max_time_on_ice_of_forwards", { mode: "number" }),
    defendingTeamMinTimeOnIceOfForwards: numeric("defending_team_min_time_on_ice_of_forwards", { mode: "number" }),
    defendingTeamAverageTimeOnIceOfDefencemen: numeric("defending_team_average_time_on_ice_of_defencemen", { mode: "number" }),
    defendingTeamMaxTimeOnIceOfDefencemen: numeric("defending_team_max_time_on_ice_of_defencemen", { mode: "number" }),
    defendingTeamMinTimeOnIceOfDefencemen: numeric("defending_team_min_time_on_ice_of_defencemen", { mode: "number" }),
    defendingTeamAverageTimeOnIceSinceFaceoff: numeric("defending_team_average_time_on_ice_since_faceoff", { mode: "number" }),
    defendingTeamMaxTimeOnIceSinceFaceoff: numeric("defending_team_max_time_on_ice_since_faceoff", { mode: "number" }),
    defendingTeamMinTimeOnIceSinceFaceoff: numeric("defending_team_min_time_on_ice_since_faceoff", { mode: "number" }),
    defendingTeamAverageTimeOnIceSinceFaceoffOfForwards: numeric("defending_team_average_time_on_ice_since_faceoff_of_forwards", { mode: "number" }),
    defendingTeamMaxTimeOnIceSinceFaceoffOfForwards: numeric("defending_team_max_time_on_ice_since_faceoff_of_forwards", { mode: "number" }),
    defendingTeamMinTimeOnIceSinceFaceoffOfForwards: numeric("defending_team_min_time_on_ice_since_faceoff_of_forwards", { mode: "number" }),
    defendingTeamAverageTimeOnIceSinceFaceoffOfDefencemen: numeric("defending_team_average_time_on_ice_since_faceoff_of_defencemen", { mode: "number" }),
    defendingTeamMaxTimeOnIceSinceFaceoffOfDefencemen: numeric("defending_team_max_time_on_ice_since_faceoff_of_defencemen", { mode: "number" }),
    defendingTeamMinTimeOnIceSinceFaceoffOfDefencemen: numeric("defending_team_min_time_on_ice_since_faceoff_of_defencemen", { mode: "number" }),
    awayPenalty1TimeLeft: numeric("away_penalty1_time_left", { mode: "number" }),
    awayPenalty1Length: numeric("away_penalty1_length", { mode: "number" }),
    homePenalty1TimeLeft: numeric("home_penalty1_time_left", { mode: "number" }),
    homePenalty1Length: numeric("home_penalty1_length", { mode: "number" }),
    penaltyLength: numeric("penalty_length", { mode: "number" }),
    lastEventXCoord: numeric("last_event_x_coord", { mode: "number" }),
    lastEventYCoord: numeric("last_event_y_coord", { mode: "number" }),
    lastEventXCoordAdjusted: numeric("last_event_x_coord_adjusted", { mode: "number" }),
    lastEventYCoordAdjusted: numeric("last_event_y_coord_adjusted", { mode: "number" }),
    lastEventShotAngle: numeric("last_event_shot_angle", { mode: "number" }),
    lastEventShotDistance: numeric("last_event_shot_distance", { mode: "number" }),
    lastEventCategory: text("last_event_category"),
    lastEventTeam: text("last_event_team"),
    distanceFromLastEvent: numeric("distance_from_last_event", { mode: "number" }),
    speedFromLastEvent: numeric("speed_from_last_event", { mode: "number" }),
    averageRestDifference: numeric("average_rest_difference", { mode: "number" }),
    xGoal: numeric("x_goal", { mode: "number" }),
    xFroze: numeric("x_froze", { mode: "number" }),
    xRebound: numeric("x_rebound", { mode: "number" }),
    xPlayContinuedInZone: numeric("x_play_continued_in_zone", { mode: "number" }),
    xPlayContinuedOutsideZone: numeric("x_play_continued_outside_zone", { mode: "number" }),
    xPlayStopped: numeric("x_play_stopped", { mode: "number" }),
    xShotWasOnGoal: numeric("x_shot_was_on_goal", { mode: "number" }),
    shotGoalProbability: numeric("shot_goal_probability", { mode: "number" }),
    shotAnglePlusRebound: numeric("shot_angle_plus_rebound", { mode: "number" }),
    shotAnglePlusReboundSpeed: numeric("shot_angle_plus_rebound_speed", { mode: "number" }),
    shotAngleReboundRoyalRoad: boolean("shot_angle_rebound_royal_road").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Natural key: the NHL event within its game (game_id encodes the season).
    // MoneyPuck shotID is not usable: it restarts every season since 2018 and is
    // renumbered mid-season, and 2008 has events duplicated under new shotIDs.
    uniqueIndex("ix_shots_game_id_event_id").on(t.gameId, t.eventId),
    index("ix_shots_goalie_player_id_season").on(t.goaliePlayerId, t.season),
    index("ix_shots_season_is_goal").on(t.season, t.isGoal),
    index("ix_shots_season_team_code").on(t.season, t.teamCode),
    index("ix_shots_shooter_player_id_season").on(t.shooterPlayerId, t.season),
  ],
);

export const games = pgTable(
  "games",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    gameId: text("game_id").notNull(),
    season: integer("season").notNull(),
    gameType: integer("game_type").notNull(),
    gameDate: date("game_date").notNull(),
    startTimeUtc: timestamp("start_time_utc", { withTimezone: true }),
    homeTeamCode: text("home_team_code").notNull(),
    awayTeamCode: text("away_team_code").notNull(),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    gameState: text("game_state").notNull(),
    periodType: text("period_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ix_games_game_id").on(t.gameId),
    index("ix_games_season").on(t.season),
    index("ix_games_game_date_game_state").on(t.gameDate, t.gameState),
  ],
);

// One row per skater per final game: Game Score and the stats behind it,
// computed from NHL play-by-play and shift charts (server/api/game-score.ts).
// player_id has no FK: call-ups can play before their bio is imported.
export const skaterGames = pgTable(
  "skater_games",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    gameId: text("game_id").notNull(),
    season: integer("season").notNull(),
    gameDate: date("game_date").notNull(),
    isPlayoffs: boolean("is_playoffs").notNull(),
    playerId: integer("player_id").notNull(),
    name: text("name").notNull(),
    position: text("position").notNull(),
    team: text("team").notNull(),
    opponent: text("opponent").notNull(),
    isHome: boolean("is_home").notNull(),
    toiSeconds: integer("toi_seconds").notNull(),
    goals: integer("goals").notNull(),
    primaryAssists: integer("primary_assists").notNull(),
    secondaryAssists: integer("secondary_assists").notNull(),
    shotsOnGoal: integer("shots_on_goal").notNull(),
    blocks: integer("blocks").notNull(),
    penaltiesDrawn: integer("penalties_drawn").notNull(),
    penaltiesTaken: integer("penalties_taken").notNull(),
    faceoffWins: integer("faceoff_wins").notNull(),
    faceoffLosses: integer("faceoff_losses").notNull(),
    onIceAttemptsFor5v5: integer("on_ice_attempts_for_5v5").notNull(),
    onIceAttemptsAgainst5v5: integer("on_ice_attempts_against_5v5").notNull(),
    onIceGoalsFor5v5: integer("on_ice_goals_for_5v5").notNull(),
    onIceGoalsAgainst5v5: integer("on_ice_goals_against_5v5").notNull(),
    gameScore: numeric("game_score", { mode: "number" }).notNull(),
    gameScoreScoring: numeric("game_score_scoring", { mode: "number" }).notNull(),
    gameScoreOnIce: numeric("game_score_on_ice", { mode: "number" }).notNull(),
    gameScoreOther: numeric("game_score_other", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ix_skater_games_game_id_player_id").on(t.gameId, t.playerId),
    index("ix_skater_games_player_id_season").on(t.playerId, t.season),
    index("ix_skater_games_game_date").on(t.gameDate),
    index("ix_skater_games_season_is_playoffs_game_score").on(t.season, t.isPlayoffs, t.gameScore),
  ],
);

// Daily playoff odds from the season simulation (server/projections), one row
// per team per run. Earlier runs are kept for day-over-day changes. The rating
// columns are the team strength the run used (also used for pregame odds).
export const playoffOdds = pgTable(
  "playoff_odds",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    season: integer("season").notNull(),
    runDate: date("run_date").notNull(),
    team: text("team").notNull(),
    conference: text("conference").notNull(),
    division: text("division").notNull(),
    gamesPlayed: integer("games_played").notNull(),
    points: integer("points").notNull(),
    ratingXgd: numeric("rating_xgd", { mode: "number" }).notNull(),
    ratingGd: numeric("rating_gd", { mode: "number" }).notNull(),
    ratingRoster: numeric("rating_roster", { mode: "number" }).notNull().default(0),
    ratingGoalie: numeric("rating_goalie", { mode: "number" }).notNull().default(0),
    pointsAvg: numeric("points_avg", { mode: "number" }).notNull(),
    pointsP10: integer("points_p10").notNull(),
    pointsP90: integer("points_p90").notNull(),
    makePlayoffs: numeric("make_playoffs", { mode: "number" }).notNull(),
    winRound1: numeric("win_round1", { mode: "number" }).notNull(),
    winRound2: numeric("win_round2", { mode: "number" }).notNull(),
    winConference: numeric("win_conference", { mode: "number" }).notNull(),
    winCup: numeric("win_cup", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ix_playoff_odds_season_run_date_team").on(t.season, t.runDate, t.team),
    index("ix_playoff_odds_run_date").on(t.runDate),
  ],
);

// The run's games for that day: pregame odds and each team's playoff odds if
// it wins or loses, for "tonight's biggest games".
export const playoffOddsGames = pgTable(
  "playoff_odds_games",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    season: integer("season").notNull(),
    runDate: date("run_date").notNull(),
    gameId: text("game_id").notNull(),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    homeWinProbability: numeric("home_win_probability", { mode: "number" }).notNull(),
    homeIfWin: numeric("home_if_win", { mode: "number" }).notNull(),
    homeIfLoss: numeric("home_if_loss", { mode: "number" }).notNull(),
    awayIfWin: numeric("away_if_win", { mode: "number" }).notNull(),
    awayIfLoss: numeric("away_if_loss", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ix_playoff_odds_games_run_date_game_id").on(t.runDate, t.gameId)],
);

// What the playoff odds sandbox simulates from (SandboxInputs): the latest
// run's standings, rating parts, schedule and goalie injuries. Older runs are
// deleted, since only today's is served.
export const projectionInputs = pgTable(
  "projection_inputs",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    season: integer("season").notNull(),
    runDate: date("run_date").notNull(),
    inputs: jsonb("inputs").$type<SandboxInputs>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ix_projection_inputs_season_run_date").on(t.season, t.runDate)],
);

export const gameScoreStateTimes = pgTable(
  "game_score_state_times",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    gameId: text("game_id").notNull(),
    teamAbbreviation: text("team_abbreviation").notNull(),
    season: integer("season").notNull(),
    isPlayoffs: boolean("is_playoffs").notNull(),
    leadingSeconds: integer("leading_seconds").notNull(),
    trailingSeconds: integer("trailing_seconds").notNull(),
    tiedSeconds: integer("tied_seconds").notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ix_game_score_state_times_game_id_team_abbreviation").on(t.gameId, t.teamAbbreviation),
    index("ix_game_score_state_times_team_abbreviation_season_is_playoffs").on(t.teamAbbreviation, t.season, t.isPlayoffs),
  ],
);

export const chemistryPairs = pgMaterializedView("chemistry_pairs", {
  player1Id: integer("player1_id").notNull(),
  player2Id: integer("player2_id").notNull(),
  player1Name: text("player1_name").notNull(),
  player2Name: text("player2_name").notNull(),
  player1Position: text("player1_position"),
  player2Position: text("player2_position"),
  team: text("team").notNull(),
  season: integer("season").notNull(),
  situation: text("situation").notNull(),
  totalIceTimeSeconds: bigint("total_ice_time_seconds", { mode: "number" }).notNull(),
  gamesPlayed: integer("games_played").notNull(),
  goalsFor: integer("goals_for").notNull(),
  goalsAgainst: integer("goals_against").notNull(),
  xGoalsFor: numeric("x_goals_for", { mode: "number" }).notNull(),
  xGoalsAgainst: numeric("x_goals_against", { mode: "number" }).notNull(),
  corsiFor: integer("corsi_for").notNull(),
  corsiAgainst: integer("corsi_against").notNull(),
}).existing();

export const seasonPercentiles = pgMaterializedView("season_percentiles", {
  season: integer("season").notNull(),
  playerCount: integer("player_count").notNull(),
  percentile: integer("percentile").notNull(),
  pointsPerGame: numeric("points_per_game", { mode: "number" }).notNull(),
  goalsPerGame: numeric("goals_per_game", { mode: "number" }).notNull(),
  pointsPer60: numeric("points_per_60", { mode: "number" }).notNull(),
  goalsPer60: numeric("goals_per_60", { mode: "number" }).notNull(),
}).existing();

// Starts and times pulled per goalie season, from shots (see 0013_goalie_pulls.sql).
export const goaliePulls = pgMaterializedView("goalie_pulls", {
  playerId: integer("player_id").notNull(),
  season: integer("season").notNull(),
  isPlayoffs: boolean("is_playoffs").notNull(),
  gamesStarted: integer("games_started").notNull(),
  timesPulled: integer("times_pulled").notNull(),
}).existing();

// Ingestion run log: one row per sync step (and season, for backfills).
// Used for visibility into cron runs and to make the backfill resumable.
export const syncRuns = pgTable(
  "sync_runs",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    step: text("step").notNull(),
    season: integer("season"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: text("status").notNull().default("running"),
    rowsWritten: integer("rows_written").notNull().default(0),
    error: text("error"),
  },
  (t) => [
    index("ix_sync_runs_step_season_started_at").on(t.step, t.season, t.startedAt.desc()),
    check("ck_sync_runs_status", sql`${t.status} in ('running', 'succeeded', 'failed')`),
  ],
);

// --- NHL records (records.nhl.com), refreshed weekly by /api/cron/history ---
// Seasons are start years (2024 = 2024-25) like everywhere else; NHL franchise
// and team IDs are the records site's own.

// One row per NHL franchise, active or not.
export const franchises = pgTable("franchises", {
  id: integer("id").primaryKey(),
  fullName: text("full_name").notNull(),
  // Most recent team code (UTA for Utah; inactive franchises keep their last).
  teamAbbreviation: text("team_abbreviation"),
  firstSeason: integer("first_season").notNull(),
  // Null while active.
  lastSeason: integer("last_season"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Each franchise's regular season, with how far it went in the playoffs.
export const franchiseSeasons = pgTable(
  "franchise_seasons",
  {
    franchiseId: integer("franchise_id").notNull().references(() => franchises.id, { onDelete: "cascade" }),
    season: integer("season").notNull(),
    teamId: integer("team_id").notNull(),
    // Team code that season (e.g. ATL for the Thrashers).
    teamAbbreviation: text("team_abbreviation").notNull(),
    teamName: text("team_name").notNull(),
    gamesPlayed: integer("games_played").notNull(),
    wins: integer("wins").notNull(),
    losses: integer("losses").notNull(),
    ties: integer("ties"),
    overtimeLosses: integer("overtime_losses"),
    points: integer("points").notNull(),
    goalsFor: integer("goals_for").notNull(),
    goalsAgainst: integer("goals_against").notNull(),
    divisionName: text("division_name"),
    divisionRank: integer("division_rank"),
    leagueRank: integer("league_rank"),
    madePlayoffs: boolean("made_playoffs").notNull(),
    // Furthest round reached, e.g. "2nd Round", "Stanley Cup Final".
    playoffResult: text("playoff_result"),
    playoffRound: integer("playoff_round"),
    wonCup: boolean("won_cup").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ix_franchise_seasons_franchise_id_season").on(t.franchiseId, t.season),
    index("ix_franchise_seasons_team_id").on(t.teamId),
  ],
);

// All-time record of one franchise against another, from the first one's side.
export const franchiseHeadToHead = pgTable(
  "franchise_head_to_head",
  {
    franchiseId: integer("franchise_id").notNull().references(() => franchises.id, { onDelete: "cascade" }),
    opponentFranchiseId: integer("opponent_franchise_id").notNull().references(() => franchises.id, { onDelete: "cascade" }),
    isPlayoffs: boolean("is_playoffs").notNull(),
    gamesPlayed: integer("games_played").notNull(),
    wins: integer("wins").notNull(),
    losses: integer("losses").notNull(),
    ties: integer("ties").notNull(),
    overtimeLosses: integer("overtime_losses").notNull(),
    goalsFor: integer("goals_for").notNull(),
    goalsAgainst: integer("goals_against").notNull(),
    lastMeetingSeason: integer("last_meeting_season"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ix_franchise_head_to_head_franchise_opponent_playoffs").on(t.franchiseId, t.opponentFranchiseId, t.isPlayoffs),
  ],
);

// Every NHL entry draft pick (1963 on).
export const draftPicks = pgTable(
  "draft_picks",
  {
    // The records site's pick ID.
    id: integer("id").primaryKey(),
    draftYear: integer("draft_year").notNull(),
    round: integer("round").notNull(),
    pickInRound: integer("pick_in_round").notNull(),
    overallPick: integer("overall_pick").notNull(),
    teamId: integer("team_id").notNull(),
    // Team code at the time of the draft.
    teamAbbreviation: text("team_abbreviation").notNull(),
    // Resolved through franchise_seasons; null when the team isn't in them.
    franchiseId: integer("franchise_id"),
    // NHL player ID; null for picks the NHL never linked to a player.
    playerId: integer("player_id"),
    playerName: text("player_name").notNull(),
    position: text("position"),
    amateurClub: text("amateur_club"),
    amateurLeague: text("amateur_league"),
    countryCode: text("country_code"),
    birthDate: date("birth_date"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ix_draft_picks_draft_year_overall_pick").on(t.draftYear, t.overallPick),
    index("ix_draft_picks_franchise_id_draft_year").on(t.franchiseId, t.draftYear),
    index("ix_draft_picks_player_id").on(t.playerId),
  ],
);

// Regular-season NHL career totals for every player in NHL history.
export const playerCareers = pgTable("player_careers", {
  playerId: integer("player_id").primaryKey(),
  name: text("name").notNull(),
  position: text("position"),
  gamesPlayed: integer("games_played").notNull(),
  // Skaters
  goals: integer("goals"),
  assists: integer("assists"),
  points: integer("points"),
  // Goalies
  wins: integer("wins"),
  // Goalies, playoffs: Game 7s and overtime games.
  playoffGames: integer("playoff_games"),
  gameSevenWins: integer("game_seven_wins"),
  gameSevenLosses: integer("game_seven_losses"),
  playoffOvertimeWins: integer("playoff_overtime_wins"),
  playoffOvertimeLosses: integer("playoff_overtime_losses"),
  playoffOvertimeSavePct: numeric("playoff_overtime_save_pct", { mode: "number" }),
  firstSeason: integer("first_season"),
  lastSeason: integer("last_season"),
  isActive: boolean("is_active").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Every NHL trophy and award (records site IDs).
export const trophies = pgTable("trophies", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  // URL slug, e.g. "hart-memorial".
  slug: text("slug").notNull().unique(),
  // 1 team, 2 player, 3 coach, 4 general manager, 5 other.
  categoryId: integer("category_id").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Winners, runners-up and finalists of every trophy, every season.
export const awardWinners = pgTable(
  "award_winners",
  {
    // The records site's award-detail ID.
    id: integer("id").primaryKey(),
    trophyId: integer("trophy_id").notNull().references(() => trophies.id, { onDelete: "cascade" }),
    season: integer("season").notNull(),
    // WINNER, RUNNER_UP or FINALIST.
    status: text("status").notNull(),
    fullName: text("full_name").notNull(),
    // NHL player ID; null for coaches, teams and others.
    playerId: integer("player_id"),
    // The team that season, and its franchise (through franchise_seasons).
    teamId: integer("team_id"),
    franchiseId: integer("franchise_id"),
    isRookie: boolean("is_rookie").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ix_award_winners_trophy_id_season").on(t.trophyId, t.season),
    index("ix_award_winners_player_id").on(t.playerId),
    index("ix_award_winners_franchise_id").on(t.franchiseId),
  ],
);

// Captains, head coaches, general managers and retired numbers by franchise,
// parsed from the records site's franchise detail lists.
export const franchisePeople = pgTable(
  "franchise_people",
  {
    franchiseId: integer("franchise_id").notNull().references(() => franchises.id, { onDelete: "cascade" }),
    // captain, coach, gm or retired.
    role: text("role").notNull(),
    // Order on the records site (newest first; retired numbers by number).
    position: integer("position").notNull(),
    name: text("name").notNull(),
    // "2016-17 – Present", "Oct. 8, 2015 – Nov. 18, 2018", "1980-87".
    tenure: text("tenure"),
    // Retired numbers only.
    sweaterNumber: integer("sweater_number"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ix_franchise_people_franchise_id_role_position").on(t.franchiseId, t.role, t.position)],
);

// Hockey Hall of Fame inductees who played in the NHL.
export const hallOfFame = pgTable("hall_of_fame", {
  playerId: integer("player_id").primaryKey(),
  // Induction year; null when the records site doesn't say.
  inductedYear: integer("inducted_year"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// The game each 1,000th point, 500th goal, 100th point of a season and 50th
// goal of a season came in.
export const milestoneMoments = pgTable(
  "milestone_moments",
  {
    // "<kind>-<gameId>-<playerId>".
    id: text("id").primaryKey(),
    // points-1000, goals-500, season-points-100 or season-goals-50.
    kind: text("kind").notNull(),
    playerId: integer("player_id").notNull(),
    name: text("name").notNull(),
    season: integer("season").notNull(),
    gameId: text("game_id").notNull(),
    gameDate: date("game_date").notNull(),
    teamId: integer("team_id"),
    teamName: text("team_name"),
    homeTeam: text("home_team"),
    awayTeam: text("away_team"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    ageYears: integer("age_years"),
    // Career games (career milestones) or season games (season milestones) at the time.
    gamesPlayed: integer("games_played"),
    // Season milestones: the season's final total.
    seasonTotal: integer("season_total"),
    goalieName: text("goalie_name"),
    isActive: boolean("is_active").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ix_milestone_moments_kind_game_date").on(t.kind, t.gameDate),
    index("ix_milestone_moments_player_id").on(t.playerId),
  ],
);

// Every NHL referee and linesperson.
export const officials = pgTable("officials", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  // Referee or Linesperson.
  officialType: text("official_type").notNull(),
  sweaterNumber: integer("sweater_number"),
  firstRegularGameId: text("first_regular_game_id"),
  firstPlayoffGameId: text("first_playoff_game_id"),
  countryCode: text("country_code"),
  isActive: boolean("is_active").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// NHL head coaches (for Cup counts and Hall of Fame status).
export const coaches = pgTable("coaches", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  stanleyCups: integer("stanley_cups").notNull(),
  inHallOfFame: boolean("in_hall_of_fame").notNull(),
  isActive: boolean("is_active").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// League attendance by season.
export const leagueAttendance = pgTable("league_attendance", {
  season: integer("season").primaryKey(),
  regular: integer("regular"),
  playoffs: integer("playoffs"),
  total: integer("total"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Each draft lottery's format and odds, as plain text plus the odds chart.
export const draftLotteries = pgTable("draft_lotteries", {
  draftYear: integer("draft_year").primaryKey(),
  format: text("format"),
  oddsImageUrl: text("odds_image_url"),
  notes: text("notes"),
  results: text("results"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- ESPN (site.api.espn.com, unofficial), refreshed by /api/cron/espn-* ---

// ESPN athletes we've seen, matched to our player IDs (NHL IDs). A null
// player_id means no match yet (often a prospect with no NHL games); the
// match is retried on later runs.
export const espnPlayers = pgTable(
  "espn_players",
  {
    espnId: text("espn_id").primaryKey(),
    playerId: integer("player_id"),
    name: text("name").notNull(),
    position: text("position"),
    birthDate: date("birth_date"),
    // name_dob, name_team, name, manual or none.
    matchMethod: text("match_method").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ix_espn_players_player_id").on(t.playerId)],
);

// Injury stints: one row from the day a player appears on ESPN's injury list
// until the run where they're gone (resolved_at). At most one open stint per
// athlete. ESPN's injury IDs aren't unique, so stints key on the athlete.
export const playerInjuries = pgTable(
  "player_injuries",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    espnAthleteId: text("espn_athlete_id").notNull(),
    playerId: integer("player_id"),
    playerName: text("player_name").notNull(),
    team: text("team").notNull(),
    position: text("position"),
    // ir, out, day_to_day, suspended or other; status_text is ESPN's label.
    status: text("status").notNull(),
    statusText: text("status_text").notNull(),
    // Body area or reason ("Upper Body", "Knee", "Illness").
    injuryType: text("injury_type"),
    detail: text("detail"),
    side: text("side"),
    comment: text("comment"),
    // ESPN's last update to the entry.
    reportedAt: timestamp("reported_at", { withTimezone: true }),
    // ESPN's returnDate: the earliest the player can return (end of an IR
    // stint, next game for day-to-day), not a forecast.
    expectedReturn: date("expected_return"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ix_player_injuries_open_athlete").on(t.espnAthleteId).where(sql`resolved_at IS NULL`),
    index("ix_player_injuries_player_id").on(t.playerId),
    index("ix_player_injuries_team_open").on(t.team).where(sql`resolved_at IS NULL`),
    check("ck_player_injuries_status", sql`${t.status} in ('ir', 'out', 'day_to_day', 'suspended', 'other')`),
  ],
);

// League transactions (IR moves, recalls, waivers, signings, trades). ESPN
// gives no IDs, so a transaction is its date, team and text. Kind and player
// are parsed from the text on a best-effort basis.
export const transactions = pgTable(
  "transactions",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    transactionDate: date("transaction_date").notNull(),
    team: text("team").notNull(),
    description: text("description").notNull(),
    // ir_place, ir_activate, recall, assign, waivers, sign, trade, other.
    kind: text("kind").notNull(),
    playerId: integer("player_id"),
    playerName: text("player_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ix_transactions_date_team_description").on(t.transactionDate, t.team, t.description),
    index("ix_transactions_team_date").on(t.team, t.transactionDate.desc()),
    index("ix_transactions_player_id").on(t.playerId),
  ],
);

// Moneylines per game and sportsbook, for model benchmarking only: no API
// route reads this table. American odds; the probabilities have the
// bookmaker's margin removed. Open is the first line, close the last before
// puck drop (null until the game starts).
export const gameOdds = pgTable(
  "game_odds",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    gameId: text("game_id").notNull(),
    espnEventId: text("espn_event_id").notNull(),
    providerId: text("provider_id").notNull(),
    provider: text("provider").notNull(),
    homeMoneylineOpen: integer("home_moneyline_open"),
    awayMoneylineOpen: integer("away_moneyline_open"),
    homeMoneylineClose: integer("home_moneyline_close"),
    awayMoneylineClose: integer("away_moneyline_close"),
    homeProbabilityOpen: numeric("home_probability_open", { mode: "number" }),
    homeProbabilityClose: numeric("home_probability_close", { mode: "number" }),
    totalClose: numeric("total_close", { mode: "number" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ix_game_odds_game_provider").on(t.gameId, t.providerId)],
);
