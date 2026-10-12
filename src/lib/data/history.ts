import { productSeeds } from "@/lib/data/seed";
import { CATEGORIES, type Category, type ChannelId, type StoreId } from "@/lib/types";
import { addDays, createRng, hashString, isoDate, startOfDay } from "@/lib/utils";

/**
 * 180 days of deterministic daily sales per product. Every chart, KPI,
 * top-seller list and reorder velocity is derived from this one dataset,
 * so switching date ranges moves all of them together.
 */
export const HISTORY_DAYS = 180;
export type SalesChannel = "in_store" | ChannelId;

export interface DayAgg {
  date: string;
  gross: number;
  discounts: number;
  refunds: number;
  net: number;
  cogs: number;
  units: number;
  transactions: number;
  byCategory: Record<Category, { net: number; units: number; cogs: number }>;
  byChannel: Record<SalesChannel, number>;
  onlineOrders: Record<ChannelId, number>;
  /** Relative inventory value (1.0 = today's live value). */
  inventoryIndex: number;
  stockouts: number;
}

export interface SalesHistory {
  storeId: StoreId;
  dates: string[];
  daily: DayAgg[];
  /** productId → units sold per day (aligned with `dates`). */
  units: Record<string, number[]>;
  /** Price/cost snapshot used for historical revenue. */
  pricing: Record<string, { price: number; cost: number; category: Category }>;
}

const WEEKDAY = [0.85, 0.7, 0.75, 0.85, 1.0, 1.4, 1.45]; // Sun..Sat, mean 1.0
const cache = new Map<string, SalesHistory>();

