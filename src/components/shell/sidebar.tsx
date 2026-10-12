"use client";

import {
  Bell,
  BoxIso,
  Check,
  HomeSimple,
  NavArrowDown,
  Puzzle,
  Settings,
  ShoppingBag,
  Sparks,
  StatsReport,
  Truck,
} from "iconoir-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInventoryStats, useRecommendations } from "@/lib/hooks";
import { storeProfiles, useApp, useData } from "@/lib/store/app-store";
import { toast } from "@/lib/store/toast-store";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Logo } from "@/components/shell/logo";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  match: (p: string) => boolean;
  badge?: ReactNode;
  children?: NavItem[];
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const hydrated = useApp((s) => s.hydrated);
  const stats = useInventoryStats();
  const recs = useRecommendations();
  const data = useData();
  const unread = data.notifications.filter((n) => !n.read).length;
  const activeRecs = recs.filter((r) => !r.dismissedAt).length;

  const main: NavItem[] = [
    { href: "/", label: "Overview", icon: <HomeSimple />, match: (p) => p === "/" },
    {
      href: "/inventory",
      label: "Inventory",
      icon: <BoxIso />,
      match: (p) => p.startsWith("/inventory"),
      badge: hydrated && stats.low > 0 ? <NavPill tone="warning">{stats.low} low stock</NavPill> : null,
    },
    {
      href: "/suppliers",
      label: "Suppliers & purchase orders",
      icon: <Truck />,
      match: (p) => p.startsWith("/suppliers") || p.startsWith("/purchase-orders"),
    },
    {
      href: "/analytics",
      label: "Analytics",
      icon: <StatsReport />,
      match: (p) => p === "/analytics",
      children: [
        {
          href: "/analytics/smart-ordering",
          label: "Smart ordering",
          icon: <Sparks />,
          match: (p) => p.startsWith("/analytics/smart-ordering"),
          badge: hydrated && activeRecs > 0 ? <NavPill>{activeRecs}</NavPill> : null,
        },
      ],
    },
    { href: "/online", label: "Online sales", icon: <ShoppingBag />, match: (p) => p.startsWith("/online") },
    { href: "/integrations", label: "Integrations", icon: <Puzzle />, match: (p) => p.startsWith("/integrations") },
  ];
  const support: NavItem[] = [
    {
      href: "/notifications",
      label: "Notifications",
      icon: <Bell />,
      match: (p) => p.startsWith("/notifications"),
      badge: hydrated && unread > 0 ? <NavPill tone="count">{unread}</NavPill> : null,
    },
    { href: "/settings", label: "Settings", icon: <Settings />, match: (p) => p.startsWith("/settings") },
  ];

  return (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,var(--color-primary-base)_0%,var(--color-primary-dark)_42%)] text-white">
      <div className="px-4 pb-3 pt-5">
        <Link href="/" onClick={onNavigate} className="inline-flex rounded-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label="Scotch home">
          <Logo />
        </Link>
      </div>
      <div className="px-3 pb-2">
        <StoreSwitcher />
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin [scrollbar-color:#ffffff26_transparent]">
        <SectionLabel>Main navigation</SectionLabel>
        <ul className="space-y-0.5">
          {main.map((item) => (
            <li key={item.href}>
              <NavLink item={item} pathname={pathname} onNavigate={onNavigate} />
              {item.children && (
                <ul className="mt-0.5 space-y-0.5">
                  {item.children.map((c) => (
                    <li key={c.href}>
                      <NavLink item={c} pathname={pathname} onNavigate={onNavigate} nested />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <SectionLabel className="mt-6">Supporting</SectionLabel>
        <ul className="space-y-0.5">
          {support.map((item) => (
            <li key={item.href}>
              <NavLink item={item} pathname={pathname} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="m-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-white/90">
          <span className="size-1.5 rounded-full bg-green-400" aria-hidden />
          Demo environment
        </p>
        <p className="mt-1 text-2xs leading-4 text-white/55">All data is fictional. No real orders, payments, emails or connections are made.</p>
      </div>
    </div>
  );
}

function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mb-1.5 px-2.5 text-2xs font-medium uppercase tracking-[0.08em] text-white/40", className)}>{children}</p>;
}

function NavPill({ children, tone }: { children: ReactNode; tone?: "warning" | "count" }) {
  return (
    <span
      className={cn(
        "ml-auto inline-flex h-5 shrink-0 items-center rounded-full px-1.5 text-2xs font-medium tnum",
        tone === "warning" ? "bg-orange-400/15 text-orange-200" : tone === "count" ? "bg-white text-primary-base" : "bg-white/10 text-white/80",
      )}
    >
      {children}
    </span>
  );
}

function NavLink({ item, pathname, onNavigate, nested }: { item: NavItem; pathname: string; onNavigate?: () => void; nested?: boolean }) {
  const active = item.match(pathname);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-2.5 rounded-10 px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        nested && "ml-4 h-8 pl-3 text-[13px]",
        active ? "bg-white/[0.11] font-medium text-white shadow-[inset_0_0_0_1px_#ffffff0f]" : "text-white/70 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      {active && !nested && <span aria-hidden className="absolute -left-3 top-2 h-5 w-[3px] rounded-r-full bg-green-400" />}
      <span className={cn("inline-flex shrink-0 [&_svg]:size-[18px]", nested && "[&_svg]:size-4", active ? "text-green-400" : "text-white/55 group-hover:text-white/80")}>{item.icon}</span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge}
    </Link>
  );
}

function StoreSwitcher() {
  const activeId = useApp((s) => s.activeStoreId);
  const switchStore = useApp((s) => s.switchStore);
  const profile = useData().profile;
  const stores = storeProfiles();
  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-md border border-white/10 bg-white/[0.06] p-2 text-left transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm bg-white text-xs font-semibold text-primary-base">OB</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">{profile.shortName === "New store" ? "New store (empty)" : profile.shortName}</span>
            <span className="block truncate text-2xs text-white/55">{profile.shortName === "New store" ? "Empty-state preview" : "Oak & Barrel · Demo store"}</span>
          </span>
          <NavArrowDown className="size-4 shrink-0 text-white/60" />
        </button>
      </MenuTrigger>
      <MenuContent align="start" className="w-[248px]">
        <MenuLabel>Switch store profile</MenuLabel>
        {stores.map((s) => (
          <MenuItem
            key={s.id}
            onSelect={() => {
              if (s.id === activeId) return;
              switchStore(s.id);
              toast.info(`Switched to ${s.shortName}`, "Each demo store has its own inventory, suppliers and orders.");
            }}
            icon={<span className="inline-flex size-[18px] items-center justify-center">{s.id === activeId ? <Check className="text-primary-base" strokeWidth={2} /> : null}</span>}
          >
            <span className="block font-medium">{s.name}</span>
            <span className="block text-xs text-text-sub">{s.address.split(",").slice(0, 2).join(",")}</span>
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem
          onSelect={() => {
            switchStore(activeId === "empty" ? "downtown" : "empty");
          }}
          icon={<span className="inline-flex size-[18px]" />}
        >
          <span className="text-text-sub">{activeId === "empty" ? "Leave empty-state preview" : "Preview empty store"}</span>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
