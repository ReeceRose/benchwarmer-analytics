import { useId, type ReactNode } from "react";

const LINE = "var(--border)";
const RED = "color-mix(in srgb, var(--rink-red) 45%, transparent)";
const BLUE = "color-mix(in srgb, var(--rink-blue) 45%, transparent)";
const CORNER = 28;
const BOARDS = `M100,-42.5 H${CORNER} A${CORNER},${CORNER} 0 0 0 0,${-42.5 + CORNER} V${42.5 - CORNER} A${CORNER},${CORNER} 0 0 0 ${CORNER},42.5 H100 Z`;

// One offensive zone plus the neutral zone, in feet, with the goal on the left:
// x runs from the end boards (0) to centre ice (100) and y from -42.5 to 42.5.
// Place shots with `toHalfRink` from shot-utils.

/** The slot box the game centre draws: 35 ft out from the goal line, between the faceoff dots. */
const SLOT = { x: 11, y: -22, width: 35, height: 44 } as const;

/**
 * An offensive-zone rink drawn in theme tokens (the game centre's `Rink`,
 * cut in half). Children are clipped to the boards.
 */
export function HalfRink({
  children,
  showSlot = true,
  underlay = false,
  label,
}: {
  children?: ReactNode;
  showSlot?: boolean;
  /** Draw the children under the markings (heat maps) rather than over them (shot dots). */
  underlay?: boolean;
  label: string;
}) {
  const clipId = useId();
  return (
    <svg viewBox="-0.5 -43 101 86" className="block h-auto w-full" role="img" aria-label={label}>
      <defs>
        <clipPath id={clipId}>
          <path d={BOARDS} />
        </clipPath>
      </defs>
      <path d={BOARDS} fill="var(--card)" />
      <g clipPath={`url(#${clipId})`}>
        {underlay && children}
        <line x1={11} x2={11} y1={-42.5} y2={42.5} stroke={RED} strokeWidth={0.4} />
        <line x1={75} x2={75} y1={-42.5} y2={42.5} stroke={BLUE} strokeWidth={1} />
        <line x1={99.5} x2={99.5} y1={-42.5} y2={42.5} stroke={RED} strokeWidth={1} />
        <path d="M11,-4 A6,6 0 0,1 11,4" fill="color-mix(in srgb, var(--rink-blue) 10%, transparent)" stroke={RED} strokeWidth={0.3} />
        <rect x={7.7} y={-3} width={3.3} height={6} fill="none" stroke="var(--muted-foreground)" strokeWidth={0.4} />
        {[-22, 22].map((y) => (
          <g key={y}>
            <circle cx={31} cy={y} r={15} fill="none" stroke={RED} strokeWidth={0.4} />
            <circle cx={31} cy={y} r={0.9} fill={RED} />
            <circle cx={80} cy={y} r={0.9} fill={RED} />
          </g>
        ))}
        {showSlot && (
          <rect
            {...SLOT}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeOpacity={0.5}
            strokeWidth={0.35}
            strokeDasharray="1.5 1.2"
          />
        )}
        {!underlay && children}
      </g>
      <path d={BOARDS} fill="none" stroke={LINE} strokeWidth={0.6} />
    </svg>
  );
}
