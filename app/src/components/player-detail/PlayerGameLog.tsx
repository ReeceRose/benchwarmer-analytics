import { Link } from "@tanstack/react-router";
import { usePlayerGameLog } from "@/hooks";
import { EmptyState, Panel, Section, SegmentedControl, StatTile } from "@/components/layout";
import { GoalieFormSections, SkaterFormSections } from "@/components/player-detail/PlayerForm";
import { ErrorState, HeaderWithTooltip, TableSkeleton } from "@/components/shared";
import { TeamTag } from "@/components/shared/TeamTag";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatSavePct, formatSeason, formatToi } from "@/lib/formatters";
import { formatGameDate } from "@/lib/game-formatters";
import { cn } from "@/lib/utils";
import type { GoalieGameLogEntry, PlayerGameLogResponse, SkaterGameLogEntry } from "@/types";

type Entry = SkaterGameLogEntry | GoalieGameLogEntry;

function resultText(g: Entry): string {
  if (g.result === null || g.teamScore === null || g.opponentScore === null) return "–";
  const extra = g.periodType === "OT" || g.periodType === "SO" ? ` ${g.periodType}` : "";
  return `${g.result === "OTL" ? "L" : g.result} ${g.teamScore}–${g.opponentScore}${extra}`;
}

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const signed = (v: number, digits = 2) => `${v > 0 ? "+" : ""}${v.toFixed(digits)}`;

function DateCell({ g }: { g: Entry }) {
  return (
    <TableCell className="sticky left-0 z-10 bg-card pl-4 whitespace-nowrap group-hover:bg-muted sm:pl-5">
      <Link to="/games/$gameId" params={{ gameId: g.gameId }} className="hover:text-link">
        {formatGameDate(g.gameDate)}
      </Link>
    </TableCell>
  );
}

function OpponentCells({ g, season }: { g: Entry; season: number }) {
  return (
    <>
      <TableCell>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 text-xs text-muted-foreground">{g.isHome ? "vs" : "@"}</span>
          <TeamTag abbrev={g.opponent} season={season} />
        </span>
      </TableCell>
      <TableCell className={cn("whitespace-nowrap", g.result !== "W" && "text-muted-foreground")}>{resultText(g)}</TableCell>
    </>
  );
}

/**
 * Game Score per game as bars from a zero line: ink above, muted below, with a
 * dashed line at the player's average. Each bar links to its game; games
 * without a Game Score get a dot on the zero line.
 */
