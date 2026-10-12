/**
 * Domain model for the Scotch POS demo. Every entity references others by
 * stable id, so derived values (stock status, margins, on-order quantities,
 * recommendations) are always computed from a single source of truth.
 */

export type StoreId = "downtown" | "riverside" | "empty";

export const CATEGORIES = [
  "Whiskey",
  "Vodka",
  "Gin",
  "Rum",
  "Tequila",
  "Liqueur",
  "Red wine",
  "White wine",
  "Sparkling",
  "Beer & cider",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type BottleShape =
  | "whiskey"
  | "square"
  | "slim"
  | "gin"
  | "squat"
  | "wine"
  | "sparkling"
  | "can"
  | "round";

export interface Thumb {
  shape: BottleShape;
  glass: string;
  liquid: string;
  label: string;
  accent: string;
}

export type ChannelId = "storefront" | "doordash" | "ubereats";
export const CHANNEL_IDS: ChannelId[] = ["storefront", "doordash", "ubereats"];

/** Per-channel listing state for a product. */
export type ListingStatus = "listed" | "pending" | "unlisted" | "error";

export interface ProductOnline {
  available: boolean;
  /** Online price override; null means "same as in-store price". */
  price: number | null;
  listings: Record<ChannelId, ListingStatus>;
  lastSyncedAt: string | null;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  category: Category;
  size: string;
  /** Units per case — purchase quantities round up to this. */
  packSize: number;
  description: string;
  unitCost: number;
  retailPrice: number;
  stock: number;
  reorderPoint: number;
  targetStock: number;
  supplierId: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  thumb: Thumb;
  online: ProductOnline;
}

export type StockStatus = "healthy" | "low" | "out";

export type SupplierStatus = "active" | "on_hold" | "archived";

export interface Supplier {
  id: string;
  name: string;
  monogram: string;
  color: string;
  contactName: string;
  contactRole: string;
  email: string;
  phone: string;
  address: string;
  categories: Category[];
  leadTimeDays: number;
  paymentTerms: string;
  minimumOrder: number;
  onTimeRate: number;
  status: SupplierStatus;
  notes: string;
  createdAt: string;
}

export const PO_STATUSES = [
  "draft",
  "pending_approval",
  "sent",
  "confirmed",
  "partially_received",
  "received",
  "cancelled",
] as const;
export type POStatus = (typeof PO_STATUSES)[number];

export interface POLine {
  productId: string;
  qty: number;
  unitCost: number;
  receivedQty: number;
}

export type POEventType = "created" | "status" | "receipt" | "edited" | "failed" | "note";

export interface POEvent {
  id: string;
  at: string;
  type: POEventType;
  status?: POStatus;
  title: string;
  detail?: string;
  actor: string;
}

export interface POReceipt {
  id: string;
  at: string;
  lines: { productId: string; qty: number }[];
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  status: POStatus;
  lines: POLine[];
  createdAt: string;
  updatedAt: string;
  expectedAt: string | null;
  deliverTo: string;
  reference: string;
  notes: string;
  taxRate: number;
  events: POEvent[];
  receipts: POReceipt[];
}

export const ORDER_STATUSES = [
  "new",
  "accepted",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OnlineOrderItem {
  productId: string;
  qty: number;
  unitPrice: number;
}

export interface OrderEvent {
  id: string;
  at: string;
  status: OrderStatus;
  title: string;
  detail?: string;
  actor: string;
}

export interface OnlineOrder {
  id: string;
  number: string;
  channel: ChannelId;
  placedAt: string;
  items: OnlineOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  fulfillment: "pickup" | "delivery";
  customer: { name: string; phone: string; email: string; address: string };
  note: string;
  events: OrderEvent[];
}

export type ChannelStatus = "connected" | "syncing" | "action_required" | "disconnected" | "failed";
export type SyncFrequency = "15m" | "1h" | "6h" | "manual";

export interface SyncEvent {
  id: string;
  at: string;
  kind: "sync" | "connect" | "disconnect" | "error" | "settings";
  ok: boolean;
  title: string;
  detail?: string;
  count?: number;
}

export interface Channel {
  id: ChannelId;
  name: string;
  kind: string;
  description: string;
  status: ChannelStatus;
  accountName: string;
  lastSyncAt: string | null;
  frequency: SyncFrequency;
  catalogSync: boolean;
  orderSync: boolean;
  error: { code: string; message: string; at: string; hint: string } | null;
  events: SyncEvent[];
}

export type MovementType = "receipt" | "adjustment" | "online_sale" | "count" | "created";

export interface StockMovement {
  id: string;
  productId: string;
  at: string;
  type: MovementType;
  qty: number;
  balance: number;
  reason: string;
  note?: string;
  ref?: { kind: "po" | "order"; id: string; label: string };
}

export type NotificationKind = "low_stock" | "out_of_stock" | "po" | "sync" | "order" | "recommendation" | "system";

export interface AppNotification {
  id: string;
  at: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  read: boolean;
}

export interface StoreProfile {
  id: StoreId;
  name: string;
  shortName: string;
  address: string;
  timezone: string;
  taxRate: number;
  approvalThreshold: number;
  ownerName: string;
}

/** A purchase order being composed in the create/edit workflow (unsaved). */
export interface PODraft {
  editingId: string | null;
  supplierId: string | null;
  lines: { productId: string; qty: number; unitCost: number }[];
  expectedAt: string;
  deliverTo: string;
  reference: string;
  notes: string;
  source: "manual" | "smart_ordering" | "product";
  dirty: boolean;
}

export interface StoreData {
  profile: StoreProfile;
  products: Product[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  onlineOrders: OnlineOrder[];
  channels: Channel[];
  movements: StockMovement[];
  notifications: AppNotification[];
  /** productId → ISO date the recommendation was dismissed. */
  dismissedRecs: Record<string, string>;
  /** productId → quantity override for a recommendation. */
  recOverrides: Record<string, number>;
  poDraft: PODraft | null;
  seq: { po: number; product: number; supplier: number; order: number; id: number };
  seededAt: string;
}
