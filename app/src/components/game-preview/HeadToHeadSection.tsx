import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { SegmentedControl } from "@/components/layout";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { Button } from "@/components/ui/button";
import { StackedBar, Swatch, TeamLabel } from "@/components/game-live/parts";
import { teamColour } from "@/components/game-live/live-utils";
import { formatSeason } from "@/lib/formatters";
import { formatGameDateWithYear } from "@/lib/game-formatters";
import { cn } from "@/lib/utils";
import type { AllTimeRecord, HeadToHead, HeadToHeadSpan, MeetingRecord, PastGame } from "@/types";

export const HEAD_TO_HEAD_RANGES = ["season", "last", "five", "all"] as const;
export type HeadToHeadRange = (typeof HEAD_TO_HEAD_RANGES)[number];
export const DEFAULT_HEAD_TO_HEAD_RANGE: HeadToHeadRange = "five";

// Seasons by year ("2026-27") rather than "This season": shorter on phones, and plain when early-season meetings are few.
const rangeOptions = (season: number): { value: HeadToHeadRange; label: string }[] => [
  { value: "season", label: formatSeason(season) },
  { value: "last", label: formatSeason(season - 1) },
  { value: "five", label: "Last 5" },
  { value: "all", label: "All-time" },
];

const SPAN_KEY = { season: "season", last: "lastSeason", five: "fiveSeasons" } as const;

const NO_MEETINGS: Record<Exclude<HeadToHeadRange, "all">, string> = {
  season: "First meeting of the season",
  last: "They didn't meet the season before",
  five: "They haven't met in the last five seasons",
};

// Games listed before "Show all".
const SHOWN = 5;

interface RecordTotals {
  gamesPlayed: number;
  awayWins: number;
  homeWins: number;
  ties: number;
  overtime: number;
  awayGoals: number;
  homeGoals: number;
}

const fromMeetings = (r: MeetingRecord): RecordTotals => ({ ...r, ties: 0 });

// NHL records are from the away team's side: its regulation and overtime losses are the home side's wins.
const fromAllTime = (r: AllTimeRecord): RecordTotals => ({
  gamesPlayed: r.gamesPlayed,
  awayWins: r.wins,
  homeWins: r.losses + r.overtimeLosses,
  ties: r.ties,
  overtime: 0,
  awayGoals: r.goalsFor,
  homeGoals: r.goalsAgainst,
});

const plural = (n: number, word: string) => `${n.toLocaleString()} ${n === 1 ? word : `${word}s`}`;

/**
 * One record as a stacked bar of away wins, ties and home wins, with games
 * and goals above and win counts below, the side with more wins bold.
 */
function RecordRow({ label, record, away, home }: { label: string; record: RecordTotals; away: string; home: string }) {
  const { awayWins, homeWins, ties, overtime } = record;
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-3 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {plural(record.gamesPlayed, "game")} · goals {record.awayGoals.toLocaleString()}–{record.homeGoals.toLocaleString()}
        </span>
      </div>
      <StackedBar
        parts={[
          { label: `${away} wins`, value: awayWins, colour: teamColour("away") },
          { label: "Ties", value: ties, colour: "var(--muted-foreground)" },
          { label: `${home} wins`, value: homeWins, colour: teamColour("home") },
        ]}
      />
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs tabular-nums">
        <TeamLabel side="away">
          <span className={cn(awayWins > homeWins ? "font-semibold" : "text-muted-foreground")}>
            {away} {plural(awayWins, "win")}
          </span>
        </TeamLabel>
        {ties > 0 && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Swatch colour="var(--muted-foreground)" />
            {plural(ties, "tie")}
          </span>
        )}
        {overtime > 0 && <span className="text-muted-foreground">{overtime.toLocaleString()} in OT/SO</span>}
        <TeamLabel side="home">
          <span className={cn(homeWins > awayWins ? "font-semibold" : "text-muted-foreground")}>
            {home} {plural(homeWins, "win")}
          </span>
        </TeamLabel>
      </div>
    </div>
  );
}

