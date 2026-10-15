import type { Ref } from "react";
import { LiveIndicator } from "@/components/shared";
import { StackedBar } from "@/components/game-live/parts";
import { SIDES, fmt, periodName, teamColour } from "@/components/game-live/live-utils";
import { getSameOriginTeamLogoUrl } from "@/lib/team-logos";
import { cn } from "@/lib/utils";
import type { LiveGameResponse, TeamSide } from "@/types";

function parsePowerPlay(value: string | null): [number, number] {
  const [goals, chances] = (value ?? "0/0").split("/").map(Number);
  return [goals || 0, chances || 0];
}

function clockText(data: LiveGameResponse): string {
  const { meta } = data;
  if (meta.gameState === "OFF" || meta.gameState === "FINAL" || meta.gameState === "OVER") {
    return meta.periodType && meta.periodType !== "REG" ? `Final/${meta.periodType}` : "Final";
  }
  if (meta.inIntermission) return `${periodName(meta.period)} intermission`;
  return `${periodName(meta.period)} ${meta.timeRemaining ?? ""}`.trim();
}

function situationText(data: LiveGameResponse): string | null {
  const s = data.situation;
  if (!s?.powerPlayTeam) return null;
  const pp = s.powerPlayTeam === "away" ? [s.awaySkaters, s.homeSkaters] : [s.homeSkaters, s.awaySkaters];
  const team = data[s.powerPlayTeam].abbrev;
  return `${team} PP ${pp[0]}v${pp[1]}${s.timeRemaining ? ` · ${s.timeRemaining}` : ""}`;
}

interface StatRow {
  label: string;
  away: number;
  home: number;
  awayText: string;
  homeText: string;
}

function statRows(data: LiveGameResponse): StatRow[] {
  const a = data.stats.away.all;
  const h = data.stats.home.all;
  const [aPpg, aPpo] = parsePowerPlay(data.powerPlay.away);
  const [hPpg, hPpo] = parsePowerPlay(data.powerPlay.home);
  const shootingPct = (side: TeamSide) => {
    const sog = data[side].shotsOnGoal;
    return sog > 0 ? (100 * data[side].score) / sog : 0;
  };
  return [
    { label: "Shots on goal", away: data.away.shotsOnGoal, home: data.home.shotsOnGoal, awayText: String(data.away.shotsOnGoal), homeText: String(data.home.shotsOnGoal) },
    { label: "Expected goals", away: a.xg, home: h.xg, awayText: fmt(a.xg, 2), homeText: fmt(h.xg, 2) },
    { label: "Shot attempts", away: a.attempts, home: h.attempts, awayText: String(a.attempts), homeText: String(h.attempts) },
    { label: "Power play", away: aPpg, home: hPpg, awayText: `${aPpg}/${aPpo}`, homeText: `${hPpg}/${hPpo}` },
    { label: "Shooting %", away: shootingPct("away"), home: shootingPct("home"), awayText: `${fmt(shootingPct("away"), 1)}%`, homeText: `${fmt(shootingPct("home"), 1)}%` },
  ];
}

function TeamColumn({ data, side }: { data: LiveGameResponse; side: TeamSide }) {
  const team = data[side];
  const logo = "size-16 shrink-0 object-contain sm:size-20";
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <img src={getSameOriginTeamLogoUrl(team.abbrev, "light")} alt={`${team.name} logo`} className={cn(logo, "dark:hidden")} />
      <img src={getSameOriginTeamLogoUrl(team.abbrev, "dark")} alt={`${team.name} logo`} className={cn(logo, "hidden dark:block")} />
      <span className="text-sm font-semibold">{team.abbrev}</span>
    </div>
  );
}

