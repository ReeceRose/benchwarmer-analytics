DROP INDEX "ix_shots_shot_id";--> statement-breakpoint
CREATE UNIQUE INDEX "ix_shots_season_shot_id" ON "shots" USING btree ("season","shot_id");