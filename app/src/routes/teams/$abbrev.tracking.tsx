import { createFileRoute } from "@tanstack/react-router";
import { TeamTrackingSection } from "@/components/tracking";

export const Route = createFileRoute("/teams/$abbrev/tracking")({
  component: TeamTrackingPage,
});

function TeamTrackingPage() {
  const { abbrev } = Route.useParams();
  return <TeamTrackingSection abbrev={abbrev.toUpperCase()} />;
}
