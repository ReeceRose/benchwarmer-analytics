import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SegmentedControl } from "@/components/layout";
import { SortableTableHeader } from "@/components/shared";
import { Card, Swatch, TeamLabel } from "@/components/game-live/parts";
import { SIDES, fmt, mmss, share, signed, teamColour } from "@/components/game-live/live-utils";
import { cn } from "@/lib/utils";
import type { LiveGameResponse, LiveGoalie, LiveSkater, TeamSide } from "@/types";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("font-display text-lg font-bold tabular-nums", tone === "good" && "text-success", tone === "bad" && "text-error")}>
        {value}
      </div>
    </div>
  );
}

function GoalieCard({ goalie }: { goalie: LiveGoalie }) {
  const gsax = goalie.xgAgainst - goalie.goalsAgainst;
  const pct = (v: number | null) => (v == null ? "–" : v.toFixed(3).replace(/^0/, ""));
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Link to="/players/$id" params={{ id: String(goalie.playerId) }} className="font-semibold hover:text-link">
          #{goalie.number} {goalie.name}
        </Link>
        <span className="text-xs text-muted-foreground tabular-nums">
          TOI {goalie.toi}
          {goalie.decision && ` · ${goalie.decision}`}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Saves" value={`${goalie.saves}/${goalie.shotsAgainst}`} />
        <Stat label="SV%" value={pct(goalie.savePct)} />
        <Stat label="xG against" value={fmt(goalie.xgAgainst, 2)} />
        <Stat label="GSAx" value={signed(gsax, 2)} tone={gsax >= 0 ? "good" : "bad"} />
      </div>
      <table className="mt-3 w-full text-sm tabular-nums">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="pb-1 text-left font-medium">Saves / shots</th>
            <th className="pb-1 text-right font-medium">Even</th>
            <th className="pb-1 text-right font-medium">Opp. PP</th>
            <th className="pb-1 text-right font-medium">Opp. SH</th>
            <th className="pb-1 text-right font-medium">High danger</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            <td />
            <td className="py-1 text-right">{goalie.evenStrength ?? "–"}</td>
            <td className="py-1 text-right">{goalie.powerPlay ?? "–"}</td>
            <td className="py-1 text-right">{goalie.shorthanded ?? "–"}</td>
            <td className="py-1 text-right">{goalie.highDangerShots - goalie.highDangerGoals}/{goalie.highDangerShots}</td>
          </tr>
        </tbody>
      </table>
      {goalie.season && (
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
          Season: {goalie.season.gamesPlayed} GP · {goalie.season.wins} W · {goalie.season.gaa.toFixed(2)} GAA · {pct(goalie.season.savePct)} SV% · {goalie.season.shutouts} SO
        </p>
      )}
    </div>
  );
}

const playedInGame = (g: LiveGoalie) => g.shotsAgainst > 0 || /[1-9]/.test(g.toi);

// Once the game is under way, drop the backup who hasn't played; before puck drop
// (nobody has TOI yet) show both. A goalie who's subbed in gets TOI and appears.
function goaliesFor(data: LiveGameResponse, side: TeamSide) {
  const goalies = data.goalies.filter((g) => g.team === side);
  const played = goalies.filter(playedInGame);
  return played.length ? played : goalies;
}

