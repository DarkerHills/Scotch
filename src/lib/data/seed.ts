import {
  CATALOG,
  DOWNTOWN_OVERRIDES,
  FIRST_NAMES,
  LAST_NAMES,
  STREETS,
  SUPPLIERS,
  type ProductOverride,
} from "@/lib/data/catalog";
import { thumbFor } from "@/lib/data/thumbs";
import {
  CATEGORY_CODE,
  DEFAULT_LEAD_TIME,
  nextOrderStatus,
  ORDER_STATUS_LABEL,
  reorderPointFor,
  targetStockFor,
} from "@/lib/domain";
import type {
  AppNotification,
  Category,
  Channel,
  ChannelId,
  ListingStatus,
  OnlineOrder,
  OrderEvent,
  OrderStatus,
  POEvent,
  POStatus,
  Product,
  PurchaseOrder,
  StockMovement,
  StoreData,
  StoreId,
  StoreProfile,
  Supplier,
} from "@/lib/types";
import { addDays, createRng, hashString, makeUpc, round2, roundUpTo, type Rng } from "@/lib/utils";

export const STORE_PROFILES: Record<StoreId, StoreProfile> = {
  downtown: {
    id: "downtown",
    name: "Oak & Barrel — Downtown",
    shortName: "Downtown",
    address: "214 Market Street, San Francisco, CA 94105",
    timezone: "America/Los_Angeles",
    taxRate: 0.0863,
    approvalThreshold: 2500,
    ownerName: "Alex Morgan",
  },
  riverside: {
    id: "riverside",
    name: "Oak & Barrel — Riverside",
    shortName: "Riverside",
    address: "18 Water Street, Sacramento, CA 95814",
    timezone: "America/Los_Angeles",
    taxRate: 0.0875,
    approvalThreshold: 1500,
    ownerName: "Alex Morgan",
  },
  empty: {
    id: "empty",
    name: "New store (empty)",
    shortName: "New store",
    address: "Address not set",
    timezone: "America/Los_Angeles",
    taxRate: 0.0863,
    approvalThreshold: 2500,
    ownerName: "Alex Morgan",
  },
};

export const supplierIdFor = (key: string) => `sup_${key}`;
export const productIdFor = (index: number) => `p_${String(index + 1).padStart(3, "0")}`;

/** Store-level velocity multiplier + seed so each profile tells a different story. */
const STORE_TUNING: Record<Exclude<StoreId, "empty">, { velocity: number; seed: number }> = {
  downtown: { velocity: 1, seed: hashString("downtown") },
  riverside: { velocity: 0.65, seed: hashString("riverside") },
};

const RIVERSIDE_LOW = [6, 19, 76, 56, 38, 67, 13, 26];
const RIVERSIDE_OUT = [28, 98];

/** Products deliberately hidden from online channels (allocated / premium). */
const OFFLINE_ONLY = new Set([89, 49, 11, 35, 65, 15, 28, 82, 62]);
/** Products whose Uber Eats listing failed (drives the "Action required" story). */
const UBER_REJECTED = new Set([3, 45, 60, 13, 43, 97]);
/** Products with unsynced edits waiting for the next catalog sync. */
const PENDING_SYNC = new Set([21, 57, 77, 93]);

export interface ProductSeed {
  index: number;
  id: string;
  velocity: number;
  price: number;
  cost: number;
  category: Category;
}

/** Deterministic product velocities — shared by the store seed and sales history. */
export function productSeeds(storeId: StoreId): ProductSeed[] {
  if (storeId === "empty") return [];
  const tuning = STORE_TUNING[storeId];
  const rng = createRng(tuning.seed ^ 0x9e3779b9);
  return CATALOG.map((row, index) => {
    const [, , category, , cost, price, , velocity] = row;
    const jitter = storeId === "downtown" ? 1 : rng.range(0.8, 1.2);
    // Keep the demo story's velocities exact for Downtown.
    const v = Math.round(velocity * tuning.velocity * jitter * 100) / 100;
    return { index, id: productIdFor(index), velocity: Math.max(0.05, v), price, cost, category };
  });
}

