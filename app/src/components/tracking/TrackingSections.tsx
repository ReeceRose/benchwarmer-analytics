import { Panel, Section } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageCard } from "@/components/player-detail/UsageCard";
import { StackedBar, Swatch } from "@/components/game-live/parts";
import { GoalieRestCard } from "@/components/tracking/GoalieRestCard";
import { RinkAreaMap } from "@/components/tracking/RinkAreaMap";
import { ShotTypesCard } from "@/components/tracking/ShotTypesCard";
import { TrackingRow } from "@/components/tracking/TrackingRow";
import { formatMoment } from "@/components/tracking/tracking-format";
import { usePlayerTracking, useTeamTracking } from "@/hooks";
import { formatPercent, formatSavePct, formatSeason } from "@/lib/formatters";
import { ZONE_COLOURS } from "@/lib/chart-colours";
import type {
  GoalieTracking,
  SkaterTracking,
  TeamTracking,
  TrackingArea,
  TrackingShotArea,
  TrackingZoneTime,
} from "@/types";

const mph = (v: number) => `${v.toFixed(1)} mph`;
const miles = (v: number) => `${v.toFixed(1)} mi`;
const whole = (v: number) => Math.round(v).toLocaleString();
const pct = (v: number) => formatPercent(v);

const AREA_LABELS: Record<string, string> = {
  high: "High-danger shots on goal",
  mid: "Mid-range shots on goal",
  long: "Long-range shots on goal",
};

function ShotAreaRows({ areas }: { areas: TrackingShotArea[] }) {
  return (
    <>
      {areas
        .filter((a) => a.area !== "all")
        .map((a) => (
          <TrackingRow
            key={a.area}
            label={AREA_LABELS[a.area] ?? a.area}
            metric={a.shots}
            format={whole}
            note={
              a.goals.value != null &&
              `${a.goals.value} ${a.goals.value === 1 ? "goal" : "goals"}${a.shootingPct.value != null ? `, ${pct(a.shootingPct.value)} shooting` : ""}`
            }
          />
        ))}
    </>
  );
}

function ZoneTimeBar({ zones }: { zones: TrackingZoneTime }) {
  const parts = [
    { label: "Offensive", metric: zones.offensive, colour: ZONE_COLOURS.offensive },
    {
      label: "Neutral",
      metric: zones.neutral,
      colour: ZONE_COLOURS.neutral,
    },
    { label: "Defensive", metric: zones.defensive, colour: ZONE_COLOURS.defensive },
  ];
  return (
    <div>
      <div className="mb-1.5 text-xs text-muted-foreground">
        Where the puck is while on the ice
      </div>
      <StackedBar
        parts={parts.map((p) => ({
          label: p.label,
          value: p.metric.value ?? 0,
          colour: p.colour,
        }))}
      />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <Swatch colour={p.colour} />
            {p.label}
            <span className="font-medium text-foreground tabular-nums">
              {p.metric.value != null ? pct(p.metric.value) : "–"}
            </span>
            {p.metric.leagueAverage != null && (
              <span className="tabular-nums">
                (avg {pct(p.metric.leagueAverage)})
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

const shotCount = (a: TrackingArea) => (a.value ?? 0).toLocaleString();
const areaSavePct = (a: TrackingArea) =>
  a.value != null ? formatSavePct(a.value) : "–";

const CAPTION =
  "From NHL EDGE player and puck tracking. Bars show where the number sits in the league; the tick marks the median.";

function SkaterTrackingCards({
  t,
  playerId,
}: {
  t: SkaterTracking;
  playerId: number;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UsageCard title="Speed and distance" caption={CAPTION}>
          <TrackingRow
            label="Top speed"
            metric={t.topSpeed}
            format={mph}
            note={formatMoment(t.topSpeed.moment)}
          />
          <TrackingRow
            label="Bursts over 20 mph"
            metric={t.burstsOver20}
            format={whole}
          />
          <TrackingRow
            label="Distance skated"
            metric={t.totalDistance}
            format={miles}
          />
          <TrackingRow
            label="Most in one game"
            metric={t.maxGameDistance}
            format={miles}
            note={
              t.maxGameDistance.moment &&
              formatMoment({ ...t.maxGameDistance.moment, period: null })
            }
          />
        </UsageCard>
        <UsageCard
          title="Shooting and zone time"
          caption="Shot areas follow the NHL's EDGE zones: high danger is the slot and crease."
        >
          <TrackingRow
            label="Hardest shot"
            metric={t.hardestShot}
            format={mph}
            note={formatMoment(t.hardestShot.moment)}
          />
          <ShotAreaRows areas={t.shotAreas} />
          <ZoneTimeBar zones={t.zoneTime} />
        </UsageCard>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {t.rinkAreas.length > 0 && (
          <UsageCard
            title="Shots on goal by area"
            caption="Shots on goal from each NHL EDGE area, bluer where more of them came from. Left and right are the shooter's, facing the net. Hover an area for its league percentile."
          >
            <RinkAreaMap
              areas={t.rinkAreas}
              format={shotCount}
              noun="shots on goal"
              label="Shots on goal by rink area"
              shade="share"
            />
          </UsageCard>
        )}
        <ShotTypesCard target={{ playerId }} />
      </div>
    </div>
  );
}

const GOALIE_AREAS: Record<string, string> = {
  all: "All shots",
  high: "High-danger shots",
  mid: "Mid-range shots",
  long: "Long-range shots",
};

function GoalieTrackingCards({
  t,
  playerId,
}: {
  t: GoalieTracking;
  playerId: number;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UsageCard title="Save % by shot location" caption={CAPTION}>
          {t.areas.map((a) => (
            <TrackingRow
              key={a.area}
              label={GOALIE_AREAS[a.area] ?? a.area}
              metric={a.savePct}
              format={formatSavePct}
              note={`${a.saves.toLocaleString()} saves, ${a.goalsAgainst} goals against`}
            />
          ))}
        </UsageCard>
        <UsageCard
          title="Results"
          caption="Goal differential counts every goal for and against while the goalie is in net."
        >
          <TrackingRow
            label="Games above .900"
            metric={t.gamesAbove900}
            format={pct}
          />
          <TrackingRow
            label="Goal differential per 60"
            metric={t.goalDifferentialPer60}
            format={(v) =>
              `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2)}`
            }
          />
        </UsageCard>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {t.rinkAreas.length > 0 && (
          <UsageCard
            title="Save % by area"
            caption="Save % on shots from each NHL EDGE area, bluer where it beats more of the league. Left and right are the shooter's. Hover an area for its percentile."
          >
            <RinkAreaMap
              areas={t.rinkAreas}
              format={areaSavePct}
              noun="save %"
              label="Save percentage by rink area"
              shade="standing"
            />
          </UsageCard>
        )}
        <GoalieRestCard playerId={playerId} />
      </div>
    </div>
  );
}

function TrackingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <Panel key={i} className="space-y-5">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }, (_, j) => (
            <div key={j} className="space-y-1.5">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </Panel>
      ))}
    </div>
  );
}

