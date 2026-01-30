import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { MenuIcon, ChevronDownIcon } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
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

// Inline SVG logo that uses currentColor for theme support
function Logo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <ellipse
        cx="32"
        cy="40"
        rx="24"
        ry="10"
        fill="currentColor"
        opacity="0.6"
      />
      <rect
        x="8"
        y="30"
        width="48"
        height="10"
        fill="currentColor"
        opacity="0.6"
      />
      <ellipse
        cx="32"
        cy="30"
        rx="24"
        ry="10"
        fill="currentColor"
        opacity="0.8"
      />
      <polyline
        points="16,32 26,28 36,30 46,24"
        fill="none"
        stroke="#22c55e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const linkClass =
  "text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground text-sm";

const navItems = [
  { to: "/games", label: "Games" },
  { to: "/teams", label: "Teams" },
  { to: "/players", label: "Players" },
];

const statsItems: NavItem[] = [
  {
    to: "/standings",
    label: "Standings",
    description: "League & division standings",
  },
  {
    to: "/leaderboards",
    label: "Leaders",
    description: "Statistical leaderboards",
  },
  {
    to: "/power-rankings",
    label: "Rankings",
    description: "Power rankings & trends",
  },
  {
    to: "/special-teams",
    label: "Special Teams",
    description: "PP & PK league stats",
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
    label: "Age Curves",
    description: "Performance by age trends",
  },
];

// Desktop navigation with dropdowns
function DesktopNav() {
  return (
    <nav className="hidden lg:flex items-center gap-4 flex-1">
      {navItems.map((item) => (
        <Link key={item.to} to={item.to} className={linkClass}>
          {item.label}
        </Link>
      ))}

      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="h-auto bg-transparent px-2 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=open]:bg-transparent">
              Stats
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-50 gap-1 p-2">
                {statsItems.map((item) => (
                  <li key={item.to}>
                    <NavigationMenuLink asChild>
                      <Link
                        to={item.to}
                        className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium">{item.label}</div>
                        <p className="text-xs text-muted-foreground">
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

      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="h-auto bg-transparent px-2 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=open]:bg-transparent">
              Tools
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-50 gap-1 p-2">
                {toolsItems.map((item) => (
                  <li key={item.to}>
                    <NavigationMenuLink asChild>
                      <Link
                        to={item.to}
                        search={item.search}
                        className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium">{item.label}</div>
                        <p className="text-xs text-muted-foreground">
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
          <SheetTitle className="flex items-center gap-2 text-left">
            <Logo className="size-6" />
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

          <MobileNavSection
            title="Stats"
            items={statsItems}
            onSelect={handleSelect}
          />
          <MobileNavSection
            title="Tools"
            items={toolsItems}
            onSelect={handleSelect}
          />
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-14 items-center gap-4">
        <MobileNav />

        <Link to="/" className="flex items-center gap-2">
          <Logo className="size-6" />
          <span className="font-semibold">Benchwarmer</span>
        </Link>

        <DesktopNav />

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