export function buildStore(storeId: StoreId, now = new Date()): StoreData {
  const profile = STORE_PROFILES[storeId];
  if (storeId === "empty") return buildEmptyStore(profile, now);

  const tuning = STORE_TUNING[storeId];
  const rng = createRng(tuning.seed);
  const iso = (d: Date) => d.toISOString();
  const ago = (days: number, hours = 0, minutes = 0) => {
    const d = new Date(now);
    d.setTime(d.getTime() - ((days * 24 + hours) * 60 + minutes) * 60_000);
    return d;
  };

  /* ── Suppliers ─────────────────────────────────────────── */
  const suppliers: Supplier[] = SUPPLIERS.map((s, i) => ({
    id: supplierIdFor(s.key),
    name: s.name,
    monogram: s.monogram,
    color: s.color,
    contactName: s.contactName,
    contactRole: s.contactRole,
    email: `${s.contactName.split(" ")[0].toLowerCase()}@${s.domain}`,
    phone: s.phone,
    address: s.address,
    categories: [],
    leadTimeDays: s.leadTimeDays,
    paymentTerms: s.paymentTerms,
    minimumOrder: s.minimumOrder,
    onTimeRate: s.onTimeRate,
    status: s.status,
    notes: s.notes,
    createdAt: iso(ago(420 - i * 17)),
  }));
  const leadOf = (key: string | null) => SUPPLIERS.find((s) => s.key === key)?.leadTimeDays ?? DEFAULT_LEAD_TIME;

  /* ── Products ──────────────────────────────────────────── */
  const seeds = productSeeds(storeId);
  const overrides: Record<number, ProductOverride> =
    storeId === "downtown" ? DOWNTOWN_OVERRIDES : riversideOverrides(seeds, rng);

  const products: Product[] = CATALOG.map((row, index) => {
    const [name, brand, category, size, cost, price, packSize, , supplierKey] = row;
    const v = seeds[index].velocity;
    const lead = leadOf(supplierKey);
    const ov = overrides[index];
    const reorderPoint = ov?.reorderPoint ?? reorderPointFor(v, lead);
    const targetStock = ov?.targetStock ?? targetStockFor(v, reorderPoint);
    const healthyMin = reorderPoint + Math.max(2, Math.ceil(v * 7)) + 1;
    const stock = ov?.stock ?? rng.int(healthyMin, Math.max(healthyMin + 2, Math.round(targetStock * 1.08)));
    const sizeCode = size.includes("1.75") ? "175" : size.includes("500") ? "500" : size.includes("pack") ? size.split("-")[0].padStart(2, "0") + "P" : "750";
    const available = !OFFLINE_ONLY.has(index);
    const pending = PENDING_SYNC.has(index) && available;
    const listing = (ch: ChannelId): ListingStatus => {
      if (!available) return "unlisted";
      if (pending) return "pending";
      if (ch === "ubereats" && UBER_REJECTED.has(index)) return "error";
      return "listed";
    };
    const createdAt = ago(rng.int(120, 600));
    const updatedAt = ov ? ago(rng.int(0, 2), rng.int(1, 20)) : ago(rng.int(3, 40), rng.int(0, 23));
    return {
      id: productIdFor(index),
      sku: `${CATEGORY_CODE[category]}-${sizeCode}-${String(1000 + index * 7).slice(-4)}`,
      barcode: makeUpc(rng),
      name,
      brand,
      category,
      size,
      packSize,
      description: describe(name, category, size),
      unitCost: cost,
      retailPrice: price,
      stock,
      reorderPoint,
      targetStock,
      supplierId: supplierKey ? supplierIdFor(supplierKey) : null,
      archived: false,
      createdAt: iso(createdAt),
      updatedAt: iso(updatedAt),
      thumb: thumbFor(brand, category, index),
      online: {
        available,
        price: index % 17 === 4 && available ? round2(price + 1) : null,
        listings: { storefront: listing("storefront"), doordash: listing("doordash"), ubereats: listing("ubereats") },
        lastSyncedAt: available ? iso(pending ? ago(1, 3) : ago(0, 0, 12)) : null,
      },
    };
  });

  for (const s of suppliers) {
    s.categories = [...new Set(products.filter((p) => p.supplierId === s.id).map((p) => p.category))];
  }

  /* ── Purchase orders ───────────────────────────────────── */
  const purchaseOrders: PurchaseOrder[] = [];
  const movements: StockMovement[] = [];
  let poNum = 1031;
  const scale = storeId === "downtown" ? 1 : 0.5;

  for (const plan of PO_PLAN) {
    const [key, status, createdDays, lineSpec, note] = plan;
    const supplier = suppliers.find((s) => s.id === supplierIdFor(key))!;
    const created = ago(createdDays, rng.int(1, 6), rng.int(0, 59));
    const lines = lineSpec.map(([idx, qty]) => {
      const p = products[idx];
      const q = Math.max(p.packSize, roundUpTo(qty * scale, p.packSize));
      return { productId: p.id, qty: q, unitCost: p.unitCost, receivedQty: 0 };
    });
    const id = `po_${poNum}`;
    const number = `PO-${poNum}`;
    poNum++;
    const events: POEvent[] = [];
    const ev = (at: Date, type: POEvent["type"], title: string, st?: POStatus, detail?: string, actor = "Alex Morgan") =>
      events.push({ id: `${id}_e${events.length}`, at: iso(at), type, title, status: st, detail, actor });

    ev(created, "created", "Draft created", "draft");
    const submitted = addDays(created, 0);
    submitted.setHours(submitted.getHours() + 1);
    const expected = addDays(created, supplier.leadTimeDays);
    const receipts: PurchaseOrder["receipts"] = [];

    const subtotal = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
    const needsApproval = subtotal > STORE_PROFILES[storeId].approvalThreshold;

    if (status !== "draft") {
      if (needsApproval || status === "pending_approval") {
        ev(submitted, "status", "Submitted for approval", "pending_approval", `Order total exceeds the ${fmtMoney(STORE_PROFILES[storeId].approvalThreshold)} approval threshold.`);
      }
      if (status === "cancelled") {
        ev(addDays(submitted, 1), "status", "Order cancelled", "cancelled", note ?? "Cancelled before confirmation.");
      } else if (status !== "pending_approval") {
        const sentAt = new Date(submitted.getTime() + (needsApproval ? 3 : 0.1) * 3_600_000);
        ev(sentAt, "status", needsApproval ? "Approved and sent to supplier" : "Sent to supplier", "sent", `Emailed to ${supplier.email} (simulated).`);
        if (["confirmed", "partially_received", "received"].includes(status)) {
          ev(addDays(sentAt, 1), "status", "Supplier confirmed order", "confirmed", `${supplier.contactName} confirmed availability (simulated).`, supplier.name);
        }
        if (status === "partially_received" || status === "received") {
          const recAt = addDays(created, Math.min(supplier.leadTimeDays, Math.max(1, createdDays - 1)));
          recAt.setHours(10, 20);
          const recLines = lines.map((l, i) => {
            const qty = status === "received" ? l.qty : i === 0 ? l.qty : i === 1 ? Math.floor(l.qty / 2) : 0;
            l.receivedQty = qty;
            return { productId: l.productId, qty };
          });
          const rid = `${id}_r1`;
          receipts.push({ id: rid, at: iso(recAt), lines: recLines.filter((r) => r.qty > 0) });
          const units = recLines.reduce((s, r) => s + r.qty, 0);
          ev(
            recAt,
            "receipt",
            status === "received" ? "Received in full" : "Partially received",
            status === "received" ? "received" : "partially_received",
            `${units} units checked in${status === "received" ? "" : " — remaining items back-ordered"}.`,
          );
          for (const r of recLines) {
            if (r.qty <= 0) continue;
            const p = products.find((x) => x.id === r.productId)!;
            movements.push({
              id: `mv_${movements.length}`,
              productId: p.id,
              at: iso(recAt),
              type: "receipt",
              qty: r.qty,
              balance: r.qty + Math.max(0, Math.round(p.reorderPoint * rng.range(0.2, 0.8))),
              reason: "Purchase order received",
              ref: { kind: "po", id, label: number },
            });
          }
        }
      }
    }

    const finalStatus: POStatus = status === "sent" && needsApproval ? "sent" : status;
    purchaseOrders.push({
      id,
      number,
      supplierId: supplier.id,
      status: finalStatus,
      lines,
      createdAt: iso(created),
      updatedAt: events.length ? events[events.length - 1].at : iso(created),
      expectedAt: status === "draft" ? null : iso(expected),
      deliverTo: STORE_PROFILES[storeId].address,
      reference: "",
      notes: note && status !== "cancelled" ? note : "",
      taxRate: STORE_PROFILES[storeId].taxRate,
      events,
      receipts,
    });
  }

  /* ── Manual stock adjustments for realism ──────────────── */
  const adjReasons: [string, number][] = [
    ["Damaged / breakage", -1],
    ["Count correction", 2],
    ["Tasting / sample", -1],
    ["Count correction", -2],
    ["Damaged / breakage", -2],
    ["Customer return", 1],
  ];
  for (let i = 0; i < 14; i++) {
    const p = rng.pick(products);
    const [reason, qty] = rng.pick(adjReasons);
    movements.push({
      id: `mv_${movements.length}`,
      productId: p.id,
      at: iso(ago(rng.int(1, 26), rng.int(0, 10))),
      type: reason === "Count correction" ? "count" : "adjustment",
      qty,
      balance: Math.max(0, p.stock + rng.int(2, 14)),
      reason,
      note: reason === "Damaged / breakage" ? "Dropped during shelf restock." : undefined,
    });
  }
  movements.sort((a, b) => b.at.localeCompare(a.at));

  /* ── Channels ──────────────────────────────────────────── */
  const listedCount = (ch: ChannelId) => products.filter((p) => p.online.listings[ch] === "listed").length;
  const channels: Channel[] = [
    {
      id: "storefront",
      name: "Online storefront",
      kind: "Web store",
      description: "Your branded online shop for local pickup and delivery. Prices and availability come straight from your Scotch catalog.",
      status: "connected",
      accountName: storeId === "downtown" ? "shop.oakandbarrel.example" : "riverside.oakandbarrel.example",
      lastSyncAt: iso(ago(0, 0, 12)),
      frequency: "15m",
      catalogSync: true,
      orderSync: true,
      error: null,
      events: [
        { id: "sf_e3", at: iso(ago(0, 0, 12)), kind: "sync", ok: true, title: "Catalog synced", detail: `${listedCount("storefront")} products up to date`, count: listedCount("storefront") },
        { id: "sf_e2", at: iso(ago(0, 0, 27)), kind: "sync", ok: true, title: "Catalog synced", detail: "2 price changes published", count: 2 },
        { id: "sf_e1", at: iso(ago(0, 3, 5)), kind: "sync", ok: true, title: "Orders imported", detail: "4 new orders", count: 4 },
        { id: "sf_e0", at: iso(ago(64)), kind: "connect", ok: true, title: "Channel connected", detail: "Demo connection created" },
      ],
    },
    {
      id: "doordash",
      name: "DoorDash",
      kind: "Delivery marketplace",
      description: "List your catalog on a delivery marketplace and receive orders directly in Scotch. Demo representation — no real DoorDash account is connected.",
      status: "connected",
      accountName: storeId === "downtown" ? "Oak & Barrel Downtown (demo)" : "Oak & Barrel Riverside (demo)",
      lastSyncAt: iso(ago(0, 0, 38)),
      frequency: "1h",
      catalogSync: true,
      orderSync: true,
      error: null,
      events: [
        { id: "dd_e2", at: iso(ago(0, 0, 38)), kind: "sync", ok: true, title: "Catalog synced", detail: `${listedCount("doordash")} products up to date`, count: listedCount("doordash") },
        { id: "dd_e1", at: iso(ago(0, 1, 38)), kind: "sync", ok: true, title: "Catalog synced", detail: "Availability updated for 3 products", count: 3 },
        { id: "dd_e0", at: iso(ago(41)), kind: "connect", ok: true, title: "Channel connected", detail: "Demo connection created" },
      ],
    },
    {
      id: "ubereats",
      name: "Uber Eats",
      kind: "Delivery marketplace",
      description: "Reach customers on a second delivery marketplace with shared inventory. Demo representation — no real Uber Eats account is connected.",
      status: "action_required",
      accountName: storeId === "downtown" ? "Oak & Barrel Downtown (demo)" : "Oak & Barrel Riverside (demo)",
      lastSyncAt: iso(ago(0, 2, 14)),
      frequency: "1h",
      catalogSync: true,
      orderSync: true,
      error: {
        code: "UE-412",
        message: `${UBER_REJECTED.size} products were rejected because they are missing an age-restricted category.`,
        at: iso(ago(0, 2, 14)),
        hint: "Mark the affected products as age-restricted, then retry the sync. In this demo, retrying resolves the issue.",
      },
      events: [
        { id: "ue_e2", at: iso(ago(0, 2, 14)), kind: "error", ok: false, title: "Sync completed with errors", detail: `${UBER_REJECTED.size} listings rejected (UE-412)`, count: UBER_REJECTED.size },
        { id: "ue_e1", at: iso(ago(0, 3, 14)), kind: "sync", ok: true, title: "Catalog synced", detail: `${listedCount("ubereats")} products up to date`, count: listedCount("ubereats") },
        { id: "ue_e0", at: iso(ago(19)), kind: "connect", ok: true, title: "Channel connected", detail: "Demo connection created" },
      ],
    },
  ];

  /* ── Online orders (last ~52 hours) ────────────────────── */
  const onlineOrders = buildOnlineOrders(products, rng, now, storeId);

  /* ── Notifications ─────────────────────────────────────── */
  const byIdx = (i: number) => products[i];
  const poByNum = (n: number) => purchaseOrders.find((p) => p.number === `PO-${n}`)!;
  const latestDd = onlineOrders.find((o) => o.channel === "doordash")!;
  const lowCount = products.filter((p) => p.stock > 0 && p.stock <= p.reorderPoint).length;
  const outCount = products.filter((p) => p.stock <= 0).length;
  const firstOut = products.find((p) => p.stock <= 0) ?? byIdx(45);
  const firstLow = storeId === "downtown" ? byIdx(0) : products.find((p) => p.stock > 0 && p.stock <= p.reorderPoint)!;
  const pending = purchaseOrders.find((p) => p.status === "pending_approval");
  const partial = purchaseOrders.find((p) => p.status === "partially_received");
  const received = [...purchaseOrders].reverse().find((p) => p.status === "received");
  const notifications: AppNotification[] = [
    { id: "n1", at: iso(ago(0, 0, 18)), kind: "out_of_stock", title: `${firstOut.name} is out of stock`, body: `${outCount} products are out of stock. Customers can't buy them in store or online.`, href: `/inventory/${firstOut.id}`, read: false },
    { id: "n2", at: iso(ago(0, 1, 5)), kind: "low_stock", title: `${firstLow.name} is running low`, body: `${firstLow.stock} left — below the reorder point of ${firstLow.reorderPoint}.`, href: `/inventory/${firstLow.id}`, read: false },
    { id: "n3", at: iso(ago(0, 2, 0)), kind: "recommendation", title: "Reorder recommendations are ready", body: `${lowCount + outCount} products are at or below their reorder point. Review suggested quantities.`, href: "/analytics/smart-ordering", read: false },
    { id: "n4", at: iso(ago(0, 2, 14)), kind: "sync", title: "Uber Eats needs attention", body: `${UBER_REJECTED.size} listings were rejected during the last sync.`, href: "/integrations/ubereats", read: false },
    ...(pending
      ? [{ id: "n5", at: iso(ago(0, 4, 30)), kind: "po" as const, title: `${pending.number} is waiting for approval`, body: `Over the ${fmtMoney(STORE_PROFILES[storeId].approvalThreshold)} approval threshold.`, href: `/purchase-orders/${pending.id}`, read: false }]
      : []),
    { id: "n6", at: latestDd.placedAt, kind: "order", title: `New DoorDash order ${latestDd.number}`, body: `${latestDd.items.length} items · ${fmtMoney(latestDd.total)}`, href: `/online/orders/${latestDd.id}`, read: true },
    ...(partial
      ? [{ id: "n7", at: iso(ago(1, 2)), kind: "po" as const, title: `${partial.number} partially received`, body: "Some items are back-ordered by the supplier.", href: `/purchase-orders/${partial.id}`, read: true }]
      : []),
    ...(byIdx(9).stock <= 0
      ? [{ id: "n8", at: iso(ago(1, 6)), kind: "out_of_stock" as const, title: `${byIdx(9).name} sold out`, body: `Incoming on ${poByNum(1043).number}.`, href: `/inventory/${byIdx(9).id}`, read: true }]
      : []),
    { id: "n9", at: iso(ago(1, 9)), kind: "sync", title: "Storefront catalog synced", body: `${listedCount("storefront")} products are live on your online storefront.`, href: "/online?tab=catalog", read: true },
    ...(received
      ? [{ id: "n10", at: iso(ago(2, 3)), kind: "po" as const, title: `${received.number} received in full`, body: "Stock levels were updated automatically.", href: `/purchase-orders/${received.id}`, read: true }]
      : []),
  ];

  return {
    profile,
    products,
    suppliers,
    purchaseOrders,
    onlineOrders,
    channels,
    movements,
    notifications: notifications.sort((a, b) => b.at.localeCompare(a.at)),
    dismissedRecs: {},
    recOverrides: {},
    poDraft: null,
    seq: { po: poNum, product: products.length + 1, supplier: suppliers.length + 1, order: 1, id: 1 },
    seededAt: now.toISOString(),
  };
}