function PeriodTable({ data }: { data: LiveGameResponse }) {
  const played = Object.keys(data.stats.away.byPeriod).map(Number);
  const periods = Array.from({ length: Math.max(3, data.meta.period, ...played) }, (_, i) => i + 1);
  const cell = (side: TeamSide, p: number, key: "goals" | "shotsOnGoal") =>
    p > data.meta.period ? null : (data.stats[side].byPeriod[p]?.[key] ?? 0);
  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          <th className="py-1 text-left font-medium">
            <span className="sr-only">Team</span>
          </th>
          {periods.map((p) => (
            <th key={p} className="py-1 text-center font-medium">{periodName(p)}</th>
          ))}
          <th className="py-1 text-center font-medium">T</th>
        </tr>
      </thead>
      <tbody>
        {SIDES.map((side) => (
          <tr key={side}>
            <td className="py-0.5 font-medium">{data[side].abbrev}</td>
            {periods.map((p) => {
              const goals = cell(side, p, "goals");
              return (
                <td key={p} className={cn("py-0.5 text-center", goals === null && "text-muted-foreground")}>
                  {goals ?? "–"}
                </td>
              );
            })}
            <td className="py-0.5 text-center font-semibold">{data[side].score}</td>
          </tr>
        ))}
        <tr className="border-t text-muted-foreground">
          <td className="pt-1">Shots</td>
          {periods.map((p) => {
            const away = cell("away", p, "shotsOnGoal");
            return (
              <td key={p} className="pt-1 text-center">
                {away === null ? "–" : `${away}–${cell("home", p, "shotsOnGoal")}`}
              </td>
            );
          })}
          <td className="pt-1 text-center text-foreground">
            {data.away.shotsOnGoal}–{data.home.shotsOnGoal}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function StatBar({ row }: { row: StatRow }) {
  const total = row.away + row.home;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm tabular-nums">
        <span className={cn(row.away > row.home ? "font-bold" : "text-muted-foreground")}>{row.awayText}</span>
        <span className="text-xs text-muted-foreground">{row.label}</span>
        <span className={cn(row.home > row.away ? "font-bold" : "text-muted-foreground")}>{row.homeText}</span>
      </div>
      {total > 0 ? (
        <StackedBar
          className="mt-1 h-1.5"
          parts={[
            { value: row.away, colour: teamColour("away"), label: "Away" },
            { value: row.home, colour: teamColour("home"), label: "Home" },
          ]}
        />
      ) : (
        <div className="mt-1 h-1.5 rounded-full bg-muted" />
      )}
    </div>
  );
}

function gameDate(data: LiveGameResponse): string | null {
  if (!data.meta.startTimeUtc) return null;
  return new Date(data.meta.startTimeUtc).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

/**
 * One game at a glance: score, goals and shots by period, five head-to-head
 * bars and the last goal. Self-contained (logos from our origin, a source
 * line at the bottom) so the share dialog can export it as an image.
 */
export function GameScorecard({ data, ref }: { data: LiveGameResponse; ref?: Ref<HTMLDivElement> }) {
  const situation = situationText(data);
  const lastGoal = data.goals.at(-1);
  const isLive = data.meta.gameState === "LIVE" || data.meta.gameState === "CRIT";
  const date = gameDate(data);

  return (
    <div ref={ref} className="min-w-0 rounded-2xl border bg-card p-4 text-card-foreground sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-2">
          {isLive && <LiveIndicator />}
          <span className="font-medium tabular-nums">{clockText(data)}</span>
        </span>
        {situation ? (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">{situation}</span>
        ) : (
          date && <span className="text-muted-foreground">{date}</span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamColumn data={data} side="away" />
        <div className="flex items-center gap-3 font-display text-5xl font-bold tabular-nums">
          <span>{data.away.score}</span>
          <span className="text-2xl text-muted-foreground">–</span>
          <span>{data.home.score}</span>
        </div>
        <TeamColumn data={data} side="home" />
      </div>

      <div className="mt-4 rounded-xl border px-3 py-2">
        <PeriodTable data={data} />
      </div>

      <div className="mt-4 space-y-2.5">
        {statRows(data).map((row) => (
          <StatBar key={row.label} row={row} />
        ))}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">
          {lastGoal
            ? `Last goal: ${lastGoal.scorer} (${data[lastGoal.team].abbrev}), ${periodName(lastGoal.period)} ${lastGoal.timeInPeriod}${lastGoal.strength && lastGoal.strength !== "EV" ? ` · ${lastGoal.strength}` : ""}`
            : "No goals yet"}
        </span>
        <span className="shrink-0 font-display font-semibold text-foreground">Benchwarmer</span>
      </div>
    </div>
  );
}
