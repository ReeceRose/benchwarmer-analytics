import { createFileRoute } from "@tanstack/react-router";
import { Database, Code2, Server, ExternalLink } from "lucide-react";
import { usePageTitle } from "@/hooks";
import { Logo } from "@/components/shared";
import { PageHeader } from "@/components/layout";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

const techStack = [
  {
    title: "Frontend",
    icon: Code2,
    items: ["React 19", "TypeScript", "Vite", "TanStack Router/Query", "Tailwind CSS", "shadcn/ui"],
  },
  {
    title: "Backend",
    icon: Server,
    items: ["TanStack Start", "Node.js", "Drizzle ORM", "PostgreSQL 18"],
  },
  {
    title: "Infrastructure",
    icon: Database,
    items: ["Vercel", "Vercel Cron", "Neon", "GitHub Actions"],
  },
];

function AboutPage() {
  usePageTitle("About");

  return (
    <div className="container max-w-3xl space-y-10 py-8">
      <PageHeader
        title="About Benchwarmer"
        description="Analysis from the cheap seats: a personal project for digging into NHL data."
      />

      <div className="flex items-center gap-4 rounded-2xl border bg-card p-5">
        <Logo className="size-14" />
        <p className="text-sm text-muted-foreground">
          The logo is a puck left on the bench, still warm. That's us: watching
          every shift from the end of the bench and keeping notes.
        </p>
      </div>

      <div className="space-y-10">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Project</h2>
            <p className="text-muted-foreground leading-relaxed">
              Benchwarmer Analytics is a personal research project for exploring
              NHL data and analytics. It provides tools for analyzing team line
              combinations, player chemistry, and performance metrics using
              advanced statistics like expected goals (xG) and Corsi.
            </p>
          </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Data attribution</h2>
            <div>
              <h3 className="mb-1 font-semibold">MoneyPuck</h3>
              <p className="text-muted-foreground leading-relaxed">
                Advanced hockey statistics are sourced from{" "}
                <a
                  href="https://moneypuck.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline hover:text-foreground transition-colors"
                >
                  MoneyPuck
                  <ExternalLink className="h-3 w-3" />
                </a>
                , which provides free, publicly available NHL data including
                expected goals models, shot data, and advanced statistics. Data is
                available from the 2008-09 season to present.
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">NHL API</h3>
              <p className="text-muted-foreground leading-relaxed">
                Game schedules, box scores, player biographical data, and real-time
                game statistics are sourced from the{" "}
                <a
                  href="https://nhl.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline hover:text-foreground transition-colors"
                >
                  NHL.com
                  <ExternalLink className="h-3 w-3" />
                </a>{" "}
                public API. This includes per-game player stats, goalie statistics,
                and roster information.
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">ESPN</h3>
              <p className="text-muted-foreground leading-relaxed">
                Injury reports and league transactions (IR moves, call-ups,
                trades and signings) come from{" "}
                <a
                  href="https://www.espn.com/nhl/injuries"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline hover:text-foreground transition-colors"
                >
                  ESPN
                  <ExternalLink className="h-3 w-3" />
                </a>
                , updated twice a day.
              </p>
            </div>
            <p className="text-sm text-muted-foreground pt-2">
              This project would not be possible without these excellent data sources
              making hockey analytics accessible to everyone.
            </p>
          </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Tech stack</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {techStack.map(({ title, icon: Icon, items }) => (
                <div key={title}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">{title}</h3>
                  </div>
                  <ul className="space-y-1">
                    {items.map((item) => (
                      <li key={item} className="text-sm text-muted-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Disclaimer</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This is an unofficial, fan-made project and is not affiliated with
              the NHL, NHLPA, any NHL team, MoneyPuck, or ESPN. All team names, logos, and
              related marks are trademarks of their respective owners. NHL and the NHL
              Shield are registered trademarks of the National Hockey League. This
              project is for educational and research purposes only.
            </p>
          </section>
      </div>
    </div>
  );
}
