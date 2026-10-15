import { Link } from "@tanstack/react-router";
import { Panel, Section } from "@/components/layout";
import { StackedBar, TeamLabel } from "@/components/game-live/parts";
import { teamColour } from "@/components/game-live/live-utils";
import { useGameProjections } from "@/hooks";
import { cn } from "@/lib/utils";
import type { GamePreviewGame } from "@/types";

/** Pregame win chances from the playoff odds model, away on the left. Renders nothing until odds exist. */
export function WinChanceSection({ game }: { game: GamePreviewGame }) {
  const { data } = useGameProjections(game.date);
  const home = data?.get(game.id);
  if (home === undefined) return null;
  const homePct = Math.round(home * 100);
  const awayPct = 100 - homePct;
  return (
    <Section
      title="Win chance"
      description="From both teams' ratings (5v5 expected goals and goal differential) and home ice."
      action={<Link to="/playoff-odds" className="text-link">Playoff odds</Link>}
    >
      <Panel>
        <div className="flex items-baseline justify-between text-sm tabular-nums">
          <TeamLabel side="away">
            {game.awayTeam} <span className={cn("font-display text-2xl", awayPct > homePct ? "font-bold" : "text-muted-foreground")}>{awayPct}%</span>
          </TeamLabel>
          <TeamLabel side="home">
            <span className={cn("font-display text-2xl", homePct > awayPct ? "font-bold" : "text-muted-foreground")}>{homePct}%</span> {game.homeTeam}
          </TeamLabel>
        </div>
        <StackedBar
          className="mt-3"
          parts={[
            { value: awayPct, colour: teamColour("away"), label: game.awayTeam },
            { value: homePct, colour: teamColour("home"), label: game.homeTeam },
          ]}
        />
      </Panel>
    </Section>
  );
}
