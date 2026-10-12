import { Link } from "@tanstack/react-router";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { getTeamName } from "@/lib/team-names";
import type { RegressionCandidate } from "@/types";

interface RegressionCardProps {
  title: string;
  icon: "up" | "down";
  candidates: RegressionCandidate[];
  season?: number;
}

export function RegressionCard({
  title,
  icon,
  candidates,
  season,
}: RegressionCardProps) {
  if (candidates.length === 0) return null;

  const Icon = icon === "up" ? TrendingUp : TrendingDown;
  const iconColor = icon === "up" ? "text-success" : "text-error";

  return (
    <Card className="py-4">
      <CardContent>
        <div className="mb-3 flex items-center gap-2 font-display font-semibold">
          <Icon className={`size-4 ${iconColor}`} />
          {title}
        </div>
        <ul className="space-y-3">
          {candidates.map((candidate) => (
            <RegressionItem
              key={candidate.abbreviation}
              candidate={candidate}
              season={season}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RegressionItem({
  candidate,
  season,
}: {
  candidate: RegressionCandidate;
  season?: number;
}) {
  return (
    <li>
      <Link
        to="/teams/$abbrev"
        params={{ abbrev: candidate.abbreviation }}
        search={{ season }}
        className="group flex items-start gap-3 text-sm"
      >
        <TeamLogo abbrev={candidate.abbreviation} size="md" className="mt-0.5" />
        <span>
          <span className="block font-medium group-hover:text-link">
            {getTeamName(candidate.abbreviation)}
          </span>
          <span className="text-muted-foreground">{candidate.reason}</span>
        </span>
      </Link>
    </li>
  );
}