/**
 * Purchase order plan (shared across stores; Riverside halves quantities).
 * Open orders deliberately avoid the low-stock products so recommendations
 * stay explainable — except Glenfiddich (index 9), which demonstrates
 * "already on order".
 */
const PO_PLAN: [string, POStatus, number, [number, number][], string?][] = [
  ["northwind", "received", 41, [[1, 6], [2, 12], [6, 24], [13, 24]]],
  ["harbor", "cancelled", 37, [[67, 24], [68, 12]], "Duplicate of an order placed by phone."],
  ["harbor", "received", 29, [[63, 24], [75, 36], [76, 24], [79, 24]]],
  ["ridgeline", "received", 22, [[91, 24], [92, 24], [93, 16]]],
  ["copperline", "received", 18, [[18, 48], [19, 12], [29, 12]]],
  ["agave", "received", 14, [[44, 12], [46, 12], [47, 18]]],
  ["northwind", "received", 11, [[0, 24], [3, 24], [16, 6]]],
  ["maison", "partially_received", 8, [[87, 12], [90, 24], [84, 6]]],
  ["caribe", "partially_received", 6, [[39, 6], [42, 12], [57, 12]]],
  ["highland", "confirmed", 5, [[8, 12], [17, 6], [15, 6]]],
  ["lakeshore", "confirmed", 6, [[21, 12], [23, 24], [43, 12], [97, 8]]],
  ["craft", "confirmed", 4, [[32, 6], [33, 6], [36, 6]]],
  ["highland", "sent", 3, [[9, 24], [10, 6]], "Please confirm the Glenfiddich allocation."],
  ["ridgeline", "sent", 2, [[93, 12], [94, 12], [95, 12], [96, 8]]],
  ["metro", "sent", 2, [[55, 6], [59, 6]]],
  ["copperline", "sent", 1, [[22, 12], [31, 12], [34, 12]]],
  ["agave", "pending_approval", 1, [[46, 24], [48, 18], [50, 12], [53, 24], [49, 6]], "Holiday tequila build-out."],
  ["maison", "pending_approval", 0, [[84, 24], [85, 24], [89, 6]], "Holiday champagne pre-order."],
  ["northwind", "draft", 0, [[4, 6], [5, 12], [12, 12]]],
  ["harbor", "draft", 0, [[66, 6], [70, 12]]],
];

