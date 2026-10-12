"use client";

import { Sparks, StatsReport } from "iconoir-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { delta, productPerformance, resolveRange, seriesFor, summarize } from "@/lib/analytics";
import { CHANNEL_LABEL } from "@/lib/domain";
import { fdate, fmt } from "@/lib/format";
import { useFirstLoad, useHistory, useInventoryStats } from "@/lib/hooks";
import { useData } from "@/lib/store/app-store";
import { CATEGORIES, type ChannelId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BarList, ChartFrame, Legend, SERIES, TimeSeriesChart, type SeriesDef } from "@/components/charts/charts";
import { ProductThumb } from "@/components/domain/product-thumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Delta, KpiCard } from "@/components/ui/display";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { SegmentedControl, TabNav } from "@/components/ui/tabs";
import { RangeFilter, useRange } from "@/features/analytics/range-filter";

export function AnalyticsTabs({ active }: { active: "overview" | "smart" }) {
  return (
    <div className="mb-5 border-b border-stroke-soft">
      <TabNav
        items={[
          { label: "Overview", href: "/analytics", active: active === "overview" },
          { label: "Smart ordering", href: "/analytics/smart-ordering", active: active === "smart" },
        ]}
      />
    </div>
  );
}

export function AnalyticsPage() {
  const data = useData();
  const history = useHistory();
  const inv = useInventoryStats();
  const router = useRouter();
  const range = useRange();
  const loading = useFirstLoad("analytics", 650);
  const [perfView, setPerfView] = useState<"top" | "slow">("top");

  const { current, previous, label } = useMemo(() => resolveRange(history, range), [history, range]);
  const s = useMemo(() => summarize(history, current), [history, current]);
  const p = useMemo(() => (previous ? summarize(history, previous) : null), [history, previous]);
  const series = useMemo(() => seriesFor(history, current, inv.value), [history, current, inv.value]);
  const perf = useMemo(() => productPerformance(history, data.products, current), [history, data.products, current]);
  const top = useMemo(() => [...perf].sort((a, b) => b.revenue - a.revenue).slice(0, 8), [perf]);
  const slow = useMemo(
    () =>
      [...perf]
        .filter((x) => x.product.stock > 0)
        .sort((a, b) => b.daysOfCover - a.daysOfCover || b.tiedUp - a.tiedUp)
        .slice(0, 8),
    [perf],
  );
  const hasData = s.net > 0;
  const rangeText = range.kind === "preset" ? label.toLowerCase() : `${fdate.short(`${history.dates[current.start]}T12:00:00`)} – ${fdate.short(`${history.dates[current.end]}T12:00:00`)}`;
  const avgInventory = inv.value * s.avgInventoryIndex;
  const turnover = avgInventory > 0 ? s.cogs / avgInventory : 0;
  const annualTurnover = turnover * (365 / current.length);

  const salesSeries: SeriesDef[] = [
    { key: "net", label: "Net sales", color: SERIES[1], kind: "area" },
    { key: "profit", label: "Gross profit", color: SERIES[2], kind: "line" },
  ];
  const chartData = series.map((d) => ({ date: d.date, net: Math.round(d.net), profit: Math.round(d.profit) }));
  const invData = series.map((d) => ({ date: d.date, inventoryValue: Math.round(d.inventoryValue) }));
  const catItems = CATEGORIES.map((c) => ({ key: c, label: c, value: s.byCategory[c].net, hint: s.net ? fmt.pct(s.byCategory[c].net / s.net, 0) : undefined }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const channels: ("in_store" | ChannelId)[] = ["in_store", "storefront", "doordash", "ubereats"];

  return (
    <>
      <PageHeader
        title="Analytics"
        description={`What's selling, what's tying up cash, and what to reorder · ${rangeText}`}
        actions={<RangeFilter history={history} />}
      />
      <AnalyticsTabs active="overview" />

      {!hasData && !loading ? (
        <Card>
          <EmptyState
            icon={<StatsReport />}
            title="No analytics data yet"
            description="Sales, margins and inventory trends appear after your store records its first transactions."
            action={
              <Button asChild variant="primary">
                <Link href="/inventory">Set up inventory</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <section aria-label="Sales metrics" className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
            <KpiCard loading={loading} label="Gross sales" value={fmt.money0(s.gross)} delta={delta(s.gross, p?.gross)} sub="Before discounts & refunds" />
            <KpiCard loading={loading} label="Net sales" value={fmt.money0(s.net)} delta={delta(s.net, p?.net)} sub={`${fmt.money0(s.discounts + s.refunds)} discounts & refunds`} />
            <KpiCard loading={loading} label="Gross profit" value={fmt.money0(s.grossProfit)} delta={delta(s.grossProfit, p?.grossProfit)} sub="Net sales − cost of goods" />
            <KpiCard loading={loading} label="Gross margin" value={fmt.pct(s.margin)} delta={delta(s.margin, p?.margin)} sub={p ? `${fmt.pct(p.margin)} previous period` : "Estimated"} />
            <KpiCard loading={loading} label="Units sold" value={fmt.int(s.units)} delta={delta(s.units, p?.units)} sub={`${fmt.dec1(s.units / current.length)} per day`} />
            <KpiCard loading={loading} label="Avg. transaction" value={fmt.money(s.atv)} delta={delta(s.atv, p?.atv)} sub={`${fmt.int(s.transactions)} transactions`} />
          </section>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Sales and gross profit" description={`Daily, ${rangeText} · same $ axis`} />
              <CardBody>
                {loading ? (
                  <Skeleton className="h-[300px]" />
                ) : (
                  <ChartFrame
                    legend={<Legend series={salesSeries} />}
                    chart={<TimeSeriesChart data={chartData} series={salesSeries} height={280} />}
                    table={{ columns: ["Date", "Net sales", "Gross profit"], rows: chartData.map((d) => [fdate.weekday(`${d.date}T12:00:00`), fmt.money0(d.net), fmt.money0(d.profit)]) }}
                  />
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Sales by category" description={`Net sales · ${rangeText}`} />
              <CardBody>
                {loading ? (
                  <Skeleton className="h-[300px]" />
                ) : (
                  <BarList items={catItems} onSelect={(c) => router.push(`/inventory?category=${encodeURIComponent(c)}`)} />
                )}
              </CardBody>
            </Card>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Inventory value over time" description="Stock on hand at cost · today's point is live" />
              <CardBody>
                {loading ? (
                  <Skeleton className="h-[220px]" />
                ) : (
                  <ChartFrame
                    chart={<TimeSeriesChart data={invData} series={[{ key: "inventoryValue", label: "Inventory value", color: SERIES[2], kind: "area" }]} height={220} />}
                    table={{ columns: ["Date", "Inventory value"], rows: invData.map((d) => [fdate.weekday(`${d.date}T12:00:00`), fmt.money0(d.inventoryValue)]) }}
                  />
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Inventory efficiency" description={rangeText} />
              <CardBody>
                <dl className="space-y-4">
                  <Metric label="Inventory turnover" value={`${fmt.dec1(turnover)}×`} sub={`≈ ${fmt.dec1(annualTurnover)}× a year at this pace`} />
                  <Metric label="Average inventory value" value={fmt.money0(avgInventory)} sub={`${fmt.money0(inv.value)} today`} />
                  <Metric
                    label="Stockout frequency"
                    value={fmt.plural(s.stockoutDays, "product-day")}
                    sub={`Products at zero stock on a given day · ${inv.out} out of stock now`}
                    delta={p ? delta(s.stockoutDays, p.stockoutDays) : null}
                    invert
                  />
                  <Metric label="Cash tied up in slow movers" value={fmt.money0(slow.reduce((a, b) => a + b.tiedUp, 0))} sub="Top 8 products by days of cover" />
                </dl>
              </CardBody>
            </Card>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="overflow-hidden xl:col-span-2" id="products">
              <CardHeader
                title={perfView === "top" ? "Top-selling products" : "Slow-moving products"}
                description={perfView === "top" ? `By net revenue · ${rangeText}` : "Highest days of stock cover — cash sitting on the shelf"}
                action={
                  <SegmentedControl
                    aria-label="Product performance view"
                    size="xs"
                    value={perfView}
                    onChange={setPerfView}
                    options={[
                      { value: "top", label: "Top sellers" },
                      { value: "slow", label: "Slow movers" },
                    ]}
                  />
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-y border-stroke-soft bg-bg-surface text-left text-xs text-text-sub">
                      <th scope="col" className="w-8 px-5 py-2 font-medium">#</th>
                      <th scope="col" className="px-3 py-2 font-medium">Product</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Units</th>
                      {perfView === "top" ? (
                        <>
                          <th scope="col" className="px-3 py-2 text-right font-medium">Revenue</th>
                          <th scope="col" className="px-5 py-2 text-right font-medium">Gross profit</th>
                        </>
                      ) : (
                        <>
                          <th scope="col" className="px-3 py-2 text-right font-medium">Days of cover</th>
                          <th scope="col" className="px-5 py-2 text-right font-medium">Cash tied up</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(perfView === "top" ? top : slow).map((x, i) => (
                      <tr key={x.product.id} className="cursor-pointer border-b border-stroke-soft last:border-0 hover:bg-bg-surface" onClick={() => router.push(`/inventory/${x.product.id}`)}>
                        <td className="px-5 py-2.5 text-xs text-text-soft tnum">{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <Link href={`/inventory/${x.product.id}`} className="flex items-center gap-3">
                            <ProductThumb thumb={x.product.thumb} category={x.product.category} size="sm" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-text-strong">{x.product.name}</span>
                              <span className="block text-xs text-text-sub">
                                {x.product.size} · {x.product.stock} on hand
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-right tnum">{fmt.int(x.units)}</td>
                        {perfView === "top" ? (
                          <>
                            <td className="px-3 py-2.5 text-right font-medium tnum">{fmt.money0(x.revenue)}</td>
                            <td className="px-5 py-2.5 text-right tnum text-text-sub">{fmt.money0(x.profit)}</td>
                          </>
                        ) : (
                          <>
                            <td className={cn("px-3 py-2.5 text-right font-medium tnum", x.daysOfCover > 90 && "text-warning-dark")}>{Number.isFinite(x.daysOfCover) ? `${fmt.int(x.daysOfCover)} days` : "No sales"}</td>
                            <td className="px-5 py-2.5 text-right tnum">{fmt.money0(x.tiedUp)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card>
              <CardHeader title="Sales by channel" description={`Net sales · ${rangeText}`} action={<Link href="/online" className="text-sm font-medium text-text-sub hover:text-text-strong">Online sales</Link>} />
              <CardBody>
                <ul className="space-y-3">
                  {channels.map((c) => {
                    const v = s.byChannel[c];
                    const pv = p?.byChannel[c];
                    return (
                      <li key={c} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-text-strong">{c === "in_store" ? "In store (POS)" : CHANNEL_LABEL[c]}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-medium tnum">{fmt.money0(v)}</span>
                          <span className="w-10 text-right text-xs text-text-sub tnum">{fmt.pct(v / s.net, 0)}</span>
                          <Delta value={pv ? delta(v, pv) : null} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-5 rounded-md bg-primary-mute/60 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-text-strong">
                    <Sparks className="size-4 text-primary-base" />
                    Turn insight into action
                  </p>
                  <p className="mt-1 text-xs text-text-sub">Smart ordering combines these sales velocities with stock, lead times and targets.</p>
                  <Button asChild size="sm" variant="primary" className="mt-3">
                    <Link href="/analytics/smart-ordering">Review reorder suggestions</Link>
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function Metric({ label, value, sub, delta: d, invert }: { label: string; value: string; sub: string; delta?: number | null; invert?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-text-sub">{label}</dt>
      <dd className="mt-0.5 flex items-baseline gap-2">
        <span className="text-lg font-medium text-text-strong">{value}</span>
        {d !== undefined && <Delta value={d} invert={invert} />}
      </dd>
      <p className="text-xs text-text-sub">{sub}</p>
    </div>
  );
}
