import * as React from "react"

import { cn } from "@/lib/utils"

// LOOP field: 48px, hairline strong border, navy on hover/focus.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-12 w-full min-w-0 rounded-control border border-rule-strong bg-background px-4 text-base text-ink transition-[border-color] duration-150 ease-snap outline-none placeholder:text-ink-muted hover:border-navy disabled:cursor-not-allowed disabled:border-rule disabled:bg-navy-50 disabled:text-ink-muted",
        "focus-visible:border-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
