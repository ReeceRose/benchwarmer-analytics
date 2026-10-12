import type { ReactNode } from "react";

export function TooltipTitle({ children, colour }: { children: ReactNode; colour?: string }) {
  return (
    <div className="mb-1 flex items-center gap-1.5 font-semibold">
      {colour && <span className="size-2.5 rounded-[3px]" style={{ background: colour }} />}
      {children}
    </div>
  );
}
