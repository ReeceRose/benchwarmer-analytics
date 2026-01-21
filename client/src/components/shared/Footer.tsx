import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
        <p className="text-sm text-muted-foreground">
          Data provided by{" "}
          <a
            href="https://moneypuck.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            MoneyPuck
          </a>
          {" "}and{" "}
          <a
            href="https://nhl.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            NHL.com
          </a>
        </p>
        <Link
          to="/about"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          About
        </Link>
      </div>
    </footer>
  );
}
