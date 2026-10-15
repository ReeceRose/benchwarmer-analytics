import { useState } from "react";
import { SegmentedControl } from "@/components/layout";
import { Card, MirroredBar, StackedBar, Swatch, TeamLabel } from "@/components/game-live/parts";
import { SIDES, fmt, mmss, periodName, share, teamColour } from "@/components/game-live/live-utils";
import type { LiveGameResponse, LiveTeamCounts, StrengthState, TeamSide } from "@/types";

function parsePowerPlay(value: string | null): [number, number] {
  const [goals, chances] = (value ?? "0/0").split("/").map(Number);
  return [goals || 0, chances || 0];
}

/** Six headline comparisons under the header. */
export function SummaryTiles({ data }: { data: LiveGameResponse }) {
  const a = data.stats.away.all;
  const h = data.stats.home.all;
  const ev = (side: TeamSide) => data.stats[side].byStrength.EV;
  const [aPpg, aPpo] = parsePowerPlay(data.powerPlay.away);
  const [hPpg, hPpo] = parsePowerPlay(data.powerPlay.home);
  const tiles = [
    { label: "Expected goals", away: a.xg, home: h.xg, digits: 2, note: `Actual ${a.goals}–${h.goals}` },
    { label: "Shot attempts", away: a.attempts, home: h.attempts, note: `CF% ${fmt(share(a.attempts, h.attempts), 1)}` },
    { label: "5v5 attempts", away: ev("away")?.attempts ?? 0, home: ev("home")?.attempts ?? 0, note: `xG ${fmt(ev("away")?.xg, 2)}–${fmt(ev("home")?.xg, 2)}` },
    { label: "High-danger chances", away: a.highDanger, home: h.highDanger, note: "From the slot" },
    { label: "Faceoffs won", away: a.faceoffWins, home: h.faceoffWins, note: `${fmt(share(a.faceoffWins, h.faceoffWins))}% – ${fmt(share(h.faceoffWins, a.faceoffWins))}%` },
    { label: "Power-play goals", away: aPpg, home: hPpg, note: `${aPpg}/${aPpo} vs ${hPpg}/${hPpo}` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => {
        const pct = share(tile.away, tile.home) ?? 50;
        return (
          <div key={tile.label} className="rounded-2xl border bg-card px-4 py-3.5">
            <div className="text-sm text-muted-foreground">{tile.label}</div>
            <div className="mt-0.5 flex items-baseline justify-between font-display text-3xl font-bold tabular-nums">
              <span>{fmt(tile.away, tile.digits ?? 0)}</span>
              <span>{fmt(tile.home, tile.digits ?? 0)}</span>
            </div>
            <StackedBar
              className="mt-2 h-1.5"
              parts={[
                { value: pct, colour: teamColour("away"), label: data.away.abbrev },
                { value: 100 - pct, colour: teamColour("home"), label: data.home.abbrev },
              ]}
            />
            <div className="mt-1.5 flex justify-between gap-2 text-[11px] text-muted-foreground">
              <span>{data.away.abbrev}</span>
              <span className="truncate text-center" title={tile.note}>{tile.note}</span>
              <span>{data.home.abbrev}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Slice = "all" | `p${number}` | StrengthState;

const ROWS: { label: string; key: keyof LiveTeamCounts; digits?: number; lowerIsBetter?: boolean; boxOnly?: boolean }[] = [
  { label: "Goals", key: "goals" },
  { label: "Expected goals", key: "xg", digits: 2 },
  { label: "Shot attempts", key: "attempts" },
  { label: "Unblocked attempts", key: "unblocked" },
  { label: "Shots on goal", key: "shotsOnGoal" },
  { label: "High-danger chances", key: "highDanger" },
  { label: "Missed the net", key: "missed", lowerIsBetter: true },
  { label: "Attempts blocked", key: "blockedByOpponent", lowerIsBetter: true },
  { label: "Blocked shots", key: "blocks" },
  { label: "Hits", key: "hits", boxOnly: true },
  { label: "Takeaways", key: "takeaways", boxOnly: true },
  { label: "Giveaways", key: "giveaways", lowerIsBetter: true, boxOnly: true },
  { label: "Faceoffs won", key: "faceoffWins", boxOnly: true },
  { label: "Penalty minutes", key: "penaltyMinutes", lowerIsBetter: true, boxOnly: true },
];

const EMPTY: LiveTeamCounts = {
  goals: 0, xg: 0, attempts: 0, unblocked: 0, shotsOnGoal: 0, highDanger: 0, missed: 0, blockedByOpponent: 0,
  blocks: 0, hits: 0, giveaways: 0, takeaways: 0, faceoffWins: 0, penaltyMinutes: 0,
};

function HeadToHead({ data }: { data: LiveGameResponse }) {
  const [slice, setSlice] = useState<Slice>("all");
  const periods = Object.keys(data.stats.away.byPeriod).map(Number).sort((x, y) => x - y);
  const pick = (side: TeamSide): LiveTeamCounts => {
    const s = data.stats[side];
    if (slice === "all") return s.all;
    if (slice.startsWith("p")) return s.byPeriod[slice.slice(1)] ?? EMPTY;
    return s.byStrength[slice as StrengthState] ?? EMPTY;
  };
  const a = pick("away");
  const h = pick("home");
  const [aPpg, aPpo] = parsePowerPlay(data.powerPlay.away);
  const [hPpg, hPpo] = parsePowerPlay(data.powerPlay.home);
  const byStrength = slice === "EV" || slice === "PP" || slice === "SH";
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Head to head</h3>
        <SegmentedControl
          aria-label="Game slice"
          value={slice}
          onValueChange={setSlice}
         
          options={[
            { value: "all", label: "Game" },
            ...periods.map((p) => ({ value: `p${p}` as Slice, label: periodName(p) })),
            { value: "EV", label: "Even" },
            { value: "PP", label: "PP" },
            { value: "SH", label: "SH" },
          ]}
        />
      </div>
      {ROWS.filter((r) => !(byStrength && r.boxOnly && r.key === "penaltyMinutes")).map((r) => (
        <MirroredBar
          key={r.key}
          label={r.label}
          away={a[r.key]}
          home={h[r.key]}
          awayText={fmt(a[r.key], r.digits ?? 0)}
          homeText={fmt(h[r.key], r.digits ?? 0)}
          lowerIsBetter={r.lowerIsBetter}
        />
      ))}
      {slice === "all" && (
        <MirroredBar label="Power play" away={aPpg} home={hPpg} awayText={`${aPpg}/${aPpo}`} homeText={`${hPpg}/${hPpo}`} />
      )}
      <div className="mt-3 flex justify-between text-xs text-muted-foreground">
        <TeamLabel side="away">{data.away.name}</TeamLabel>
        <span>{byStrength ? "Strength from each team's point of view" : "Bold = better side"}</span>
        <TeamLabel side="home">{data.home.name}</TeamLabel>
      </div>
    </Card>
  );
}

function ByPeriodTable({ data }: { data: LiveGameResponse }) {
  const periods = Object.keys(data.stats.away.byPeriod).map(Number).sort((x, y) => x - y);
  const rows: { label: string; key: keyof LiveTeamCounts; digits?: number }[] = [
    { label: "Goals", key: "goals" },
    { label: "Shots on goal", key: "shotsOnGoal" },
    { label: "Attempts", key: "attempts" },
    { label: "xG", key: "xg", digits: 2 },
    { label: "High danger", key: "highDanger" },
    { label: "Hits", key: "hits" },
    { label: "Faceoffs won", key: "faceoffWins" },
  ];
  return (
    <Card title="By period">
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="pb-2 text-left font-medium" />
              {periods.map((p) => (
                <th key={p} className="pb-2 text-right font-medium">{periodName(p)}</th>
              ))}
              <th className="pb-2 text-right font-semibold text-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) =>
              SIDES.map((side, i) => (
                <tr key={`${r.key}-${side}`} className={i === 0 ? "border-t" : ""}>
                  <td className="py-1 pr-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-24 text-xs text-muted-foreground">{i === 0 ? r.label : ""}</span>
                      <Swatch side={side} />
                      {data[side].abbrev}
                    </span>
                  </td>
                  {periods.map((p) => (
                    <td key={p} className="py-1 text-right">{fmt(data.stats[side].byPeriod[p]?.[r.key] ?? 0, r.digits ?? 0)}</td>
                  ))}
                  <td className="py-1 text-right font-semibold">{fmt(data.stats[side].all[r.key], r.digits ?? 0)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function FaceoffZones({ data }: { data: LiveGameResponse }) {
  const a = data.stats.away.faceoffsByZone;
  const zones = [
    { label: `${data.away.abbrev} offensive zone`, zone: "O" as const },
    { label: "Neutral zone", zone: "N" as const },
    { label: `${data.home.abbrev} offensive zone`, zone: "D" as const },
  ];
  return (
    <Card title="Faceoffs by zone">
      <div className="space-y-2.5">
        {zones.map(({ label, zone }) => {
          const won = a[zone].won;
          const lost = a[zone].lost;
          return (
            <div key={zone}>
              <div className="flex justify-between text-xs tabular-nums">
                <span className="text-muted-foreground">{label}</span>
                <span>
                  {data.away.abbrev} {won} – {lost} {data.home.abbrev}
                </span>
              </div>
              <StackedBar
                className="mt-1"
                parts={[
                  { value: won, colour: teamColour("away"), label: data.away.abbrev },
                  { value: lost, colour: teamColour("home"), label: data.home.abbrev },
                ]}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TimeByStrength({ data }: { data: LiveGameResponse }) {
  const total = Object.values(data.timeBySkaters).reduce((x, y) => x + y, 0) || 1;
  const entries = Object.entries(data.timeBySkaters).sort((x, y) => y[1] - x[1]);
  return (
    <Card title="Time by strength">
      <div className="space-y-1.5">
        {entries.map(([key, seconds]) => {
          const [away, home] = key.split("v").map(Number);
          const leader: TeamSide | null = away > home ? "away" : home > away ? "home" : null;
          const label = leader ? `${data[leader].abbrev} power play` : away === 5 ? "Even strength" : `${away}-on-${home}`;
          return (
            <div key={key} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3 text-sm tabular-nums">
              <span>
                {label} <span className="text-xs text-muted-foreground">{Math.max(away, home)}v{Math.min(away, home)}</span>
              </span>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${(100 * seconds) / total}%`, background: leader ? teamColour(leader) : "var(--muted-foreground)" }}
                />
              </div>
              <span className="text-right">{mmss(seconds)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ShotOutcomes({ data }: { data: LiveGameResponse }) {
  return (
    <Card title="Shot outcomes">
      <div className="space-y-3">
        {SIDES.map((side) => {
          const c = data.stats[side].all;
          const saved = c.shotsOnGoal - c.goals;
          return (
            <div key={side}>
              <div className="flex flex-wrap justify-between gap-x-3 text-xs">
                <TeamLabel side={side}>
                  <b>{data[side].abbrev}</b> · {c.attempts} attempts
                </TeamLabel>
                <span className="text-muted-foreground tabular-nums">
                  {c.goals} G · {saved} saved · {c.missed} missed · {c.blockedByOpponent} blocked
                </span>
              </div>
              <StackedBar
                className="mt-1.5"
                parts={[
                  { value: c.goals, colour: "var(--foreground)", label: "Goals" },
                  { value: saved, colour: teamColour(side), label: "Saved" },
                  { value: c.missed, colour: `color-mix(in srgb, ${teamColour(side)} 40%, var(--card))`, label: "Missed" },
                  { value: c.blockedByOpponent, colour: "var(--border)", label: "Blocked" },
                ]}
              />
              <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                Sh% {fmt((100 * c.goals) / Math.max(c.shotsOnGoal, 1), 1)} · on target {fmt((100 * c.shotsOnGoal) / Math.max(c.attempts, 1))}%
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">
          Left to right: goals (ink), saved, missed (lighter) and blocked (grey).
        </p>
      </div>
    </Card>
  );
}

export function TeamStatsSection({ data }: { data: LiveGameResponse }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <HeadToHead data={data} />
      <ByPeriodTable data={data} />
      <div className="grid grid-cols-1 content-start gap-4 lg:col-span-2 lg:grid-cols-3 xl:col-span-1 xl:grid-cols-1">
        <FaceoffZones data={data} />
        <TimeByStrength data={data} />
        <ShotOutcomes data={data} />
      </div>
    </div>
  );
}
