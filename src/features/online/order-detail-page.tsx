"use client";

import { Check, Mail, MapPin, Phone, ShoppingBag, User, Xmark } from "iconoir-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CHANNEL_LABEL, nextOrderStatus, ORDER_ACTION_LABEL, ORDER_STATUS_LABEL } from "@/lib/domain";
import { fdate, fmt } from "@/lib/format";
import { useAsyncAction } from "@/lib/simulate";
import { useApp, useData } from "@/lib/store/app-store";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductThumb } from "@/components/domain/product-thumb";
import { OrderStatusBadge } from "@/components/domain/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DetailRow } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Timeline } from "@/components/ui/display";
import { Field, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Banner, EmptyState } from "@/components/ui/states";
import { ChannelDot } from "@/features/online/online-page";

const CANCEL_REASONS = ["Customer requested cancellation", "Item out of stock", "Couldn't verify customer age", "Store closing early", "Other"];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const data = useData();
  const order = data.onlineOrders.find((o) => o.id === id);
  const { run, pending } = useAsyncAction();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);

  if (!order) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Online sales", href: "/online?tab=orders" }, { label: "Not found" }]} title="Order not found" />
        <Card>
          <EmptyState icon={<ShoppingBag />} title="This order doesn't exist in this store" action={<Button asChild variant="primary"><Link href="/online?tab=orders">Back to orders</Link></Button>} />
        </Card>
      </>
    );
  }

  const next = nextOrderStatus(order.status, order.fulfillment);
  const flow: OrderStatus[] = ["new", "accepted", "preparing", order.fulfillment === "pickup" ? "ready_for_pickup" : "out_for_delivery", "completed"];
  const idx = flow.indexOf(order.status);
  const canCancel = order.status !== "completed" && order.status !== "cancelled";
  const unavailable = order.items.filter((it) => (data.products.find((p) => p.id === it.productId)?.stock ?? 0) < it.qty);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Online sales", href: "/online" }, { label: "Orders", href: "/online?tab=orders" }, { label: order.number }]}
        leading={<ChannelDot channel={order.channel} />}
        title={`Order ${order.number}`}
        meta={<OrderStatusBadge status={order.status} />}
        description={`${CHANNEL_LABEL[order.channel]} · placed ${fdate.dateTime(order.placedAt)} · ${order.fulfillment === "pickup" ? "Customer pickup" : "Delivery"}`}
        actions={
          <>
            {canCancel && (
              <Button variant="secondary" leftIcon={<Xmark />} onClick={() => setCancelOpen(true)}>
                Cancel order
              </Button>
            )}
            {next && (
              <Button
                variant="primary"
                leftIcon={<Check />}
                loading={pending}
                onClick={() =>
                  run(() => useApp.getState().advanceOrder(order.id), {
                    success:
                      next === "completed"
                        ? { title: `${order.number} completed`, description: `Stock deducted for ${fmt.plural(order.items.length, "item")}.` }
                        : { title: `Order ${ORDER_STATUS_LABEL[next].toLowerCase()}`, description: `${CHANNEL_LABEL[order.channel]} would be notified (simulated).` },
                    error: "Status wasn't updated",
                  })
                }
              >
                {ORDER_ACTION_LABEL[next]}
              </Button>
            )}
          </>
        }
      />

      {order.status === "cancelled" && (
        <Banner tone="neutral" icon={<Xmark />} title="This order was cancelled" className="mb-4">
          {order.events.findLast((e) => e.status === "cancelled")?.detail ?? "No stock was deducted."}
        </Banner>
      )}
      {order.status === "new" && unavailable.length > 0 && (
        <Banner tone="warning" icon={<ShoppingBag />} title="Not enough stock for some items" className="mb-4">
          {unavailable.map((it) => data.products.find((p) => p.id === it.productId)?.name).join(", ")} — consider a substitution or cancelling.
        </Banner>
      )}

      {order.status !== "cancelled" && (
        <Card className="mb-4 px-5 py-4">
          <ol className="flex items-center" aria-label="Fulfilment progress">
            {flow.map((s, i) => (
              <li key={s} className="flex flex-1 items-center last:flex-none">
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      i < idx || order.status === "completed" ? "bg-primary-base text-white" : i === idx ? "bg-primary-mute text-primary-base ring-1 ring-primary-base/30" : "bg-bg-soft text-text-soft",
                    )}
                  >
                    {i < idx || order.status === "completed" ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
                  </span>
                  <span className={cn("hidden whitespace-nowrap text-sm md:inline", i <= idx ? "font-medium text-text-strong" : "text-text-sub")}>{ORDER_STATUS_LABEL[s]}</span>
                </span>
                {i < flow.length - 1 && <span className={cn("mx-3 h-0.5 flex-1 rounded-full", i < idx ? "bg-primary-base" : "bg-bg-subtle")} />}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader title="Items" description={`${order.items.reduce((s, i) => s + i.qty, 0)} units`} />
            <ul className="divide-y divide-stroke-soft border-t border-stroke-soft">
              {order.items.map((it) => {
                const p = data.products.find((x) => x.id === it.productId);
                return (
                  <li key={it.productId} className="flex items-center gap-3 px-5 py-3">
                    {p && <ProductThumb thumb={p.thumb} category={p.category} size="md" />}
                    <div className="min-w-0 flex-1">
                      {p ? (
                        <Link href={`/inventory/${p.id}`} className="block truncate text-sm font-medium text-text-strong hover:underline underline-offset-2">
                          {p.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-text-sub">Removed product</span>
                      )}
                      <span className="block text-xs text-text-sub">
                        {p?.size} · {p?.stock ?? 0} in stock
                      </span>
                    </div>
                    <span className="text-sm text-text-sub tnum">
                      {it.qty} × {fmt.money(it.unitPrice)}
                    </span>
                    <span className="w-24 text-right text-sm font-medium tnum">{fmt.money(it.qty * it.unitPrice)}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="ml-auto max-w-xs space-y-1.5 border-t border-stroke-soft px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-sub">Subtotal</dt>
                <dd className="tnum">{fmt.money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-sub">Taxes</dt>
                <dd className="tnum">{fmt.money(order.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-stroke-soft pt-1.5 text-base font-medium">
                <dt>Total</dt>
                <dd className="tnum">{fmt.money(order.total)}</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Event history" description="Every status change on this order" />
            <CardBody>
              <Timeline
                items={[...order.events].reverse().map((e) => ({
                  id: e.id,
                  title: e.title,
                  detail: e.detail,
                  meta: `${fdate.dateTime(e.at)} · ${e.actor}`,
                  tone: e.status === "cancelled" ? "neutral" : e.status === "completed" ? "success" : e.status === "new" ? "info" : "primary",
                }))}
              />
            </CardBody>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Customer" action={<Badge size="sm">Fictional</Badge>} />
            <CardBody>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2.5">
                  <User className="size-4 text-text-soft" />
                  <span className="font-medium text-text-strong">{order.customer.name}</span>
                </li>
                <li className="flex items-center gap-2.5 text-text-sub">
                  <Phone className="size-4 text-text-soft" />
                  {order.customer.phone}
                </li>
                <li className="flex items-center gap-2.5 text-text-sub">
                  <Mail className="size-4 text-text-soft" />
                  {order.customer.email}
                </li>
                {order.customer.address && (
                  <li className="flex items-start gap-2.5 text-text-sub">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-text-soft" />
                    {order.customer.address}
                  </li>
                )}
              </ul>
              {order.note && <p className="mt-3 rounded-sm bg-warning-mute px-3 py-2 text-sm text-warning-dark">“{order.note}”</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Fulfilment" />
            <CardBody>
              <dl className="divide-y divide-stroke-soft">
                <DetailRow label="Channel">{CHANNEL_LABEL[order.channel]}</DetailRow>
                <DetailRow label="Method">{order.fulfillment === "pickup" ? "Pickup in store" : "Delivery"}</DetailRow>
                <DetailRow label="Status">{ORDER_STATUS_LABEL[order.status]}</DetailRow>
                <DetailRow label="Age check">{order.fulfillment === "pickup" ? "At counter" : "By courier"}</DetailRow>
              </dl>
              <p className="mt-3 text-xs text-text-sub">Status changes here are simulated and never reach a real marketplace or customer.</p>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={(o) => {
          setCancelOpen(o);
          if (o) {
            setReason("");
            setNote("");
            setTried(false);
          }
        }}
        tone="danger"
        icon={<Xmark />}
        title={`Cancel order ${order.number}?`}
        description={`The customer and ${CHANNEL_LABEL[order.channel]} would be notified in a live store (simulated). This can't be undone.`}
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        onConfirm={async () => {
          setTried(true);
          if (!reason) return false;
          const r = await run(() => useApp.getState().cancelOrder(order.id, [reason, note.trim()].filter(Boolean).join(" — ")), { success: { title: `${order.number} cancelled` }, error: "Couldn't cancel the order" });
          return r.ok;
        }}
      >
        <div className="space-y-3">
          <Field label="Reason" error={tried && !reason ? "Choose a reason" : undefined}>
            {(f) => <Select id={f.id} invalid={f.invalid} value={reason || undefined} onValueChange={setReason} placeholder="Choose a reason…" options={CANCEL_REASONS.map((r) => ({ value: r, label: r }))} />}
          </Field>
          <Field label="Note" optional>
            {(f) => <Textarea id={f.id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}