export function getSalesHistory(storeId: StoreId, now = new Date()): SalesHistory {
  const key = `${storeId}:${isoDate(now)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const h = generate(storeId, now);
  cache.set(key, h);
  return h;
}

function poisson(mean: number, r: () => number) {
  if (mean <= 0) return 0;
  if (mean > 30) {
    // Normal approximation for large means.
    const u = 1 - r();
    const v = r();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return Math.max(0, Math.round(mean + z * Math.sqrt(mean)));
  }
  const L = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= r();
  } while (p > L);
  return k - 1;
}

function emptyByCategory() {
  return Object.fromEntries(CATEGORIES.map((c) => [c, { net: 0, units: 0, cogs: 0 }])) as DayAgg["byCategory"];
}

function generate(storeId: StoreId, now: Date): SalesHistory {
  const seeds = productSeeds(storeId);
  const rng = createRng(hashString(`history:${storeId}`));
  const today = startOfDay(now);
  const dates = Array.from({ length: HISTORY_DAYS }, (_, i) => isoDate(addDays(today, i - (HISTORY_DAYS - 1))));
  const dow = dates.map((d) => new Date(`${d}T12:00:00`).getDay());
  const units: Record<string, number[]> = {};
  const pricing: SalesHistory["pricing"] = {};

  // Store-wide day factor (weather, events) shared by every product.
  const dayFactor = dates.map(() => 0.93 + rng.next() * 0.14);
  const T = HISTORY_DAYS - 1;
  for (const s of seeds) {
    pricing[s.id] = { price: s.price, cost: s.cost, category: s.category };
    const series = new Array<number>(HISTORY_DAYS);
    for (let d = 0; d < HISTORY_DAYS; d++) {
      const trend = 0.88 + 0.12 * (d / (HISTORY_DAYS - 1));
      series[d] = poisson(s.velocity * WEEKDAY[dow[d]] * trend * dayFactor[d], rng.next);
    }
    units[s.id] = series;
  }

  // Pin each product's trailing 30 days so displayed velocity equals the seeded
  // velocity. Today is left alone (shaped separately below).
  const pin = () => {
    for (const s of seeds) {
      const series = units[s.id];
      let diff = Math.round(s.velocity * 30) - series.slice(-30).reduce((a, b) => a + b, 0);
      for (let guard = 0; diff !== 0 && guard < 5000; guard++) {
        const d = T - 1 - Math.floor(rng.next() * 29);
        if (diff > 0) {
          series[d]++;
          diff--;
        } else if (series[d] > 0) {
          series[d]--;
          diff++;
        }
      }
    }
  };

  // Today is the demo's headline figure: shape it to ~4% above a typical same
  // weekday (avg of the prior four) so it reads like an ordinary, slightly busy
  // day. A few shape → re-pin passes converge on the post-pin benchmark.
  const grossOn = (d: number) => seeds.reduce((acc, s) => acc + units[s.id][d] * s.price, 0);
  const movers = seeds.filter((s) => s.velocity >= 0.4);
  pin();
  for (let pass = 0; pass < 4; pass++) {
    const goal = ([7, 14, 21, 28].reduce((acc, k) => acc + grossOn(T - k), 0) / 4) * 1.04;
    let todayGross = grossOn(T);
    for (let guard = 0; guard < 4000 && movers.length && Math.abs(todayGross - goal) > goal * 0.01; guard++) {
      const s = movers[Math.floor(rng.next() * movers.length)];
      if (todayGross < goal) {
        units[s.id][T]++;
        todayGross += s.price;
      } else if (units[s.id][T] > 0) {
        units[s.id][T]--;
        todayGross -= s.price;
      }
    }
    pin();
  }

  const daily: DayAgg[] = dates.map((date, d) => {
    const byCategory = emptyByCategory();
    let gross = 0;
    let cogs = 0;
    let u = 0;
    for (const s of seeds) {
      const n = units[s.id][d];
      if (!n) continue;
      gross += n * s.price;
      cogs += n * s.cost;
      u += n;
      const c = byCategory[s.category];
      c.units += n;
      c.cogs += n * s.cost;
      c.net += n * s.price; // gross for now; scaled to net below
    }
    const r1 = rng.next();
    const r2 = rng.next();
    const discountRate = 0.02 + 0.015 * r1;
    const refundRate = 0.004 + 0.004 * r2;
    const discounts = gross * discountRate;
    const refunds = gross * refundRate;
    const net = gross - discounts - refunds;
    const netFactor = gross > 0 ? net / gross : 0;
    for (const c of CATEGORIES) byCategory[c].net *= netFactor;
    const weekend = dow[d] === 5 || dow[d] === 6;
    const atv = 36 + 8 * rng.next() + (weekend ? 6 : 0);
    const transactions = gross > 0 ? Math.max(1, Math.round(gross / atv)) : 0;
    const uberFactor = d >= HISTORY_DAYS - 1 ? 0.55 : 1; // today's Uber Eats sync issue
    const sf = net * (0.052 + 0.01 * rng.next());
    const dd = net * (0.038 + 0.01 * rng.next());
    const ue = net * (0.028 + 0.008 * rng.next()) * uberFactor;
    const byChannel = { in_store: net - sf - dd - ue, storefront: sf, doordash: dd, ubereats: ue };
    const onlineOrders = {
      storefront: Math.round(sf / (54 + 10 * rng.next())),
      doordash: Math.round(dd / (46 + 8 * rng.next())),
      ubereats: Math.round(ue / (44 + 8 * rng.next())),
    };
    // Inventory value: weekly receiving sawtooth around a slow upward drift.
    const saw = ((d + 3) % 7) / 7;
    const inventoryIndex = 0.9 + 0.06 * (d / HISTORY_DAYS) + 0.07 * (1 - saw) + 0.02 * (rng.next() - 0.5);
    const stockouts = Math.max(0, Math.round(1.6 + Math.sin(d / 9) * 1.2 + (rng.next() - 0.5) * 2));
    return { date, gross, discounts, refunds, net, cogs, units: u, transactions, byCategory, byChannel, onlineOrders, inventoryIndex, stockouts };
  });

  // Normalize so today's point equals 1.0 (the live inventory value).
  const last = daily[daily.length - 1].inventoryIndex;
  for (const day of daily) day.inventoryIndex /= last;

  return { storeId, dates, daily, units, pricing };
}
