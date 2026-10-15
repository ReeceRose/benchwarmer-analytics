import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { StackedBar, Swatch, TeamLabel } from "@/components/game-live/parts";
import { teamColour } from "@/components/game-live/live-utils";
import { formatGameDate } from "@/lib/game-formatters";
import { cn } from "@/lib/utils";
import type { AllTimeRecord, HeadToHead } from "@/types";

/**
 * One all-time record (from the away team's side) as a stacked bar of away
 * wins, ties and home wins, with the better side bold.
 */
function AllTimeRow({ label, record, away, home }: { label: string; record: AllTimeRecord; away: string; home: string }) {
  const awayWins = record.wins;
  // The away side's regulation and overtime losses are the home side's wins.
  const homeWins = record.losses + record.overtimeLosses;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {record.gamesPlayed.toLocaleString()} {record.gamesPlayed === 1 ? "game" : "games"} · goals{" "}
          {record.goalsFor.toLocaleString()}–{record.goalsAgainst.toLocaleString()}
        </span>
      </div>
      <StackedBar
        parts={[
          { label: `${away} wins`, value: awayWins, colour: teamColour("away") },
          { label: "Ties", value: record.ties, colour: "var(--muted-foreground)" },
          { label: `${home} wins`, value: homeWins, colour: teamColour("home") },
        ]}
      />
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs tabular-nums">
        <TeamLabel side="away">
          <span className={cn(awayWins > homeWins ? "font-semibold" : "text-muted-foreground")}>
            {away} {awayWins.toLocaleString()} {awayWins === 1 ? "win" : "wins"}
          </span>
        </TeamLabel>
        {record.ties > 0 && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Swatch colour="var(--muted-foreground)" />
            {record.ties.toLocaleString()} {record.ties === 1 ? "tie" : "ties"}
          </span>
        )}
        <TeamLabel side="home">
          <span className={cn(homeWins > awayWins ? "font-semibold" : "text-muted-foreground")}>
            {home} {homeWins.toLocaleString()} {homeWins === 1 ? "win" : "wins"}
          </span>
        </TeamLabel>
      </div>
    </div>
  );
}

/**
 * All-time franchise records (NHL records, every era) and earlier meetings
 * this season, most recent first. The away team is on the left.
 */
export function HeadToHeadSection({ data, awayTeam, homeTeam }: { data: HeadToHead; awayTeam: string; homeTeam: string }) {
  const { lastFive, allTime } = data;

  return (
    <div className="space-y-5">
      {(allTime?.regular || allTime?.playoffs) && (
        <div className="space-y-4">
          {allTime.regular && <AllTimeRow label="All-time, regular season" record={allTime.regular} away={awayTeam} home={homeTeam} />}
          {allTime.playoffs && <AllTimeRow label="All-time, playoffs" record={allTime.playoffs} away={awayTeam} home={homeTeam} />}
        </div>
      )}

      <div className={cn(allTime?.regular && "border-t pt-4")}>
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">This season</h3>
        {lastFive.length === 0 ? (
          <p className="text-sm text-muted-foreground">First meeting of the season</p>
        ) : (
          <ol className="divide-y">
            {lastFive.map((game, idx) => (
              <li key={idx} className="flex items-center gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
                <span className="w-24 shrink-0 text-muted-foreground">{formatGameDate(game.date)}</span>
                <span className="flex-1 tabular-nums">{game.score}</span>
                {game.overtimeType && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase">
                    {game.overtimeType}
                  </span>
                )}
                <span className="flex w-16 shrink-0 items-center justify-end gap-1.5 font-semibold">
                  <TeamLogo abbrev={game.winner} size="sm" />
                  {game.winner}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