function description(season: number, gamesPlayed: number | null): string {
  const games =
    gamesPlayed != null
      ? `, ${gamesPlayed} ${gamesPlayed === 1 ? "game" : "games"}`
      : "";
  return `Speed, distance, shot speed and where the puck is, from NHL EDGE tracking. ${formatSeason(season)} regular season${games}.`;
}

/**
 * A player's NHL EDGE tracking (latest season with data). Renders nothing
 * when the NHL has no tracking for them.
 */
export function PlayerTrackingSection({ playerId }: { playerId: number }) {
  const { data, isLoading, error } = usePlayerTracking(playerId);
  if (error || (data && !data.tracking)) return null;
  const t = data?.tracking;
  return (
    <Section
      title="Tracking"
      description={
        t
          ? description(t.season, t.gamesPlayed)
          : "Speed, distance and shot speed from NHL EDGE tracking."
      }
    >
      {isLoading || !t ? (
        <TrackingSkeleton />
      ) : t.kind === "goalie" ? (
        <GoalieTrackingCards t={t} playerId={playerId} />
      ) : (
        <SkaterTrackingCards t={t} playerId={playerId} />
      )}
    </Section>
  );
}

function TeamTrackingCards({ t, abbrev }: { t: TeamTracking; abbrev: string }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UsageCard
          title="Speed and distance"
          caption="From NHL EDGE player and puck tracking. Bars and the number on the right show the league rank; the tick marks the middle of the league."
        >
          <TrackingRow
            label="Top speed"
            metric={t.topSpeed}
            format={mph}
            note={formatMoment(t.topSpeed.moment)}
          />
          <TrackingRow
            label="Bursts over 20 mph"
            metric={t.burstsOver20}
            format={whole}
          />
          <TrackingRow
            label="Bursts over 22 mph"
            metric={t.burstsOver22}
            format={whole}
          />
          <TrackingRow
            label="Distance skated"
            metric={t.totalDistance}
            format={miles}
          />
        </UsageCard>
        <UsageCard
          title="Shooting and zone time"
          caption="Shot areas follow the NHL's EDGE zones: high danger is the slot and crease."
        >
          <TrackingRow
            label="Hardest shot"
            metric={t.hardestShot}
            format={mph}
            note={formatMoment(t.hardestShot.moment)}
          />
          <TrackingRow
            label="Shots over 90 mph"
            metric={t.shotsOver90}
            format={whole}
          />
          <ShotAreaRows areas={t.shotAreas} />
          <ZoneTimeBar zones={t.zoneTime} />
        </UsageCard>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {t.rinkAreas.length > 0 && (
          <UsageCard
            title="Shots on goal by area"
            caption="Shots on goal from each NHL EDGE area, bluer where more of them came from. Left and right are the shooter's, facing the net. Hover an area for its league rank."
          >
            <RinkAreaMap
              areas={t.rinkAreas}
              format={shotCount}
              noun="shots on goal"
              label="Shots on goal by rink area"
              shade="share"
            />
          </UsageCard>
        )}
        <ShotTypesCard target={{ team: abbrev }} />
      </div>
    </div>
  );
}

/** A team's NHL EDGE tracking with league ranks (latest season with data). */
export function TeamTrackingSection({ abbrev }: { abbrev: string }) {
  const { data, isLoading, error } = useTeamTracking(abbrev);
  const t = data?.tracking;
  if (error || (data && !t)) {
    return (
      <Panel className="text-sm text-muted-foreground">
        The NHL hasn't published tracking numbers for this team yet.
      </Panel>
    );
  }
  return (
    <Section
      title="Tracking"
      description={
        t
          ? description(t.season, t.gamesPlayed)
          : "Speed, distance and shot speed from NHL EDGE tracking."
      }
    >
      {isLoading || !t ? (
        <TrackingSkeleton />
      ) : (
        <TeamTrackingCards t={t} abbrev={abbrev} />
      )}
    </Section>
  );
}
