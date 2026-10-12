"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

/** Pill segmented control (radio group semantics) for filters and ranges. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "sm",
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentOption<T>[];
  size?: "xs" | "sm";
  className?: string;
  "aria-label": string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex items-center gap-0.5 rounded-10 bg-bg-soft p-0.5 ring-1 ring-inset ring-stroke-soft", className)}
      onKeyDown={(e) => {
        const idx = options.findIndex((o) => o.value === value);
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const next = options[(idx + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length];
          onChange(next.value);
          const el = (e.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null) ?? null;
          el?.focus();
        }
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-value={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-sm font-medium transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/30",
              size === "sm" ? "h-7 px-2.5 text-sm" : "h-6 px-2 text-xs",
              active ? "bg-bg-default text-text-strong shadow-[0_1px_2px_#0000000f,0_1px_3px_#0000000a]" : "text-text-sub hover:text-text-strong",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn("rounded-full px-1.5 text-2xs leading-4 tnum", active ? "bg-bg-soft text-text-sub" : "bg-bg-subtle/70 text-text-sub")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Underline tabs that act as section navigation (links or buttons). */
export function TabNav({
  items,
  className,
}: {
  items: { label: ReactNode; href?: string; onClick?: () => void; active: boolean; count?: number; tone?: "default" | "warning" }[];
  className?: string;
}) {
  return (
    <nav className={cn("-mb-px flex items-center gap-5 overflow-x-auto scrollbar-thin", className)} aria-label="Sections">
      {items.map((it, i) => {
        const inner = (
          <>
            {it.label}
            {it.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-2xs leading-4 tnum",
                  it.tone === "warning" ? "bg-warning-mute text-warning-dark" : it.active ? "bg-primary-mute text-primary-base" : "bg-bg-soft text-text-sub",
                )}
              >
                {it.count}
              </span>
            )}
          </>
        );
        const cls = cn(
          "inline-flex h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/30 rounded-t-xs",
          it.active ? "border-primary-base text-text-strong" : "border-transparent text-text-sub hover:text-text-strong",
        );
        return it.href ? (
          <Link key={i} href={it.href} className={cls} aria-current={it.active ? "page" : undefined}>
            {inner}
          </Link>
        ) : (
          <button key={i} type="button" onClick={it.onClick} className={cls} aria-pressed={it.active}>
            {inner}
          </button>
        );
      })}
    </nav>
  );
}
