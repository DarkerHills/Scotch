"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { NEW_PRODUCT_THUMB } from "@/lib/data/thumbs";
import { buildStore, STORE_PROFILES } from "@/lib/data/seed";
import {
  CATEGORY_CODE,
  nextOrderStatus,
  ORDER_STATUS_LABEL,
  PO_STATUS_LABEL,
  poSubtotal,
  RECEIVABLE_PO_STATUSES,
} from "@/lib/domain";
import { fmt } from "@/lib/format";
import type {
  AppNotification,
  Category,
  ChannelId,
  ChannelStatus,
  PODraft,
  POEvent,
  POStatus,
  Product,
  PurchaseOrder,
  StockMovement,
  StoreData,
  StoreId,
  StoreProfile,
  Supplier,
  SyncFrequency,
} from "@/lib/types";
import { CHANNEL_IDS } from "@/lib/types";
import { addDays, createRng, hashString, makeUpc } from "@/lib/utils";

const ACTOR = "Alex Morgan";

export interface NewProductInput {
  name: string;
  brand: string;
  category: Category;
  size: string;
  sku?: string;
  barcode?: string;
  unitCost: number;
  retailPrice: number;
  stock: number;
  reorderPoint: number;
  targetStock: number;
  packSize: number;
  supplierId: string | null;
  description: string;
  availableOnline: boolean;
}

export type ProductPatch = Partial<
  Pick<
    Product,
    | "name"
    | "brand"
    | "category"
    | "size"
    | "sku"
    | "barcode"
    | "description"
    | "packSize"
    | "unitCost"
    | "retailPrice"
    | "reorderPoint"
    | "targetStock"
    | "supplierId"
  >
>;

export type StockAdjustment = { mode: "add" | "remove" | "set"; qty: number; reason: string; note?: string };

export type SupplierInput = Omit<Supplier, "id" | "createdAt" | "monogram" | "color" | "onTimeRate"> & {
  monogram?: string;
  color?: string;
};

interface AppState {
  activeStoreId: StoreId;
  stores: Partial<Record<StoreId, StoreData>>;
  demo: { failNext: boolean };
  hydrated: boolean;

  ensureStore: (id?: StoreId) => void;
  switchStore: (id: StoreId) => void;
  resetStore: (id?: StoreId) => void;
  setFailNext: (v: boolean) => void;
  /** Returns true (and clears the flag) when the next simulated request should fail. */
  consumeFailure: () => boolean;
  updateProfile: (patch: Partial<StoreProfile>) => void;

  addProduct: (input: NewProductInput) => string;
  updateProduct: (id: string, patch: ProductPatch) => void;
  adjustStock: (id: string, adj: StockAdjustment) => void;
  setOnlineAvailability: (ids: string[], available: boolean) => void;
  setOnlinePrice: (id: string, price: number | null) => void;
  archiveProducts: (ids: string[]) => void;
  restoreProducts: (ids: string[]) => void;
  bulkUpdateProducts: (ids: string[], patch: Partial<Pick<Product, "reorderPoint" | "supplierId" | "targetStock">>) => void;

  addSupplier: (input: SupplierInput) => string;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;

  setPoDraft: (draft: PODraft | null) => void;
  updatePoDraft: (patch: Partial<PODraft>) => void;
  upsertDraftLine: (productId: string, qty: number, unitCost?: number) => void;
  removeDraftLine: (productId: string) => void;
  commitPoDraft: (mode: "draft" | "submit") => string;
  submitPO: (id: string) => POStatus;
  approvePO: (id: string) => void;
  confirmPO: (id: string) => void;
  receivePO: (id: string, receiptId: string, qtys: Record<string, number>) => { units: number; status: POStatus };
  cancelPO: (id: string, reason: string) => void;
  deleteDraftPO: (id: string) => void;
  logPOFailure: (id: string, title: string) => void;
  createDraftPOs: (groups: { supplierId: string; lines: { productId: string; qty: number; unitCost: number }[] }[]) => string[];

  advanceOrder: (id: string) => void;
  cancelOrder: (id: string, reason: string) => void;

