"use client";

import { CloudSync, InfoCircle, NavArrowRight } from "iconoir-react";
import Link from "next/link";
import { useState } from "react";
import { CHANNEL_LABEL } from "@/lib/domain";
import { fdate, fmt } from "@/lib/format";
import { useData } from "@/lib/store/app-store";
import type { Channel } from "@/lib/types";
import { ChannelStatusBadge } from "@/components/domain/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Banner } from "@/components/ui/states";
import { runSync } from "@/features/online/sync";
import { ChannelDot } from "@/features/online/online-page";
import { ConnectDialog } from "@/features/integrations/connect-dialog";

export function IntegrationsPage() {
  const data = useData();
  const [connecting, setConnecting] = useState<Channel | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  return (
    <>
      <PageHeader title="Integrations" description="Connect sales channels so your catalog, prices and stock stay in sync everywhere you sell." />
      <Banner tone="neutral" icon={<InfoCircle />} className="mb-5">
        These are demo representations of possible integrations — not a claim that every channel is available to every Scotch customer. No external accounts are ever connected.
      </Banner>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.channels.map((c) => {
          const listed = data.products.filter((p) => p.online.listings[c.id] === "listed").length;
          const pending = data.products.filter((p) => p.online.listings[c.id] === "pending" || p.online.listings[c.id] === "error").length;
          const connected = c.status !== "disconnected";
          return (
            <Card key={c.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <ChannelDot channel={c.id} />
                <ChannelStatusBadge status={c.status} />
              </div>
              <h2 className="mt-4 text-base font-medium text-text-strong">{CHANNEL_LABEL[c.id]}</h2>
              <p className="text-xs text-text-sub">{c.kind}</p>
              <p className="mt-2 flex-1 text-sm text-text-sub">{c.description}</p>
              {c.error && (
                <p className="mt-3 rounded-sm bg-warning-mute px-3 py-2 text-xs text-warning-dark">
                  <span className="font-medium">{c.error.code}:</span> {c.error.message}
                </p>
              )}
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-stroke-soft pt-4 text-sm">
                <div>
                  <dt className="text-xs text-text-sub">Listed</dt>
                  <dd className="font-medium tnum">{connected ? listed : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-sub">Pending</dt>
                  <dd className="font-medium tnum">{connected ? pending : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-sub">Last sync</dt>
                  <dd className="truncate font-medium">{c.lastSyncAt && connected ? fdate.relative(c.lastSyncAt) : "—"}</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                {connected ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<CloudSync />}
                    loading={syncing === c.id || c.status === "syncing"}
                    onClick={async () => {
                      setSyncing(c.id);
                      await runSync([c.id]);
                      setSyncing(null);
                    }}
                  >
                    {c.status === "failed" || c.status === "action_required" ? "Retry sync" : "Sync now"}
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => setConnecting(c)}>
                    Connect
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm" rightIcon={<NavArrowRight />} className="ml-auto">
                  <Link href={`/integrations/${c.id}`}>Settings</Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      {data.channels.every((c) => c.status === "disconnected") && (
        <p className="mt-6 text-center text-sm text-text-sub">
          No channels connected yet. Connect one above — {fmt.plural(data.products.filter((p) => p.online.available).length, "product")} {data.products.length ? "are ready to list" : "will be listed once you add products"}.
        </p>
      )}
      {connecting && <ConnectDialog channel={connecting} open={!!connecting} onOpenChange={(o) => !o && setConnecting(null)} />}
    </>
  );
}
