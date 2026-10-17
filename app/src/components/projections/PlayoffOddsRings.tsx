import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Panel } from "@/components/layout";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { formatOdds } from "@/lib/odds";
import { colourChroma, coloursAreSimilar, getBrandPalette } from "@/lib/team-colours";
import { getTeamLogoUrl } from "@/lib/team-logos";
import { getTeamName } from "@/lib/team-names";
import { cn } from "@/lib/utils";
import type { TeamPlayoffOdds } from "@/types";

/** Rings from the outside in. Each ring splits the teams' expected share of that round's spots. */
const RINGS = [
  { key: "makePlayoffs", label: "Make playoffs" },
  { key: "winRound1", label: "Make 2nd round" },
  { key: "winRound2", label: "Make conf. final" },
  { key: "winConference", label: "Make Cup final" },
  { key: "winCup", label: "Win Cup" },
] as const;

const SIZE = 640;
const C = SIZE / 2;
const OUTER = 236;
const HUB = 46;
const RING = (OUTER - HUB) / RINGS.length;
const LOGO_R = 288;
const LOGO = 40;
/** Arc length (in viewBox units) a wedge needs at its mid radius before it gets a label. */
const LABEL_MIN_ARC = 30;

function point(r: number, angle: number) {
  return [C + r * Math.sin(angle), C - r * Math.cos(angle)] as const;
}

