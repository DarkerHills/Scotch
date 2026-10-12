import { CheckCircle, CloudSync, LinkSlash, RefreshDouble, WarningCircle, WarningTriangle } from "iconoir-react";
import { Badge, type Tone } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL, PO_STATUS_LABEL, STOCK_STATUS_LABEL } from "@/lib/domain";
import type { Priority } from "@/lib/recommendations";
import { PRIORITY_LABEL } from "@/lib/recommendations";
import type { ChannelStatus, ListingStatus, OrderStatus, POStatus, StockStatus, SupplierStatus } from "@/lib/types";

const STOCK_TONE: Record<StockStatus, Tone> = { healthy: "success", low: "warning", out: "error" };
export function StockBadge({ status, size }: { status: StockStatus; size?: "sm" | "md" }) {
  return (
    <Badge tone={STOCK_TONE[status]} dot size={size}>
      {STOCK_STATUS_LABEL[status]}
    </Badge>
  );
}

const PO_TONE: Record<POStatus, Tone> = {
  draft: "neutral",
  pending_approval: "warning",
  sent: "info",
  confirmed: "feature",
  partially_received: "verified",
  received: "success",
  cancelled: "neutral",
};
export function POStatusBadge({ status, size }: { status: POStatus; size?: "sm" | "md" }) {
  return (
    <Badge tone={PO_TONE[status]} dot size={size} look={status === "cancelled" ? "stroke" : "light"} className={status === "cancelled" ? "line-through decoration-text-soft/60" : undefined}>
      {PO_STATUS_LABEL[status]}
    </Badge>
  );
}

const ORDER_TONE: Record<OrderStatus, Tone> = {
  new: "info",
  accepted: "feature",
  preparing: "warning",
  ready_for_pickup: "verified",
  out_for_delivery: "verified",
  completed: "success",
  cancelled: "neutral",
};
export function OrderStatusBadge({ status, size }: { status: OrderStatus; size?: "sm" | "md" }) {
  return (
    <Badge tone={ORDER_TONE[status]} dot size={size} look={status === "cancelled" ? "stroke" : "light"}>
      {ORDER_STATUS_LABEL[status]}
    </Badge>
  );
}

export const CHANNEL_STATUS: Record<ChannelStatus, { label: string; tone: Tone; icon: React.ReactNode }> = {
  connected: { label: "Connected", tone: "success", icon: <CheckCircle /> },
  syncing: { label: "Syncing", tone: "info", icon: <RefreshDouble className="animate-spin [animation-duration:1.6s]" /> },
  action_required: { label: "Action required", tone: "warning", icon: <WarningTriangle /> },
  disconnected: { label: "Disconnected", tone: "neutral", icon: <LinkSlash /> },
  failed: { label: "Connection failed", tone: "error", icon: <WarningCircle /> },
};
export function ChannelStatusBadge({ status, size }: { status: ChannelStatus; size?: "sm" | "md" }) {
  const s = CHANNEL_STATUS[status];
  return (
    <Badge tone={s.tone} icon={s.icon} size={size}>
      {s.label}
    </Badge>
  );
}

export const LISTING: Record<ListingStatus, { label: string; tone: Tone }> = {
  listed: { label: "Listed", tone: "success" },
  pending: { label: "Pending sync", tone: "info" },
  unlisted: { label: "Not listed", tone: "neutral" },
  error: { label: "Rejected", tone: "error" },
};
export function ListingBadge({ status, removal }: { status: ListingStatus; removal?: boolean }) {
  const s = LISTING[status];
  return (
    <Badge tone={s.tone} dot size="sm" icon={status === "pending" ? <CloudSync /> : undefined}>
      {status === "pending" && removal ? "Pending removal" : s.label}
    </Badge>
  );
}

const PRIORITY_TONE: Record<Priority, Tone> = { critical: "error", high: "warning", medium: "info" };
export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge tone={PRIORITY_TONE[priority]} look={priority === "critical" ? "dark" : "light"} dot>
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

const SUPPLIER_TONE: Record<SupplierStatus, Tone> = { active: "success", on_hold: "warning", archived: "neutral" };
const SUPPLIER_LABEL: Record<SupplierStatus, string> = { active: "Active", on_hold: "On hold", archived: "Archived" };
export function SupplierStatusBadge({ status }: { status: SupplierStatus }) {
  return (
    <Badge tone={SUPPLIER_TONE[status]} dot>
      {SUPPLIER_LABEL[status]}
    </Badge>
  );
}