  setChannelStatus: (ids: ChannelId[], status: ChannelStatus) => void;
  completeSync: (ids: ChannelId[], ok: boolean) => number;
  connectChannel: (id: ChannelId, accountName: string) => void;
  disconnectChannel: (id: ChannelId) => void;
  updateChannelSettings: (id: ChannelId, patch: { frequency?: SyncFrequency; catalogSync?: boolean; orderSync?: boolean }) => void;

  dismissRec: (productId: string) => void;
  restoreRec: (productId: string) => void;
  setRecQty: (productId: string, qty: number | null) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const nowIso = () => new Date().toISOString();

function nextId(d: StoreData, prefix: string) {
  d.seq.id += 1;
  return `${prefix}_${Date.now().toString(36)}${d.seq.id}`;
}

function pushNotification(d: StoreData, n: Omit<AppNotification, "id" | "at" | "read">) {
  d.notifications.unshift({ ...n, id: nextId(d, "n"), at: nowIso(), read: false });
  if (d.notifications.length > 60) d.notifications.length = 60;
}

function pushMovement(d: StoreData, m: Omit<StockMovement, "id" | "at">) {
  d.movements.unshift({ ...m, id: nextId(d, "mv"), at: nowIso() });
}

function poEvent(d: StoreData, po: PurchaseOrder, e: Omit<POEvent, "id" | "at" | "actor"> & { actor?: string }) {
  po.events.push({ actor: ACTOR, ...e, id: nextId(d, "pe"), at: nowIso() });
  po.updatedAt = nowIso();
}

/** Mark all channel listings for a product as awaiting the next sync. */
function markPending(p: Product, d: StoreData) {
  for (const ch of CHANNEL_IDS) {
    const channel = d.channels.find((c) => c.id === ch);
    if (!channel || channel.status === "disconnected") continue;
    if (p.online.listings[ch] === "unlisted" && !p.online.available) continue;
    p.online.listings[ch] = "pending";
  }
}

function lowStockCheck(d: StoreData, p: Product, before: number) {
  if (p.archived) return;
  if (before > 0 && p.stock <= 0) {
    pushNotification(d, { kind: "out_of_stock", title: `${p.name} is out of stock`, body: "Reorder now to avoid lost sales.", href: `/inventory/${p.id}` });
  } else if (before > p.reorderPoint && p.stock > 0 && p.stock <= p.reorderPoint) {
    pushNotification(d, { kind: "low_stock", title: `${p.name} is running low`, body: `${p.stock} left — below the reorder point of ${p.reorderPoint}.`, href: `/inventory/${p.id}` });
  }
}

export const useApp = create<AppState>()(
  persist(
    immer((set, get) => {
      /** Apply a mutation to the active store's data. */
      const mutate = (fn: (d: StoreData, s: AppState) => void) =>
        set((s) => {
          const d = s.stores[s.activeStoreId];
          if (d) fn(d as StoreData, s as AppState);
        });

      return {
        activeStoreId: "downtown",
        stores: {},
        demo: { failNext: false },
        hydrated: false,

        ensureStore: (id) =>
          set((s) => {
            const target = id ?? s.activeStoreId;
            if (!s.stores[target]) s.stores[target] = buildStore(target);
          }),
        switchStore: (id) =>
          set((s) => {
            if (!s.stores[id]) s.stores[id] = buildStore(id);
            s.activeStoreId = id;
          }),
        resetStore: (id) =>
          set((s) => {
            const target = id ?? s.activeStoreId;
            s.stores[target] = buildStore(target);
          }),
        setFailNext: (v) => set((s) => void (s.demo.failNext = v)),
        consumeFailure: () => {
          if (!get().demo.failNext) return false;
          set((s) => void (s.demo.failNext = false));
          return true;
        },
        updateProfile: (patch) => mutate((d) => void Object.assign(d.profile, patch)),

        /* ── Products ─────────────────────────────────────── */
        addProduct: (input) => {
          let newId = "";
          mutate((d) => {
            const n = d.seq.product++;
            newId = `p_n${String(n).padStart(3, "0")}`;
            const rng = createRng(hashString(newId));
            const sku = input.sku?.trim() || `${CATEGORY_CODE[input.category]}-NEW-${String(9000 + n).slice(-4)}`;
            const p: Product = {
              id: newId,
              sku,
              barcode: input.barcode?.trim() || makeUpc(rng),
              name: input.name.trim(),
              brand: input.brand.trim(),
              category: input.category,
              size: input.size.trim(),
              packSize: input.packSize,
              description: input.description.trim(),
              unitCost: input.unitCost,
              retailPrice: input.retailPrice,
              stock: input.stock,
              reorderPoint: input.reorderPoint,
              targetStock: input.targetStock,
              supplierId: input.supplierId,
              archived: false,
              createdAt: nowIso(),
              updatedAt: nowIso(),
              thumb: NEW_PRODUCT_THUMB(input.category),
              online: {
                available: input.availableOnline,
                price: null,
                listings: { storefront: "unlisted", doordash: "unlisted", ubereats: "unlisted" },
                lastSyncedAt: null,
              },
            };
            if (input.availableOnline) markPending(p, d);
            d.products.unshift(p);
            pushMovement(d, { productId: p.id, type: "created", qty: p.stock, balance: p.stock, reason: "Product created · opening stock" });
            const sup = d.suppliers.find((x) => x.id === p.supplierId);
            if (sup && !sup.categories.includes(p.category)) sup.categories.push(p.category);
          });
          return newId;
        },
        updateProduct: (id, patch) =>
          mutate((d) => {
            const p = d.products.find((x) => x.id === id);
            if (!p) return;
            const priceChanged = patch.retailPrice !== undefined && patch.retailPrice !== p.retailPrice;
            Object.assign(p, patch);
            p.updatedAt = nowIso();
            if ((priceChanged && p.online.price === null) || patch.name || patch.size) {
              if (p.online.available) markPending(p, d);
            }
          }),
        adjustStock: (id, adj) =>
          mutate((d) => {
            const p = d.products.find((x) => x.id === id);
            if (!p) return;
            const before = p.stock;
            const after = adj.mode === "add" ? before + adj.qty : adj.mode === "remove" ? before - adj.qty : adj.qty;
            p.stock = Math.max(0, after);
            p.updatedAt = nowIso();
            pushMovement(d, {
              productId: p.id,
              type: adj.mode === "set" ? "count" : "adjustment",
              qty: p.stock - before,
              balance: p.stock,
              reason: adj.reason,
              note: adj.note?.trim() || undefined,
            });
            if (p.online.available) markPending(p, d);
            lowStockCheck(d, p, before);
          }),
        setOnlineAvailability: (ids, available) =>
          mutate((d) => {
            for (const id of ids) {
              const p = d.products.find((x) => x.id === id);
              if (!p || p.online.available === available) continue;
              p.online.available = available;
              p.updatedAt = nowIso();
              for (const ch of CHANNEL_IDS) {
                const channel = d.channels.find((c) => c.id === ch);
                if (!channel || channel.status === "disconnected") continue;
                // Pending either way: the change reaches channels on the next sync.
                p.online.listings[ch] = available || p.online.listings[ch] !== "unlisted" ? "pending" : "unlisted";
              }
            }
          }),
        setOnlinePrice: (id, price) =>
          mutate((d) => {
            const p = d.products.find((x) => x.id === id);
            if (!p) return;
            p.online.price = price === null || price === p.retailPrice ? null : price;
            p.updatedAt = nowIso();
            if (p.online.available) markPending(p, d);
          }),
        archiveProducts: (ids) =>
          mutate((d) => {
            for (const id of ids) {
              const p = d.products.find((x) => x.id === id);
              if (!p) continue;
              p.archived = true;
              p.updatedAt = nowIso();
              if (p.online.available) {
                p.online.available = false;
                markPending(p, d);
              }
            }
          }),
        restoreProducts: (ids) =>
          mutate((d) => {
            for (const id of ids) {
              const p = d.products.find((x) => x.id === id);
              if (!p) continue;
              p.archived = false;
              p.updatedAt = nowIso();
            }
          }),
        bulkUpdateProducts: (ids, patch) =>
          mutate((d) => {
            for (const id of ids) {
              const p = d.products.find((x) => x.id === id);
              if (!p) continue;
              Object.assign(p, patch);
              if (patch.reorderPoint !== undefined && p.targetStock <= p.reorderPoint) p.targetStock = p.reorderPoint + Math.max(6, p.packSize);
              p.updatedAt = nowIso();
            }
          }),

        /* ── Suppliers ────────────────────────────────────── */
        addSupplier: (input) => {
          let id = "";
          mutate((d) => {
            const n = d.seq.supplier++;
            id = `sup_n${n}`;
            const palette = ["#0b4627", "#335cff", "#7d52f4", "#e16614", "#124b68", "#fb4ba3", "#1daf61"];
            d.suppliers.unshift({
              ...input,
              id,
              monogram:
                input.monogram ||
                input.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0]!.toUpperCase())
                  .join(""),
              color: input.color || palette[n % palette.length],
              onTimeRate: 1,
              createdAt: nowIso(),
            });
          });
          return id;
        },
        updateSupplier: (id, patch) =>
          mutate((d) => {
            const s = d.suppliers.find((x) => x.id === id);
            if (s) Object.assign(s, patch);
          }),

        /* ── Purchase orders ──────────────────────────────── */
        setPoDraft: (draft) => mutate((d) => void (d.poDraft = draft)),
        updatePoDraft: (patch) =>
          mutate((d) => {
            if (!d.poDraft) return;
            Object.assign(d.poDraft, patch, { dirty: true });
          }),
        upsertDraftLine: (productId, qty, unitCost) =>
          mutate((d) => {
            if (!d.poDraft) return;
            const p = d.products.find((x) => x.id === productId);
            const line = d.poDraft.lines.find((l) => l.productId === productId);
            if (line) {
              line.qty = qty;
              if (unitCost !== undefined) line.unitCost = unitCost;
            } else {
              d.poDraft.lines.push({ productId, qty, unitCost: unitCost ?? p?.unitCost ?? 0 });
            }
            d.poDraft.dirty = true;
          }),
        removeDraftLine: (productId) =>
          mutate((d) => {
            if (!d.poDraft) return;
            d.poDraft.lines = d.poDraft.lines.filter((l) => l.productId !== productId);
            d.poDraft.dirty = true;
          }),
        commitPoDraft: (mode) => {
          let id = "";
          mutate((d) => {
            const draft = d.poDraft;
            if (!draft || !draft.supplierId) return;
            let po = draft.editingId ? d.purchaseOrders.find((x) => x.id === draft.editingId) : undefined;
            const lines = draft.lines.map((l) => ({ ...l, receivedQty: 0 }));
            if (po) {
              po.supplierId = draft.supplierId;
              po.lines = lines;
              po.expectedAt = draft.expectedAt ? new Date(draft.expectedAt).toISOString() : null;
              po.deliverTo = draft.deliverTo;
              po.reference = draft.reference;
              po.notes = draft.notes;
              poEvent(d, po, { type: "edited", title: "Draft updated", detail: `${lines.length} line items` });
            } else {
              const num = d.seq.po++;
              po = {
                id: `po_${num}`,
                number: `PO-${num}`,
                supplierId: draft.supplierId,
                status: "draft",
                lines,
                createdAt: nowIso(),
                updatedAt: nowIso(),
                expectedAt: draft.expectedAt ? new Date(draft.expectedAt).toISOString() : null,
                deliverTo: draft.deliverTo,
                reference: draft.reference,
                notes: draft.notes,
                taxRate: d.profile.taxRate,
                events: [],
                receipts: [],
              };
              d.purchaseOrders.unshift(po);
              poEvent(d, po, {
                type: "created",
                status: "draft",
                title: "Draft created",
                detail: draft.source === "smart_ordering" ? "Created from smart ordering recommendations" : draft.source === "product" ? "Created from a product reorder suggestion" : undefined,
              });
            }
            if (mode === "submit") submitInPlace(d, po);
            id = po.id;
            d.poDraft = null;
          });
          return id;
        },
        submitPO: (id) => {
          let status: POStatus = "draft";
          mutate((d) => {
            const po = d.purchaseOrders.find((x) => x.id === id);
            if (!po || po.status !== "draft") return;
            submitInPlace(d, po);
            status = po.status;
          });
          return status;
        },
        approvePO: (id) =>
          mutate((d) => {
            const po = d.purchaseOrders.find((x) => x.id === id);
            if (!po || po.status !== "pending_approval") return;
            const s = d.suppliers.find((x) => x.id === po.supplierId);
            po.status = "sent";
            poEvent(d, po, { type: "status", status: "sent", title: "Approved and sent to supplier", detail: `Emailed to ${s?.email ?? "supplier"} (simulated — nothing was sent).` });
          }),
        confirmPO: (id) =>
          mutate((d) => {
            const po = d.purchaseOrders.find((x) => x.id === id);
            if (!po || po.status !== "sent") return;
            const s = d.suppliers.find((x) => x.id === po.supplierId);
            po.status = "confirmed";
            poEvent(d, po, { type: "status", status: "confirmed", title: "Supplier confirmed order", detail: "Simulated confirmation for the demo.", actor: s?.name ?? "Supplier" });
          }),
        receivePO: (id, receiptId, qtys) => {
          let units = 0;
          let status: POStatus = "sent";
          mutate((d) => {
            const po = d.purchaseOrders.find((x) => x.id === id);
            if (!po || !RECEIVABLE_PO_STATUSES.includes(po.status)) return;
            // Idempotency: a receipt id can only be applied once.
            if (po.receipts.some((r) => r.id === receiptId)) {
              status = po.status;
              return;
            }
            const lines: { productId: string; qty: number }[] = [];
            for (const line of po.lines) {
              const remaining = line.qty - line.receivedQty;
              const want = Math.floor(qtys[line.productId] ?? 0);
              const qty = Math.max(0, Math.min(remaining, want));
              if (qty <= 0) continue;
              line.receivedQty += qty;
              units += qty;
              lines.push({ productId: line.productId, qty });
              const p = d.products.find((x) => x.id === line.productId);
              if (p) {
                p.stock += qty;
                p.updatedAt = nowIso();
                if (p.online.available) markPending(p, d);
                pushMovement(d, { productId: p.id, type: "receipt", qty, balance: p.stock, reason: "Purchase order received", ref: { kind: "po", id: po.id, label: po.number } });
              }
            }
            if (units === 0) {
              status = po.status;
              return;
            }
            po.receipts.push({ id: receiptId, at: nowIso(), lines });
            const complete = po.lines.every((l) => l.receivedQty >= l.qty);
            po.status = complete ? "received" : "partially_received";
            poEvent(d, po, {
              type: "receipt",
              status: po.status,
              title: complete ? "Received in full" : "Partially received",
              detail: `${units} units checked in across ${lines.length} ${lines.length === 1 ? "item" : "items"}.`,
            });
            pushNotification(d, {
              kind: "po",
              title: `${po.number} ${complete ? "received in full" : "partially received"}`,
              body: `${units} units added to inventory.`,
              href: `/purchase-orders/${po.id}`,
            });
            status = po.status;
          });
          return { units, status };
        },
        cancelPO: (id, reason) =>
          mutate((d) => {
            const po = d.purchaseOrders.find((x) => x.id === id);
            if (!po || ["received", "partially_received", "cancelled"].includes(po.status)) return;
            po.status = "cancelled";
            poEvent(d, po, { type: "status", status: "cancelled", title: "Order cancelled", detail: reason || undefined });
          }),
        deleteDraftPO: (id) =>
          mutate((d) => {
            d.purchaseOrders = d.purchaseOrders.filter((x) => !(x.id === id && x.status === "draft"));
            if (d.poDraft?.editingId === id) d.poDraft = null;
          }),
        logPOFailure: (id, title) =>
          mutate((d) => {
            const po = d.purchaseOrders.find((x) => x.id === id);
            if (po) poEvent(d, po, { type: "failed", title, detail: "Simulated network error — no changes were saved." });
          }),
        createDraftPOs: (groups) => {
          const ids: string[] = [];
          mutate((d) => {
            for (const g of groups) {
              const s = d.suppliers.find((x) => x.id === g.supplierId);
              const num = d.seq.po++;
              const po: PurchaseOrder = {
                id: `po_${num}`,
                number: `PO-${num}`,
                supplierId: g.supplierId,
                status: "draft",
                lines: g.lines.map((l) => ({ ...l, receivedQty: 0 })),
                createdAt: nowIso(),
                updatedAt: nowIso(),
                expectedAt: addDays(new Date(), s?.leadTimeDays ?? 7).toISOString(),
                deliverTo: d.profile.address,
                reference: "",
                notes: "",
                taxRate: d.profile.taxRate,
                events: [],
                receipts: [],
              };
              d.purchaseOrders.unshift(po);
              poEvent(d, po, { type: "created", status: "draft", title: "Draft created", detail: "Created from smart ordering recommendations" });
              for (const l of g.lines) {
                delete d.recOverrides[l.productId];
              }
              ids.push(po.id);
            }
          });
          return ids;
        },

        /* ── Online orders ────────────────────────────────── */
        advanceOrder: (id) =>
          mutate((d) => {
            const o = d.onlineOrders.find((x) => x.id === id);
            if (!o) return;
            const next = nextOrderStatus(o.status, o.fulfillment);
            if (!next) return;
            o.status = next;
            o.events.push({ id: nextId(d, "oe"), at: nowIso(), status: next, title: ORDER_STATUS_LABEL[next], actor: ACTOR });
            if (next === "completed") {
              for (const it of o.items) {
                const p = d.products.find((x) => x.id === it.productId);
                if (!p) continue;
                const before = p.stock;
                p.stock = Math.max(0, p.stock - it.qty);
                pushMovement(d, { productId: p.id, type: "online_sale", qty: p.stock - before, balance: p.stock, reason: "Online order fulfilled", ref: { kind: "order", id: o.id, label: o.number } });
                lowStockCheck(d, p, before);
              }
            }
          }),
        cancelOrder: (id, reason) =>
          mutate((d) => {
            const o = d.onlineOrders.find((x) => x.id === id);
            if (!o || o.status === "completed" || o.status === "cancelled") return;
            o.status = "cancelled";
            o.events.push({ id: nextId(d, "oe"), at: nowIso(), status: "cancelled", title: "Order cancelled", detail: reason || undefined, actor: ACTOR });
          }),

        /* ── Channels ─────────────────────────────────────── */
        setChannelStatus: (ids, status) =>
          mutate((d) => {
            for (const c of d.channels) if (ids.includes(c.id)) c.status = status;
          }),
        completeSync: (ids, ok) => {
          let changed = 0;
          mutate((d) => {
            for (const ch of d.channels) {
              if (!ids.includes(ch.id)) continue;
              if (ok) {
                let count = 0;
                for (const p of d.products) {
                  const st = p.online.listings[ch.id];
                  if (st === "pending" || st === "error") {
                    p.online.listings[ch.id] = p.online.available && !p.archived ? "listed" : "unlisted";
                    p.online.lastSyncedAt = nowIso();
                    count++;
                  }
                }
                changed += count;
                ch.status = "connected";
                ch.error = null;
                ch.lastSyncAt = nowIso();
                ch.events.unshift({ id: nextId(d, "se"), at: nowIso(), kind: "sync", ok: true, title: "Catalog synced", detail: count ? `${count} ${count === 1 ? "change" : "changes"} published` : "Everything was already up to date", count });
              } else {
                ch.status = "failed";
                ch.error = {
                  code: "SYNC-504",
                  message: `${ch.name} didn't respond before the sync timed out. No listings were changed.`,
                  at: nowIso(),
                  hint: "This is a simulated failure. Retry the sync — pending changes are kept and will be sent on the next attempt.",
                };
                ch.events.unshift({ id: nextId(d, "se"), at: nowIso(), kind: "error", ok: false, title: "Sync failed", detail: "Timed out (SYNC-504) — pending changes kept" });
              }
            }
            if (!ok) {
              pushNotification(d, { kind: "sync", title: "Catalog sync failed", body: "Pending changes were kept. Retry from Online sales.", href: "/online?tab=catalog" });
            }
          });
          return changed;
        },
        connectChannel: (id, accountName) =>
          mutate((d) => {
            const ch = d.channels.find((c) => c.id === id);
            if (!ch) return;
            ch.status = "connected";
            ch.accountName = accountName;
            ch.error = null;
            ch.lastSyncAt = nowIso();
            let count = 0;
            for (const p of d.products) {
              if (p.archived) continue;
              p.online.listings[id] = p.online.available ? "listed" : "unlisted";
              if (p.online.available) count++;
            }
            ch.events.unshift({ id: nextId(d, "se"), at: nowIso(), kind: "connect", ok: true, title: "Channel connected (demo)", detail: `${count} products listed · no external account was connected`, count });
          }),
        disconnectChannel: (id) =>
          mutate((d) => {
            const ch = d.channels.find((c) => c.id === id);
            if (!ch) return;
            ch.status = "disconnected";
            ch.error = null;
            for (const p of d.products) p.online.listings[id] = "unlisted";
            ch.events.unshift({ id: nextId(d, "se"), at: nowIso(), kind: "disconnect", ok: true, title: "Channel disconnected", detail: "Listings removed from this channel" });
          }),
        updateChannelSettings: (id, patch) =>
          mutate((d) => {
            const ch = d.channels.find((c) => c.id === id);
            if (!ch) return;
            Object.assign(ch, patch);
            const parts = [
              patch.frequency ? `Sync frequency set to ${patch.frequency === "manual" ? "manual" : `every ${patch.frequency}`}` : null,
              patch.catalogSync !== undefined ? `Catalog sync ${patch.catalogSync ? "on" : "off"}` : null,
              patch.orderSync !== undefined ? `Order sync ${patch.orderSync ? "on" : "off"}` : null,
            ].filter(Boolean);
            ch.events.unshift({ id: nextId(d, "se"), at: nowIso(), kind: "settings", ok: true, title: "Settings updated", detail: parts.join(" · ") });
          }),

        /* ── Recommendations ──────────────────────────────── */
        dismissRec: (productId) => mutate((d) => void (d.dismissedRecs[productId] = nowIso())),
        restoreRec: (productId) => mutate((d) => void delete d.dismissedRecs[productId]),
        setRecQty: (productId, qty) =>
          mutate((d) => {
            if (qty === null) delete d.recOverrides[productId];
            else d.recOverrides[productId] = qty;
          }),

        /* ── Notifications ────────────────────────────────── */
        markNotificationRead: (id) =>
          mutate((d) => {
            const n = d.notifications.find((x) => x.id === id);
            if (n) n.read = true;
          }),
        markAllNotificationsRead: () => mutate((d) => d.notifications.forEach((n) => (n.read = true))),
      };
    }),
    {
      name: "scotch-pos-demo",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ activeStoreId: s.activeStoreId, stores: s.stores, demo: s.demo }),
      onRehydrateStorage: () => (state) => {
        state?.ensureStore();
        useApp.setState({ hydrated: true });
      },
    },
  ),
);

