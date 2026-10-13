import { useMemo } from "react";
import { Panel } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { summariseShooters } from "@/components/shot-explorer/shot-utils";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { Shot } from "@/types";

interface TopShootersProps {
  shots: Shot[];
  teamAbbrev: string;
  onSelect: (playerId: number) => void;
  limit?: number;
}

/** The shooters behind the shots on the map, most expected goals first. Picking one filters the map. */
export function TopShooters({ shots, teamAbbrev, onSelect, limit = 8 }: TopShootersProps) {
  const shooters = useMemo(() => summariseShooters(shots).slice(0, limit), [shots, limit]);

  if (shooters.length === 0) return null;

  return (
    <Panel>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">Top shooters</h3>
        <span className="text-xs text-muted-foreground">By xG</span>
      </div>
      <div className="space-y-1">
        {shooters.map((s) => (
          <button
            key={s.playerId}
            type="button"
            onClick={() => onSelect(s.playerId)}
            title={`Show only ${s.name}'s shots`}
            className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-muted/60"
          >
            <Avatar className="size-7">
              <AvatarImage src={getPlayerHeadshotUrl(s.playerId, teamAbbrev)} alt={s.name} />
              <AvatarFallback className="text-[10px]">{getPlayerInitials(s.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium group-hover:text-link">
                {s.name}
                {s.position && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">{s.position}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {s.shots} shots · {s.goals} G
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums">{s.xGoal.toFixed(1)}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}
