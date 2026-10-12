import { CloudXmark, Search } from "iconoir-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-sm", className)} />;
}

export function SkeletonRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-stroke-soft" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-3.5">
          <Skeleton className="size-9 rounded-10" />
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={cn("h-3.5", c === 0 ? "w-48" : "w-20", c > 2 && "hidden md:block")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Empty state: explains why nothing is shown and offers the next action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondary,
  className,
  compact,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  secondary?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "px-6 py-8" : "px-6 py-14", className)}>
      {icon && (
        <div className="relative mb-4">
          <div aria-hidden className="absolute inset-0 -m-3 rounded-full bg-[radial-gradient(circle,var(--color-bg-soft)_0%,transparent_70%)]" />
          <span className="relative inline-flex size-12 items-center justify-center rounded-md border border-stroke-soft bg-bg-default text-text-sub shadow-xs [&_svg]:size-6">
            {icon}
          </span>
        </div>
      )}
      <h3 className="text-sm font-medium text-text-strong">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-text-sub">{description}</p>}
      {(action || secondary) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {secondary}
          {action}
        </div>
      )}
    </div>
  );
}

export function NoResults({ query, onClear, what = "results" }: { query?: string; onClear: () => void; what?: string }) {
  return (
    <EmptyState
      icon={<Search />}
      title={query ? `No ${what} match “${query}”` : `No ${what} match these filters`}
      description="Check the spelling, try a SKU or barcode, or clear filters to see everything."
      action={
        <Button variant="secondary" size="sm" onClick={onClear}>
          Clear search and filters
        </Button>
      }
    />
  );
}

export function ErrorState({
  title = "Couldn't load this data",
  description = "A simulated network error interrupted the request. Your data is safe.",
  onRetry,
  retrying,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-md bg-error-mute text-error-base [&_svg]:size-6">
        <CloudXmark />
      </span>
      <h3 className="text-sm font-medium text-text-strong">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-sub">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry} loading={retrying}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Inline notice banner for page-level context (warnings, info, demo notes). */
export function Banner({
  tone = "info",
  icon,
  title,
  children,
  action,
  className,
}: {
  tone?: "info" | "warning" | "error" | "success" | "neutral";
  icon?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-info-mute border-info-faint text-info-dark [&_.banner-icon]:text-info-base",
    warning: "bg-warning-mute border-warning-faint text-warning-dark [&_.banner-icon]:text-warning-base",
    error: "bg-error-mute border-error-faint text-error-dark [&_.banner-icon]:text-error-base",
    success: "bg-success-mute border-success-faint text-success-dark [&_.banner-icon]:text-success-base",
    neutral: "bg-bg-default border-stroke-soft text-text-sub [&_.banner-icon]:text-text-soft",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : undefined} className={cn("flex flex-col gap-3 rounded-md border px-4 py-3 sm:flex-row sm:items-center", tones[tone], className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {icon && <span className="banner-icon mt-px inline-flex shrink-0 [&_svg]:size-5">{icon}</span>}
        <div className="min-w-0 text-sm">
          {title && <p className="font-medium">{title}</p>}
          {children && <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div>}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2 sm:ml-auto">{action}</div>}
    </div>
  );
}
