import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link to="/" className="flex items-center gap-2 mr-6">
          <img src="/logo.svg" alt="" className="h-6 w-6" />
          <span className="font-semibold hidden sm:inline-block">
            Benchwarmer
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm flex-1">
          <Link
            to="/games"
            className="text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground"
          >
            Games
          </Link>
          <Link
            to="/teams"
            className="text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground"
          >
            Teams
          </Link>
          <Link
            to="/players"
            className="text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground"
          >
            Players
          </Link>
          <Link
            to="/leaderboards"
            className="text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground"
          >
            Leaders
          </Link>
          <Link
            to="/compare"
            className="text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground"
          >
            Compare
          </Link>
          <Link
            to="/power-rankings"
            className="text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground"
          >
            Rankings
          </Link>
          <Link
            to="/breakout-candidates"
            className="text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground"
          >
            Breakouts
          </Link>
          <Link
            to="/age-curves"
            className="text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground"
          >
            Age Curves
          </Link>
          <Link
            to="/glossary"
            className="text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground"
          >
            Glossary
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
