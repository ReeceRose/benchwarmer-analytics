import type { ReactNode } from "react";

// NHL coordinates in feet: x from -100 to 100 (goal lines at ±89), y from
// -42.5 to 42.5. SVG y runs downward, so callers plot -y to keep the NHL's
// orientation.
const LINE = "var(--border)";
const RED = "color-mix(in srgb, var(--chart-2) 45%, transparent)";
const BLUE = "color-mix(in srgb, var(--chart-1) 45%, transparent)";

/** A full rink with a band below it for direction labels. */
export function Rink({ children, labels }: { children?: ReactNode; labels?: [string, string] }) {
  return (
    <svg viewBox="-101 -43.5 202 94" className="w-full" role="img">
      <rect x={-100} y={-42.5} width={200} height={85} rx={28} fill="var(--card)" stroke={LINE} strokeWidth={0.6} />
      <line x1={0} x2={0} y1={-42.5} y2={42.5} stroke={RED} strokeWidth={1} />
      {[-25, 25].map((x) => (
        <line key={x} x1={x} x2={x} y1={-42.5} y2={42.5} stroke={BLUE} strokeWidth={1} />
      ))}
      {[-89, 89].map((x) => (
        <g key={x}>
          <line x1={x} x2={x} y1={-37} y2={37} stroke={RED} strokeWidth={0.4} />
          <path
            d={`M${x},-4 A6,6 0 0,${x > 0 ? 0 : 1} ${x},4`}
            fill="color-mix(in srgb, var(--chart-1) 10%, transparent)"
            stroke={RED}
            strokeWidth={0.3}
          />
          <rect x={x > 0 ? x : x - 3.3} y={-3} width={3.3} height={6} fill="none" stroke="var(--muted-foreground)" strokeWidth={0.4} />
          <rect
            x={x > 0 ? 54 : -89}
            y={-22}
            width={35}
            height={44}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeOpacity={0.5}
            strokeWidth={0.35}
            strokeDasharray="1.5 1.2"
          />
        </g>
      ))}
      <circle cx={0} cy={0} r={15} fill="none" stroke={BLUE} strokeWidth={0.4} />
      {[[69, 22], [69, -22], [-69, 22], [-69, -22]].map(([cx, cy]) => (
        <g key={`${cx},${cy}`}>
          <circle cx={cx} cy={cy} r={15} fill="none" stroke={RED} strokeWidth={0.4} />
          <circle cx={cx} cy={cy} r={0.9} fill={RED} />
        </g>
      ))}
      {[[20, 22], [20, -22], [-20, 22], [-20, -22]].map(([cx, cy]) => (
        <circle key={`${cx},${cy}`} cx={cx} cy={cy} r={0.9} fill={RED} />
      ))}
      {labels && (
        <>
          <text x={-55} y={48.5} textAnchor="middle" fontSize={4} fontWeight={600} fill="var(--muted-foreground)">
            {labels[0]}
          </text>
          <text x={55} y={48.5} textAnchor="middle" fontSize={4} fontWeight={600} fill="var(--muted-foreground)">
            {labels[1]}
          </text>
        </>
      )}
      {children}
    </svg>
  );
}
