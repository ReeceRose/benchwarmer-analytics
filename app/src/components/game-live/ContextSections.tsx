import { Card, TeamLabel } from "@/components/game-live/parts";
import { SIDES, fmt, signed, titleCase } from "@/components/game-live/live-utils";
import { cn } from "@/lib/utils";
import type { LiveGameResponse } from "@/types";

function Kpi({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("font-display text-lg font-bold tabular-nums", tone === "good" && "text-success", tone === "bad" && "text-error")}>{value}</div>
    </div>
  );
}

export function SeasonContextSection({ data }: { data: LiveGameResponse }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {SIDES.map((side) => {
        const s = data.season[side];
        return (
          <Card key={side} title={<TeamLabel side={side}>{data[side].name}</TeamLabel>}>
            {!s ? (
              <p className="text-sm text-muted-foreground">No standings available.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Kpi label="Record" value={`${s.wins}-${s.losses}-${s.otLosses}`} />
                  <Kpi label="Points" value={<>{s.points} <span className="text-xs font-normal text-muted-foreground">({fmt((s.pointPct ?? 0) * 100)}%)</span></>} />
                  <Kpi label="Goal diff" value={signed(s.goalDifferential)} tone={s.goalDifferential >= 0 ? "good" : "bad"} />
                  <Kpi label="League rank" value={s.leagueRank ? `#${s.leagueRank}` : "–"} />
                </div>
                <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm tabular-nums">
                  <dt className="text-muted-foreground">Division</dt>
                  <dd>{s.division ?? "–"}{s.divisionRank ? ` · #${s.divisionRank}` : ""}</dd>
                  <dt className="text-muted-foreground">Home / road</dt>
                  <dd>{s.homeRecord} / {s.roadRecord}</dd>
                  <dt className="text-muted-foreground">Last 10</dt>
                  <dd>{s.last10}{s.streak ? ` · streak ${s.streak}` : ""}</dd>
                  <dt className="text-muted-foreground">GF / GA</dt>
                  <dd>
                    {s.goalsFor} / {s.goalsAgainst}
                    {s.gamesPlayed > 0 && ` (${fmt(s.goalsFor / s.gamesPlayed, 2)} / ${fmt(s.goalsAgainst / s.gamesPlayed, 2)} per game)`}
                  </dd>
                  <dt className="text-muted-foreground">Head coach</dt>
                  <dd>{data[side].headCoach ?? "–"}</dd>
                </dl>
                {s.topScorers.length > 0 && (
                  <table className="mt-3 w-full text-sm tabular-nums">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th className="pb-1 text-left font-medium">Top scorers</th>
                        <th className="pb-1 text-right font-medium">GP</th>
                        <th className="pb-1 text-right font-medium">G</th>
                        <th className="pb-1 text-right font-medium">A</th>
                        <th className="pb-1 text-right font-medium">P</th>
                        <th className="pb-1 text-right font-medium">+/−</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.topScorers.map((p) => (
                        <tr key={p.name} className="border-t">
                          <td className="py-1">{p.name}</td>
                          <td className="py-1 text-right">{p.gamesPlayed}</td>
                          <td className="py-1 text-right">{p.goals}</td>
                          <td className="py-1 text-right">{p.assists}</td>
                          <td className="py-1 text-right font-semibold">{p.points}</td>
                          <td className="py-1 text-right">{signed(p.plusMinus)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export function GameInfoSection({ data }: { data: LiveGameResponse }) {
  const { meta } = data;
  const stoppages = Object.entries(data.stoppages).sort((a, b) => b[1] - a[1]);
  const maxStop = Math.max(1, ...stoppages.map(([, n]) => n));
  const start = meta.startTimeUtc
    ? new Date(meta.startTimeUtc).toLocaleString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" })
    : null;
  const info: [string, React.ReactNode][] = [
    ["Venue", [meta.venue, meta.venueCity].filter(Boolean).join(", ") || "–"],
    ["Start", start ?? "–"],
    ["Broadcast", meta.broadcasts.length ? meta.broadcasts.join(", ") : "–"],
    ["Referees", data.officials.referees.join(", ") || "–"],
    ["Linesmen", data.officials.linesmen.join(", ") || "–"],
    ["Coaches", `${data.away.abbrev}: ${data.away.headCoach ?? "–"} · ${data.home.abbrev}: ${data.home.headCoach ?? "–"}`],
    ["Season series", data.seasonSeries ? `${data.away.abbrev} ${data.seasonSeries.awayWins} – ${data.seasonSeries.homeWins} ${data.home.abbrev}` : "–"],
    ["Feed", `${meta.eventCount} events · ${meta.shiftCount} shifts · updated ${new Date(meta.updatedAt).toLocaleTimeString()}`],
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr]">
      <Card title="Game info" className="md:col-span-2 xl:col-span-1">
        <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
          {info.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {data.reports.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {data.reports.map((r) => (
              <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">{r.label}</a>
            ))}
          </div>
        )}
      </Card>
      <Card title="Scratches & stars">
        <div className="space-y-3 text-sm">
          {SIDES.map((side) => (
            <div key={side}>
              <div className="mb-0.5 text-xs text-muted-foreground"><TeamLabel side={side}>{data[side].abbrev} scratches</TeamLabel></div>
              {data[side].scratches.length ? data[side].scratches.map((n) => <div key={n}>{n}</div>) : <div className="text-muted-foreground">None</div>}
            </div>
          ))}
          <div>
            <div className="mb-0.5 text-xs text-muted-foreground">Three stars</div>
            {data.threeStars.length
              ? data.threeStars.map((s) => <div key={s.star}>{"★".repeat(s.star)} {s.name} <span className="text-muted-foreground">{s.team}</span></div>)
              : <div className="text-muted-foreground">Named after the game</div>}
          </div>
        </div>
      </Card>
      <Card title="Stoppages">
        <div className="space-y-1">
          {stoppages.length === 0 && <p className="text-sm text-muted-foreground">None yet</p>}
          {stoppages.map(([reason, n]) => (
            <div key={reason} className="grid grid-cols-[9.5rem_1fr_1.5rem] items-center gap-2 text-xs tabular-nums">
              <span>{titleCase(reason)}</span>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-muted-foreground/60" style={{ width: `${(100 * n) / maxStop}%` }} />
              </div>
              <span className="text-right">{n}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
