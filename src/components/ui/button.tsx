"use client";

import { Slot } from "radix-ui";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

/**
 * KernUI button. The neutral variant mirrors the Figma "Button" (white,
 * 5–10% stroke, soft top-light gradient, radius-md); primary uses the
 * brand primary-base token with the same gradient sheen.
 */
const VARIANT = {
  primary:
    "bg-primary-base text-white shadow-button-primary bg-[linear-gradient(180deg,#ffffff1f_0%,#ffffff00_100%)] hover:bg-primary-dark active:bg-primary-dark disabled:bg-primary-base/45",
  secondary:
    "bg-bg-default text-text-strong border border-stroke-mid shadow-button bg-[linear-gradient(180deg,#ffffff38_0%,#ffffff03_100%)] hover:bg-bg-surface hover:border-stroke-strong/70 active:bg-bg-soft disabled:text-text-soft",
  ghost: "text-text-sub hover:bg-bg-soft hover:text-text-strong active:bg-bg-subtle disabled:text-text-disabled",
  danger:
    "bg-error-base text-white shadow-button bg-[linear-gradient(180deg,#ffffff1f_0%,#ffffff00_100%)] hover:bg-red-600 active:bg-red-600 disabled:bg-error-base/45",
  "danger-soft": "bg-error-mute text-error-dark hover:bg-error-faint/70 disabled:opacity-50",
  soft: "bg-primary-mute text-primary-base hover:bg-primary-faint/70 disabled:opacity-50",
  link: "text-text-strong underline-offset-4 hover:underline px-0 h-auto",
} as const;

const SIZE = {
  xs: "h-7 gap-1 rounded-sm px-2 text-xs font-medium [&_svg]:size-3.5",
  sm: "h-8 gap-1.5 rounded-10 px-2.5 text-sm font-medium [&_svg]:size-4",
  md: "h-9 gap-1.5 rounded-10 px-3.5 text-sm font-medium [&_svg]:size-[18px]",
  lg: "h-10 gap-2 rounded-md px-4 text-sm font-medium [&_svg]:size-[18px]",
} as const;

const ICON_SIZE = {
  xs: "size-7 rounded-sm [&_svg]:size-3.5",
  sm: "size-8 rounded-10 [&_svg]:size-4",
  md: "size-9 rounded-10 [&_svg]:size-[18px]",
  lg: "size-10 rounded-md [&_svg]:size-5",
} as const;

export type ButtonVariant = keyof typeof VARIANT;
export type ButtonSize = keyof typeof SIZE;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square, icon-only button. Requires an aria-label. */
  icon?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, loading, leftIcon, rightIcon, asChild, className, children, disabled, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? "button")}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-150",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-base/25",
        "disabled:cursor-not-allowed disabled:shadow-none",
        VARIANT[variant],
        icon ? ICON_SIZE[size] : SIZE[size],
        variant === "link" && "h-auto px-0",
        className,
      )}
      {...props}
    >
      {asChild ? (
        <Slot.Slottable>{children}</Slot.Slottable>
      ) : (
        <>
          {loading ? <Spinner className="size-4" /> : leftIcon}
          {children}
          {!loading && rightIcon}
        </>
      )}
    </Comp>
  );
});
