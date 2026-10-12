"use client";

import {
  ArrowRight,
  BoxIso,
  CheckCircle,
  Clock,
  Coins,
  Page,
  PercentageCircle,
  RefreshDouble,
  ShoppingBag,
  Sparks,
  WarningCircle,
  WarningTriangle,
} from "iconoir-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { delta, productPerformance, resolveRange, seriesFor, summarize, type RangePreset } from "@/lib/analytics";
import { CHANNEL_LABEL, OPEN_ORDER_STATUSES, poTotal, RECEIVABLE_PO_STATUSES } from "@/lib/domain";
import { fdate, fmt } from "@/lib/format";
import { useFirstLoad, useHistory, useInventoryStats, useQueryState, useRecommendations, useSupplierMap } from "@/lib/hooks";
import { simulateRequest } from "@/lib/simulate";
import { useData } from "@/lib/store/app-store";
import { toast } from "@/lib/store/toast-store";
import { cn, daysBetween } from "@/lib/utils";
import { ChartFrame, Legend, SERIES, TimeSeriesChart, type SeriesDef } from "@/components/charts/charts";
import { ProductThumb } from "@/components/domain/product-thumb";
import { ChannelStatusBadge, POStatusBadge } from "@/components/domain/status";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Delta, KpiCard, LinkRow, Monogram } from "@/components/ui/display";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { SegmentedControl } from "@/components/ui/tabs";

