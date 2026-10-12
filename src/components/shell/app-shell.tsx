"use client";

import { Xmark } from "iconoir-react";
import { IconoirProvider } from "iconoir-react";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useApp } from "@/lib/store/app-store";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/states";
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/shell/header";
import { Sidebar } from "@/components/shell/sidebar";

/**
 * Persistent app frame: sidebar (drawer below lg), sticky header with global
 * search, and the routed page. Page content waits for the persisted demo
 * store to hydrate from localStorage.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const hydrated = useApp((s) => s.hydrated);
  const pathname = usePathname();

  useEffect(() => {
    void useApp.persist.rehydrate();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <IconoirProvider iconProps={{ strokeWidth: 1.6, width: "1.25em", height: "1.25em" }}>
      <TooltipProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-sm focus:bg-bg-default focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
        >
          Skip to content
        </a>
        <div className="flex min-h-dvh">
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] lg:block">
            <Sidebar />
          </aside>
          <Dialog.Root open={navOpen} onOpenChange={setNavOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-neutral-950/40 animate-fade-in lg:hidden" />
              <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(300px,86vw)] animate-slide-in-left shadow-xl focus:outline-none lg:hidden">
                <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                <Dialog.Description className="sr-only">Main navigation</Dialog.Description>
                <Sidebar onNavigate={() => setNavOpen(false)} />
                <Dialog.Close asChild>
                  <Button variant="ghost" icon size="sm" aria-label="Close navigation" className="absolute right-3 top-5 text-white/70 hover:bg-white/10 hover:text-white">
                    <Xmark />
                  </Button>
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <div className="flex min-w-0 flex-1 flex-col lg:pl-[264px]">
            <Header onOpenNav={() => setNavOpen(true)} />
            <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">
              <Suspense fallback={<PageSkeleton />}>{hydrated ? children : <PageSkeleton />}</Suspense>
            </main>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </IconoirProvider>
  );
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading page">
      <Skeleton className="mb-2 h-4 w-32" />
      <Skeleton className="mb-8 h-8 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="mt-4 h-[360px] rounded-lg" />
    </div>
  );
}
