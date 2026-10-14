import type { ReactNode } from "react";
import { EyeOff } from "lucide-react";
import { Section } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { GameInfoSection, SeasonContextSection } from "@/components/game-live/ContextSections";
import { AdvancedSkatersTable, GameLeaders, GoaltendingSection } from "@/components/game-live/PlayerSections";
import { LinesSection, OnIceNow, ShiftChart } from "@/components/game-live/DeploymentSections";
import { PenaltiesSection, PuckEventsMap } from "@/components/game-live/EventSections";
import { SummaryTiles, TeamStatsSection } from "@/components/game-live/OverviewSections";
import { GameFlowChart, LiveShotMap, ShotProfile } from "@/components/game-live/ShotSections";
import { GameCentreSettings } from "@/components/game-live/GameCentreSettings";
import { TeamColourPicker } from "@/components/game-live/TeamColourPicker";
import { SIDES } from "@/components/game-live/live-utils";
import {
  GAME_CENTRE_SECTIONS,
  useGameCentreSections,
  type GameCentreSectionId,
} from "@/components/game-live/useGameCentreSections";
import { useSideColours } from "@/components/game-live/useSideColours";
import type { LiveGameResponse } from "@/types";

interface GameCentreProps {
  data: LiveGameResponse | undefined;
  isLoading: boolean;
  isLive: boolean;
  /** The existing box score table, shown as one of the sections. */
  boxscore: ReactNode;
  /** MoneyPuck shot charts for final games; replaces the live flow chart and shot map. */
  moneyPuckCharts?: ReactNode;
}

function HideButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={`Hide ${label}`}
    >
      <EyeOff className="size-3.5" />
      Hide
    </button>
  );
}

export function GameCentre({ data, isLoading, isLive, boxscore, moneyPuckCharts }: GameCentreProps) {
  const sections = useGameCentreSections();
  const colours = useSideColours(data);

  const available = new Set<GameCentreSectionId>(GAME_CENTRE_SECTIONS.map((s) => s.id));
  if (!isLive) available.delete("onIce");
  if (moneyPuckCharts) available.delete("flow");
  if (!data) {
    // Without the live feed, only the box score and MoneyPuck charts remain.
    for (const id of [...available]) if (id !== "boxscore" && !(id === "shotMap" && moneyPuckCharts)) available.delete(id);
  }

  const show = (id: GameCentreSectionId) => available.has(id) && sections.isVisible(id);
  const label = (id: GameCentreSectionId) => GAME_CENTRE_SECTIONS.find((s) => s.id === id)!.label;
  const block = (id: GameCentreSectionId, title: string, description: ReactNode, body: ReactNode) =>
    show(id) && (
      <Section key={id} title={title} description={description} action={<HideButton label={label(id)} onClick={() => sections.setVisible(id, false)} />}>
        {body}
      </Section>
    );

  const updated = data ? new Date(data.meta.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <h2 className="text-xl font-semibold">Game centre</h2>
          <p className="text-sm text-muted-foreground">
            {isLoading && !data
              ? "Loading play-by-play…"
              : data
                ? `${isLive ? "Live from" : "From"} NHL play-by-play and shift charts · ${data.meta.xgSource === "moneypuck" ? "MoneyPuck xG" : "approximate xG until MoneyPuck's arrives"}${updated ? ` · updated ${updated}` : ""}${isLive ? " · refreshes every 20s" : ""}`
                : "Play-by-play isn't available for this game."}
          </p>
          {data && (
            <div className="mt-1.5 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
              {SIDES.map((side) => (
                <TeamColourPicker key={side} side={side} name={data[side].name} abbrev={data[side].abbrev} colours={colours} />
              ))}
            </div>
          )}
        </div>
        <GameCentreSettings sections={sections} available={available} />
      </div>

      {isLoading && !data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      )}

      {data && show("summary") && (
        <div className="space-y-2">
          <SummaryTiles data={data} />
          <div className="flex justify-end">
            <HideButton label={label("summary")} onClick={() => sections.setVisible("summary", false)} />
          </div>
        </div>
      )}

      {data && block("teamStats", "Team stats", "NHL box-score totals plus attempt-based stats from play-by-play.", <TeamStatsSection data={data} />)}

      {data && block("flow", "Game flow", "Cumulative expected goals against actual goals, with power plays shaded; shot attempts in two-minute windows below.", <GameFlowChart data={data} />)}

      {show("shotMap") &&
        (moneyPuckCharts ? (
          <Section
            title="Shot charts"
            description="MoneyPuck shot data for the completed game."
            action={<HideButton label={label("shotMap")} onClick={() => sections.setVisible("shotMap", false)} />}
          >
            <div className="space-y-8">
              {moneyPuckCharts}
              {data && <ShotProfile data={data} />}
            </div>
          </Section>
        ) : (
          data && block(
            "shotMap",
            "Shot map",
            "Every attempt, sized by xG. Hover a shot for details.",
            <div className="grid items-start gap-4 xl:grid-cols-[1.6fr_1fr]">
              <LiveShotMap data={data} />
              <ShotProfile data={data} />
            </div>,
          )
        ))}

      {data && block("goalies", "Goaltending", "NHL save splits plus expected goals against from shots faced. GSAx = xG against − goals against.", <GoaltendingSection data={data} />)}

      {show("boxscore") && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <HideButton label={label("boxscore")} onClick={() => sections.setVisible("boxscore", false)} />
          </div>
          {boxscore}
        </div>
      )}

      {data && block("skaters", "Advanced skater stats", "Individual shooting, on-ice shot share, ice time by strength and physical play.", <AdvancedSkatersTable data={data} />)}

      {data && (show("leaders") || show("onIce")) && (
        <div className={show("leaders") && show("onIce") ? "grid gap-8 lg:grid-cols-2" : ""}>
          {block("leaders", "Game leaders", "Top three in each category so far.", <GameLeaders data={data} />)}
          {block("onIce", "On ice now", "Who's out there, with ice time tonight.", <OnIceNow data={data} />)}
        </div>
      )}

      {data && block("lines", "Lines & pairs", "Most-used 5v5 forward lines and defence pairs from shift data, with on-ice attempts, xG and goals.", <LinesSection data={data} />)}

      {data && block("shiftChart", "Shift chart", "Every shift by player.", <ShiftChart data={data} />)}

      {data && (show("puckEvents") || show("penalties")) && (
        <div className={show("puckEvents") && show("penalties") ? "grid items-start gap-8 lg:grid-cols-2" : ""}>
          {block("puckEvents", "Hits & puck battles", "Where hits, giveaways, takeaways and faceoff wins happened.", <PuckEventsMap data={data} />)}
          {block("penalties", "Penalties", "Every call, who drew it, and what the power play produced.", <PenaltiesSection data={data} />)}
        </div>
      )}

      {data && block("season", "Season context", "Standings and team scoring leaders.", <SeasonContextSection data={data} />)}

      {data && block("info", "Game info", "Officials, broadcasts, scratches and why play stopped.", <GameInfoSection data={data} />)}
    </div>
  );
}
