import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/shared/Logo";

export function Footer() {
  return (
    <footer className="mt-12 border-t bg-card">
      <div className="container flex flex-col gap-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Logo className="size-7" />
          <p>
            Data from{" "}
            <a
              href="https://moneypuck.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              MoneyPuck
            </a>{" "}
            and{" "}
            <a
              href="https://nhl.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              NHL.com
            </a>
            . Not affiliated with the NHL.
          </p>
        </div>
        <nav className="flex items-center gap-5">
          <Link to="/glossary" className="hover:text-foreground">
            Glossary
          </Link>
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
        </nav>
      </div>
    </footer>
  );
}
