/**
 * Pulsing "LIVE" indicator for games in progress
 */
export function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 text-red-500 font-medium">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
      </span>
      LIVE
    </span>
  );
}
