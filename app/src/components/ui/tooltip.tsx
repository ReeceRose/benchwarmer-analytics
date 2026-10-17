"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

// Radix tooltips only open on hover and focus, so on touch screens a tap
// toggles them instead.
const TooltipTapContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
} | null>(null)

function Tooltip({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange]
  )
  const tap = React.useMemo(() => ({ open, setOpen }), [open, setOpen])
  return (
    <TooltipProvider>
      <TooltipTapContext.Provider value={tap}>
        <TooltipPrimitive.Root
          data-slot="tooltip"
          open={open}
          onOpenChange={setOpen}
          {...props}
        />
      </TooltipTapContext.Provider>
    </TooltipProvider>
  )
}

function TooltipTrigger({
  onPointerDown,
  onClick,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const tap = React.useContext(TooltipTapContext)
  const touchTap = React.useRef<{ wasOpen: boolean } | null>(null)
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      onPointerDown={(event) => {
        touchTap.current =
          event.pointerType === "touch" && tap ? { wasOpen: tap.open } : null
        onPointerDown?.(event)
      }}
      onClick={(event) => {
        onClick?.(event)
        const pending = touchTap.current
        touchTap.current = null
        // Radix closes the tooltip on click; reopen it after that.
        if (pending && tap && !pending.wasOpen) {
          queueMicrotask(() => tap.setOpen(true))
        }
      }}
      {...props}
    />
  )
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
