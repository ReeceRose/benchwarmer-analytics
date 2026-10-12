import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipState {
  x: number;
  y: number;
  content: ReactNode;
}

/**
 * A cursor-following tooltip for hand-drawn SVG charts, where wrapping every
 * mark in a Radix tooltip would be too heavy. Spread `bind(content)` onto a
 * mark and render `tooltip` once.
 */
export function useChartTooltip() {
  const [state, setState] = useState<TooltipState | null>(null);

  const show = useCallback((event: React.MouseEvent, content: ReactNode) => {
    setState({ x: event.clientX, y: event.clientY, content });
  }, []);
  const hide = useCallback(() => setState(null), []);

  const bind = useCallback(
    (content: ReactNode) => ({
      onMouseMove: (event: React.MouseEvent) => show(event, content),
      onMouseLeave: hide,
    }),
    [show, hide],
  );

  const tooltip =
    state && typeof document !== "undefined"
      ? createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-50 max-w-72 rounded-xl border bg-popover p-3 text-sm leading-relaxed text-popover-foreground shadow-lg shadow-black/5"
            style={{
              left: Math.min(state.x + 14, window.innerWidth - 300),
              top: state.y + 14 > window.innerHeight - 160 ? state.y - 120 : state.y + 14,
            }}
          >
            {state.content}
          </div>,
          document.body,
        )
      : null;

  return { show, hide, bind, tooltip };
}
