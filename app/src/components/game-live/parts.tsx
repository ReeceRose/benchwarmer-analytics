import type { ReactNode } from "react";
import { Panel } from "@/components/layout";
import { cn } from "@/lib/utils";
import { teamColour } from "@/components/game-live/live-utils";
import type { TeamSide } from "@/types";

export function Swatch({ side, colour, className }: { side?: TeamSide; colour?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-[3px]", className)}
      style={{ background: colour ?? (side ? teamColour(side) : undefined) }}
    />
  );
}

export function TeamLabel({ side, children }: { side: TeamSide; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Swatch side={side} />
      {children}
    </span>
  );
}

/** Two bars growing outward from a centre label, scaled to the larger value. */
export function MirroredBar({
  label,
  away,
  home,
  awayText,
  homeText,
  lowerIsBetter = false,
}: {
  label: ReactNode;
  away: number;
  home: number;
  awayText: string;
  homeText: string;
  lowerIsBetter?: boolean;
}) {
  const max = Math.max(away, home, 1e-9);
  const awayLeads = lowerIsBetter ? away < home : away > home;
  const homeLeads = lowerIsBetter ? home < away : home > away;
  return (
    <div className="grid grid-cols-[3rem_1fr_6.5rem_1fr_3rem] items-center gap-1.5 py-1 text-sm tabular-nums sm:grid-cols-[3.5rem_1fr_9rem_1fr_3.5rem] sm:gap-2">
      <span className={cn("text-right", awayLeads ? "font-bold" : "text-muted-foreground")}>{awayText}</span>
      <div className="flex h-2 justify-end overflow-hidden rounded-full bg-muted">
        <div className="rounded-l-full" style={{ width: `${(100 * away) / max}%`, background: teamColour("away") }} />
      </div>
      <span className="text-center text-xs leading-tight text-muted-foreground">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-2 rounded-r-full" style={{ width: `${(100 * home) / max}%`, background: teamColour("home") }} />
      </div>
      <span className={cn(homeLeads ? "font-bold" : "text-muted-foreground")}>{homeText}</span>
    </div>
  );
}

/** Proportional segments with 2px gaps. */
export function StackedBar({ parts, className }: { parts: { value: number; colour: string; label: string }[]; className?: string }) {
  return (
    <div className={cn("flex h-2.5 gap-0.5", className)}>
      {parts
        .filter((p) => p.value > 0)
        .map((p) => (
          <div key={p.label} title={`${p.label}: ${p.value}`} className="rounded-[3px]" style={{ flex: p.value, background: p.colour }} />
        ))}
    </div>
  );
}

/** The layout Panel with an optional small heading. */
export function Card({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Panel className={className}>
      {title && <h3 className="mb-3 text-sm font-semibold">{title}</h3>}
      {children}
    </Panel>
  );
}
