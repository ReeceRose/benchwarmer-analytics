import { Link } from "@tanstack/react-router";
import { Panel } from "@/components/layout";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { getTeamName } from "@/lib/team-names";
import type { RegressionCandidate } from "@/types";

interface RegressionCardProps {
  title: string;
  description: string;
  candidates: RegressionCandidate[];
  season?: number;
}

/** Teams whose record and underlying numbers disagree, with the ranks that say so. */
export function RegressionCard({
  title,
  description,
  candidates,
  season,
}: RegressionCardProps) {
  if (candidates.length === 0) return null;

  return (
    <Panel>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      <ul className="mt-3 space-y-1">
        {candidates.map((candidate) => (
          <li key={candidate.abbreviation}>
            <Link
              to="/teams/$abbrev"
              params={{ abbrev: candidate.abbreviation }}
              search={{ season }}
              className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/60"
            >
              <TeamLogo abbrev={candidate.abbreviation} size="md" />
              <span className="min-w-0">
                <span className="block text-sm font-medium group-hover:text-link">
                  {getTeamName(candidate.abbreviation)}
                </span>
                <span className="block text-xs text-muted-foreground">{candidate.reason}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
