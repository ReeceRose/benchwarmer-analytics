import { createFileRoute } from "@tanstack/react-router";
import { Database, Code2, Server, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/shared";

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
    items: [".NET 10", "ASP.NET Core", "Entity Framework Core", "PostgreSQL 17"],
  },
  {
    title: "Infrastructure",
    icon: Database,
    items: ["Docker", "Azure Container Apps", "GitHub Actions"],
  },
];

function AboutPage() {
  return (
    <div className="container py-8 max-w-3xl">
      <BackButton />

      <div className="mb-8 mt-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">About</h1>
        <p className="text-muted-foreground">
          Learn more about this project and the data behind it.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Project</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              Benchwarmer Analytics is a personal research project for exploring
              NHL data and analytics. It provides tools for analyzing team line
              combinations, player chemistry, and performance metrics using
              advanced statistics like expected goals (xG) and Corsi.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data Attribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">MoneyPuck</h4>
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
              <h4 className="font-medium mb-2">NHL API</h4>
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
            <p className="text-sm text-muted-foreground pt-2">
              This project would not be possible without these excellent data sources
              making hockey analytics accessible to everyone.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tech Stack</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Disclaimer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This is an unofficial, fan-made project and is not affiliated with
              the NHL, NHLPA, any NHL team, or MoneyPuck. All team names, logos, and
              related marks are trademarks of their respective owners. NHL and the NHL
              Shield are registered trademarks of the National Hockey League. This
              project is for educational and research purposes only.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
