import { cn } from "@/lib/utils";

// Brand mark: a puck on the bench, still warm. Mirrors public/logo.svg but
// takes its colours from the theme tokens so it follows the app's theme
// toggle rather than the OS colour scheme.
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d="M26 14c-2.6-3.2 2.6-5.6 0-9M38 14c-2.6-3.2 2.6-5.6 0-9"
        className="stroke-steam"
        fill="none"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M12 25v9c0 4.4 9 8 20 8s20-3.6 20-8v-9z"
        className="fill-puck"
      />
      <ellipse cx="32" cy="25" rx="20" ry="8" className="fill-puck-top" />
      <rect x="3" y="45" width="58" height="8" rx="4" className="fill-primary" />
      <rect x="9" y="52" width="7" height="9" rx="2" className="fill-primary" />
      <rect x="48" y="52" width="7" height="9" rx="2" className="fill-primary" />
    </svg>
  );
}