/** One meeting: date, score with the away team on the left, where and how, and the winner. */
function MeetingRow({ game, away, home }: { game: PastGame; away: string; home: string }) {
  const winner = game.awayScore > game.homeScore ? away : home;
  return (
    <li>
      <Link
        to="/games/$gameId"
        params={{ gameId: game.gameId }}
        className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
      >
        <span className="w-24 shrink-0 text-muted-foreground tabular-nums">{formatGameDateWithYear(game.date)}</span>
        <span className="min-w-0 flex-1">
          <span className="tabular-nums group-hover:text-link">
            {away} {game.awayScore}–{game.homeScore} {home}
          </span>
          <span className="block text-xs text-muted-foreground sm:ml-2 sm:inline">
            at {game.atHome ? home : away}
            {game.isPlayoffs && " · Playoffs"}
          </span>
        </span>
        {game.overtimeType && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase">{game.overtimeType}</span>
        )}
        <span className="flex w-16 shrink-0 items-center justify-end gap-1.5 font-semibold">
          <TeamLogo abbrev={winner} size="sm" />
          {winner}
        </span>
      </Link>
    </li>
  );
}

function SpanView({ span, empty, away, home }: { span: HeadToHeadSpan; empty: string; away: string; home: string }) {
  const [showAll, setShowAll] = useState(false);
  if (span.games.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const shown = showAll ? span.games : span.games.slice(0, SHOWN);
  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:gap-8">
      <div className="space-y-4">
        {span.regular && <RecordRow label="Regular season" record={fromMeetings(span.regular)} away={away} home={home} />}
        {span.playoffs && <RecordRow label="Playoffs" record={fromMeetings(span.playoffs)} away={away} home={home} />}
      </div>
      <div className="border-t pt-4 lg:border-t-0 lg:pt-0">
        <ol className="space-y-1">
          {shown.map((game) => (
            <MeetingRow key={game.gameId} game={game} away={away} home={home} />
          ))}
        </ol>
        {span.games.length > SHOWN && (
          <Button variant="ghost" size="sm" className="mt-2 -ml-3" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show fewer" : `Show all ${span.games.length}`}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Head to head over a chosen range: this season, last season and the last
 * five (meetings from our games, playoffs included) or all-time franchise
 * records (NHL records, every era). The away team is on the left. Built for
 * a full-width panel: records on the left and games on the right from lg up.
 */
export function HeadToHeadSection({
  data,
  awayTeam,
  homeTeam,
  season,
  range,
  onRangeChange,
}: {
  data: HeadToHead;
  awayTeam: string;
  homeTeam: string;
  /** The game's season (start year). */
  season: number;
  range: HeadToHeadRange;
  onRangeChange: (range: HeadToHeadRange) => void;
}) {
  // Browsers may hold a response from before spans existed for a few minutes after a deploy.
  const shownRange = data.spans ? range : "all";
  const { allTime } = data;

  return (
    <div className="space-y-5">
      {data.spans && (
        <SegmentedControl aria-label="Head-to-head range" value={range} onValueChange={onRangeChange} options={rangeOptions(season)} />
      )}
      {shownRange === "all" ? (
        allTime.regular || allTime.playoffs ? (
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-8">
            {allTime.regular && <RecordRow label="Regular season" record={fromAllTime(allTime.regular)} away={awayTeam} home={homeTeam} />}
            {allTime.playoffs && <RecordRow label="Playoffs" record={fromAllTime(allTime.playoffs)} away={awayTeam} home={homeTeam} />}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No all-time record between these franchises yet</p>
        )
      ) : (
        <SpanView
          key={shownRange}
          span={data.spans[SPAN_KEY[shownRange]]}
          empty={NO_MEETINGS[shownRange]}
          away={awayTeam}
          home={homeTeam}
        />
      )}
    </div>
  );
}
