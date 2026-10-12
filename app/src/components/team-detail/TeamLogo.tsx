import { useState } from "react";
import { getTeamLogoUrl } from "@/lib/team-logos";
import { cn } from "@/lib/utils";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<LogoSize, string> = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-16 h-16",
  xl: "w-20 h-20",
};

const FALLBACK_SIZE_CLASSES: Record<LogoSize, string> = {
  xs: "w-4 h-4 text-[8px]",
  sm: "w-5 h-5 text-[9px]",
  md: "w-6 h-6 text-[10px]",
  lg: "w-16 h-16 text-sm",
  xl: "w-20 h-20 text-lg",
};

interface TeamLogoProps {
  abbrev: string;
  name?: string;
  size?: LogoSize;
  variant?: "light" | "dark";
  className?: string;
}

export function TeamLogo({
  abbrev,
  name,
  size = "xl",
  variant,
  className = "",
}: TeamLogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={cn(
          FALLBACK_SIZE_CLASSES[size],
          "flex shrink-0 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground",
          className,
        )}
      >
        {abbrev.slice(0, 3)}
      </div>
    );
  }

  const imgProps = {
    alt: name ? `${name} logo` : abbrev,
    className: cn(SIZE_CLASSES[size], "shrink-0 object-contain", className),
    onError: () => setHasError(true),
  };

  if (variant) {
    return <img src={getTeamLogoUrl(abbrev, variant)} {...imgProps} />;
  }

  return <ThemedImages abbrev={abbrev} {...imgProps} />;
}

/**
 * Both logo variants, switched by the `dark` class rather than the theme in
 * React state, so server-rendered markup doesn't depend on the visitor's
 * theme. Lazy loading keeps the hidden variant from being downloaded.
 */
export function ThemedImages({
  abbrev,
  className,
  ...props
}: { abbrev: string } & React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <>
      <img
        src={getTeamLogoUrl(abbrev, "light")}
        loading="lazy"
        className={cn(className, "dark:hidden")}
        {...props}
      />
      <img
        src={getTeamLogoUrl(abbrev, "dark")}
        loading="lazy"
        className={cn(className, "hidden dark:block")}
        {...props}
      />
    </>
  );
}
