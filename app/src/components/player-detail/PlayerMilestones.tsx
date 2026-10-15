import { Link } from "@tanstack/react-router";
import { Panel, Section, StatTile } from "@/components/layout";
import { formatSavePct } from "@/lib/formatters";
import { formatGameDateLong } from "@/lib/game-formatters";
import { milestoneTitle, milestoneGame } from "@/lib/milestones";
import type { GoaliePlayoffRecord, MilestoneMoment } from "@/types";

// Our game pages cover games from 2008-09 on.
const FIRST_GAME_PAGE_SEASON = 2008;

/** The games a player reached 1,000 points, 500 goals, 100 points or 50 goals in a season. */
export function PlayerMilestones({ milestones }: { milestones: MilestoneMoment[] }) {
  if (milestones.length === 0) return null;
  return (
    <Section title="Milestones" description="The game each one came in, oldest first.">
      <Panel>
        <ol className="space-y-3 text-sm">
          {milestones.map((m) => (
            <li key={`${m.kind}-${m.gameId}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <span>
                <span className="font-medium">{milestoneTitle(m)}</span>
                <span className="ml-2 text-muted-foreground">
                  {m.season >= FIRST_GAME_PAGE_SEASON ? (
                    <Link to="/games/$gameId" params={{ gameId: m.gameId }} className="hover:text-link">
                      {formatGameDateLong(m.gameDate)}
                    </Link>
                  ) : (
                    formatGameDateLong(m.gameDate)
                  )}
                  {milestoneGame(m) && `, ${milestoneGame(m)}`}
                </span>
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {[
                  m.ageYears != null && `age ${m.ageYears}`,
                  m.gamesPlayed != null && (m.kind.startsWith("season") ? `game ${m.gamesPlayed} of the season` : `career game ${m.gamesPlayed.toLocaleString()}`),
                  m.goalie && `on ${m.goalie}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ol>
      </Panel>
    </Section>
  );
}

const record = (w: number, l: number) => `${w}–${l}`;

/** A goalie's Game 7 and playoff overtime record, career. */
export function GoaliePlayoffPressure({ record: r }: { record: GoaliePlayoffRecord }) {
  return (
    <Section title="Playoff pressure" description={`Career playoffs, ${r.games} games. Overtime save % counts only the overtime periods.`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Game 7s" value={record(r.gameSevenWins, r.gameSevenLosses)} note={r.gameSevenWins + r.gameSevenLosses === 0 ? "Never played one" : "Wins–losses"} />
        <StatTile label="Overtime games" value={record(r.overtimeWins, r.overtimeLosses)} note="Wins–losses" />
        <StatTile label="Overtime save %" value={r.overtimeSavePct != null ? formatSavePct(r.overtimeSavePct) : "–"} />
      </div>
    </Section>
  );
}
