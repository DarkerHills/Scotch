import { velocityOf } from "@/lib/analytics";
import type { SalesHistory } from "@/lib/data/history";
import { DEFAULT_LEAD_TIME, onOrderByProduct } from "@/lib/domain";
import { fmt } from "@/lib/format";
import type { Product, PurchaseOrder, StoreData, Supplier } from "@/lib/types";
import { roundUpTo } from "@/lib/utils";

export type Priority = "critical" | "high" | "medium";
export type Coverage = "ok" | "no_supplier" | "supplier_on_hold" | "supplier_archived";

export interface Recommendation {
  product: Product;
  supplier: Supplier | null;
  velocity: number;
  daysLeft: number;
  leadTime: number;
  onOrder: number;
  onOrderPoIds: string[];
  suggestedQty: number;
  qty: number;
  unitCost: number;
  total: number;
  priority: Priority;
  coverage: Coverage;
  headline: string;
  reason: string;
  dismissedAt: string | null;
  /** Inputs to the explanation panel. */
  math: { need: number; rawQty: number; packSize: number; target: number };
}

export const PRIORITY_LABEL: Record<Priority, string> = { critical: "Critical", high: "High", medium: "Medium" };
const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, medium: 2 };

/**
 * Rule-based reorder suggestions from simulated sales velocity, stock on hand,
 * open purchase orders, supplier lead time and target stock. Illustrative —
 * not a machine-learning forecast.
 *
 *   needs reorder  = stock ≤ reorder point, or days left ≤ lead time + 6
 *   quantity       = round up to case size (target − stock − on order)
 *   critical       = out of stock, or will run out before a delivery could arrive
 *   high           = at or below the reorder point
 *   medium         = will reach the reorder point within ~3 days
 */
export function buildRecommendations(data: StoreData, history: SalesHistory): Recommendation[] {
  const onOrder = onOrderByProduct(data.purchaseOrders);
  const recs: Recommendation[] = [];
  for (const p of data.products) {
    if (p.archived) continue;
    const supplier = data.suppliers.find((s) => s.id === p.supplierId) ?? null;
    const leadTime = supplier?.leadTimeDays ?? DEFAULT_LEAD_TIME;
    const velocity = velocityOf(history, p.id);
    const daysLeft = velocity > 0 ? p.stock / velocity : p.stock > 0 ? Infinity : 0;
    const atReorder = p.stock <= p.reorderPoint;
    const approaching = velocity > 0 && daysLeft <= leadTime + 6;
    if (!atReorder && !approaching) continue;

    const incoming = onOrder.get(p.id);
    const onOrderQty = incoming?.qty ?? 0;
    const need = p.targetStock - p.stock - onOrderQty;
    if (need <= 0) continue; // Already covered by open purchase orders.
    const suggestedQty = Math.max(p.packSize, roundUpTo(need, p.packSize));
    const override = data.recOverrides[p.id];
    const qty = override && override > 0 ? override : suggestedQty;

    const priority: Priority = p.stock <= 0 || daysLeft < leadTime ? "critical" : atReorder ? "high" : "medium";
    const coverage: Coverage = !supplier
      ? "no_supplier"
      : supplier.status === "on_hold"
        ? "supplier_on_hold"
        : supplier.status === "archived"
          ? "supplier_archived"
          : "ok";

    const unit = p.category === "Beer & cider" ? "packs" : "bottles";
    const v = fmt.dec1(velocity);
    const days = Number.isFinite(daysLeft) ? Math.floor(daysLeft) : null;
    const headline = `Reorder ${qty} ${unit} of ${p.name}`;
    let reason = `Current stock is ${p.stock}, average sales are ${v} per day, and ${supplier ? `${supplier.name}'s` : "the default"} lead time is ${leadTime} days.`;
    if (p.stock <= 0) reason += " It's already sold out, so every day without stock is lost sales.";
    else if (days !== null && daysLeft < leadTime) reason += ` At this pace it runs out in about ${days} ${days === 1 ? "day" : "days"} — before a new delivery could arrive.`;
    else if (atReorder) reason += ` It's at or below its reorder point of ${p.reorderPoint}.`;
    else if (days !== null) reason += ` It will reach the reorder point of ${p.reorderPoint} in about ${Math.max(1, Math.floor((p.stock - p.reorderPoint) / Math.max(velocity, 0.01)))} days.`;
    if (onOrderQty > 0) reason += ` ${onOrderQty} units are already on order.`;

    recs.push({
      product: p,
      supplier,
      velocity,
      daysLeft,
      leadTime,
      onOrder: onOrderQty,
      onOrderPoIds: incoming?.poIds ?? [],
      suggestedQty,
      qty,
      unitCost: p.unitCost,
      total: qty * p.unitCost,
      priority,
      coverage,
      headline,
      reason,
      dismissedAt: data.dismissedRecs[p.id] ?? null,
      math: { need, rawQty: need, packSize: p.packSize, target: p.targetStock },
    });
  }
  return recs.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.daysLeft - b.daysLeft);
}

export function stockoutRisk(r: Pick<Recommendation, "daysLeft" | "leadTime">) {
  if (!Number.isFinite(r.daysLeft)) return 0;
  return r.leadTime - r.daysLeft;
}

export function isOrderable(r: Recommendation) {
  return r.coverage === "ok";
}

export function openPOsFor(pos: PurchaseOrder[], productId: string) {
  return pos.filter((po) => po.lines.some((l) => l.productId === productId));
}
