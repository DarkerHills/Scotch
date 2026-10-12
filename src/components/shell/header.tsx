"use client";

import { Bell, Flask, LogOut, Menu as MenuIcon, NavArrowDown, RefreshDouble, Search, Settings } from "iconoir-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp, useData } from "@/lib/store/app-store";
import { toast } from "@/lib/store/toast-store";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/display";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Popover, PopoverContent, PopoverTrigger } from "@/components/ui/menu";
import { CommandSearch } from "@/components/shell/command-search";
import { NotificationList } from "@/components/shell/notification-list";

export function Header({ onOpenNav }: { onOpenNav: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      } else if (e.key === "/" && !(e.target as HTMLElement).closest("input,textarea,[contenteditable]")) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-stroke-soft bg-bg-default/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <Button variant="ghost" icon className="lg:hidden" aria-label="Open navigation" onClick={onOpenNav}>
        <MenuIcon />
      </Button>
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="group flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-10 border sm:max-w-[460px] border-stroke-mid bg-bg-surface/70 px-3 text-left text-sm text-text-soft shadow-xs transition-colors hover:border-stroke-strong/70 hover:bg-bg-default focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-base/25"
        aria-label="Search products, suppliers and orders"
        aria-keyshortcuts="Meta+K"
      >
        <Search className="size-[18px]" />
        <span className="flex-1 truncate">
          <span className="sm:hidden">Search</span>
          <span className="hidden sm:inline">Search products, suppliers, orders…</span>
        </span>
        <span className="hidden items-center gap-0.5 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <DemoControls />
        <NotificationsButton />
        <UserMenu />
      </div>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

function NotificationsButton() {
  const data = useData();
  const markAll = useApp((s) => s.markAllNotificationsRead);
  const hydrated = useApp((s) => s.hydrated);
  const [open, setOpen] = useState(false);
  const unread = data.notifications.filter((n) => !n.read).length;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" icon aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative">
          <Bell />
          {hydrated && unread > 0 && (
            <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-error-base px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-bg-default tnum">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(400px,calc(100vw-24px))]">
        <div className="flex items-center justify-between border-b border-stroke-soft px-4 py-3">
          <p className="text-sm font-medium text-text-strong">Notifications</p>
          <button
            type="button"
            disabled={unread === 0}
            onClick={markAll}
            className="cursor-pointer text-xs font-medium text-text-sub hover:text-text-strong disabled:cursor-default disabled:text-text-disabled"
          >
            Mark all as read
          </button>
        </div>
        <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
          {data.notifications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-text-sub">You&apos;re all caught up. Alerts about stock, orders and syncs will appear here.</p>
          ) : (
            <NotificationList items={data.notifications.slice(0, 7)} onNavigate={() => setOpen(false)} compact />
          )}
        </div>
        <div className="border-t border-stroke-soft p-2">
          <Link href="/notifications" onClick={() => setOpen(false)} className="block rounded-sm px-3 py-2 text-center text-sm font-medium text-text-strong hover:bg-bg-soft">
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DemoControls() {
  const failNext = useApp((s) => s.demo.failNext);
  const setFailNext = useApp((s) => s.setFailNext);
  const resetStore = useApp((s) => s.resetStore);
  const activeId = useApp((s) => s.activeStoreId);
  const switchStore = useApp((s) => s.switchStore);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="sm" leftIcon={<Flask />} rightIcon={<NavArrowDown className="!size-3.5 opacity-60" />} className={failNext ? "border-warning-base/50 bg-warning-mute text-warning-dark" : undefined}>
            <span className="hidden sm:inline">Demo</span>
            {failNext && <span className="size-1.5 rounded-full bg-warning-base" aria-label="Failure armed" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[320px] p-0">
          <div className="border-b border-stroke-soft px-4 py-3">
            <p className="text-sm font-medium text-text-strong">Demo controls</p>
            <p className="mt-0.5 text-xs text-text-sub">Trigger states that are hard to reach in a healthy store.</p>
          </div>
          <div className="space-y-1 p-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 hover:bg-bg-surface">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text-strong">Fail the next request</span>
                <span className="mt-0.5 block text-xs text-text-sub">The next save, submit or sync returns a simulated network error. Retrying then succeeds.</span>
              </span>
              <Switch checked={failNext} onCheckedChange={setFailNext} aria-label="Fail the next request" />
            </label>
            <button
              type="button"
              onClick={() => {
                switchStore(activeId === "empty" ? "downtown" : "empty");
                router.push("/");
              }}
              className="flex w-full cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 text-left hover:bg-bg-surface"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text-strong">{activeId === "empty" ? "Exit empty-state preview" : "Preview empty states"}</span>
                <span className="mt-0.5 block text-xs text-text-sub">
                  {activeId === "empty" ? "Return to the Downtown demo store." : "Switch to a brand-new store with no products, suppliers, orders or channels."}
                </span>
              </span>
            </button>
            <button type="button" onClick={() => setConfirm(true)} className="flex w-full cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 text-left hover:bg-bg-surface">
              <RefreshDouble className="mt-0.5 size-4 text-text-sub" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text-strong">Reset demo data</span>
                <span className="mt-0.5 block text-xs text-text-sub">Restore this store&apos;s seeded products, orders and channels.</span>
              </span>
            </button>
          </div>
          <p className="border-t border-stroke-soft bg-bg-surface/60 px-4 py-2.5 text-2xs leading-4 text-text-sub">
            Everything runs in your browser. No orders, emails, payments or channel connections are real.
          </p>
        </PopoverContent>
      </Popover>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="danger"
        title="Reset demo data?"
        description="All changes in this store — stock adjustments, purchase orders, receipts and channel changes — will be replaced with the original seeded data."
        confirmLabel="Reset data"
        icon={<RefreshDouble />}
        onConfirm={() => {
          resetStore();
          toast.success("Demo data reset", "The store is back to its original seeded state.");
          router.push("/");
        }}
      />
    </>
  );
}

function UserMenu() {
  const owner = useData().profile.ownerName;
  const router = useRouter();
  const initials = owner
    .split(" ")
    .map((w) => w[0])
    .join("");
  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          className="ml-1 inline-flex cursor-pointer items-center gap-2 rounded-full p-0.5 hover:bg-bg-soft md:pr-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-base/25"
          aria-label="Account menu"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-[linear-gradient(140deg,#3ee089,#0b4627)] text-xs font-semibold text-white">{initials}</span>
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-sm font-medium text-text-strong">{owner}</span>
            <span className="block text-2xs text-text-sub">Owner</span>
          </span>
        </button>
      </MenuTrigger>
      <MenuContent>
        <MenuLabel>Signed in as demo owner</MenuLabel>
        <MenuItem icon={<Settings />} onSelect={() => router.push("/settings")}>
          Store settings
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<LogOut />} disabled>
          Sign out (disabled in demo)
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