const RANGES: { value: string; label: string }[] = [
  { value: "7", label: "7D" },
  { value: "30", label: "30D" },
  { value: "90", label: "90D" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function OverviewPage() {
  const data = useData();
  const history = useHistory();
  const stats = useInventoryStats();
  const recs = useRecommendations();
  const suppliers = useSupplierMap();
  const loading = useFirstLoad("overview", 700);
  const q = useQueryState();
  const days = (Number(q.get("range")) || 30) as RangePreset;
  const [refresh, setRefresh] = useState<{ state: "idle" | "loading" | "error"; at: Date }>({ state: "idle", at: new Date() });

  const { current, previous } = useMemo(() => resolveRange(history, { kind: "preset", days }), [history, days]);
  const summary = useMemo(() => summarize(history, current), [history, current]);
  const prevSummary = useMemo(() => (previous ? summarize(history, previous) : null), [history, previous]);
  const series = useMemo(() => {
    const cur = seriesFor(history, current, stats.value);
    const prev = previous ? seriesFor(history, previous, stats.value) : [];
    return cur.map((d, i) => ({ date: d.date, net: Math.round(d.net), prev: prev[i] ? Math.round(prev[i].net) : 0 }));
  }, [history, current, previous, stats.value]);
  const today = history.daily[history.daily.length - 1];
  // Benchmark: average of the same weekday over the previous four weeks.
  const sameDays = [7, 14, 21, 28].map((d) => history.daily[history.daily.length - 1 - d]).filter(Boolean);
  const typicalDay = sameDays.length ? sameDays.reduce((s, d) => s + d.net, 0) / sameDays.length : 0;
  const weekdayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const top = useMemo(
    () =>
      productPerformance(history, data.products, current)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
    [history, data.products, current],
  );
  const hasSales = summary.net > 0;
  const activeRecs = recs.filter((r) => !r.dismissedAt);
  const recentPOs = [...data.purchaseOrders].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  const doRefresh = async () => {
    setRefresh((r) => ({ ...r, state: "loading" }));
    try {
      await simulateRequest({ ms: 900 });
      setRefresh({ state: "idle", at: new Date() });
      toast.success("Dashboard refreshed", "Figures are up to date with the latest demo data.");
    } catch {
      setRefresh((r) => ({ ...r, state: "error" }));
    }
  };

  const seriesDefs: SeriesDef[] = [
    { key: "net", label: `Net sales · last ${days} days`, color: SERIES[1], kind: "area" },
    ...(previous ? [{ key: "prev", label: `Previous ${days} days`, color: SERIES.muted, kind: "line" as const }] : []),
  ];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${data.profile.ownerName.split(" ")[0]}`}
        description={
          <>
            {fdate.long(new Date())} · {data.profile.name}
          </>
        }
        actions={
          <>
            <SegmentedControl aria-label="Date range" value={String(days)} onChange={(v) => q.set({ range: v === "30" ? null : v })} options={RANGES} />
            <Button
              variant="secondary"
              leftIcon={<RefreshDouble className={cn(refresh.state === "loading" && "animate-spin")} />}
              onClick={doRefresh}
              disabled={refresh.state === "loading"}
              aria-label="Refresh dashboard"
            >
              <span className="hidden sm:inline">{refresh.state === "loading" ? "Refreshing…" : "Refresh"}</span>
            </Button>
          </>
        }
      />

      {refresh.state === "error" && (
        <div role="alert" className="mb-4 flex flex-col gap-3 rounded-md border border-error-faint bg-error-mute px-4 py-3 text-sm text-error-dark sm:flex-row sm:items-center">
          <WarningCircle className="size-5 shrink-0 text-error-base" />
          <p className="flex-1">
            <span className="font-medium">Couldn&apos;t refresh the dashboard.</span> A simulated network error interrupted the request — you&apos;re seeing data from{" "}
            {fdate.time(refresh.at)}.
          </p>
          <Button size="sm" variant="secondary" onClick={doRefresh}>
            Try again
          </Button>
        </div>
      )}

      <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          loading={loading}
          label="Inventory value"
          icon={<Coins />}
          value={fmt.money0(stats.value)}
          sub={`${stats.total} active products · ${fmt.moneyCompact(stats.retailValue)} at retail`}
          href="/inventory?sort=value"
        />
        <KpiCard
          loading={loading}
          label="Sales today"
          icon={<ShoppingBag />}
          value={fmt.money0(today?.net ?? 0)}
          delta={hasSales ? delta(today.net, typicalDay) : undefined}
          sub={hasSales ? `${fmt.int(today.transactions)} transactions · vs. a typical ${weekdayName}` : "No sales recorded yet"}
          href="/analytics?range=7"
        />
        <KpiCard
          loading={loading}
          label="Gross margin"
          icon={<PercentageCircle />}
          value={hasSales ? fmt.pct(summary.margin) : "—"}
          delta={hasSales && prevSummary ? delta(summary.margin, prevSummary.margin) : undefined}
          sub={hasSales ? `${fmt.money0(summary.grossProfit)} gross profit · last ${days} days` : "Appears after your first sale"}
          href={`/analytics?range=${days}`}
        />
        <KpiCard
          loading={loading}
          label="Low-stock products"
          icon={<WarningTriangle />}
          tone={stats.low + stats.out > 0 ? "warning" : undefined}
          value={fmt.int(stats.low)}
          sub={`${stats.out} out of stock · ${activeRecs.length} reorder suggestions`}
          href="/inventory?status=low"
        />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Sales performance"
            description={`Net sales after discounts and refunds · last ${days} days`}
            action={
              <Link href={`/analytics?range=${days}`} className="text-sm font-medium text-text-sub hover:text-text-strong">
                Open analytics
              </Link>
            }
          />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-md" />
            ) : refresh.state === "error" ? (
              <ErrorState title="Sales data didn't refresh" onRetry={doRefresh} className="h-[300px]" />
            ) : !hasSales ? (
              <EmptyState
                icon={<ShoppingBag />}
                title="No sales activity yet"
                description="Sales appear here once products are on the shelf and the register records transactions."
                action={
                  <Button asChild variant="primary" size="sm">
                    <Link href="/inventory?new=1">Add your first product</Link>
                  </Button>
                }
                className="h-[300px]"
              />
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-3xl font-medium tracking-[-0.02em] text-text-strong">{fmt.money0(summary.net)}</span>
                  <Delta value={prevSummary ? delta(summary.net, prevSummary.net) : null} />
                  <span className="text-sm text-text-sub">vs previous {days} days</span>
                </div>
                <ChartFrame
                  legend={<Legend series={seriesDefs} />}
                  chart={<TimeSeriesChart data={series} series={seriesDefs} height={250} dimmed={refresh.state === "loading"} />}
                  table={{
                    columns: ["Date", "Net sales", "Previous period"],
                    rows: series.map((d) => [fdate.weekday(`${d.date}T12:00:00`), fmt.money0(d.net), d.prev ? fmt.money0(d.prev) : "—"]),
                  }}
                />
                <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-stroke-soft bg-stroke-soft sm:grid-cols-4">
                  {[
                    { label: "Transactions", value: fmt.int(summary.transactions), d: delta(summary.transactions, prevSummary?.transactions) },
                    { label: "Avg. transaction", value: fmt.money(summary.atv), d: delta(summary.atv, prevSummary?.atv) },
                    { label: "Units sold", value: fmt.int(summary.units), d: delta(summary.units, prevSummary?.units) },
                    { label: "Online share", value: fmt.pct((summary.byChannel.storefront + summary.byChannel.doordash + summary.byChannel.ubereats) / summary.net), d: null },
                  ].map((m) => (
                    <div key={m.label} className="bg-bg-default px-4 py-3">
                      <dt className="text-xs text-text-sub">{m.label}</dt>
                      <dd className="mt-1 flex items-baseline gap-2">
                        <span className="text-base font-medium text-text-strong">{m.value}</span>
                        {m.d !== null && <Delta value={m.d} />}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </CardBody>
        </Card>

        <AttentionCard loading={loading} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title="Inventory health" description={`${stats.total} active products`} action={<ViewAll href="/inventory" />} />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[150px] w-full" />
            ) : stats.total === 0 ? (
              <EmptyState compact icon={<BoxIso />} title="No products yet" description="Add products to track stock health." />
            ) : (
              <HealthBar healthy={stats.healthy} low={stats.low} out={stats.out} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top-selling products" description={`By revenue · last ${days} days`} action={<ViewAll href={`/analytics?range=${days}#products`} />} />
          <CardBody className="px-3">
            {loading ? (
              <ListSkeleton />
            ) : top.length === 0 || !hasSales ? (
              <EmptyState compact icon={<Sparks />} title="No best-sellers yet" description="Top products show up after a few days of sales." />
            ) : (
              <ol>
                {top.map((t, i) => (
                  <li key={t.product.id}>
                    <LinkRow href={`/inventory/${t.product.id}`}>
                      <span className="w-4 text-center text-xs text-text-soft tnum">{i + 1}</span>
                      <ProductThumb thumb={t.product.thumb} category={t.product.category} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text-strong">{t.product.name}</span>
                        <span className="block text-xs text-text-sub">
                          {t.product.size} · {fmt.int(t.units)} sold
                        </span>
                      </span>
                      <span className="text-sm font-medium text-text-strong tnum">{fmt.money0(t.revenue)}</span>
                    </LinkRow>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader title="Recent purchase orders" description="Latest activity with suppliers" action={<ViewAll href="/purchase-orders" />} />
          <CardBody className="px-3">
            {loading ? (
              <ListSkeleton />
            ) : recentPOs.length === 0 ? (
              <EmptyState
                compact
                icon={<Page />}
                title="No purchase orders yet"
                description="Create one to restock from a supplier."
                action={
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/purchase-orders/new">New purchase order</Link>
                  </Button>
                }
              />
            ) : (
              <ul>
                {recentPOs.map((po) => {
                  const s = suppliers.get(po.supplierId);
                  const late = po.expectedAt && RECEIVABLE_PO_STATUSES.includes(po.status) && daysBetween(po.expectedAt, new Date()) > 0;
                  return (
                    <li key={po.id}>
                      <LinkRow href={`/purchase-orders/${po.id}`}>
                        {s && <Monogram text={s.monogram} color={s.color} size="sm" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-text-strong">
                            {po.number} <span className="font-normal text-text-sub">· {s?.name}</span>
                          </span>
                          <span className={cn("block text-xs", late ? "text-error-dark" : "text-text-sub")}>
                            {fmt.money0(poTotal(po))} · {late ? fdate.due(po.expectedAt!) : fdate.relative(po.updatedAt)}
                          </span>
                        </span>
                        <POStatusBadge status={po.status} size="sm" />
                      </LinkRow>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <ChannelSummary loading={loading} days={days} online={summary.byChannel} orders={summary.onlineOrders} prev={prevSummary?.byChannel} />
    </>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-text-sub hover:text-text-strong">
      View all
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3 px-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-10" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HealthBar({ healthy, low, out }: { healthy: number; low: number; out: number }) {
  const total = Math.max(1, healthy + low + out);
  const rows = [
    { key: "healthy", label: "In stock", value: healthy, cls: "bg-success-base", href: "/inventory?status=healthy", icon: <CheckCircle className="text-success-base" /> },
    { key: "low", label: "Low stock", value: low, cls: "bg-warning-base", href: "/inventory?status=low", icon: <WarningTriangle className="text-warning-base" /> },
    { key: "out", label: "Out of stock", value: out, cls: "bg-error-base", href: "/inventory?status=out", icon: <WarningCircle className="text-error-base" /> },
  ];
  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${healthy} in stock, ${low} low stock, ${out} out of stock`}>
        {rows.map((r) =>
          r.value > 0 ? <Link key={r.key} href={r.href} aria-label={`${r.label}: ${r.value}`} className={cn("h-full transition-opacity hover:opacity-80", r.cls)} style={{ width: `${(r.value / total) * 100}%` }} /> : null,
        )}
      </div>
      <ul className="mt-4 divide-y divide-stroke-soft">
        {rows.map((r) => (
          <li key={r.key}>
            <Link href={r.href} className="-mx-2 flex items-center gap-2.5 rounded-sm px-2 py-2.5 text-sm hover:bg-bg-surface">
              <span className="[&_svg]:size-4">{r.icon}</span>
              <span className="flex-1 text-text-strong">{r.label}</span>
              <span className="font-medium text-text-strong tnum">{r.value}</span>
              <span className="w-12 text-right text-xs text-text-sub tnum">{fmt.pct(r.value / total, 0)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Alert {
  id: string;
  tone: "error" | "warning" | "info" | "primary";
  icon: ReactNode;
  title: ReactNode;
  body: ReactNode;
  href: string;
  cta: string;
}

function AttentionCard({ loading }: { loading: boolean }) {
  const data = useData();
  const stats = useInventoryStats();
  const recs = useRecommendations();
  const suppliers = useSupplierMap();
  const active = recs.filter((r) => !r.dismissedAt);
  const orderable = active.filter((r) => r.coverage === "ok");
  const hero = active.find((r) => r.priority === "critical" && r.product.stock > 0 && r.coverage === "ok");
  const pending = data.purchaseOrders.filter((p) => p.status === "pending_approval");
  const late = data.purchaseOrders.filter((p) => p.expectedAt && RECEIVABLE_PO_STATUSES.includes(p.status) && daysBetween(p.expectedAt, new Date()) > 0);
  const channelIssues = data.channels.filter((c) => c.status === "action_required" || c.status === "failed");
  const newOrders = data.onlineOrders.filter((o) => o.status === "new").length;

  const alerts: Alert[] = [];
  if (hero) {
    alerts.push({
      id: "hero",
      tone: "error",
      icon: <WarningTriangle />,
      title: `${hero.product.name} runs out in ~${Math.max(1, Math.floor(hero.daysLeft))} days`,
      body: `${hero.product.stock} left, selling ${fmt.dec1(hero.velocity)}/day. ${hero.supplier?.name} needs ${hero.leadTime} days to deliver.`,
      href: `/inventory/${hero.product.id}`,
      cta: "Review & reorder",
    });
  }
  if (stats.out > 0)
    alerts.push({ id: "out", tone: "error", icon: <WarningCircle />, title: `${stats.out} products are out of stock`, body: "Lost sales in store and online until restocked.", href: "/inventory?status=out", cta: "View products" });
  if (active.length > 0)
    alerts.push({
      id: "recs",
      tone: "primary",
      icon: <Sparks />,
      title: `${active.length} reorder recommendations`,
      body: `${orderable.length} ready to order · est. ${fmt.money0(orderable.reduce((s, r) => s + r.total, 0))} across ${new Set(orderable.map((r) => r.supplier?.id)).size} suppliers.`,
      href: "/analytics/smart-ordering",
      cta: "Review suggestions",
    });
  for (const po of pending.slice(0, 1))
    alerts.push({ id: po.id, tone: "warning", icon: <Page />, title: `${po.number} needs approval`, body: `${fmt.money(poTotal(po))} · ${suppliers.get(po.supplierId)?.name}`, href: `/purchase-orders/${po.id}`, cta: "Review order" });
  for (const po of late.slice(0, 1))
    alerts.push({ id: `late${po.id}`, tone: "warning", icon: <Clock />, title: `${po.number} delivery is late`, body: `Expected ${fdate.short(po.expectedAt!)} from ${suppliers.get(po.supplierId)?.name}.`, href: `/purchase-orders/${po.id}`, cta: "Open order" });
  for (const c of channelIssues)
    alerts.push({ id: c.id, tone: "warning", icon: <WarningTriangle />, title: `${c.name} needs attention`, body: c.error?.message ?? "Sync issue detected.", href: `/integrations/${c.id}`, cta: "Fix sync" });
  if (newOrders > 0)
    alerts.push({ id: "orders", tone: "info", icon: <ShoppingBag />, title: `${newOrders} new online orders`, body: "Accept them to start preparing.", href: "/online?tab=orders&status=new", cta: "Open orders" });

  const toneCls = { error: "bg-error-mute text-error-base", warning: "bg-warning-mute text-warning-base", info: "bg-info-mute text-info-base", primary: "bg-primary-mute text-primary-base" };

  return (
    <Card className="flex flex-col">
      <CardHeader title="Needs attention" description="Alerts and recommended next steps" action={alerts.length > 0 && !loading ? <span className="text-xs text-text-sub tnum">{alerts.length}</span> : undefined} />
      <CardBody className="flex-1 px-3">
        {loading ? (
          <ListSkeleton />
        ) : alerts.length === 0 ? (
          <EmptyState compact icon={<CheckCircle />} title="All clear" description="No stock, supplier or channel issues right now. We'll flag anything that needs you here." />
        ) : (
          <ul className="space-y-1">
            {alerts.slice(0, 5).map((a) => (
              <li key={a.id}>
                <Link href={a.href} className="group flex gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/25">
                  <span className={cn("mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4", toneCls[a.tone])}>{a.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-text-strong">{a.title}</span>
                    <span className="mt-0.5 block text-xs text-text-sub">{a.body}</span>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary-base">
                      {a.cta}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function ChannelSummary({
  loading,
  days,
  online,
  orders,
  prev,
}: {
  loading: boolean;
  days: number;
  online: Record<string, number>;
  orders: Record<string, number>;
  prev?: Record<string, number>;
}) {
  const data = useData();
  const openOrders = data.onlineOrders.filter((o) => OPEN_ORDER_STATUSES.includes(o.status)).length;
  const totalOnline = online.storefront + online.doordash + online.ubereats;
  return (
    <Card className="mt-4">
      <CardHeader
        title="Online channels"
        description={`${fmt.money0(totalOnline)} online sales · last ${days} days · ${openOrders} open orders`}
        action={
          <Button asChild size="sm" variant="secondary">
            <Link href="/online">Open online sales</Link>
          </Button>
        }
      />
      <CardBody>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[112px] rounded-md" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {data.channels.map((c) => {
              const listed = data.products.filter((p) => p.online.listings[c.id] === "listed").length;
              return (
                <Link
                  key={c.id}
                  href={c.status === "disconnected" ? `/integrations/${c.id}` : `/online?tab=orders&channel=${c.id}`}
                  className="group rounded-md border border-stroke-soft p-4 transition-colors hover:border-stroke-mid hover:bg-bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/25"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-strong">{CHANNEL_LABEL[c.id]}</span>
                    <ChannelStatusBadge status={c.status} size="sm" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-xl font-medium text-text-strong">{c.status === "disconnected" ? "—" : fmt.money0(online[c.id] ?? 0)}</span>
                    {c.status !== "disconnected" && <Delta value={prev ? delta(online[c.id], prev[c.id]) : null} />}
                  </div>
                  <p className="mt-1 text-xs text-text-sub">
                    {c.status === "disconnected" ? "Not connected — connect to start selling" : `${fmt.int(orders[c.id] ?? 0)} orders · ${listed} products listed`}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
