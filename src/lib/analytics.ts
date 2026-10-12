import type { DayAgg, SalesChannel, SalesHistory } from "@/lib/data/history";
import { productMargin, stockStatus } from "@/lib/domain";
import { CATEGORIES, type Category, type ChannelId, type Product } from "@/lib/types";
import { sum } from "@/lib/utils";

export type RangePreset = 7 | 30 | 90;
export type DateRange = { kind: "preset"; days: RangePreset } | { kind: "custom"; from: string; to: string };

export interface Window {
  start: number;
  end: number; // inclusive
  length: number;
}

/** Resolve a range to history indexes, plus the equal-length previous period. */
export function resolveRange(h: SalesHistory, range: DateRange): { current: Window; previous: Window | null; label: string } {
  const lastIdx = h.dates.length - 1;
  let start: number;
  let end: number;
  let label: string;
  if (range.kind === "preset") {
    end = lastIdx;
    start = Math.max(0, lastIdx - range.days + 1);
    label = `Last ${range.days} days`;
  } else {
    const s = h.dates.indexOf(range.from);
    const e = h.dates.indexOf(range.to);
    start = s === -1 ? 0 : s;
    end = e === -1 ? lastIdx : e;
    if (end < start) [start, end] = [end, start];
    label = "Custom range";
  }
  const length = end - start + 1;
  const prevEnd = start - 1;
  const prevStart = prevEnd - length + 1;
  const previous = prevStart >= 0 ? { start: prevStart, end: prevEnd, length } : null;
  return { current: { start, end, length }, previous, label };
}

export interface Summary {
  gross: number;
  discounts: number;
  refunds: number;
  net: number;
  cogs: number;
  grossProfit: number;
  margin: number;
  units: number;
  transactions: number;
  atv: number;
  stockoutDays: number;
  byCategory: Record<Category, { net: number; units: number; cogs: number }>;
  byChannel: Record<SalesChannel, number>;
  onlineOrders: Record<ChannelId, number>;
  avgInventoryIndex: number;
}

export function summarize(h: SalesHistory, w: Window): Summary {
  const days = h.daily.slice(w.start, w.end + 1);
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, { net: 0, units: 0, cogs: 0 }])) as Summary["byCategory"];
  const byChannel: Summary["byChannel"] = { in_store: 0, storefront: 0, doordash: 0, ubereats: 0 };
  const onlineOrders: Summary["onlineOrders"] = { storefront: 0, doordash: 0, ubereats: 0 };
  for (const d of days) {
    for (const c of CATEGORIES) {
      byCategory[c].net += d.byCategory[c].net;
      byCategory[c].units += d.byCategory[c].units;
      byCategory[c].cogs += d.byCategory[c].cogs;
    }
    for (const k of Object.keys(byChannel) as SalesChannel[]) byChannel[k] += d.byChannel[k];
    for (const k of Object.keys(onlineOrders) as ChannelId[]) onlineOrders[k] += d.onlineOrders[k];
  }
  const net = sum(days, (d) => d.net);
  const cogs = sum(days, (d) => d.cogs);
  const transactions = sum(days, (d) => d.transactions);
  return {
    gross: sum(days, (d) => d.gross),
    discounts: sum(days, (d) => d.discounts),
    refunds: sum(days, (d) => d.refunds),
    net,
    cogs,
    grossProfit: net - cogs,
    margin: net > 0 ? (net - cogs) / net : 0,
    units: sum(days, (d) => d.units),
    transactions,
    atv: transactions > 0 ? net / transactions : 0,
    stockoutDays: sum(days, (d) => d.stockouts),
    byCategory,
    byChannel,
    onlineOrders,
    avgInventoryIndex: days.length ? sum(days, (d) => d.inventoryIndex) / days.length : 1,
  };
}

export function delta(cur: number, prev: number | undefined | null) {
  if (prev == null || prev === 0) return null;
  return (cur - prev) / prev;
}

export function seriesFor(h: SalesHistory, w: Window, liveInventoryValue: number) {
  return h.daily.slice(w.start, w.end + 1).map((d: DayAgg) => ({
    date: d.date,
    net: d.net,
    gross: d.gross,
    profit: d.net - d.cogs,
    units: d.units,
    transactions: d.transactions,
    inventoryValue: d.inventoryIndex * liveInventoryValue,
    stockouts: d.stockouts,
    storefront: d.byChannel.storefront,
    doordash: d.byChannel.doordash,
    ubereats: d.byChannel.ubereats,
    online: d.byChannel.storefront + d.byChannel.doordash + d.byChannel.ubereats,
  }));
}

export interface ProductPerf {
  product: Product;
  units: number;
  revenue: number;
  profit: number;
  daysOfCover: number;
  velocity: number;
  tiedUp: number;
}

/** Product-level performance for a window, using the historical price snapshot. */
export function productPerformance(h: SalesHistory, products: Product[], w: Window): ProductPerf[] {
  const out: ProductPerf[] = [];
  for (const p of products) {
    if (p.archived) continue;
    const series = h.units[p.id];
    const price = h.pricing[p.id]?.price ?? p.retailPrice;
    const cost = h.pricing[p.id]?.cost ?? p.unitCost;
    let units = 0;
    if (series) for (let i = w.start; i <= w.end; i++) units += series[i];
    const revenue = units * price * 0.972;
    const v = velocityOf(h, p.id);
    out.push({
      product: p,
      units,
      revenue,
      profit: revenue - units * cost,
      velocity: v,
      daysOfCover: v > 0 ? p.stock / v : p.stock > 0 ? Infinity : 0,
      tiedUp: p.stock * p.unitCost,
    });
  }
  return out;
}

/** Average units per day over the trailing 30 days. */
export function velocityOf(h: SalesHistory, productId: string, days = 30) {
  const s = h.units[productId];
  if (!s) return 0;
  let t = 0;
  for (let i = s.length - days; i < s.length; i++) t += s[i];
  return t / days;
}

export function unitsSeries(h: SalesHistory, productId: string, days = 30) {
  const s = h.units[productId] ?? [];
  return h.dates.slice(-days).map((date, i) => ({ date, units: s[s.length - days + i] ?? 0 }));
}

/* ── Inventory snapshots (live state) ─────────────────────── */

export function inventorySnapshot(products: Product[]) {
  const active = products.filter((p) => !p.archived);
  let healthy = 0;
  let low = 0;
  let out = 0;
  let value = 0;
  let retailValue = 0;
  for (const p of active) {
    const s = stockStatus(p);
    if (s === "healthy") healthy++;
    else if (s === "low") low++;
    else out++;
    value += Math.max(0, p.stock) * p.unitCost;
    retailValue += Math.max(0, p.stock) * p.retailPrice;
  }
  const avgMargin = active.length ? sum(active, productMargin) / active.length : 0;
  return { total: active.length, healthy, low, out, value, retailValue, avgMargin };
}
