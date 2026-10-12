import { Link } from "@tanstack/react-router";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="py-3">
      <CardContent className="py-0">
        <div className="flex items-center gap-2 font-medium mb-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
        </div>
        <ul className="space-y-1">
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
    <li className="text-sm">
      <Link
        to="/teams/$abbrev"
        params={{ abbrev: candidate.abbreviation }}
        search={{ season }}
        className="font-medium hover:underline"
      >
        {candidate.abbreviation}
      </Link>
      <span className="text-muted-foreground">: {candidate.reason}</span>
    </li>
  );
}
