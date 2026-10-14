import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Swatch } from "@/components/game-live/parts";
import { opposite } from "@/components/game-live/live-utils";
import {
  CHART_CHOICES,
  DEFAULT_SIDE_COLOURS,
  resolveSideColour,
  type SideColourChoice,
  type useSideColours,
} from "@/components/game-live/useSideColours";
import { getTeamColours } from "@/lib/team-colours";
import { cn } from "@/lib/utils";
import type { TeamSide } from "@/types";

interface TeamColourPickerProps {
  side: TeamSide;
  name: string;
  abbrev: string;
  colours: ReturnType<typeof useSideColours>;
}

/** A team's colour key; clicking it opens a picker for that side's colour. */
export function TeamColourPicker({ side, name, abbrev, colours }: TeamColourPickerProps) {
  const current = colours.choices[side];
  const other = colours.choices[opposite(side)];
  const { primary, accent } = getTeamColours(abbrev);
  const brand: SideColourChoice[] = primary === accent ? ["brand-primary"] : ["brand-primary", "brand-accent"];
  const custom = current.startsWith("#") ? current : "#ff4c00";

  const option = (choice: SideColourChoice, label: string) => {
    const taken = choice === other && !choice.startsWith("brand-");
    return (
      <button
        key={choice}
        type="button"
        disabled={taken}
        title={taken ? `${label} (used by the other team)` : label}
        aria-label={label}
        aria-pressed={choice === current}
        onClick={() => colours.setChoice(side, choice)}
        className={cn(
          "grid size-7 place-items-center rounded-md ring-offset-2 ring-offset-popover hover:ring-2 hover:ring-border disabled:cursor-not-allowed disabled:opacity-30",
          choice === current && "ring-2 ring-foreground hover:ring-foreground",
        )}
        style={{ background: resolveSideColour(choice, abbrev) }}
      >
        {choice === current && <Check className="size-3.5 text-white mix-blend-difference" />}
      </button>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-sm hover:text-foreground"
          aria-label={`Change ${name} colour`}
        >
          <Swatch side={side} />
          {name}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3 rounded-xl p-3">
        <div className="text-sm font-semibold">{name} colour</div>
        <div className="flex flex-wrap gap-2">{CHART_CHOICES.map((c, i) => option(c, `Colour ${i + 1}`))}</div>
        <div>
          <div className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Team colours</div>
          <div className="flex flex-wrap gap-2">
            {brand.map((c) => option(c, c === "brand-primary" ? `${abbrev} primary` : `${abbrev} accent`))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <input
              type="color"
              value={custom}
              onChange={(e) => colours.setChoice(side, e.target.value as SideColourChoice)}
              className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            Custom
          </label>
          {current !== DEFAULT_SIDE_COLOURS[side] && (
            <button
              type="button"
              onClick={() => colours.setChoice(side, null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Applies to the {side} team in every game, saved in this browser.
        </p>
      </PopoverContent>
    </Popover>
  );
}
