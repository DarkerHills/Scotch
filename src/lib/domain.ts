import type {
  Category,
  ChannelId,
  OrderStatus,
  POStatus,
  Product,
  PurchaseOrder,
  StockStatus,
  Supplier,
} from "@/lib/types";

/* ── Inventory rules ────────────────────────────────────────── */

export const DEFAULT_LEAD_TIME = 7;
/** Safety stock, in days of sales, added on top of lead-time demand. */
export const SAFETY_DAYS = 3;

export function reorderPointFor(velocity: number, leadTime: number) {
  return Math.max(3, Math.ceil(velocity * (leadTime + SAFETY_DAYS)));
}

/** Target = reorder point + ~3 weeks of cycle stock. */
export function targetStockFor(velocity: number, reorderPoint: number) {
  return reorderPoint + Math.max(6, Math.ceil(velocity * 21));
}

export function stockStatus(p: Pick<Product, "stock" | "reorderPoint">): StockStatus {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.reorderPoint) return "low";
  return "healthy";
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  healthy: "In stock",
  low: "Low stock",
  out: "Out of stock",
};

export function marginOf(price: number, cost: number) {
  if (price <= 0) return 0;
  return (price - cost) / price;
}

export function productMargin(p: Pick<Product, "retailPrice" | "unitCost">) {
  return marginOf(p.retailPrice, p.unitCost);
}

export function onlinePrice(p: Product) {
  return p.online.price ?? p.retailPrice;
}

export function leadTimeFor(p: Product, suppliers: Supplier[]) {
  const s = suppliers.find((x) => x.id === p.supplierId);
  return s?.leadTimeDays ?? DEFAULT_LEAD_TIME;
}

/* ── Purchase orders ────────────────────────────────────────── */

export const PO_STATUS_LABEL: Record<POStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  sent: "Sent",
  confirmed: "Confirmed",
  partially_received: "Partially received",
  received: "Received",
  cancelled: "Cancelled",
};

/** Statuses whose remaining quantities count as incoming stock. */
export const OPEN_PO_STATUSES: POStatus[] = ["pending_approval", "sent", "confirmed", "partially_received"];
export const RECEIVABLE_PO_STATUSES: POStatus[] = ["sent", "confirmed", "partially_received"];
export const CANCELLABLE_PO_STATUSES: POStatus[] = ["draft", "pending_approval", "sent", "confirmed"];

export function poSubtotal(po: Pick<PurchaseOrder, "lines">) {
  return po.lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
}
export function poTax(po: Pick<PurchaseOrder, "lines" | "taxRate">) {
  return poSubtotal(po) * po.taxRate;
}
export function poTotal(po: Pick<PurchaseOrder, "lines" | "taxRate">) {
  return poSubtotal(po) + poTax(po);
}
export function poUnits(po: Pick<PurchaseOrder, "lines">) {
  return po.lines.reduce((s, l) => s + l.qty, 0);
}
export function poReceivedUnits(po: Pick<PurchaseOrder, "lines">) {
  return po.lines.reduce((s, l) => s + l.receivedQty, 0);
}

export function onOrderByProduct(pos: PurchaseOrder[]) {
  const map = new Map<string, { qty: number; poIds: string[] }>();
  for (const po of pos) {
    if (!OPEN_PO_STATUSES.includes(po.status)) continue;
    for (const l of po.lines) {
      const remaining = l.qty - l.receivedQty;
      if (remaining <= 0) continue;
      const cur = map.get(l.productId) ?? { qty: 0, poIds: [] };
      cur.qty += remaining;
      if (!cur.poIds.includes(po.id)) cur.poIds.push(po.id);
      map.set(l.productId, cur);
    }
  }
  return map;
}

/* ── Online orders ──────────────────────────────────────────── */

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Permitted forward transitions for the demo fulfillment workflow. */
export function nextOrderStatus(status: OrderStatus, fulfillment: "pickup" | "delivery"): OrderStatus | null {
  switch (status) {
    case "new":
      return "accepted";
    case "accepted":
      return "preparing";
    case "preparing":
      return fulfillment === "pickup" ? "ready_for_pickup" : "out_for_delivery";
    case "ready_for_pickup":
    case "out_for_delivery":
      return "completed";
    default:
      return null;
  }
}

export const ORDER_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  accepted: "Accept order",
  preparing: "Start preparing",
  ready_for_pickup: "Mark ready for pickup",
  out_for_delivery: "Hand off to courier",
  completed: "Mark completed",
};

export const OPEN_ORDER_STATUSES: OrderStatus[] = ["new", "accepted", "preparing", "ready_for_pickup", "out_for_delivery"];

export const CHANNEL_LABEL: Record<ChannelId, string> = {
  storefront: "Online storefront",
  doordash: "DoorDash",
  ubereats: "Uber Eats",
};

export const CATEGORY_CODE: Record<Category, string> = {
  Whiskey: "WSK",
  Vodka: "VOD",
  Gin: "GIN",
  Rum: "RUM",
  Tequila: "TEQ",
  Liqueur: "LIQ",
  "Red wine": "RED",
  "White wine": "WHT",
  Sparkling: "SPK",
  "Beer & cider": "BER",
};
