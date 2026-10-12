import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  ESSENTIAL_SECTIONS,
  GAME_CENTRE_SECTIONS,
  type GameCentreSectionId,
  type useGameCentreSections,
} from "@/components/game-live/useGameCentreSections";

interface GameCentreSettingsProps {
  sections: ReturnType<typeof useGameCentreSections>;
  /** Sections that exist for this game (e.g. "On ice now" only while live). */
  available: ReadonlySet<GameCentreSectionId>;
}

export function GameCentreSettings({ sections, available }: GameCentreSettingsProps) {
  const options = GAME_CENTRE_SECTIONS.filter((s) => available.has(s.id));
  const groups = [...new Set(options.map((s) => s.group))];
  const shown = options.filter((s) => sections.isVisible(s.id)).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="size-4" />
          Sections
          <span className="text-xs text-muted-foreground tabular-nums">
            {shown}/{options.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-xl p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <span className="text-sm font-semibold">Show on this page</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => sections.showOnly("all")}>All</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => sections.showOnly(ESSENTIAL_SECTIONS)}>Essentials</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => sections.showOnly("none")}>None</Button>
          </div>
        </div>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-4 py-3">
          {groups.map((group) => (
            <div key={group}>
              <div className="mb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{group}</div>
              {options
                .filter((s) => s.group === group)
                .map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-1">
                    <Label htmlFor={`gc-${s.id}`} className="cursor-pointer text-sm font-normal">{s.label}</Label>
                    <Switch id={`gc-${s.id}`} checked={sections.isVisible(s.id)} onCheckedChange={(v) => sections.setVisible(s.id, v)} />
                  </div>
                ))}
            </div>
          ))}
        </div>
        <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">Your choice is saved in this browser and applies to every game.</p>
      </PopoverContent>
    </Popover>
  );
}
