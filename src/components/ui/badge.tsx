import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * KernUI Badge — styles Fill / Light / Dark / Stroke, variants Default / Dot /
 * Icon / Number, rounded-full, 12/16 Paragraph X-Small.
 *
 * Accessibility deviation: KernUI's Light and Stroke styles set text in the
 * `-base` tone (e.g. #1fc16b on #e0faec ≈ 2.2:1). Here the label uses the
 * `-dark` tone and the dot keeps the vivid `-base` hue, which meets WCAG AA
 * (≥ 4.5:1) while preserving the design's color identity.
 */
export type Tone = "success" | "warning" | "error" | "info" | "feature" | "verified" | "highlight" | "neutral";
export type BadgeStyle = "light" | "dark" | "fill" | "stroke";

const STYLES: Record<BadgeStyle, Record<Tone, string>> = {
  light: {
    success: "bg-success-mute text-success-dark",
    warning: "bg-warning-mute text-warning-dark",
    error: "bg-error-mute text-error-dark",
    info: "bg-info-mute text-info-dark",
    feature: "bg-feature-mute text-feature-dark",
    verified: "bg-verified-mute text-verified-dark",
    highlight: "bg-highlight-mute text-highlight-dark",
    neutral: "bg-bg-soft text-text-sub",
  },
  dark: {
    success: "bg-success-faint text-success-dark",
    warning: "bg-warning-faint text-warning-dark",
    error: "bg-error-faint text-error-dark",
    info: "bg-info-faint text-info-dark",
    feature: "bg-feature-faint text-feature-dark",
    verified: "bg-verified-faint text-verified-dark",
    highlight: "bg-highlight-faint text-highlight-dark",
    neutral: "bg-bg-subtle text-neutral-700",
  },
  fill: {
    success: "bg-success-base text-white",
    warning: "bg-warning-base text-white",
    error: "bg-error-base text-white",
    info: "bg-info-base text-white",
    feature: "bg-feature-base text-white",
    verified: "bg-verified-base text-white",
    highlight: "bg-highlight-base text-white",
    neutral: "bg-neutral-600 text-white",
  },
  stroke: {
    success: "bg-success-mute text-success-dark ring-1 ring-inset ring-success-base/60",
    warning: "bg-warning-mute text-warning-dark ring-1 ring-inset ring-warning-base/60",
    error: "bg-error-mute text-error-dark ring-1 ring-inset ring-error-base/60",
    info: "bg-info-mute text-info-dark ring-1 ring-inset ring-info-base/60",
    feature: "bg-feature-mute text-feature-dark ring-1 ring-inset ring-feature-base/60",
    verified: "bg-verified-mute text-verified-dark ring-1 ring-inset ring-verified-base/60",
    highlight: "bg-highlight-mute text-highlight-dark ring-1 ring-inset ring-highlight-base/60",
    neutral: "bg-bg-surface text-text-sub ring-1 ring-inset ring-bg-muted",
  },
};

const DOT: Record<Tone, string> = {
  success: "bg-success-base",
  warning: "bg-warning-base",
  error: "bg-error-base",
  info: "bg-info-base",
  feature: "bg-feature-base",
  verified: "bg-verified-base",
  highlight: "bg-highlight-base",
  neutral: "bg-neutral-400",
};

export interface BadgeProps {
  tone?: Tone;
  look?: BadgeStyle;
  dot?: boolean;
  icon?: ReactNode;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
  title?: string;
}

export function Badge({ tone = "neutral", look = "light", dot, icon, size = "md", className, children, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-normal tnum",
        size === "md" ? "h-6 px-2 text-xs" : "h-5 px-1.5 text-2xs",
        dot && (size === "md" ? "pl-[9px] pr-2.5" : "pl-1.5 pr-2"),
        icon && "pl-1.5",
        STYLES[look][tone],
        className,
      )}
    >
      {dot && <span aria-hidden className={cn("size-[5px] shrink-0 rounded-full", look === "fill" ? "bg-white" : DOT[tone])} />}
      {icon && <span className="inline-flex shrink-0 [&_svg]:size-3.5">{icon}</span>}
      {children}
    </span>
  );
}

/** Small numeric count badge (KernUI Badge · Number). */
export function CountBadge({ children, tone = "neutral", look = "light", className }: { children: ReactNode; tone?: Tone; look?: BadgeStyle; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-2xs font-medium tnum", STYLES[look][tone], className)}>
      {children}
    </span>
  );
}

export function dotClass(tone: Tone) {
  return DOT[tone];
}