function riversideOverrides(seeds: ProductSeed[], rng: Rng): Record<number, ProductOverride> {
  const out: Record<number, ProductOverride> = {};
  for (const i of RIVERSIDE_LOW) {
    const s = seeds[i];
    const lead = SUPPLIERS.find((x) => x.key === CATALOG[i][8])?.leadTimeDays ?? DEFAULT_LEAD_TIME;
    const rp = reorderPointFor(s.velocity, lead);
    out[i] = { stock: Math.max(1, Math.floor(rp * rng.range(0.35, 0.85))) };
  }
  for (const i of RIVERSIDE_OUT) out[i] = { stock: 0 };
  return out;
}

function buildOnlineOrders(products: Product[], rng: Rng, now: Date, storeId: StoreId): OnlineOrder[] {
  const sellable = products.filter((p) => p.online.available && p.stock > 0);
  const channels: ChannelId[] = ["storefront", "storefront", "storefront", "storefront", "doordash", "doordash", "doordash", "ubereats", "ubereats", "ubereats"];
  const orders: OnlineOrder[] = [];
  const count = 30;
  const tax = STORE_PROFILES[storeId].taxRate;
  const prefixes: Record<ChannelId, string> = { storefront: "WEB", doordash: "DD", ubereats: "UE" };
  for (let i = 0; i < count; i++) {
    const minutesAgo = Math.round(6 + i * i * 3.4 + rng.int(0, 12));
    const placed = new Date(now.getTime() - minutesAgo * 60_000);
    const channel = rng.pick(channels);
    const fulfillment: "pickup" | "delivery" = channel === "storefront" ? (rng.chance(0.55) ? "pickup" : "delivery") : rng.chance(0.15) ? "pickup" : "delivery";
    const itemCount = rng.int(1, 4);
    const picks = rng.shuffle(sellable).slice(0, itemCount);
    const items = picks.map((p) => ({
      productId: p.id,
      qty: p.category === "Beer & cider" ? rng.int(1, 3) : rng.chance(0.8) ? 1 : 2,
      unitPrice: p.online.price ?? p.retailPrice,
    }));
    const subtotal = round2(items.reduce((s, it) => s + it.qty * it.unitPrice, 0));
    const taxAmt = round2(subtotal * tax);
    let status: OrderStatus;
    if (i < 3) status = "new";
    else if (i < 6) status = "accepted";
    else if (i < 9) status = "preparing";
    else if (i < 12) status = fulfillment === "pickup" ? "ready_for_pickup" : "out_for_delivery";
    else if (i === 15 || i === 23) status = "cancelled";
    else status = "completed";

    const first = rng.pick(FIRST_NAMES);
    const last = rng.pick(LAST_NAMES);
    const id = `ord_${1000 + i}`;
    const number = `${prefixes[channel]}-${channel === "storefront" ? 2400 + count - i : rng.int(10000, 99999)}`;
    const events: OrderEvent[] = [];
    const push = (st: OrderStatus, at: Date, title: string, detail?: string, actor = "Store team") =>
      events.push({ id: `${id}_e${events.length}`, at: at.toISOString(), status: st, title, detail, actor });
    push("new", placed, `Order placed on ${channel === "storefront" ? "online storefront" : channel === "doordash" ? "DoorDash" : "Uber Eats"}`, undefined, "Customer");
    let cursor: OrderStatus = "new";
    let t = placed.getTime();
    if (status === "cancelled") {
      push("cancelled", new Date(t + 9 * 60_000), "Order cancelled", "Customer requested cancellation.", "Customer");
    } else {
      while (cursor !== status) {
        const next = nextOrderStatus(cursor, fulfillment);
        if (!next) break;
        t += rng.int(4, 16) * 60_000;
        if (t > now.getTime()) t = now.getTime() - 60_000;
        push(next, new Date(t), ORDER_STATUS_LABEL[next]);
        cursor = next;
      }
    }
    orders.push({
      id,
      number,
      channel,
      placedAt: placed.toISOString(),
      items,
      subtotal,
      tax: taxAmt,
      total: round2(subtotal + taxAmt),
      status,
      fulfillment,
      customer: {
        name: `${first} ${last}`,
        phone: `(555) 01${rng.int(0, 9)}-${String(rng.int(0, 9999)).padStart(4, "0")}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
        address: fulfillment === "delivery" ? `${rng.int(12, 2900)} ${rng.pick(STREETS)}, Apt ${rng.int(1, 40)}` : "",
      },
      note: rng.chance(0.2) ? rng.pick(["Please include a gift note.", "Leave with the front desk.", "Call on arrival.", "ID will be ready at the door."]) : "",
      events,
    });
  }
  return orders;
}

function buildEmptyStore(profile: StoreProfile, now: Date): StoreData {
  const channel = (id: ChannelId, name: string, kind: string, description: string): Channel => ({
    id,
    name,
    kind,
    description,
    status: "disconnected",
    accountName: "",
    lastSyncAt: null,
    frequency: "1h",
    catalogSync: true,
    orderSync: true,
    error: null,
    events: [],
  });
  return {
    profile,
    products: [],
    suppliers: [],
    purchaseOrders: [],
    onlineOrders: [],
    channels: [
      channel("storefront", "Online storefront", "Web store", "Your branded online shop for local pickup and delivery."),
      channel("doordash", "DoorDash", "Delivery marketplace", "Demo representation — no real DoorDash account is connected."),
      channel("ubereats", "Uber Eats", "Delivery marketplace", "Demo representation — no real Uber Eats account is connected."),
    ],
    movements: [],
    notifications: [],
    dismissedRecs: {},
    recOverrides: {},
    poDraft: null,
    seq: { po: 1001, product: 1, supplier: 1, order: 1, id: 1 },
    seededAt: now.toISOString(),
  };
}

function describe(name: string, category: Category, size: string) {
  const notes: Record<Category, string> = {
    Whiskey: "Aged in oak for a rounded palate with notes of vanilla, caramel and toasted spice. A dependable shelf staple and cocktail base.",
    Vodka: "Clean, neutral and smooth — built for mixing, martinis and highballs. One of the most-requested spirits behind the counter.",
    Gin: "Botanical-forward with juniper at its core. Pairs naturally with tonic and citrus garnishes.",
    Rum: "Sugarcane spirit with warm, tropical character. Versatile for daiquiris, punches and tiki serves.",
    Tequila: "100% agave spirit from Mexico. Bright agave and citrus up front with a peppery finish.",
    Liqueur: "Sweetened, flavored spirit for aperitivo hour, digestifs and cocktail modifiers.",
    "Red wine": "Medium to full-bodied red with ripe dark fruit and soft tannins. A reliable dinner-table pick.",
    "White wine": "Crisp and aromatic with lively acidity. Best served well chilled.",
    Sparkling: "Fine persistent bubbles with orchard fruit and brioche notes. A celebration favorite.",
    "Beer & cider": "Cold-case favorite. Sold as a multi-pack and restocked from the distributor's weekly route.",
  };
  return `${name} (${size}). ${notes[category]}`;
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