function wedgePath(r0: number, r1: number, a0: number, a1: number) {
  // A lone wedge covering the whole ring would be a zero-length arc.
  const end = a1 - a0 >= 2 * Math.PI ? a0 + 2 * Math.PI - 1e-4 : a1;
  const large = end - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = point(r1, a0);
  const [x1, y1] = point(r1, end);
  const [x2, y2] = point(r0, end);
  const [x3, y3] = point(r0, a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
}

/**
 * Spread logo angles so neighbours sit at least `gap` apart, starting from
 * their wedges' mid angles (sorted, within one turn) and pushing overlapping
 * pairs apart evenly, so each logo stays as close to its wedge as it can.
 */
function spreadAngles(targets: number[], gap: number) {
  const pos = [...targets];
  const n = pos.length;
  if (n < 2 || n * gap > 2 * Math.PI) return pos;
  for (let iter = 0; iter < 1000; iter++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const between = pos[j] - pos[i] + (j === 0 ? 2 * Math.PI : 0);
      if (between < gap - 1e-4) {
        const push = (gap - between) / 2;
        pos[i] -= push;
        pos[j] += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return pos;
}

/** Conference, then division, then playoff odds, so rivals sit together around the circle. */
function order(teams: TeamPlayoffOdds[]) {
  return [...teams].sort(
    (a, b) =>
      a.conference.localeCompare(b.conference) ||
      a.division.localeCompare(b.division) ||
      b.makePlayoffs - a.makePlayoffs ||
      a.team.localeCompare(b.team),
  );
}

/** Below this OKLCH chroma a brand colour reads as black, grey or white. */
const MIN_VIVID_CHROMA = 0.06;

/**
 * Each team's first vivid brand colour (Bruins gold, not black; Kraken ice
 * blue, not deep navy), stepping to the next when it would blur into its
 * neighbour's. Teams with no vivid colour (Kings) keep their brightest.
 * Drawn as is, not through teamMarkColour: these are big fills with card
 * seams, and clamping lightness washes them out in dark mode.
 */
function wedgeColours(teams: TeamPlayoffOdds[]) {
  const colours: string[] = [];
  teams.forEach((t, i) => {
    const brand = getBrandPalette(t.team);
    const vivid = brand.filter((c) => colourChroma(c) >= MIN_VIVID_CHROMA);
    const palette = [...vivid, ...brand.filter((c) => !vivid.includes(c)).sort((a, b) => colourChroma(b) - colourChroma(a))];
    const prev = colours[i - 1];
    const first = i === teams.length - 1 ? colours[0] : undefined;
    const pick =
      palette.find((c) => (!prev || !coloursAreSimilar(c, prev)) && (!first || !coloursAreSimilar(c, first))) ??
      palette[0] ??
      "#888888";
    colours.push(pick);
  });
  return colours;
}

/**
 * MoneyPuck-style rings: one ring per playoff round, outside in, each split
 * into team wedges sized by the team's share of that round's expected spots.
 * Hover (or tap) a team to trace it through every ring.
 */
export function PlayoffOddsRings({ teams, season }: { teams: TeamPlayoffOdds[]; season: number }) {
  const sorted = order(teams);
  const colours = wedgeColours(sorted);
  const favourite = teams.reduce((best, t) => (t.winCup > best.winCup ? t : best), teams[0]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = hovered ?? pinned;
  const shown = teams.find((t) => t.team === (active ?? favourite.team)) ?? favourite;

  const rings = RINGS.map((ring, ri) => {
    const total = sorted.reduce((s, t) => s + t[ring.key], 0) || 1;
    const r1 = OUTER - ri * RING;
    const r0 = r1 - RING;
    let angle = 0;
    return sorted.map((t, ti) => {
      const a0 = angle;
      angle += (t[ring.key] / total) * 2 * Math.PI;
      return { team: t.team, colour: colours[ti], value: t[ring.key], r0, r1, a0, a1: angle };
    });
  });

  const outer = rings[0];
  const logoAngles = spreadAngles(
    outer.map((w) => (w.a0 + w.a1) / 2),
    2 * Math.asin((LOGO + 4) / 2 / LOGO_R),
  );

  const select = (team: string) => setPinned((p) => (p === team ? null : team));

  return (
    <Panel>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto w-full max-w-140 touch-manipulation select-none"
          role="img"
          aria-label="Each team's share of playoff spots, round by round, from the playoffs (outside) to the Stanley Cup (centre)"
          onPointerLeave={() => setHovered(null)}
        >
          {sorted.map((t, i) => {
            const mid = (outer[i].a0 + outer[i].a1) / 2;
            const at = logoAngles[i];
            const [x0, y0] = point(OUTER + 2, mid);
            const [x1, y1] = point(LOGO_R - LOGO / 2 - 4, at);
            const [lx, ly] = point(LOGO_R, at);
            const dim = active && active !== t.team;
            return (
              <g
                key={t.team}
                className={cn("cursor-pointer transition-opacity", dim && "opacity-30")}
                onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(t.team)}
                onClick={() => select(t.team)}
              >
                <title>{`${getTeamName(t.team)}: ${formatOdds(t.makePlayoffs)} to make the playoffs, ${formatOdds(t.winCup)} to win the Cup`}</title>
                <line x1={x0} y1={y0} x2={x1} y2={y1} className="stroke-border" strokeWidth={1} />
                <image href={getTeamLogoUrl(t.team, "light")} x={lx - LOGO / 2} y={ly - LOGO / 2} width={LOGO} height={LOGO} className="dark:hidden" />
                <image href={getTeamLogoUrl(t.team, "dark")} x={lx - LOGO / 2} y={ly - LOGO / 2} width={LOGO} height={LOGO} className="hidden dark:inline" />
              </g>
            );
          })}
          {rings.map((ring, ri) =>
            ring.map((w) => {
              const dim = active && active !== w.team;
              const mid = (w.a0 + w.a1) / 2;
              const rMid = (w.r0 + w.r1) / 2;
              const [tx, ty] = point(rMid, mid);
              const labelled = (w.a1 - w.a0) * rMid >= LABEL_MIN_ARC || w.team === active;
              return (
                <g
                  key={`${ri}-${w.team}`}
                  className={cn("cursor-pointer transition-opacity", dim && "opacity-25")}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(w.team)}
                  onClick={() => select(w.team)}
                >
                  {w.a1 > w.a0 && (
                    <path d={wedgePath(w.r0, w.r1, w.a0, w.a1)} fill={w.colour} className="stroke-card" strokeWidth={1.5} strokeLinejoin="round" />
                  )}
                  {labelled && w.value > 0 && (
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="pointer-events-none fill-white stroke-black/70 text-[12px] font-semibold tabular-nums"
                      strokeWidth={3}
                      paintOrder="stroke"
                      strokeLinejoin="round"
                    >
                      {formatOdds(w.value)}
                    </text>
                  )}
                </g>
              );
            }),
          )}
          <circle cx={C} cy={C} r={HUB - 1} className="fill-muted" />
          <text x={C} y={C - 7} textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground text-[11px]">
            Stanley
          </text>
          <text x={C} y={C + 8} textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground text-[11px]">
            Cup
          </text>
        </svg>

        <div className="w-full shrink-0 lg:w-64">
          <h3 className="text-sm font-semibold">Path to the Cup</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Rings run from the playoffs (outside) to the Cup (centre). Each wedge is the team's share of that round's
            spots. Hover or tap a team to trace it.
          </p>
          <Link
            to="/teams/$abbrev"
            params={{ abbrev: shown.team }}
            search={{ season }}
            className="group mb-3 flex items-center gap-3"
          >
            <TeamLogo abbrev={shown.team} size="lg" className="size-12" />
            <div>
              <div className="font-semibold group-hover:text-link">{getTeamName(shown.team)}</div>
              <div className="text-xs text-muted-foreground">
                {active ? (pinned === shown.team ? "Pinned · tap again to clear" : shown.division) : "Cup favourite"}
              </div>
            </div>
          </Link>
          <dl className="space-y-1.5 text-sm">
            {RINGS.map((ring) => (
              <div key={ring.key} className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{ring.label}</dt>
                <dd className="font-semibold tabular-nums">{formatOdds(shown[ring.key])}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Panel>
  );
}
