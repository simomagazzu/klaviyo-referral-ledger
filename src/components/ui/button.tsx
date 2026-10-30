import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// LOOP buttons: navy primary, outlined secondary, underlined link. 48px / 40px controls.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-control border border-transparent font-semibold leading-none whitespace-nowrap transition-[background,border-color,color,transform] duration-150 ease-snap outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-navy disabled:pointer-events-none disabled:bg-navy-100 disabled:text-ink-muted aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-navy text-on-navy hover:bg-navy-700 active:translate-y-px active:bg-navy-900",
        destructive: "border-danger bg-danger text-white hover:bg-danger/90",
        outline: "border-rule-strong bg-background text-navy hover:border-navy hover:bg-navy-50 active:bg-navy-100",
        secondary: "bg-navy-50 text-navy hover:bg-navy-100",
        ghost: "text-navy hover:bg-navy-50",
        link: "h-auto rounded-tag border-0 px-0 py-1 font-semibold text-navy underline decoration-rule-strong decoration-1 underline-offset-[0.25em] hover:decoration-current active:text-navy-700 disabled:bg-transparent",
      },
      size: {
        default: "min-h-12 px-6 text-base",
        sm: "min-h-10 px-4 text-sm",
        xs: "min-h-8 gap-1 px-3 text-xs [&_svg:not([class*='size-'])]:size-3",
        lg: "min-h-12 px-8 text-base",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    compoundVariants: [{ variant: "link", className: "min-h-0 px-0" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
