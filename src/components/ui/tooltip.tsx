"use client"

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
    return <PopoverPrimitive.Root {...props} />
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
  "z-[2200] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    align?: "start" | "center" | "end"
  }
>(({ className, sideOffset = 4, side, align, collisionPadding = 12, ...props }, ref) => {
  const touch = useTouchHintMode()

  if (touch) {
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          side={side}
          align={align ?? "center"}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={cn(
            hintSurfaceClass,
            "px-3 py-2 text-sm max-w-[min(calc(100vw-2rem),18rem)] touch-manipulation outline-none",
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
}

/** Single control wrapper — hover tooltip on desktop, tap popover on touch devices. */
function Hint({
  children,
  content,
  side = "top",
  align,
  className,
  delayDuration = 200,
  skipOnTouch = false,
}: HintProps) {
  const touch = useTouchHintMode()
  if (touch && skipOnTouch) {
    return children
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