export function GoaltendingSection({ data }: { data: LiveGameResponse }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {SIDES.map((side) => (
        <Card key={side} title={<TeamLabel side={side}>{data[side].name}</TeamLabel>}>
          <div className="space-y-3">
            {goaliesFor(data, side).map((g) => (
              <GoalieCard key={g.playerId} goalie={g} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

type View = "shooting" | "onIce" | "usage" | "physical";

interface Column {
  key: string;
  label: string;
  title?: string;
  value: (s: LiveSkater) => number | null;
  format?: (v: number | null) => string;
  tone?: (v: number | null) => "good" | "bad" | null;
  bar?: boolean;
}

const pctTone = (v: number | null) => (v == null ? null : v >= 55 ? "good" : v <= 45 ? "bad" : null);
const time = (v: number | null) => (v ? mmss(v) : "–");

const VIEWS: Record<View, Column[]> = {
  shooting: [
    { key: "g", label: "G", value: (s) => s.goals },
    { key: "sog", label: "SOG", value: (s) => s.shotsOnGoal },
    { key: "att", label: "Att", title: "Shot attempts", value: (s) => s.attempts, bar: true },
    { key: "ub", label: "Unbl", title: "Unblocked attempts", value: (s) => s.unblocked },
    { key: "hd", label: "HD", title: "High-danger chances", value: (s) => s.highDanger },
    { key: "ixg", label: "ixG", title: "Individual expected goals", value: (s) => s.ixg, format: (v) => fmt(v, 2), bar: true },
    { key: "gax", label: "G−ixG", title: "Goals above expected", value: (s) => s.goals - s.ixg, format: (v) => signed(v ?? 0, 2), tone: (v) => (v == null ? null : v > 0.3 ? "good" : v < -0.5 ? "bad" : null) },
    { key: "ppg", label: "PPG", value: (s) => s.powerPlayGoals },
    { key: "pts", label: "P", value: (s) => s.points },
  ],
  onIce: [
    { key: "cf", label: "CF", title: "On-ice attempts for", value: (s) => s.onIceAttemptsFor },
    { key: "ca", label: "CA", title: "On-ice attempts against", value: (s) => s.onIceAttemptsAgainst },
    { key: "cfp", label: "CF%", value: (s) => share(s.onIceAttemptsFor, s.onIceAttemptsAgainst), format: (v) => fmt(v), tone: pctTone },
    { key: "evcf", label: "EV CF%", title: "Even-strength attempt share", value: (s) => share(s.evAttemptsFor, s.evAttemptsAgainst), format: (v) => fmt(v), tone: pctTone },
    { key: "xgf", label: "xGF", value: (s) => s.onIceXgFor, format: (v) => fmt(v, 2), bar: true },
    { key: "xga", label: "xGA", value: (s) => s.onIceXgAgainst, format: (v) => fmt(v, 2) },
    { key: "xgp", label: "xGF%", value: (s) => share(s.onIceXgFor, s.onIceXgAgainst), format: (v) => fmt(v), tone: pctTone },
    { key: "gf", label: "GF", value: (s) => s.onIceGoalsFor },
    { key: "ga", label: "GA", value: (s) => s.onIceGoalsAgainst },
    { key: "pm", label: "+/−", value: (s) => s.plusMinus, format: (v) => signed(v ?? 0) },
  ],
  usage: [
    { key: "toi", label: "TOI", value: (s) => s.toiSeconds, format: time, bar: true },
    { key: "ev", label: "EV", value: (s) => s.toiEv, format: time },
    { key: "pp", label: "PP", value: (s) => s.toiPp, format: time },
    { key: "sh", label: "SH", value: (s) => s.toiSh, format: time },
    { key: "shifts", label: "Shifts", value: (s) => s.shifts },
    { key: "avg", label: "Avg shift", value: (s) => (s.shifts ? s.toiSeconds / s.shifts : null), format: time },
    { key: "fow", label: "FOW", value: (s) => s.faceoffWins },
    { key: "fol", label: "FOL", value: (s) => s.faceoffLosses },
    { key: "fo", label: "FO%", value: (s) => share(s.faceoffWins, s.faceoffLosses), format: (v) => fmt(v) },
  ],
  physical: [
    { key: "hits", label: "Hits", value: (s) => s.hits, bar: true },
    { key: "hitsTaken", label: "Hit by", title: "Times hit", value: (s) => s.hitsTaken },
    { key: "blk", label: "Blk", title: "Shots blocked", value: (s) => s.blocks },
    { key: "tk", label: "TK", title: "Takeaways", value: (s) => s.takeaways },
    { key: "gv", label: "GV", title: "Giveaways", value: (s) => s.giveaways },
    { key: "pim", label: "PIM", value: (s) => s.pim },
    { key: "drawn", label: "Pen drawn", value: (s) => s.penaltiesDrawn },
    { key: "taken", label: "Pen taken", value: (s) => s.penaltiesTaken },
  ],
};

export function AdvancedSkatersTable({ data }: { data: LiveGameResponse }) {
  const [team, setTeam] = useState<TeamSide>("away");
  const [view, setView] = useState<View>("shooting");
  const columns = VIEWS[view];
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: "att", desc: true });
  const sortCol = columns.find((c) => c.key === sort.key) ?? columns[0];
  const rows = useMemo(() => {
    const list = data.skaters.filter((s) => s.team === team);
    return [...list].sort((a, b) => {
      const d = (sortCol.value(a) ?? -1e9) - (sortCol.value(b) ?? -1e9);
      return sort.desc ? -d : d;
    });
  }, [data.skaters, team, sortCol, sort.desc]);
  const max = Object.fromEntries(columns.map((c) => [c.key, Math.max(...rows.map((r) => c.value(r) ?? 0), 1e-9)]));
  const onSort = (key: string) => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }));

  return (
    <Card>
      <div className="mb-3 flex flex-wrap gap-2">
        <SegmentedControl aria-label="Team" value={team} onValueChange={setTeam}
          options={SIDES.map((s) => ({ value: s, label: data[s].name }))} />
        <SegmentedControl aria-label="View" value={view} onValueChange={(v) => { setView(v); setSort({ key: VIEWS[v][0].key, desc: true }); }}
          options={[{ value: "shooting", label: "Shooting" }, { value: "onIce", label: "On-ice" }, { value: "usage", label: "Usage" }, { value: "physical", label: "Physical" }]} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-2 pr-2 text-left font-medium">#</th>
              <th className="sticky left-0 z-10 bg-card py-2 pr-2 text-left font-medium">Player</th>
              <th className="py-2 pr-2 text-left font-medium">Pos</th>
              {columns.map((c) => (
                <SortableTableHeader
                  key={c.key}
                  label={c.label}
                  tooltip={c.title}
                  sortKey={c.key}
                  currentSort={sortCol.key}
                  sortDesc={sort.desc}
                  onSort={onSort}
                  className="py-2 text-right"
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.playerId} className="border-b last:border-0">
                <td className="py-1.5 pr-2 text-muted-foreground">{r.number}</td>
                <td className="sticky left-0 z-10 bg-card py-1.5 pr-2 font-medium whitespace-nowrap">
                  <Link to="/players/$id" params={{ id: String(r.playerId) }} className="hover:text-link">{r.name}</Link>
                </td>
                <td className="py-1.5 pr-2 text-muted-foreground">{r.position}</td>
                {columns.map((c) => {
                  const v = c.value(r);
                  const tone = c.tone?.(v);
                  return (
                    <td key={c.key} className={cn("relative py-1.5 pl-3 text-right", tone === "good" && "text-success", tone === "bad" && "text-error")}>
                      {c.format ? c.format(v) : (v ?? "–")}
                      {c.bar && (
                        <div className="absolute right-0 bottom-0.5 h-0.5 rounded-full opacity-60" style={{ width: `${(100 * (v ?? 0)) / max[c.key]}%`, background: teamColour(team) }} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Attempts, xG, on-ice and strength splits come from play-by-play and shift charts. The shift feed trails live play by a few minutes.
      </p>
    </Card>
  );
}

export function GameLeaders({ data }: { data: LiveGameResponse }) {
  const cats: { label: string; value: (s: LiveSkater) => number; format?: (v: number) => string }[] = [
    // gameScore can be missing from a response cached before it was added.
    { label: "Game Score", value: (s) => s.gameScore?.total ?? 0, format: (v) => v.toFixed(2) },
    { label: "Points", value: (s) => s.points },
    { label: "Shots on goal", value: (s) => s.shotsOnGoal },
    { label: "Individual xG", value: (s) => s.ixg, format: (v) => v.toFixed(2) },
    { label: "Hits", value: (s) => s.hits },
    { label: "Blocked shots", value: (s) => s.blocks },
    { label: "Ice time", value: (s) => s.toiSeconds, format: mmss },
    { label: "Faceoff wins", value: (s) => s.faceoffWins },
    { label: "Takeaways", value: (s) => s.takeaways },
  ];
  return (
    <Card>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        {cats.map((cat) => {
          const top = [...data.skaters].sort((a, b) => cat.value(b) - cat.value(a)).slice(0, 3);
          return (
            <div key={cat.label}>
              <div className="mb-1 text-xs text-muted-foreground">{cat.label}</div>
              {top.map((s, i) => (
                <div key={s.playerId} className={cn("flex justify-between gap-2 py-0.5 tabular-nums", i === 0 ? "font-semibold" : "text-[13px]")}>
                  <span className="inline-flex min-w-0 items-center gap-1.5" title={s.name}>
                    <Swatch side={s.team} />
                    <span className="truncate">{s.name}</span>
                  </span>
                  <span>{cat.format ? cat.format(cat.value(s)) : cat.value(s)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
