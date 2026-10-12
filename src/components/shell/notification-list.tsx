"use client";

import { BoxIso, CloudXmark, Page, ShoppingBag, Sparks, WarningCircle, WarningTriangle } from "iconoir-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { fdate } from "@/lib/format";
import { useApp } from "@/lib/store/app-store";
import type { AppNotification, NotificationKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND: Record<NotificationKind, { icon: ReactNode; cls: string }> = {
  low_stock: { icon: <WarningTriangle />, cls: "bg-warning-mute text-warning-base" },
  out_of_stock: { icon: <WarningCircle />, cls: "bg-error-mute text-error-base" },
  po: { icon: <Page />, cls: "bg-info-mute text-info-base" },
  sync: { icon: <CloudXmark />, cls: "bg-feature-mute text-feature-base" },
  order: { icon: <ShoppingBag />, cls: "bg-verified-mute text-verified-dark" },
  recommendation: { icon: <Sparks />, cls: "bg-primary-mute text-primary-base" },
  system: { icon: <BoxIso />, cls: "bg-bg-soft text-text-sub" },
};

export function NotificationList({ items, onNavigate, compact }: { items: AppNotification[]; onNavigate?: () => void; compact?: boolean }) {
  const markRead = useApp((s) => s.markNotificationRead);
  return (
    <ul className="divide-y divide-stroke-soft">
      {items.map((n) => {
        const k = KIND[n.kind];
        return (
          <li key={n.id}>
            <Link
              href={n.href}
              onClick={() => {
                markRead(n.id);
                onNavigate?.();
              }}
              className={cn(
                "flex gap-3 px-4 py-3 transition-colors hover:bg-bg-surface focus-visible:bg-bg-surface focus-visible:outline-none",
                !n.read && "bg-primary-mute/25",
              )}
            >
              <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4", k.cls)}>{k.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className={cn("text-sm text-text-strong", !n.read && "font-medium")}>{n.title}</span>
                  {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary-base" aria-label="Unread" />}
                </span>
                <span className={cn("mt-0.5 block text-xs text-text-sub", compact && "line-clamp-2")}>{n.body}</span>
                <span className="mt-1 block text-2xs text-text-soft">{fdate.relative(n.at)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
