import { Link } from "@tanstack/react-router";
import { Panel, Section } from "@/components/layout";
import { formatSeason } from "@/lib/formatters";
import type { PlayerAward } from "@/types";

const seasons = (list: number[]) => list.map(formatSeason).join(", ");

/** Every trophy a player has won or been a finalist for, most wins first. */
export function PlayerAwards({ awards }: { awards: PlayerAward[] }) {
  if (awards.length === 0) return null;
  return (
    <Section title="Awards" description="NHL trophies won, and seasons as a runner-up or finalist.">
      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs">
              <th className="pb-2 text-left font-medium">Trophy</th>
              <th className="pb-2 pl-3 text-right font-medium">Won</th>
              <th className="pb-2 pl-4 text-left font-medium">Seasons</th>
              <th className="hidden pb-2 pl-4 text-left font-medium sm:table-cell">Finalist</th>
            </tr>
          </thead>
          <tbody>
            {awards.map((a) => (
              <tr key={a.slug} className="border-t">
                <td className="py-2 pr-3">
                  <Link to="/trophies/$slug" params={{ slug: a.slug }} className="font-medium hover:text-link">
                    {a.trophy}
                  </Link>
                </td>
                <td className="py-2 pl-3 text-right font-semibold">{a.wins.length || <span className="font-normal text-muted-foreground">–</span>}</td>
                <td className="py-2 pl-4">{a.wins.length > 0 ? seasons(a.wins) : <span className="text-muted-foreground">–</span>}</td>
                <td className="hidden py-2 pl-4 text-muted-foreground sm:table-cell">{a.finalist.length > 0 ? seasons(a.finalist) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </Section>
  );
}
