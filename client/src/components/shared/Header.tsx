import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

const linkClass =
  "text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground text-sm";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link to="/" className="flex items-center gap-2 mr-6">
          <img src="/logo.svg" alt="" className="h-6 w-6" />
          <span className="font-semibold hidden sm:inline-block">
            Benchwarmer
          </span>
        </Link>
        <nav className="flex items-center gap-4 flex-1">
          <Link to="/games" className={linkClass}>
            Games
          </Link>
          <Link to="/teams" className={linkClass}>
            Teams
          </Link>
          <Link to="/players" className={linkClass}>
            Players
          </Link>

          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-auto bg-transparent px-2 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=open]:bg-transparent">
                  Stats
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-50 gap-1 p-2">
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          to="/standings"
                          className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium">Standings</div>
                          <p className="text-xs text-muted-foreground">
                            League & division standings
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          to="/leaderboards"
                          className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium">Leaders</div>
                          <p className="text-xs text-muted-foreground">
                            Statistical leaderboards
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          to="/power-rankings"
                          className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium">Rankings</div>
                          <p className="text-xs text-muted-foreground">
                            Power rankings & trends
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          to="/special-teams"
                          className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium">Special Teams</div>
                          <p className="text-xs text-muted-foreground">
                            PP & PK league stats
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-auto bg-transparent px-2 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=open]:bg-transparent">
                  Tools
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-50 gap-1 p-2">
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          to="/compare"
                          className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium">Compare</div>
                          <p className="text-xs text-muted-foreground">
                            Compare players head-to-head
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          to="/breakout-candidates"
                          search={{ view: "table" }}
                          className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium">Breakouts</div>
                          <p className="text-xs text-muted-foreground">
                            Breakout candidate analysis
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          to="/age-curves"
                          className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium">Age Curves</div>
                          <p className="text-xs text-muted-foreground">
                            Performance by age trends
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
