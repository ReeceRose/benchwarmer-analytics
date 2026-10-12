DROP INDEX "ix_shots_game_id";--> statement-breakpoint
DROP INDEX "ix_shots_season_shot_id";--> statement-breakpoint
-- Custom: drop duplicated events (MoneyPuck repeats some 2008 events under new
-- shotIDs) so the new natural key can be created. Keeps the earliest row.
DELETE FROM "shots" a USING "shots" b
WHERE a."game_id" = b."game_id" AND a."event_id" = b."event_id" AND a."id" > b."id";--> statement-breakpoint
CREATE UNIQUE INDEX "ix_shots_game_id_event_id" ON "shots" USING btree ("game_id","event_id");