import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeamLogo } from "@/components/shared";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import { cn } from "@/lib/utils";

export interface RankedBarRow {
  key: string;
  /** Rank shown in the first column. Defaults to the row's position. */
  rank?: number;
  /** Logo + code, or headshot + name. */
  label: ReactNode;
  value: number;
  /** The formatted value shown right of the bar. */
  display: ReactNode;
  /** Optional muted column after the value (record, team), from `sm` up. */
  meta?: ReactNode;
  /** Native hover text for the row. */
  title?: string;
  /** Overrides the bar colour for this row (e.g. forwards vs defence). */
  colour?: string;
}

interface RankedBarsProps<T extends RankedBarRow> {
  rows: readonly T[];
  /** Wraps each row in a link. Spread `className`, `title` and `children` onto it. */
  renderRow: (
    row: T,
    props: { className: string; title?: string; children: ReactNode },
  ) => ReactNode;
  /** "team" fits a logo and code; "player" a headshot and name; "line" two or three surnames. */
  variant?: "team" | "player" | "line";
  headers: { label: string; value: string; meta?: string };
  domain: readonly [number, number];
  ticks: readonly number[];
  formatTick: (value: number) => string;
  /**
   * Where bars grow from. Defaults to the domain minimum (usually zero).
   * Set it to a meaningful middle (league average) and values below it grow
   * left in muted ink.
   */
  baseline?: number;
  /** A dashed reference line (e.g. .500). */
  reference?: number;
  /** Fade bars below the reference instead of colouring rank buckets. */
  fadeBelowReference?: boolean;
  /** A dot on a thin track instead of a bar, for stats that can't start at zero. */
  marker?: "bar" | "dot";
  colour?: string;
  /** Rows are links (hover fill, label turns link blue). Off for rows with nowhere to go. */
  linked?: boolean;
}

const GRID = {
  team: "grid-cols-[1.25rem_4.5rem_1fr_3.5rem] sm:grid-cols-[1.25rem_4.5rem_1fr_3.5rem_4.5rem]",
  player: "grid-cols-[1.25rem_8.5rem_1fr_3.25rem] sm:grid-cols-[1.25rem_11rem_1fr_3.5rem_3rem]",
  line: "grid-cols-[1.25rem_9rem_1fr_3.25rem] sm:grid-cols-[1.25rem_12rem_1fr_3.5rem_4rem]",
};

/**
 * A ranked list with one bar per row: rank, label, a track, the value. Used
 * instead of a tall Recharts bar chart whose axis is only logos or headshots.
 */
export function RankedBars<T extends RankedBarRow>({
  rows,
  renderRow,
  variant = "team",
  headers,
  domain,
  ticks,
  formatTick,
  baseline,
  reference,
  fadeBelowReference = false,
  marker = "bar",
  colour = "var(--chart-1)",
  linked = true,
}: RankedBarsProps<T>) {
  const [min, max] = domain;
  const pct = (value: number) => Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const base = baseline ?? min;
  const grid = cn("grid items-center gap-x-3", GRID[variant]);
  // More than five labels collide on a narrow track: keep every other one,
  // always including the baseline or reference.
  const anchor = ticks.indexOf(baseline ?? reference ?? Number.NaN);
  const parity = anchor >= 0 ? anchor % 2 : 0;
  const shownTicks = ticks.length > 5 ? ticks.filter((_, i) => i % 2 === parity) : ticks;

  return (
    <div>
      <div className={cn(grid, "text-xs text-muted-foreground")}>
        <span />
        <span>{headers.label}</span>
        <span />
        <span className="text-right">{headers.value}</span>
        <span className="hidden text-right sm:block">{headers.meta}</span>
      </div>
      <div className="mt-1 space-y-0.5">
        {rows.map((row, index) => {
          const below = row.value < base;
          const faded = fadeBelowReference && reference != null && row.value < reference;
          const from = Math.min(pct(base), pct(row.value));
          const to = Math.max(pct(base), pct(row.value));
          return renderRow(row, {
            className: cn(grid, "group -mx-2 rounded-xl px-2 py-1", linked && "hover:bg-muted/60"),
            title: row.title,
            children: (
              <>
                <span className="text-xs text-muted-foreground tabular-nums">{row.rank ?? index + 1}</span>
                <span className={cn("flex min-w-0 items-center gap-2 text-sm font-medium", linked && "group-hover:text-link")}>
                  {row.label}
                </span>
                <span className="relative h-5" aria-hidden>
                  {marker === "bar" ? (
                    <>
                      <span className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted" />
                      <span
                        className={cn("absolute top-1/2 h-2 -translate-y-1/2 rounded-full", faded && "opacity-40")}
                        style={{
                          left: `${from}%`,
                          width: `${to - from}%`,
                          background: below ? "var(--muted-foreground)" : (row.colour ?? colour),
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-border" />
                      <span
                        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
                        style={{ left: `${pct(row.value)}%`, background: row.colour ?? colour }}
                      />
                    </>
                  )}
                  {baseline != null && baseline > min && (
                    <span className="absolute inset-y-0 border-l border-foreground/40" style={{ left: `${pct(baseline)}%` }} />
                  )}
                  {reference != null && (
                    <span
                      className="absolute inset-y-0 border-l border-dashed border-muted-foreground/60"
                      style={{ left: `${pct(reference)}%` }}
                    />
                  )}
                </span>
                <span className="text-right text-sm font-semibold tabular-nums">{row.display}</span>
                <span className="hidden truncate text-right text-xs text-muted-foreground tabular-nums sm:block">
                  {row.meta}
                </span>
              </>
            ),
          });
        })}
      </div>
      <div className={cn(grid, "mt-1")}>
        <span />
        <span />
        <span className="relative h-4 text-[11px] text-muted-foreground tabular-nums">
          {shownTicks.map((t, i) => {
            const at = pct(t);
            // On phones the track is narrow: keep the ends and the baseline only.
            const essential = i === 0 || i === shownTicks.length - 1 || t === baseline || t === reference;
            return (
              <span
                key={t}
                className={cn(
                  "absolute whitespace-nowrap",
                  at <= 0 ? "" : at >= 100 ? "-translate-x-full" : "-translate-x-1/2",
                  !essential && "hidden sm:inline",
                )}
                style={{ left: `${at}%` }}
              >
                {formatTick(t)}
              </span>
            );
          })}
        </span>
      </div>
    </div>
  );
}

/** Logo and code, the label for a team row. */
export function RankedTeamLabel({ abbrev }: { abbrev: string }) {
  return (
    <>
      <TeamLogo abbrev={abbrev} size="sm" />
      {abbrev}
    </>
  );
}

/** Headshot and name, the label for a player row. */
export function RankedPlayerLabel({ playerId, name, team }: { playerId: number; name: string; team?: string }) {
  return (
    <>
      <Avatar className="size-6 shrink-0">
        <AvatarImage src={getPlayerHeadshotUrl(playerId, team ?? "")} alt="" loading="lazy" />
        <AvatarFallback className="text-[10px]">{getPlayerInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="truncate">{name}</span>
    </>
  );
}
