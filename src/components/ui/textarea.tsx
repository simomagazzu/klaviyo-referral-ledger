import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-30 w-full min-w-0 resize-y rounded-control border border-rule-strong bg-background px-4 py-3 text-base leading-relaxed text-ink transition-[border-color] duration-150 ease-snap outline-none placeholder:text-ink-muted hover:border-navy disabled:cursor-not-allowed disabled:bg-navy-50",
        "focus-visible:border-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
