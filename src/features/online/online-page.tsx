"use client";

import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { CloudSync, EditPencil, Globe, InfoCircle, ShoppingBag, WarningTriangle } from "iconoir-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { delta, resolveRange, seriesFor, summarize } from "@/lib/analytics";
import { CHANNEL_LABEL, marginOf, OPEN_ORDER_STATUSES, ORDER_STATUS_LABEL, onlinePrice } from "@/lib/domain";
import { fdate, fmt } from "@/lib/format";
import { useFirstLoad, useHistory, useInventoryStats, useQueryState } from "@/lib/hooks";
import { useAsyncAction } from "@/lib/simulate";
import { useApp, useData } from "@/lib/store/app-store";
import { CHANNEL_IDS, ORDER_STATUSES, type ChannelId, type ListingStatus, type OnlineOrder, type OrderStatus, type Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChartFrame, Legend, SERIES, TimeSeriesChart, type SeriesDef } from "@/components/charts/charts";
import { ProductThumb } from "@/components/domain/product-thumb";
import { ChannelStatusBadge, LISTING, ListingBadge, OrderStatusBadge } from "@/components/domain/status";
import { Badge, dotClass } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/checkbox";
import { DataTable, selectionColumn } from "@/components/ui/data-table";
import { Drawer, Modal } from "@/components/ui/dialog";
import { KpiCard, LinkRow, Timeline } from "@/components/ui/display";
import { FilterMenu } from "@/components/ui/filter-menu";
import { Field, Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/menu";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Banner, EmptyState, NoResults, Skeleton } from "@/components/ui/states";
import { SegmentedControl, TabNav } from "@/components/ui/tabs";
import { SyncDialog, usePendingChanges } from "@/features/online/sync";

type Tab = "overview" | "catalog" | "orders";

export function OnlinePage() {
  const q = useQueryState();
  const tab = (q.get("tab") || "overview") as Tab;
  const data = useData();
  const pending = usePendingChanges();
  const [syncOpen, setSyncOpen] = useState(false);
  const openOrders = data.onlineOrders.filter((o) => OPEN_ORDER_STATUSES.includes(o.status)).length;
  const connected = data.channels.filter((c) => c.status !== "disconnected").length;

  return (
    <>
      <PageHeader
        title="Online sales"
        description="Manage what's listed online, sync your catalog and fulfil channel orders — all from the same inventory."
        actions={
          <>
            <Button asChild variant="secondary" leftIcon={<Globe />}>
              <Link href="/integrations">Manage channels</Link>
            </Button>
            <Button variant="primary" leftIcon={<CloudSync />} onClick={() => setSyncOpen(true)} disabled={connected === 0}>
              Sync catalog{pending.length ? ` (${pending.length})` : ""}
            </Button>
          </>
        }
      />
      <div className="mb-5 border-b border-stroke-soft">
        <TabNav
          items={[
            { label: "Overview", onClick: () => q.set({ tab: null, status: null, channel: null }), active: tab === "overview" },
            { label: "Catalog", onClick: () => q.set({ tab: "catalog", status: null }), active: tab === "catalog", count: pending.length || undefined, tone: pending.length ? "warning" : undefined },
            { label: "Orders", onClick: () => q.set({ tab: "orders" }), active: tab === "orders", count: openOrders || undefined },
          ]}
        />
      </div>
      {connected === 0 && (
        <Banner
          tone="info"
          icon={<Globe />}
          className="mb-4"
          title="No sales channels connected"
          action={
            <Button asChild size="sm" variant="primary">
              <Link href="/integrations">Connect a channel</Link>
            </Button>
          }
        >
          Connect your online storefront or a delivery marketplace (demo) to start selling online.
        </Banner>
      )}
      {tab === "overview" && <OverviewTab onSync={() => setSyncOpen(true)} />}
      {tab === "catalog" && <CatalogTab onSync={() => setSyncOpen(true)} />}
      {tab === "orders" && <OrdersTab />}
      <SyncDialog open={syncOpen} onOpenChange={setSyncOpen} />
    </>
  );
}

/* ── Overview ─────────────────────────────────────────────── */

function OverviewTab({ onSync }: { onSync: () => void }) {
  const data = useData();
  const history = useHistory();
  const inv = useInventoryStats();
  const q = useQueryState();
  const loading = useFirstLoad("online", 550);
  const pending = usePendingChanges();
  const days = (Number(q.get("range")) || 30) as 7 | 30;
  const { current, previous } = useMemo(() => resolveRange(history, { kind: "preset", days }), [history, days]);
  const s = useMemo(() => summarize(history, current), [history, current]);
  const p = useMemo(() => (previous ? summarize(history, previous) : null), [history, previous]);
  const series = useMemo(() => seriesFor(history, current, inv.value).map((d) => ({ date: d.date, storefront: Math.round(d.storefront), doordash: Math.round(d.doordash), ubereats: Math.round(d.ubereats) })), [history, current, inv.value]);
  const online = s.byChannel.storefront + s.byChannel.doordash + s.byChannel.ubereats;
  const onlinePrev = p ? p.byChannel.storefront + p.byChannel.doordash + p.byChannel.ubereats : null;
  const orders = s.onlineOrders.storefront + s.onlineOrders.doordash + s.onlineOrders.ubereats;
  const ordersPrev = p ? p.onlineOrders.storefront + p.onlineOrders.doordash + p.onlineOrders.ubereats : null;
  const active = data.products.filter((x) => !x.archived);
  const listedAny = active.filter((x) => CHANNEL_IDS.some((c) => x.online.listings[c] === "listed")).length;
  const unavailable = active.filter((x) => !x.online.available).length;
  const openOrders = data.onlineOrders.filter((o) => OPEN_ORDER_STATUSES.includes(o.status));
  const fulfilled = data.onlineOrders.filter((o) => o.status === "completed").length;
  const recent = [...data.onlineOrders].sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, 6);
  const channelSeries: SeriesDef[] = [
    { key: "storefront", label: "Online storefront", color: SERIES[1], kind: "bar" },
    { key: "doordash", label: "DoorDash", color: SERIES[2], kind: "bar" },
    { key: "ubereats", label: "Uber Eats", color: SERIES[3], kind: "bar" },
  ];
  const listingCounts = (["listed", "pending", "error", "unlisted"] as ListingStatus[]).map((st) => ({
    st,
    n: active.reduce((acc, x) => acc + CHANNEL_IDS.filter((c) => data.channels.find((ch) => ch.id === c)?.status !== "disconnected" && x.online.listings[c] === st).length, 0),
  }));
  const lastSync = data.channels.map((c) => c.lastSyncAt).filter(Boolean).sort().pop();

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-text-sub">Showing last {days} days</p>
        <SegmentedControl
          aria-label="Date range"
          value={String(days)}
          onChange={(v) => q.set({ range: v === "30" ? null : v })}
          options={[
            { value: "7", label: "7D" },
            { value: "30", label: "30D" },
          ]}
        />
      </div>
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Online metrics">
        <KpiCard loading={loading} label="Online sales" icon={<Globe />} value={fmt.money0(online)} delta={delta(online, onlinePrev)} sub={`${fmt.pct(online / Math.max(1, s.net))} of total net sales`} />
        <KpiCard loading={loading} label="Online orders" icon={<ShoppingBag />} value={fmt.int(orders)} delta={delta(orders, ordersPrev)} sub={`${fmt.money(online / Math.max(1, orders))} average order`} />
        <KpiCard
          loading={loading}
          label="Pending orders"
          icon={<WarningTriangle />}
          tone={openOrders.length ? "warning" : undefined}
          value={fmt.int(openOrders.length)}
          sub={`${fulfilled} fulfilled in the last 2 days`}
          href="/online?tab=orders&status=open"
        />
        <KpiCard loading={loading} label="Listed online" icon={<CloudSync />} value={`${listedAny}`} sub={`${unavailable} products unavailable online`} href="/online?tab=catalog" />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Online revenue by channel" description={`Net sales per day · last ${days} days`} />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <ChartFrame
                legend={<Legend series={channelSeries} />}
                chart={<TimeSeriesChart data={series} series={channelSeries} stacked height={260} />}
                table={{ columns: ["Date", "Storefront", "DoorDash", "Uber Eats"], rows: series.map((d) => [fdate.weekday(`${d.date}T12:00:00`), fmt.money0(d.storefront), fmt.money0(d.doordash), fmt.money0(d.ubereats)]) }}
              />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Catalog sync"
            description={lastSync ? `Last sync ${fdate.relative(lastSync)}` : "Never synced"}
            action={
              <Button size="sm" variant="secondary" leftIcon={<CloudSync />} onClick={onSync}>
                Preview sync
              </Button>
            }
          />
          <CardBody>
            <ul className="space-y-2.5">
              {listingCounts.map(({ st, n }) => (
                <li key={st}>
                  <Link href={`/online?tab=catalog&listing=${st}`} className="-mx-2 flex items-center justify-between rounded-sm px-2 py-1 text-sm hover:bg-bg-surface">
                    <span className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", dotClass(LISTING[st].tone))} aria-hidden />
                      {LISTING[st].label}
                    </span>
                    <span className="font-medium tnum">{n}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-text-sub">Counts are product listings across connected channels.</p>
            {pending.length > 0 && (
              <p className="mt-3 flex gap-2 rounded-sm bg-info-mute px-3 py-2 text-xs text-info-dark">
                <InfoCircle className="size-4 shrink-0 text-info-base" />
                {fmt.plural(pending.length, "change")} waiting for the next sync.
              </p>
            )}
            <div className="mt-4 space-y-2 border-t border-stroke-soft pt-4">
              {data.channels.map((c) => (
                <Link key={c.id} href={`/integrations/${c.id}`} className="-mx-2 flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-bg-surface">
                  <span className="truncate text-text-strong">{c.name}</span>
                  <ChannelStatusBadge status={c.status} size="sm" />
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Recent channel orders" action={<Link href="/online?tab=orders" className="text-sm font-medium text-text-sub hover:text-text-strong">View all</Link>} />
        <CardBody className="px-3">
          {recent.length === 0 ? (
            <EmptyState compact icon={<ShoppingBag />} title="No online orders yet" description="Orders from connected channels will appear here." />
          ) : (
            <ul className="grid gap-x-4 md:grid-cols-2">
              {recent.map((o) => (
                <li key={o.id}>
                  <LinkRow href={`/online/orders/${o.id}`}>
                    <ChannelDot channel={o.channel} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text-strong">
                        {o.number} · {o.customer.name}
                      </span>
                      <span className="block text-xs text-text-sub">
                        {CHANNEL_LABEL[o.channel]} · {fdate.relative(o.placedAt)} · {fmt.money(o.total)}
                      </span>
                    </span>
                    <OrderStatusBadge status={o.status} size="sm" />
                  </LinkRow>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}

const SHORT_CHANNEL: Record<ChannelId, string> = { storefront: "Storefront", doordash: "DoorDash", ubereats: "Uber Eats" };

/** Compact per-channel listing status for narrower screens. */
function ListingDots({ product }: { product: Product }) {
  const data = useData();
  return (
    <ul className="flex items-center gap-1.5">
      {CHANNEL_IDS.map((ch) => {
        const off = data.channels.find((c) => c.id === ch)?.status === "disconnected";
        const st = product.online.listings[ch];
        const label = `${SHORT_CHANNEL[ch]}: ${off ? "not connected" : LISTING[st].label}`;
        return (
          <li key={ch}>
            <Tooltip content={label}>
              <span tabIndex={0} aria-label={label} className="inline-flex h-6 items-center gap-1 rounded-full bg-bg-soft px-1.5 text-2xs font-medium text-text-sub">
                <span className={cn("size-1.5 rounded-full", off ? "bg-neutral-300" : dotClass(LISTING[st].tone))} />
                {{ storefront: "Web", doordash: "DD", ubereats: "UE" }[ch]}
              </span>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}

const CHANNEL_SWATCH: Record<ChannelId, string> = { storefront: SERIES[1], doordash: SERIES[2], ubereats: SERIES[3] };
export function ChannelDot({ channel }: { channel: ChannelId }) {
  const letter = { storefront: "W", doordash: "D", ubereats: "U" }[channel];
  return (
    <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-10 text-xs font-semibold text-white" style={{ background: CHANNEL_SWATCH[channel] }}>
      {letter}
    </span>
  );
}

/* ── Catalog ──────────────────────────────────────────────── */

function CatalogTab({ onSync }: { onSync: () => void }) {
  const data = useData();
  const q = useQueryState();
  const pending = usePendingChanges();
  const loading = useFirstLoad("catalog", 450);
  const [text, setText] = useState(q.get("q"));
  const search = q.get("q");
  const channels = q.getList("channel") as ChannelId[];
  const listing = q.getList("listing") as ListingStatus[];
  const avail = q.get("avail");
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [priceFor, setPriceFor] = useState<Product | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const { run } = useAsyncAction();

  useEffect(() => {
    const t = setTimeout(() => text !== search && q.set({ q: text }), 200);
    return () => clearTimeout(t);
  }, [text, search, q]);

  const filtered = useMemo(() => {
    const n = search.toLowerCase().trim();
    const chs = channels.length ? channels : CHANNEL_IDS;
    return data.products.filter((p) => {
      if (p.archived) return false;
      if (avail === "yes" && !p.online.available) return false;
      if (avail === "no" && p.online.available) return false;
      if (listing.length && !chs.some((c) => listing.includes(p.online.listings[c]))) return false;
      if (n && !`${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(n)) return false;
      return true;
    });
  }, [data.products, search, channels, listing, avail]);

  const selectedIds = Object.keys(selection).filter((k) => selection[k]);
  const setAvailability = (ids: string[], v: boolean) =>
    run(() => useApp.getState().setOnlineAvailability(ids, v), {
      success: { title: v ? `${fmt.plural(ids.length, "product")} available online` : `${fmt.plural(ids.length, "product")} hidden online`, description: "Changes go live on the next catalog sync." },
    });

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      selectionColumn<Product>(),
      {
        id: "name",
        accessorFn: (p) => p.name,
        header: "Product",
        meta: { className: "min-w-[220px]" },
        cell: ({ row: { original: p } }) => (
          <div className="flex items-center gap-3">
            <ProductThumb thumb={p.thumb} category={p.category} size="sm" />
            <div className="min-w-0">
              <button type="button" onClick={() => setDetail(p)} className="block max-w-[240px] cursor-pointer truncate text-left font-medium text-text-strong hover:underline underline-offset-2">
                {p.name}
              </button>
              <span className="block text-xs text-text-sub">{p.size}</span>
            </div>
          </div>
        ),
      },
      { id: "store", accessorFn: (p) => p.retailPrice, header: "In-store", meta: { align: "right", hideBelow: "lg" }, cell: ({ getValue }) => <span className="text-text-sub">{fmt.money(Number(getValue()))}</span> },
      {
        id: "online",
        accessorFn: (p) => onlinePrice(p),
        header: "Online price",
        meta: { align: "right" },
        cell: ({ row: { original: p } }) => (
          <button type="button" onClick={() => setPriceFor(p)} className="group inline-flex cursor-pointer items-center gap-1 rounded-xs px-1 hover:bg-bg-soft" aria-label={`Edit online price for ${p.name}`}>
            <span className={cn("font-medium", p.online.price !== null && "text-primary-base")}>{fmt.money(onlinePrice(p))}</span>
            <EditPencil className="size-3.5 text-text-soft opacity-0 group-hover:opacity-100" />
          </button>
        ),
      },
      {
        id: "stock",
        accessorFn: (p) => p.stock,
        header: "Inventory",
        meta: { align: "right" },
        cell: ({ row: { original: p } }) =>
          p.stock <= 0 && p.online.available ? (
            <Tooltip content="Shown as sold out on channels until restocked">
              <span className="font-medium text-error-dark">Sold out</span>
            </Tooltip>
          ) : (
            <span>{p.stock}</span>
          ),
      },
      {
        id: "available",
        accessorFn: (p) => (p.online.available ? 1 : 0),
        header: "Online",
        cell: ({ row: { original: p } }) => <Switch checked={p.online.available} onCheckedChange={(v) => setAvailability([p.id], v)} aria-label={`Sell ${p.name} online`} size="sm" />,
      },
      {
        id: "channels",
        enableSorting: false,
        header: "Channels",
        meta: { className: "xl:hidden", headerClassName: "xl:hidden" },
        cell: ({ row: { original: p } }) => <ListingDots product={p} />,
      },
      ...CHANNEL_IDS.map<ColumnDef<Product, unknown>>((ch) => ({
        id: ch,
        accessorFn: (p) => p.online.listings[ch],
        header: SHORT_CHANNEL[ch],
        meta: { hideBelow: "xl" },
        cell: ({ row: { original: p } }) => {
          const c = data.channels.find((x) => x.id === ch);
          return c?.status === "disconnected" ? <span className="text-xs text-text-soft">Not connected</span> : <ListingBadge status={p.online.listings[ch]} removal={!p.online.available} />;
        },
      })),
      {
        id: "sync",
        accessorFn: (p) => p.online.lastSyncedAt ?? "",
        header: "Last sync",
        meta: { hideBelow: "2xl" },
        cell: ({ getValue }) => <span className="whitespace-nowrap text-xs text-text-sub">{getValue() ? fdate.relative(String(getValue())) : "Never"}</span>,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.channels],
  );

  const clear = () => {
    setText("");
    q.set({ q: null, channel: null, listing: null, avail: null });
  };

  return (
    <>
      {pending.length > 0 && (
        <Banner
          tone="info"
          icon={<CloudSync />}
          className="mb-4"
          title={`${fmt.plural(pending.length, "listing change")} waiting to sync`}
          action={
            <Button size="sm" variant="primary" leftIcon={<CloudSync />} onClick={onSync}>
              Preview & sync
            </Button>
          }
        >
          Availability and price edits reach channels on the next sync. Review exactly what will change first.
        </Banner>
      )}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 px-5 py-3.5 lg:flex-row lg:items-center">
          <SearchInput value={text} onChange={setText} placeholder="Search catalog" className="w-full lg:w-[280px]" />
          <div className="flex flex-wrap gap-2">
            <FilterMenu label="Channel" options={CHANNEL_IDS.map((c) => ({ value: c, label: CHANNEL_LABEL[c] }))} selected={channels} onChange={(v) => q.set({ channel: v })} />
            <FilterMenu label="Listing status" options={(Object.keys(LISTING) as ListingStatus[]).map((l) => ({ value: l, label: LISTING[l].label }))} selected={listing} onChange={(v) => q.set({ listing: v })} />
            <FilterMenu
              label="Availability"
              single
              options={[
                { value: "yes", label: "Available online" },
                { value: "no", label: "In-store only" },
              ]}
              selected={avail ? [avail] : []}
              onChange={(v) => q.set({ avail: v[0] ?? null })}
            />
            {(channels.length || listing.length || avail || search) && (
              <Button variant="ghost" size="sm" onClick={clear}>
                Clear all
              </Button>
            )}
          </div>
          <span className="text-sm text-text-sub lg:ml-auto" aria-live="polite">
            {fmt.plural(filtered.length, "product")}
          </span>
        </div>
        {selectedIds.length > 0 && (
          <div className="mx-3 mb-2 flex flex-wrap items-center gap-2 rounded-md bg-bg-strong px-3 py-2 text-sm text-white animate-pop-in">
            <span className="font-medium">{selectedIds.length} selected</span>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setAvailability(selectedIds, true).then(() => setSelection({}))}>
              Make available online
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setAvailability(selectedIds, false).then(() => setSelection({}))}>
              Hide from online
            </Button>
            <button type="button" className="ml-auto cursor-pointer text-white/70 hover:text-white" onClick={() => setSelection({})}>
              Clear
            </button>
          </div>
        )}
        <DataTable
          caption="Online catalog"
          data={filtered}
          columns={columns}
          getRowId={(p) => p.id}
          loading={loading}
          rowSelection={selection}
          onRowSelectionChange={setSelection}
          onRowClick={(p) => setDetail(p)}
          empty={<NoResults query={search} onClear={clear} what="products" />}
        />
      </Card>
      <RecentSyncEvents />
      {priceFor && <OnlinePriceDialog product={priceFor} onClose={() => setPriceFor(null)} />}
      <ChannelDetailDrawer product={detail ? (data.products.find((p) => p.id === detail.id) ?? null) : null} onClose={() => setDetail(null)} />
    </>
  );
}

function RecentSyncEvents() {
  const data = useData();
  const events = data.channels
    .flatMap((c) => c.events.map((e) => ({ ...e, channel: c.name, channelId: c.id })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);
  return (
    <Card className="mt-4">
      <CardHeader title="Recent sync events" description="Across all channels" />
      <CardBody>
        {events.length === 0 ? (
          <p className="text-sm text-text-sub">No sync activity yet.</p>
        ) : (
          <Timeline
            items={events.map((e) => ({
              id: `${e.channelId}-${e.id}`,
              title: `${e.channel} · ${e.title}`,
              detail: e.detail,
              meta: fdate.dateTime(e.at),
              tone: e.ok ? (e.kind === "sync" ? "success" : "info") : "error",
            }))}
          />
        )}
      </CardBody>
    </Card>
  );
}

function OnlinePriceDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const [value, setValue] = useState(onlinePrice(product).toFixed(2));
  const { run, pending, error } = useAsyncAction();
  const n = Number(value);
  const err = !value || !Number.isFinite(n) || n <= 0 ? "Enter a price above $0" : n < product.unitCost ? `Below unit cost (${fmt.money(product.unitCost)})` : null;
  return (
    <Modal
      open
      onOpenChange={(o) => !o && !pending && onClose()}
      title="Edit online price"
      description={`${product.name} · in-store ${fmt.money(product.retailPrice)} · cost ${fmt.money(product.unitCost)}`}
      width="sm"
      footer={
        <>
          {product.online.price !== null && (
            <Button
              variant="ghost"
              className="mr-auto"
              disabled={pending}
              onClick={async () => {
                const r = await run(() => useApp.getState().setOnlinePrice(product.id, null), { success: "Online price matches in-store again" });
                if (r.ok) onClose();
              }}
            >
              Use in-store price
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending}
            disabled={!!err}
            onClick={async () => {
              const r = await run(() => useApp.getState().setOnlinePrice(product.id, Math.round(n * 100) / 100), {
                success: { title: "Online price updated", description: "Publishes on the next catalog sync." },
                toastOnError: false,
              });
              if (r.ok) onClose();
            }}
          >
            {error ? "Retry" : "Save price"}
          </Button>
        </>
      }
    >
      <Field label="Online price" error={err ?? undefined} hint={!err ? `${fmt.pct(marginOf(n, product.unitCost))} margin online · in-store price is unchanged` : undefined}>
        {(f) => <Input id={f.id} type="number" step="0.01" leading="$" invalid={!!err} value={value} onChange={(e) => setValue(e.target.value)} autoFocus />}
      </Field>
      {error && <p className="mt-3 text-sm text-error-dark">Simulated network error — the price wasn&apos;t saved. Select Retry.</p>}
    </Modal>
  );
}

function ChannelDetailDrawer({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const data = useData();
  return (
    <Drawer
      open={!!product}
      onOpenChange={(o) => !o && onClose()}
      title={product?.name ?? ""}
      description="Channel-specific listing details"
      footer={
        product && (
          <Button asChild variant="secondary">
            <Link href={`/inventory/${product.id}`}>Open product</Link>
          </Button>
        )
      }
    >
      {product && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ProductThumb thumb={product.thumb} category={product.category} size="lg" />
            <div className="text-sm">
              <p className="font-medium text-text-strong">{product.name}</p>
              <p className="text-text-sub">
                {product.size} · {product.stock} in stock
              </p>
              <p className="mt-1">{product.online.available ? <Badge tone="success" dot>Available online</Badge> : <Badge>In-store only</Badge>}</p>
            </div>
          </div>
          {CHANNEL_IDS.map((ch) => {
            const c = data.channels.find((x) => x.id === ch)!;
            const st = product.online.listings[ch];
            return (
              <div key={ch} className="rounded-md border border-stroke-soft p-4">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/integrations/${ch}`} className="flex items-center gap-2 text-sm font-medium text-text-strong hover:underline underline-offset-2">
                    <ChannelDot channel={ch} />
                    {c.name}
                  </Link>
                  {c.status === "disconnected" ? <ChannelStatusBadge status="disconnected" size="sm" /> : <ListingBadge status={st} removal={!product.online.available} />}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-text-sub">Channel price</dt>
                    <dd className="font-medium">{fmt.money(onlinePrice(product))}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-sub">Stock shown</dt>
                    <dd className="font-medium">{product.stock > 0 ? `${product.stock} available` : "Sold out"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-sub">Account</dt>
                    <dd className="truncate">{c.accountName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-sub">Last sync</dt>
                    <dd>{c.lastSyncAt ? fdate.relative(c.lastSyncAt) : "Never"}</dd>
                  </div>
                </dl>
                {st === "error" && (
                  <p className="mt-3 rounded-sm bg-error-mute px-3 py-2 text-xs text-error-dark">Rejected: missing age-restricted category (UE-412). Retry the sync after fixing — in this demo, retrying resolves it.</p>
                )}
                {st === "pending" && <p className="mt-3 rounded-sm bg-info-mute px-3 py-2 text-xs text-info-dark">{product.online.available ? "Update" : "Removal"} waiting for the next sync.</p>}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

/* ── Orders ───────────────────────────────────────────────── */

function OrdersTab() {
  const data = useData();
  const router = useRouter();
  const q = useQueryState();
  const loading = useFirstLoad("online-orders", 450);
  const status = q.get("status") || "all";
  const channels = q.getList("channel") as ChannelId[];
  const search = q.get("q");
  const [text, setText] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => text !== search && q.set({ q: text }), 200);
    return () => clearTimeout(t);
  }, [text, search, q]);

  const filtered = useMemo(() => {
    const n = search.toLowerCase().trim();
    return data.onlineOrders
      .filter((o) => {
        if (status === "open" && !OPEN_ORDER_STATUSES.includes(o.status)) return false;
        if (status !== "all" && status !== "open" && o.status !== status) return false;
        if (channels.length && !channels.includes(o.channel)) return false;
        if (n && !`${o.number} ${o.customer.name}`.toLowerCase().includes(n)) return false;
        return true;
      })
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }, [data.onlineOrders, status, channels, search]);

  const columns = useMemo<ColumnDef<OnlineOrder, unknown>[]>(
    () => [
      {
        id: "number",
        accessorFn: (o) => o.number,
        header: "Order",
        cell: ({ row: { original: o } }) => (
          <div className="flex items-center gap-3">
            <ChannelDot channel={o.channel} />
            <div>
              <Link href={`/online/orders/${o.id}`} className="font-medium text-text-strong hover:underline underline-offset-2">
                {o.number}
              </Link>
              <span className="block text-xs text-text-sub">{CHANNEL_LABEL[o.channel]}</span>
            </div>
          </div>
        ),
      },
      { id: "placed", accessorFn: (o) => o.placedAt, header: "Placed", cell: ({ getValue }) => <span className="whitespace-nowrap text-text-sub">{fdate.relative(String(getValue()))}</span> },
      { id: "customer", accessorFn: (o) => o.customer.name, header: "Customer", meta: { hideBelow: "md" } },
      { id: "items", accessorFn: (o) => o.items.reduce((s, i) => s + i.qty, 0), header: "Items", meta: { align: "right", hideBelow: "lg" } },
      { id: "total", accessorFn: (o) => o.total, header: "Total", meta: { align: "right" }, cell: ({ getValue }) => <span className="font-medium">{fmt.money(Number(getValue()))}</span> },
      { id: "fulfillment", accessorFn: (o) => o.fulfillment, header: "Fulfilment", meta: { hideBelow: "lg" }, cell: ({ getValue }) => <span className="capitalize text-text-sub">{String(getValue())}</span> },
      { id: "status", accessorFn: (o) => ORDER_STATUSES.indexOf(o.status), header: "Status", cell: ({ row: { original: o } }) => <OrderStatusBadge status={o.status} /> },
    ],
    [],
  );
  const counts = (s: OrderStatus | "all" | "open") =>
    s === "all" ? data.onlineOrders.length : s === "open" ? data.onlineOrders.filter((o) => OPEN_ORDER_STATUSES.includes(o.status)).length : data.onlineOrders.filter((o) => o.status === s).length;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-stroke-soft px-5">
        <TabNav
          items={(["all", "open", "new", "accepted", "preparing", "completed", "cancelled"] as const).map((s) => ({
            label: s === "all" ? "All" : s === "open" ? "Open" : ORDER_STATUS_LABEL[s],
            count: counts(s),
            active: status === s,
            tone: s === "new" && counts(s) > 0 ? ("warning" as const) : undefined,
            onClick: () => q.set({ status: s === "all" ? null : s }),
          }))}
        />
      </div>
      <div className="flex flex-col gap-3 px-5 py-3.5 md:flex-row md:items-center">
        <SearchInput value={text} onChange={setText} placeholder="Search order number or customer" className="w-full md:w-[300px]" />
        <FilterMenu label="Channel" options={CHANNEL_IDS.map((c) => ({ value: c, label: CHANNEL_LABEL[c], count: data.onlineOrders.filter((o) => o.channel === c).length }))} selected={channels} onChange={(v) => q.set({ channel: v })} />
        <span className="text-sm text-text-sub md:ml-auto">{fmt.plural(filtered.length, "order")}</span>
      </div>
      <DataTable
        caption="Online orders"
        data={filtered}
        columns={columns}
        getRowId={(o) => o.id}
        loading={loading}
        pageSizes={[10, 20, 50]}
        onRowClick={(o) => router.push(`/online/orders/${o.id}`)}
        empty={
          data.onlineOrders.length === 0 ? (
            <EmptyState icon={<ShoppingBag />} title="No online orders yet" description="Once a channel is connected and your catalog is listed, orders arrive here." action={<Button asChild variant="primary"><Link href="/integrations">Connect a channel</Link></Button>} />
          ) : (
            <NoResults query={search} onClear={() => { setText(""); q.set({ q: null, channel: null, status: null }); }} what="orders" />
          )
        }
      />
    </Card>
  );
}

