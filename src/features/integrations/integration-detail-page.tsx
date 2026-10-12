"use client";

import { CloudSync, LinkSlash, Puzzle, WarningCircle, WarningTriangle } from "iconoir-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { fdate, fmt } from "@/lib/format";
import { useAsyncAction } from "@/lib/simulate";
import { useApp, useData } from "@/lib/store/app-store";
import type { ChannelId, ListingStatus, SyncFrequency } from "@/lib/types";
import { ChannelStatusBadge, LISTING } from "@/components/domain/status";
import { Badge, dotClass } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DetailRow } from "@/components/ui/card";
import { Checkbox, Switch } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Banner, EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { ChannelDot } from "@/features/online/online-page";
import { runSync, SyncDialog } from "@/features/online/sync";
import { ConnectDialog } from "@/features/integrations/connect-dialog";

const FREQ: { value: SyncFrequency; label: string }[] = [
  { value: "15m", label: "Every 15 minutes" },
  { value: "1h", label: "Every hour" },
  { value: "6h", label: "Every 6 hours" },
  { value: "manual", label: "Manual only" },
];

export function IntegrationDetailPage() {
  const { id } = useParams<{ id: ChannelId }>();
  const data = useData();
  const channel = data.channels.find((c) => c.id === id);
  const [connect, setConnect] = useState(false);
  const [disconnect, setDisconnect] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const { run } = useAsyncAction();

  if (!channel) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Integrations", href: "/integrations" }, { label: "Not found" }]} title="Integration not found" />
        <Card>
          <EmptyState icon={<Puzzle />} title="This integration doesn't exist" action={<Button asChild variant="primary"><Link href="/integrations">Back to integrations</Link></Button>} />
        </Card>
      </>
    );
  }

  const connected = channel.status !== "disconnected";
  const counts = (["listed", "pending", "error", "unlisted"] as ListingStatus[]).map((st) => ({ st, n: data.products.filter((p) => !p.archived && p.online.listings[channel.id] === st).length }));
  const sync = async () => {
    setBusy(true);
    await runSync([channel.id], { forceFail: failNext });
    setFailNext(false);
    setBusy(false);
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Integrations", href: "/integrations" }, { label: channel.name }]}
        leading={<ChannelDot channel={channel.id} />}
        title={channel.name}
        meta={<ChannelStatusBadge status={channel.status} />}
        description={`${channel.kind} · demo integration`}
        actions={
          connected ? (
            <>
              <Button variant="secondary" leftIcon={<LinkSlash />} onClick={() => setDisconnect(true)}>
                Disconnect
              </Button>
              <Button variant="secondary" onClick={() => setPreview(true)}>
                Preview sync
              </Button>
              <Button variant="primary" leftIcon={<CloudSync />} loading={busy || channel.status === "syncing"} onClick={sync}>
                {channel.status === "failed" || channel.status === "action_required" ? "Retry sync" : "Sync now"}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setConnect(true)}>
              Connect {channel.name}
            </Button>
          )
        }
      />

      {channel.error && (
        <Banner
          tone={channel.status === "failed" ? "error" : "warning"}
          icon={channel.status === "failed" ? <WarningCircle /> : <WarningTriangle />}
          className="mb-4"
          title={`${channel.status === "failed" ? "Connection failed" : "Action required"} · ${channel.error.code}`}
          action={
            <Button size="sm" variant="secondary" loading={busy} onClick={sync}>
              Retry sync
            </Button>
          }
        >
          <p>{channel.error.message}</p>
          <p className="mt-1 text-xs opacity-80">
            {channel.error.hint} · {fdate.dateTime(channel.error.at)}
          </p>
        </Banner>
      )}
      {!connected && (
        <Banner tone="neutral" icon={<LinkSlash />} className="mb-4" title="Not connected">
          Connecting is simulated — no real {channel.name} account is involved. Products marked “Sell online” will be listed once connected.
        </Banner>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="About this channel" />
            <CardBody>
              <p className="text-sm leading-6 text-text-sub">{channel.description}</p>
              <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
                <DetailRow label="Connection status">
                  <ChannelStatusBadge status={channel.status} size="sm" />
                </DetailRow>
                <DetailRow label="Account">{channel.accountName || "—"}</DetailRow>
                <DetailRow label="Last synchronization">{channel.lastSyncAt && connected ? fdate.dateTime(channel.lastSyncAt) : "Never"}</DetailRow>
                <DetailRow label="Sync frequency">{FREQ.find((f) => f.value === channel.frequency)?.label}</DetailRow>
              </dl>
            </CardBody>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title="Sync events" description="The most recent catalog, order and connection activity" />
            {channel.events.length === 0 ? (
              <CardBody>
                <p className="text-sm text-text-sub">No activity yet.</p>
              </CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-y border-stroke-soft bg-bg-surface text-left text-xs text-text-sub">
                      <th scope="col" className="px-5 py-2 font-medium">Time</th>
                      <th scope="col" className="px-3 py-2 font-medium">Event</th>
                      <th scope="col" className="px-3 py-2 font-medium">Detail</th>
                      <th scope="col" className="px-5 py-2 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channel.events.slice(0, 12).map((e) => (
                      <tr key={e.id} className="border-b border-stroke-soft last:border-0">
                        <td className="whitespace-nowrap px-5 py-2.5 text-text-sub">{fdate.dateTime(e.at)}</td>
                        <td className="px-3 py-2.5 font-medium text-text-strong">{e.title}</td>
                        <td className="px-3 py-2.5 text-text-sub">{e.detail}</td>
                        <td className="px-5 py-2.5">
                          <Badge tone={e.ok ? "success" : "error"} dot size="sm">
                            {e.ok ? "OK" : "Failed"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Sync settings" />
            <CardBody className="space-y-4">
              <div>
                <p className="mb-1.5 text-sm font-medium text-text-strong">Frequency</p>
                <Select
                  aria-label="Sync frequency"
                  disabled={!connected}
                  value={channel.frequency}
                  onValueChange={(v) => run(() => useApp.getState().updateChannelSettings(channel.id, { frequency: v as SyncFrequency }), { success: "Sync frequency updated" })}
                  options={FREQ}
                />
              </div>
              <label className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium text-text-strong">Catalog sync</span>
                  <span className="block text-xs text-text-sub">Publish products, prices and stock</span>
                </span>
                <Switch
                  disabled={!connected}
                  checked={channel.catalogSync}
                  onCheckedChange={(v) => run(() => useApp.getState().updateChannelSettings(channel.id, { catalogSync: v }), { success: `Catalog sync ${v ? "on" : "off"}` })}
                  aria-label="Catalog sync"
                />
              </label>
              <label className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium text-text-strong">Order sync</span>
                  <span className="block text-xs text-text-sub">Import orders into Online sales</span>
                </span>
                <Switch
                  disabled={!connected}
                  checked={channel.orderSync}
                  onCheckedChange={(v) => run(() => useApp.getState().updateChannelSettings(channel.id, { orderSync: v }), { success: `Order sync ${v ? "on" : "off"}` })}
                  aria-label="Order sync"
                />
              </label>
              {connected && (
                <label className="flex cursor-pointer items-center gap-2 border-t border-stroke-soft pt-4 text-sm text-text-sub">
                  <Checkbox checked={failNext} onCheckedChange={setFailNext} aria-label="Simulate a failed sync" />
                  Make the next “Sync now” fail (demo)
                </label>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Listings" description="Products on this channel" action={<Link href={`/online?tab=catalog&channel=${channel.id}`} className="text-sm font-medium text-text-sub hover:text-text-strong">Catalog</Link>} />
            <CardBody>
              <ul className="space-y-2">
                {counts.map(({ st, n }) => (
                  <li key={st}>
                    <Link href={`/online?tab=catalog&channel=${channel.id}&listing=${st}`} className="-mx-2 flex items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-bg-surface">
                      <span className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-full", dotClass(LISTING[st].tone))} aria-hidden />
                        {LISTING[st].label}
                      </span>
                      <span className="font-medium tnum">{connected ? fmt.int(n) : "—"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConnectDialog channel={channel} open={connect} onOpenChange={setConnect} />
      <SyncDialog open={preview} onOpenChange={setPreview} initialChannels={[channel.id]} />
      <ConfirmDialog
        open={disconnect}
        onOpenChange={setDisconnect}
        tone="danger"
        icon={<LinkSlash />}
        title={`Disconnect ${channel.name}?`}
        description="All listings on this channel are removed and new orders stop arriving. You can reconnect any time (demo only — nothing external changes)."
        confirmLabel="Disconnect"
        onConfirm={async () => {
          const r = await run(() => useApp.getState().disconnectChannel(channel.id), { success: { title: `${channel.name} disconnected` }, error: "Couldn't disconnect" });
          return r.ok;
        }}
      />
    </>
  );
}