function GameScoreStrip({ games, avg }: { games: SkaterGameLogEntry[]; avg: number }) {
  const max = Math.max(1, ...games.map((g) => Math.abs(g.gameScore ?? 0)));
  const top = Math.max(0, ...games.map((g) => g.gameScore ?? 0)) / max;
  const bottom = Math.max(0, ...games.map((g) => -(g.gameScore ?? 0))) / max;
  const span = top + bottom || 1;
  const zero = `${(top / span) * 100}%`;
  return (
    <div>
      <div className="relative h-32" aria-hidden>
        <div className="absolute inset-x-0 h-px bg-foreground/25" style={{ top: zero }} />
        <div
          className="absolute inset-x-0 border-t border-dashed border-muted-foreground/60"
          style={{ top: `${((top - avg / max) / span) * 100}%` }}
        />
        <div className="absolute inset-0 flex gap-px">
          {games.map((g) => {
            const v = g.gameScore;
            const h = v === null ? 0 : (Math.abs(v) / max / span) * 100;
            return (
              <Link
                key={g.gameId}
                to="/games/$gameId"
                params={{ gameId: g.gameId }}
                tabIndex={-1}
                title={
                  v === null
                    ? `${formatGameDate(g.gameDate)} ${g.isHome ? "vs" : "@"} ${g.opponent}: no Game Score`
                    : `${formatGameDate(g.gameDate)} ${g.isHome ? "vs" : "@"} ${g.opponent}: ${v.toFixed(2)}`
                }
                className="group relative min-w-0 flex-1"
              >
                {v === null ? (
                  <span
                    className="absolute left-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/50"
                    style={{ top: zero }}
                  />
                ) : (
                  <span
                    className={cn(
                      "absolute left-1/2 w-full max-w-6 -translate-x-1/2 group-hover:bg-link",
                      v >= 0 ? "rounded-t-sm bg-foreground/80" : "rounded-b-sm bg-muted-foreground/45",
                    )}
                    style={v >= 0 ? { bottom: `calc(100% - ${zero})`, height: `${h}%` } : { top: zero, height: `${h}%` }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{formatGameDate(games[0].gameDate)}</span>
        <span>Dashed line: average {avg.toFixed(2)}</span>
        <span>{formatGameDate(games[games.length - 1].gameDate)}</span>
      </div>
    </div>
  );
}

function SkaterLog({ games, season }: { games: SkaterGameLogEntry[]; season: number }) {
  const scored = games.filter((g) => g.gameScore !== null);
  const avg = average(scored.map((g) => g.gameScore!));
  const recent = scored.slice(-10);
  const recentAvg = average(recent.map((g) => g.gameScore!));
  const best = scored.reduce<SkaterGameLogEntry | null>((b, g) => (!b || g.gameScore! > b.gameScore! ? g : b), null);
  const missing = games.length - scored.length;

  return (
    <div className="space-y-8">
      {avg !== null && best && recentAvg !== null && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              label="Game Score per game"
              value={avg.toFixed(2)}
              note={missing > 0 ? `${scored.length} of ${games.length} games have a Game Score` : `${games.length} games`}
            />
            {scored.length > recent.length ? (
              <StatTile
                label={`Last ${recent.length}`}
                value={recentAvg.toFixed(2)}
                note={`${signed(recentAvg - avg)} against the season average`}
              />
            ) : (
              <StatTile
                label="Total Game Score"
                value={(avg * scored.length).toFixed(1)}
                note={`Over ${scored.length} ${scored.length === 1 ? "game" : "games"}`}
              />
            )}
            <StatTile
              label="Best game"
              value={best.gameScore!.toFixed(2)}
              note={`${best.isHome ? "vs" : "@"} ${best.opponent}, ${formatGameDate(best.gameDate)}: ${best.goals} G, ${best.assists} A`}
            />
          </div>
          <Panel>
            <h3 className="text-sm font-semibold">Game Score by game</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Oldest to newest. Select a bar to open the game{missing > 0 ? "; dots are games without a Game Score" : ""}.
            </p>
            <GameScoreStrip games={games} avg={avg} />
          </Panel>
        </div>
      )}
      <SkaterFormSections games={games} />
      <Section title="Game log" description="Newest first. xG and Game Score are ours; the rest is from NHL.com.">
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <Table className="min-w-200">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 w-32 bg-card pl-4 sm:pl-5">Date</TableHead>
                <TableHead>Opponent</TableHead>
                <TableHead>Result</TableHead>
                <HeaderWithTooltip label="TOI" tooltip="Time on ice" className="text-right" />
                <HeaderWithTooltip label="G" tooltip="Goals" className="text-right" />
                <HeaderWithTooltip label="A" tooltip="Assists" className="text-right" />
                <HeaderWithTooltip label="P" tooltip="Points" className="text-right" />
                <HeaderWithTooltip label="+/-" tooltip="Plus-minus" className="text-right" />
                <HeaderWithTooltip label="SOG" tooltip="Shots on goal" className="text-right" />
                <HeaderWithTooltip label="xG" tooltip="Expected goals from the player's shots" className="text-right" />
                <HeaderWithTooltip
                  label="GS"
                  tooltip="Game Score: one number for a skater's game, from scoring, shots, blocks, penalties, faceoffs and 5v5 on-ice shots and goals"
                  className="pr-4 text-right sm:pr-5"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...games].reverse().map((g) => (
                <TableRow key={g.gameId} className="group">
                  <DateCell g={g} />
                  <OpponentCells g={g} season={season} />
                  <TableCell className="text-right text-muted-foreground">{formatToi(g.toiSeconds)}</TableCell>
                  <TableCell className="text-right">{g.goals}</TableCell>
                  <TableCell className="text-right">{g.assists}</TableCell>
                  <TableCell className="text-right font-medium">{g.points}</TableCell>
                  <TableCell className="text-right">{signed(g.plusMinus, 0).replace("+0", "0")}</TableCell>
                  <TableCell className="text-right">{g.shots}</TableCell>
                  <TableCell className="text-right">{g.xGoals !== null ? g.xGoals.toFixed(2) : "–"}</TableCell>
                  <TableCell
                    className="pr-4 text-right font-semibold sm:pr-5"
                    title={
                      g.gameScore !== null
                        ? `Scoring ${g.gameScoreScoring!.toFixed(2)} · on-ice ${g.gameScoreOnIce!.toFixed(2)} · other ${g.gameScoreOther!.toFixed(2)}`
                        : "No Game Score for this game"
                    }
                  >
                    {g.gameScore !== null ? g.gameScore.toFixed(2) : <span className="font-normal text-muted-foreground">–</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      </Section>
      {missing > 0 && (
        <p className="text-xs text-muted-foreground">
          {missing === 1 ? "One game has" : `${missing} games have`} no Game Score: it needs NHL shift data, which is
          missing for some games and arrives the morning after the rest.{" "}
          <Link to="/glossary" hash="Game Score per Game" className="text-link">How Game Score works</Link>
        </p>
      )}
    </div>
  );
}

function GoalieLog({ games, season }: { games: GoalieGameLogEntry[]; season: number }) {
  const shotsAgainst = games.reduce((n, g) => n + g.shotsAgainst, 0);
  const goalsAgainst = games.reduce((n, g) => n + g.goalsAgainst, 0);
  const withXg = games.filter((g) => g.goalsSavedAboveExpected !== null);
  const gsax = withXg.reduce((n, g) => n + g.goalsSavedAboveExpected!, 0);
  const starts = games.filter((g) => g.started).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Games" value={games.length} note={`${starts} ${starts === 1 ? "start" : "starts"}`} />
        <StatTile
          label="Save percentage"
          value={formatSavePct(shotsAgainst > 0 ? 1 - goalsAgainst / shotsAgainst : null)}
          note={`${goalsAgainst} goals on ${shotsAgainst} shots`}
        />
        <StatTile
          label="GSAx"
          value={withXg.length > 0 ? signed(gsax, 1) : "–"}
          note={withXg.length < games.length ? `Over ${withXg.length} games with shot data` : "Goals saved above expected"}
        />
      </div>
      <GoalieFormSections games={games} />
      <Section title="Game log" description="Newest first. xGA and GSAx are ours; the rest is from NHL.com.">
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <Table className="min-w-180">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 w-32 bg-card pl-4 sm:pl-5">Date</TableHead>
                <TableHead>Opponent</TableHead>
                <TableHead>Result</TableHead>
                <HeaderWithTooltip label="Dec" tooltip="Decision: W, L or O (overtime or shootout loss)" />
                <HeaderWithTooltip label="TOI" tooltip="Time on ice" className="text-right" />
                <HeaderWithTooltip label="SA" tooltip="Shots against" className="text-right" />
                <HeaderWithTooltip label="GA" tooltip="Goals against" className="text-right" />
                <HeaderWithTooltip label="SV%" tooltip="Save percentage" className="text-right" />
                <HeaderWithTooltip label="xGA" tooltip="Expected goals against" className="text-right" />
                <HeaderWithTooltip label="GSAx" tooltip="Goals saved above expected" className="pr-4 text-right sm:pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...games].reverse().map((g) => (
                <TableRow key={g.gameId} className="group">
                  <DateCell g={g} />
                  <OpponentCells g={g} season={season} />
                  <TableCell className="text-muted-foreground">{g.decision ?? "–"}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatToi(g.toiSeconds)}</TableCell>
                  <TableCell className="text-right">{g.shotsAgainst}</TableCell>
                  <TableCell className="text-right">{g.goalsAgainst}</TableCell>
                  <TableCell className="text-right">
                    {g.shotsAgainst > 0 ? formatSavePct(1 - g.goalsAgainst / g.shotsAgainst) : "–"}
                  </TableCell>
                  <TableCell className="text-right">{g.xGoalsAgainst !== null ? g.xGoalsAgainst.toFixed(2) : "–"}</TableCell>
                  <TableCell
                    className={cn(
                      "pr-4 text-right font-medium sm:pr-5",
                      g.goalsSavedAboveExpected !== null && (g.goalsSavedAboveExpected >= 0 ? "text-success" : "text-error"),
                    )}
                  >
                    {g.goalsSavedAboveExpected !== null ? signed(g.goalsSavedAboveExpected) : "–"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      </Section>
    </div>
  );
}

function GameLogBody({ data }: { data: PlayerGameLogResponse }) {
  if (!data.available) {
    return <ErrorState title="Couldn't load the game log" message="The NHL game log is unavailable right now." />;
  }
  if (data.games.length === 0) {
    return (
      <EmptyState
        title={data.isPlayoffs ? "No playoff games this season" : "No games this season"}
        hint="Pick another season above."
      />
    );
  }
  return data.isGoalie ? (
    <GoalieLog games={data.games} season={data.season} />
  ) : (
    <SkaterLog games={data.games} season={data.season} />
  );
}

/**
 * Every game a player played in a season, newest first in the table, with
 * Game Score for skaters and GSAx for goalies.
 */
export function PlayerGameLog({
  playerId,
  seasons,
  season,
  playoffs,
  onChange,
}: {
  playerId: number;
  /** Seasons the player has stats for, newest first. */
  seasons: number[];
  season: number;
  playoffs: boolean;
  onChange: (next: { season?: number; playoffs?: boolean }) => void;
}) {
  const { data, isLoading, isPlaceholderData, error, refetch } = usePlayerGameLog(playerId, season, playoffs);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(season)} onValueChange={(v) => onChange({ season: Number(v) })}>
          <SelectTrigger className="w-32" aria-label="Season">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {formatSeason(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SegmentedControl
          aria-label="Season type"
          value={playoffs ? "playoffs" : "regular"}
          onValueChange={(v) => onChange({ playoffs: v === "playoffs" })}
          options={[
            { value: "regular", label: "Regular season" },
            { value: "playoffs", label: "Playoffs" },
          ]}
        />
      </div>
      {error ? (
        <ErrorState title="Couldn't load the game log" message="The game log request failed." onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <TableSkeleton rows={10} columns={10} />
        </div>
      ) : (
        <div className={cn(isPlaceholderData && "opacity-60 transition-opacity")}>
          <GameLogBody data={data} />
        </div>
      )}
    </div>
  );
}