function submitInPlace(d: StoreData, po: PurchaseOrder) {
  const s = d.suppliers.find((x) => x.id === po.supplierId);
  const subtotal = poSubtotal(po);
  if (subtotal > d.profile.approvalThreshold) {
    po.status = "pending_approval";
    poEvent(d, po, {
      type: "status",
      status: "pending_approval",
      title: "Submitted for approval",
      detail: `${fmt.money(subtotal)} is over the ${fmt.money0(d.profile.approvalThreshold)} approval threshold.`,
    });
    pushNotification(d, { kind: "po", title: `${po.number} is waiting for approval`, body: `${fmt.money(subtotal)} · ${s?.name ?? "Supplier"}`, href: `/purchase-orders/${po.id}` });
  } else {
    po.status = "sent";
    poEvent(d, po, { type: "status", status: "sent", title: "Sent to supplier", detail: `Emailed to ${s?.email ?? "supplier"} (simulated — nothing was sent).` });
  }
  if (!po.expectedAt) po.expectedAt = addDays(new Date(), s?.leadTimeDays ?? 7).toISOString();
}

/* ── Selectors ─────────────────────────────────────────────── */

const EMPTY = buildStore("empty");

/** Active store data. Falls back to an empty store before hydration. */
export function useData(): StoreData {
  return useApp((s) => s.stores[s.activeStoreId]) ?? EMPTY;
}

export const useActions = () => useApp.getState();

export function storeProfiles() {
  return [STORE_PROFILES.downtown, STORE_PROFILES.riverside];
}

export { PO_STATUS_LABEL };
