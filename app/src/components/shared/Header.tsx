import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { MenuIcon, ChevronDownIcon } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Logo } from "@/components/shared/Logo";
import { GlobalSearch } from "@/components/shared/GlobalSearch";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  description: string;
  search?: { view: "table" | "charts" | "explorer" | "heatmaps" };
};

const linkClass =
  "rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&.active]:bg-secondary [&.active]:font-medium [&.active]:text-secondary-foreground";

const navItems = [
  { to: "/games", label: "Games" },
  { to: "/teams", label: "Teams" },
  { to: "/players", label: "Players" },
];

// Team and season views.
const standingsItems: NavItem[] = [
  {
    to: "/standings",
    label: "Standings",
    description: "League & division standings",
  },
  {
    to: "/power-rankings",
    label: "Power rankings",
    description: "Power rankings & trends",
  },
  {
    to: "/category-rankings",
    label: "Category rankings",
    description: "Team ranks across all stats",
  },
  {
    to: "/playoff-odds",
    label: "Playoff odds",
    description: "Season simulations & Cup odds",
  },
  {
    to: "/playoffs",
    label: "Playoff bracket",
    description: "Every series, every year since 2008",
  },
];

// Player and league numbers.
const statsItems: NavItem[] = [
  {
    to: "/leaderboards",
    label: "Leaders",
    description: "Statistical leaderboards",
  },
  {
    to: "/tracking-leaders",
    label: "Tracking leaders",
    description: "Fastest skaters, hardest shots, most miles",
  },
  {
    to: "/trophies",
    label: "Trophies",
    description: "Every winner of every NHL award",
  },
  {
    to: "/milestone-clubs",
    label: "Milestone clubs",
    description: "Every 1,000-point career and 50-goal season",
  },
  {
    to: "/single-games",
    label: "Single games",
    description: "Best and worst games by Game Score",
  },
  {
    to: "/special-teams",
    label: "Special teams",
    description: "PP & PK league stats",
  },
  {
    to: "/league-trends",
    label: "League trends",
    description: "Season-over-season stats",
  },
];

const toolsItems: NavItem[] = [
  {
    to: "/compare",
    label: "Compare",
    description: "Compare players head-to-head",
  },
  {
    to: "/rookie-watcher",
    label: "Rookies",
    description: "First-year player tracker",
    search: { view: "table" },
  },
  {
    to: "/breakout-candidates",
    label: "Breakouts",
    description: "Breakout candidate analysis",
    search: { view: "table" },
  },
  {
    to: "/age-curves",
    label: "Age curves",
    description: "Performance by age trends",
  },
  {
    to: "/draft",
    label: "Draft",
    description: "Every draft class and how the picks turned out",
  },
  {
    to: "/officials",
    label: "Officials",
    description: "This season's referees and linespeople",
  },
];

// The dropdown menus, in order. Keep each to about five items so the
// dropdown fits on a laptop screen.
const menus: { title: string; items: NavItem[] }[] = [
  { title: "Standings", items: standingsItems },
  { title: "Stats", items: statsItems },
  { title: "Tools", items: toolsItems },
];

// Desktop navigation with dropdowns
const triggerClass =
  "h-auto rounded-full bg-transparent px-3 py-1.5 text-sm font-normal text-muted-foreground hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground";

const activeTriggerClass =
  "bg-secondary font-medium text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground";

function DesktopNav() {
  const { pathname } = useLocation();
  const isSection = (items: NavItem[]) =>
    items.some((item) => pathname.startsWith(item.to));

  return (
    <nav className="hidden lg:flex items-center gap-1 flex-1">
      {navItems.map((item) => (
        <Link key={item.to} to={item.to} className={linkClass}>
          {item.label}
        </Link>
      ))}

      {menus.map((menu) => (
        <NavigationMenu key={menu.title}>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={cn(triggerClass, isSection(menu.items) && activeTriggerClass)}
              >
                {menu.title}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-56 gap-1 p-2">
                  {menu.items.map((item) => (
                    <li key={item.to}>
                      <NavigationMenuLink asChild>
                        <Link
                          to={item.to}
                          search={item.search}
                          className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium">{item.label}</div>
                          <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                            {item.description}
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      ))}
    </nav>
  );
}

// Mobile navigation item
function MobileNavLink({
  to,
  children,
  onSelect,
  search,
}: {
  to: string;
  children: React.ReactNode;
  onSelect: () => void;
  search?: Record<string, string>;
}) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      search={search}
      onClick={onSelect}
      className={cn(
        "block px-4 py-3 text-base transition-colors rounded-md",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
      )}
    >
      {children}
    </Link>
  );
}

// Mobile collapsible section
function MobileNavSection({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: NavItem[];
  onSelect: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-base text-muted-foreground hover:text-foreground transition-colors">
        {title}
        <ChevronDownIcon
          className={cn(
            "size-4 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            search={"search" in item ? item.search : undefined}
            onClick={onSelect}
            className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-medium">{item.label}</span>
            <span className="block text-xs opacity-70">{item.description}</span>
          </Link>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Mobile navigation sheet
function MobileNav() {
  const [open, setOpen] = useState(false);

  const handleSelect = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open menu"
        >
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle className="flex items-center gap-2 text-left font-display text-lg">
            <Logo className="size-7" />
            Benchwarmer
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col py-2">
          {navItems.map((item) => (
            <MobileNavLink key={item.to} to={item.to} onSelect={handleSelect}>
              {item.label}
            </MobileNavLink>
          ))}

          <div className="my-2 border-t" />

          {menus.map((menu) => (
            <MobileNavSection
              key={menu.title}
              title={menu.title}
              items={menu.items}
              onSelect={handleSelect}
            />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
      <div className="container flex h-16 items-center gap-4">
        <MobileNav />

        <Link to="/" className="mr-2 flex items-center gap-2">
          <Logo className="size-8" />
          <span className="font-display text-xl font-bold tracking-tight">
            Benchwarmer
          </span>
        </Link>

        <DesktopNav />

        <div className="ml-auto flex items-center gap-2">
          <GlobalSearch className="w-9 justify-center px-0 sm:w-56 sm:justify-start sm:px-3.5 xl:w-64" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
