import { ArrowDownRight, ArrowUpRight, NavArrowRight } from "iconoir-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/states";

/** Delta pill: green when the change is good, red when bad (respecting `invert`). */
export function Delta({ value, invert, className, suffix }: { value: number | null; invert?: boolean; className?: string; suffix?: string }) {
  if (value === null || !Number.isFinite(value)) return <span className={cn("text-xs text-text-soft", className)}>—</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  const flat = Math.abs(value) < 0.0005;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tnum",
        flat ? "bg-bg-soft text-text-sub" : good ? "bg-success-mute text-success-dark" : "bg-error-mute text-error-dark",
        className,
      )}
    >
      {!flat && (up ? <ArrowUpRight className="size-3" strokeWidth={2} /> : <ArrowDownRight className="size-3" strokeWidth={2} />)}
      <span className="sr-only">{up ? "Up" : "Down"} </span>
      {Math.abs(value * 100).toFixed(1)}%{suffix}
    </span>
  );
}

/**
 * KPI card. When `href` is set the whole card is a link to the filtered view
 * behind the number (dashboard → inventory, analytics …).
 */
export function KpiCard({
  label,
  value,
  delta,
  invertDelta,
  sub,
  icon,
  href,
  loading,
  tone,
  footer,
}: {
  label: string;
  value: ReactNode;
  delta?: number | null;
  invertDelta?: boolean;
  sub?: ReactNode;
  icon?: ReactNode;
  href?: string;
  loading?: boolean;
  tone?: "warning" | "error";
  footer?: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm text-text-sub">
          {icon && (
            <span
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-sm [&_svg]:size-4",
                tone === "warning" ? "bg-warning-mute text-warning-base" : tone === "error" ? "bg-error-mute text-error-base" : "bg-bg-soft text-text-sub",
              )}
            >
              {icon}
            </span>
          )}
          {label}
        </span>
        {href && <NavArrowRight className="size-4 text-text-soft transition-transform group-hover:translate-x-0.5 group-hover:text-text-sub" />}
      </div>
      {loading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3.5 w-36" />
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-2xl font-medium tracking-[-0.015em] text-text-strong tnum">{value}</span>
            {delta !== undefined && <Delta value={delta} invert={invertDelta} />}
          </div>
          {sub && <p className="mt-1 text-xs text-text-sub">{sub}</p>}
          {footer}
        </>
      )}
    </>
  );
  const cls = "group block rounded-lg border border-stroke-soft bg-bg-default p-4 shadow-xs transition-[box-shadow,border-color]";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-stroke-mid hover:shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-base/25")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Monogram logo for suppliers and channels. */
export function Monogram({ text, color, size = "md", className }: { text: string; color: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const s = { sm: "size-7 text-2xs rounded-sm", md: "size-9 text-xs rounded-10", lg: "size-12 text-sm rounded-md", xl: "size-16 text-lg rounded-lg" }[size];
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center font-semibold tracking-[0.02em] text-white shadow-[inset_0_0_0_1px_#0000001a]", s, className)}
      style={{ background: `linear-gradient(160deg, ${color} 0%, color-mix(in oklab, ${color} 78%, black) 100%)` }}
    >
      {text}
    </span>
  );
}

/** Horizontal meter for stock levels vs reorder point and target. */
export function StockMeter({ stock, reorderPoint, target, className }: { stock: number; reorderPoint: number; target: number; className?: string }) {
  const max = Math.max(target * 1.15, stock, reorderPoint * 1.5, 1);
  const pct = Math.min(100, (stock / max) * 100);
  const rp = (reorderPoint / max) * 100;
  const tg = (target / max) * 100;
  const tone = stock <= 0 ? "bg-error-base" : stock <= reorderPoint ? "bg-warning-base" : "bg-success-base";
  return (
    <div className={cn("relative h-2 w-full rounded-full bg-bg-subtle", className)} role="img" aria-label={`${stock} on hand, reorder point ${reorderPoint}, target ${target}`}>
      <div className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out-quint", tone)} style={{ width: `${Math.max(pct, stock > 0 ? 2 : 0)}%` }} />
      <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-warning-base/80" style={{ left: `${rp}%` }} title="Reorder point" />
      <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-neutral-400" style={{ left: `${tg}%` }} title="Target stock" />
    </div>
  );
}

export function LinkRow({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/25", className)}
    >
      {children}
    </Link>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-stroke-mid bg-bg-default px-1 font-sans text-2xs font-medium text-text-sub shadow-[0_1px_0_#0000000f]">
      {children}
    </kbd>
  );
}

/** Vertical event timeline (PO status history, order events, sync logs). */
export function Timeline({
  items,
}: {
  items: { id: string; title: ReactNode; detail?: ReactNode; meta?: ReactNode; tone?: "success" | "warning" | "error" | "info" | "neutral" | "primary"; icon?: ReactNode }[];
}) {
  const dot = {
    success: "bg-success-base ring-success-mute",
    warning: "bg-warning-base ring-warning-mute",
    error: "bg-error-base ring-error-mute",
    info: "bg-info-base ring-info-mute",
    neutral: "bg-neutral-400 ring-bg-soft",
    primary: "bg-primary-base ring-primary-mute",
  };
  return (
    <ol className="relative">
      {items.map((it, i) => (
        <li key={it.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i < items.length - 1 && <span aria-hidden className="absolute left-[5px] top-4 h-[calc(100%-8px)] w-px bg-bg-subtle" />}
          <span aria-hidden className={cn("relative z-10 mt-1.5 size-[11px] shrink-0 rounded-full ring-4", dot[it.tone ?? "neutral"])} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-strong">{it.title}</p>
            {it.detail && <p className="mt-0.5 text-sm text-text-sub">{it.detail}</p>}
            {it.meta && <p className="mt-1 text-xs text-text-soft">{it.meta}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
