'use client'

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"
import { usePrefersTouch } from "@/hooks/use-prefers-touch"

const TouchHintContext = React.createContext<boolean | null>(null)

function useTouchHintMode(): boolean {
  const fromProvider = React.useContext(TouchHintContext)
  const prefersTouch = usePrefersTouch()
  return fromProvider ?? prefersTouch
}

const TooltipProvider = ({
  delayDuration = 200,
  disableHoverableContent,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) => {
  const touch = usePrefersTouch()

  return (
    <TouchHintContext.Provider value={touch}>
      {touch ? (
        children
      ) : (
        <TooltipPrimitive.Provider
          delayDuration={delayDuration}
          disableHoverableContent={disableHoverableContent}
          {...props}
        >
          {children}
        </TooltipPrimitive.Provider>
      )}
    </TouchHintContext.Provider>
  )
}

const Tooltip = (props: React.ComponentProps<typeof TooltipPrimitive.Root>) => {
  const touch = useTouchHintMode()
  if (touch) {
    return <PopoverPrimitive.Root modal={false} {...props} />
  }
  return <TooltipPrimitive.Root {...props} />
}

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>((props, ref) => {
  const touch = useTouchHintMode()
  if (touch) {
    return <PopoverPrimitive.Trigger ref={ref} {...props} />
  }
  return <TooltipPrimitive.Trigger ref={ref} {...props} />
})
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName

const hintSurfaceClass =
  "z-[2100] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"

/** On touch, open hints above the trigger so bottom-docked controls (bar workstation) stay tappable. */
function resolveTouchPopoverSide(
  side?: React.ComponentProps<typeof TooltipContent>["side"]
): React.ComponentProps<typeof TooltipContent>["side"] {
  if (side === "top") return "top"
  if (side === "bottom" || side === "left" || side === "right" || !side) return "top"
  return side
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    align?: "start" | "center" | "end"
  }
>(({ className, sideOffset = 4, side, align, collisionPadding = 12, ...props }, ref) => {
  const touch = useTouchHintMode()
  const touchSide = touch ? resolveTouchPopoverSide(side) : side
  const touchAlign = touch ? (align ?? "center") : align
  const touchCollisionPadding =
    touch && typeof collisionPadding === "number"
      ? Math.max(collisionPadding, 20)
      : collisionPadding

  if (touch) {
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          side={touchSide}
          align={touchAlign ?? "center"}
          sideOffset={sideOffset}
          collisionPadding={touchCollisionPadding}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            hintSurfaceClass,
            "px-3 py-2 text-sm max-w-[min(calc(100vw-2rem),18rem)] touch-manipulation outline-none pointer-events-auto",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Portal>
    )
  }

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(hintSurfaceClass, "px-3 py-1.5 text-sm", className)}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

type HintProps = {
  children: React.ReactElement
  content: React.ReactNode
  side?: React.ComponentProps<typeof TooltipContent>["side"]
  align?: React.ComponentProps<typeof TooltipContent>["align"]
  className?: string
  delayDuration?: number
  /** Skip tap popover on touch when the trigger already has a visible label (avoids clutter). */
  skipOnTouch?: boolean
  /**
   * For controls that must run on first tap (save / load / toggles).
   * Desktop: normal hover tooltip. Touch: long-press (~450ms) shows the hint; tap still fires the action.
   */
  actionSafe?: boolean
}

const ACTION_SAFE_HOLD_MS = 450

/** Single control wrapper — hover tooltip on desktop, tap (or long-press) popover on touch. */
function Hint({
  children,
  content,
  side = "top",
  align,
  className,
  delayDuration = 200,
  skipOnTouch = false,
  actionSafe = false,
}: HintProps) {
  const touch = useTouchHintMode()
  const [holdOpen, setHoldOpen] = React.useState(false)
  const holdTimerRef = React.useRef<number | null>(null)

  const clearHoldTimer = React.useCallback(() => {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }, [])

  React.useEffect(() => () => clearHoldTimer(), [clearHoldTimer])

  if (touch && skipOnTouch) {
    return children
  }

  // Touch + actionSafe: don't steal the tap — long-press reveals the hint.
  if (touch && actionSafe) {
    const child = React.Children.only(children) as React.ReactElement<any>
    return (
      <PopoverPrimitive.Root modal={false} open={holdOpen} onOpenChange={setHoldOpen}>
        {React.cloneElement(child, {
          onPointerDown: (e: React.PointerEvent) => {
            child.props.onPointerDown?.(e)
            if (e.pointerType === "touch" || e.pointerType === "pen") {
              clearHoldTimer()
              holdTimerRef.current = window.setTimeout(() => setHoldOpen(true), ACTION_SAFE_HOLD_MS)
            }
          },
          onPointerUp: (e: React.PointerEvent) => {
            child.props.onPointerUp?.(e)
            clearHoldTimer()
          },
          onPointerCancel: (e: React.PointerEvent) => {
            child.props.onPointerCancel?.(e)
            clearHoldTimer()
          },
          onPointerLeave: (e: React.PointerEvent) => {
            child.props.onPointerLeave?.(e)
            clearHoldTimer()
          },
          onClick: (e: React.MouseEvent) => {
            clearHoldTimer()
            if (holdOpen) setHoldOpen(false)
            child.props.onClick?.(e)
          },
        })}
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side={resolveTouchPopoverSide(side)}
            align={align ?? "center"}
            sideOffset={4}
            collisionPadding={20}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className={cn(
              hintSurfaceClass,
              "px-3 py-2 text-sm max-w-[min(calc(100vw-2rem),18rem)] touch-manipulation outline-none pointer-events-auto",
              className
            )}
          >
            {content}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    )
  }

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} className={className}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, Hint, useTouchHintMode }
export { usePrefersTouch } from "@/hooks/use-prefers-touch"
