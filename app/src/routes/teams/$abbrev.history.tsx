import { createFileRoute } from "@tanstack/react-router";
import { FranchiseHistory } from "@/components/team-history/FranchiseHistory";

export const Route = createFileRoute("/teams/$abbrev/history")({
  component: TeamHistoryPage,
});

function TeamHistoryPage() {
  const { abbrev } = Route.useParams();
  return <FranchiseHistory abbrev={abbrev.toUpperCase()} />;
}
