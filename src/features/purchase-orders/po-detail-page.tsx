"use client";

import { BoxIso, Check, Clock, DoubleCheck, EditPencil, MoreHoriz, Page, Send, Trash, Truck, WarningCircle, Xmark } from "iconoir-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CANCELLABLE_PO_STATUSES, poReceivedUnits, poSubtotal, poTax, poTotal, poUnits, RECEIVABLE_PO_STATUSES } from "@/lib/domain";
import { fdate, fmt } from "@/lib/format";
import { useAsyncAction } from "@/lib/simulate";
import { useApp, useData } from "@/lib/store/app-store";
import { toast } from "@/lib/store/toast-store";
import type { POStatus, PurchaseOrder } from "@/lib/types";
import { cn, daysBetween, uid } from "@/lib/utils";
import { ProductThumb } from "@/components/domain/product-thumb";
import { POStatusBadge } from "@/components/domain/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DetailRow } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Monogram, Timeline } from "@/components/ui/display";
import { Field, Textarea } from "@/components/ui/input";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { PageHeader } from "@/components/ui/page-header";
import { QuantityInput } from "@/components/ui/quantity-input";
import { Select } from "@/components/ui/select";
import { Banner, EmptyState } from "@/components/ui/states";

const PROGRESS: { key: string; label: string; match: POStatus[] }[] = [
  { key: "draft", label: "Draft", match: ["draft"] },
  { key: "submitted", label: "Submitted", match: ["pending_approval", "sent"] },
  { key: "confirmed", label: "Confirmed", match: ["confirmed"] },
  { key: "receiving", label: "Received", match: ["partially_received", "received"] },
];

export function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const data = useData();
  const router = useRouter();
  const po = data.purchaseOrders.find((p) => p.id === id);
  const [dialog, setDialog] = useState<null | "receive" | "cancel" | "submit" | "approve" | "delete">(null);
  const [failSubmit, setFailSubmit] = useState(false);
  const { run, pending } = useAsyncAction();

  if (!po) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Purchase orders", href: "/purchase-orders" }, { label: "Not found" }]} title="Purchase order not found" />
        <Card>
          <EmptyState
            icon={<Page />}
            title="This order doesn't exist in this store"
            description="Drafts that were discarded no longer appear here."
            action={
              <Button asChild variant="primary">
                <Link href="/purchase-orders">Back to purchase orders</Link>
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const supplier = data.suppliers.find((s) => s.id === po.supplierId);
  const late = po.expectedAt && RECEIVABLE_PO_STATUSES.includes(po.status) && daysBetween(po.expectedAt, new Date()) > 0;
  const progressIdx = po.status === "cancelled" ? -1 : PROGRESS.findIndex((p) => p.match.includes(po.status));
  const received = poReceivedUnits(po);
  const units = poUnits(po);

  const submit = async () => {
    const r = await run(
      () => useApp.getState().submitPO(po.id),
      { forceFail: failSubmit, error: "Order wasn't submitted", success: poSubtotal(po) > data.profile.approvalThreshold ? { title: `${po.number} sent for approval` } : { title: `${po.number} sent to ${supplier?.name}`, description: "Simulated — no real order was placed." } },
    );
    if (!r.ok) useApp.getState().logPOFailure(po.id, "Submission failed");
    setFailSubmit(false);
    return true;
  };

  const primary = (() => {
    switch (po.status) {
      case "draft":
        return (
          <>
            <Button asChild variant="secondary" leftIcon={<EditPencil />}>
              <Link href={`/purchase-orders/new?edit=${po.id}`}>Edit draft</Link>
            </Button>
            <Button variant="primary" leftIcon={<Send />} onClick={() => setDialog("submit")}>
              Submit order
            </Button>
          </>
        );
      case "pending_approval":
        return (
          <Button variant="primary" leftIcon={<DoubleCheck />} onClick={() => setDialog("approve")}>
            Approve & send
          </Button>
        );
      case "sent":
        return (
          <>
            <Button
              variant="secondary"
              leftIcon={<Check />}
              loading={pending}
              onClick={() => run(() => useApp.getState().confirmPO(po.id), { success: { title: "Supplier confirmation recorded", description: "Simulated for the demo." } })}
            >
              Mark confirmed
            </Button>
            <Button variant="primary" leftIcon={<BoxIso />} onClick={() => setDialog("receive")}>
              Receive stock
            </Button>
          </>
        );
      case "confirmed":
        return (
          <Button variant="primary" leftIcon={<BoxIso />} onClick={() => setDialog("receive")}>
            Receive stock
          </Button>
        );
      case "partially_received":
        return (
          <Button variant="primary" leftIcon={<BoxIso />} onClick={() => setDialog("receive")}>
            Receive remaining
          </Button>
        );
      default:
        return null;
    }
  })();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Purchase orders", href: "/purchase-orders" },
          { label: po.number },
        ]}
        title={po.number}
        meta={<POStatusBadge status={po.status} />}
        description={
          <>
            {supplier && (
              <Link href={`/suppliers/${supplier.id}`} className="font-medium text-text-strong hover:underline underline-offset-2">
                {supplier.name}
              </Link>
            )}{" "}
            · Created {fdate.medium(po.createdAt)} · {fmt.plural(po.lines.length, "item")} · {fmt.money(poTotal(po))}
          </>
        }
        actions={
          <>
            {primary}
            {(CANCELLABLE_PO_STATUSES.includes(po.status) || po.status === "draft") && (
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="secondary" icon aria-label="More actions">
                    <MoreHoriz />
                  </Button>
                </MenuTrigger>
                <MenuContent>
                  {po.status === "draft" ? (
                    <MenuItem icon={<Trash />} danger onSelect={() => setDialog("delete")}>
                      Delete draft
                    </MenuItem>
                  ) : (
                    <>
                      {supplier && (
                        <MenuItem icon={<Truck />} onSelect={() => router.push(`/suppliers/${supplier.id}`)}>
                          View supplier
                        </MenuItem>
                      )}
                      <MenuSeparator />
                      <MenuItem icon={<Xmark />} danger onSelect={() => setDialog("cancel")}>
                        Cancel order
                      </MenuItem>
                    </>
                  )}
                </MenuContent>
              </Menu>
            )}
          </>
        }
      />

      {late && (
        <Banner tone="warning" icon={<Clock />} title={`Delivery is ${fdate.due(po.expectedAt!)}`} className="mb-4" action={supplier && <Button asChild size="sm" variant="secondary"><Link href={`/suppliers/${supplier.id}`}>Contact supplier</Link></Button>}>
          Expected {fdate.medium(po.expectedAt!)}. Follow up with {supplier?.contactName ?? "the supplier"} or receive what arrived.
        </Banner>
      )}
      {po.status === "pending_approval" && (
        <Banner tone="info" icon={<DoubleCheck />} title="Waiting for approval" className="mb-4">
          {fmt.money(poTotal(po))} is over the {fmt.money0(data.profile.approvalThreshold)} approval threshold. Once approved, it&apos;s sent to {supplier?.name} (simulated).
        </Banner>
      )}
      {po.status === "cancelled" && (
        <Banner tone="neutral" icon={<Xmark />} title="This order was cancelled" className="mb-4">
          {po.events.findLast((e) => e.status === "cancelled")?.detail ?? "No stock was received."}
        </Banner>
      )}
      {po.status === "received" && (
        <Banner tone="success" icon={<Check />} title="Received in full" className="mb-4">
          All {fmt.int(units)} units were checked in and added to inventory.
        </Banner>
      )}

      {po.status !== "cancelled" && (
        <Card className="mb-4 px-5 py-4">
          <ol className="flex items-center" aria-label="Order progress">
            {PROGRESS.map((p, i) => {
              const done = i < progressIdx || (i === progressIdx && (po.status === "received" || (i === 0 && po.status !== "draft")));
              const current = i === progressIdx && !done;
              return (
                <li key={p.key} className="flex flex-1 items-center last:flex-none">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        done ? "bg-primary-base text-white" : current ? "bg-primary-mute text-primary-base ring-1 ring-primary-base/30" : "bg-bg-soft text-text-soft",
                      )}
                    >
                      {done ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
                    </span>
                    <span className={cn("hidden whitespace-nowrap text-sm sm:inline", done || current ? "font-medium text-text-strong" : "text-text-sub")}>
                      {p.key === "submitted" && po.status === "pending_approval" ? "Pending approval" : p.key === "receiving" && po.status === "partially_received" ? `Received ${received}/${units}` : p.label}
                    </span>
                  </div>
                  {i < PROGRESS.length - 1 && <span className={cn("mx-3 h-0.5 flex-1 rounded-full", i < progressIdx ? "bg-primary-base" : "bg-bg-subtle")} />}
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader title="Items" description={`${fmt.int(units)} units ordered · ${fmt.int(received)} received`} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <caption className="sr-only">Line items for {po.number}</caption>
                <thead>
                  <tr className="border-y border-stroke-soft bg-bg-surface text-left text-xs text-text-sub">
                    <th scope="col" className="px-5 py-2 font-medium">Product</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Ordered</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Received</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Unit cost</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
                    <th scope="col" className="px-5 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {po.lines.map((l) => {
                    const p = data.products.find((x) => x.id === l.productId);
                    const remaining = l.qty - l.receivedQty;
                    return (
                      <tr key={l.productId} className="border-b border-stroke-soft last:border-0">
                        <td className="px-5 py-3">
                          {p ? (
                            <Link href={`/inventory/${p.id}`} className="flex items-center gap-3 hover:underline underline-offset-2">
                              <ProductThumb thumb={p.thumb} category={p.category} size="sm" />
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-text-strong">{p.name}</span>
                                <span className="block text-xs text-text-sub">
                                  {p.size} · now {p.stock} on hand
                                </span>
                              </span>
                            </Link>
                          ) : (
                            <span className="text-text-sub">Removed product</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right tnum">{l.qty}</td>
                        <td className="px-3 py-3 text-right tnum">{l.receivedQty}</td>
                        <td className="px-3 py-3 text-right tnum text-text-sub">{fmt.money(l.unitCost)}</td>
                        <td className="px-3 py-3 text-right font-medium tnum">{fmt.money(l.qty * l.unitCost)}</td>
                        <td className="px-5 py-3">
                          {po.status === "cancelled" ? (
                            <Badge size="sm">Cancelled</Badge>
                          ) : remaining <= 0 ? (
                            <Badge tone="success" dot size="sm">
                              Received
                            </Badge>
                          ) : l.receivedQty > 0 ? (
                            <Badge tone="verified" dot size="sm">
                              {remaining} back-ordered
                            </Badge>
                          ) : (
                            <Badge tone="neutral" dot size="sm">
                              {po.status === "draft" ? "Not sent" : "Awaiting"}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto max-w-xs space-y-1.5 border-t border-stroke-soft px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-sub">Subtotal</dt>
                <dd className="tnum">{fmt.money(poSubtotal(po))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-sub">Est. tax ({fmt.pct(po.taxRate, 2)})</dt>
                <dd className="tnum">{fmt.money(poTax(po))}</dd>
              </div>
              <div className="flex justify-between border-t border-stroke-soft pt-1.5 text-base font-medium">
                <dt>Total</dt>
                <dd className="tnum">{fmt.money(poTotal(po))}</dd>
              </div>
            </dl>
          </Card>

          {po.receipts.length > 0 && (
            <Card>
              <CardHeader title="Receipts" description="Each receipt adds only the quantities checked in — never twice." />
              <ul className="divide-y divide-stroke-soft border-t border-stroke-soft">
                {[...po.receipts].reverse().map((r, i) => (
                  <li key={r.id} className="px-5 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text-strong">Receipt {po.receipts.length - i}</span>
                      <span className="text-xs text-text-sub">{fdate.dateTime(r.at)}</span>
                    </div>
                    <p className="mt-1 text-text-sub">
                      {r.lines
                        .map((l) => {
                          const p = data.products.find((x) => x.id === l.productId);
                          return `${l.qty} × ${p?.name ?? "item"}`;
                        })
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Order details" />
            <CardBody>
              {supplier && (
                <Link href={`/suppliers/${supplier.id}`} className="-mx-2 mb-2 flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-bg-surface">
                  <Monogram text={supplier.monogram} color={supplier.color} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text-strong">{supplier.name}</span>
                    <span className="block truncate text-xs text-text-sub">{supplier.email}</span>
                  </span>
                </Link>
              )}
              <dl className="divide-y divide-stroke-soft">
                <DetailRow label="Expected delivery">
                  <span className={cn(late && "text-error-dark")}>{po.expectedAt ? fdate.medium(po.expectedAt) : "Not set"}</span>
                </DetailRow>
                <DetailRow label="Payment terms">{supplier?.paymentTerms ?? "—"}</DetailRow>
                <DetailRow label="Reference">{po.reference || <span className="font-normal text-text-soft">None</span>}</DetailRow>
                <DetailRow label="Deliver to">
                  <span className="font-normal">{po.deliverTo}</span>
                </DetailRow>
              </dl>
              {po.notes && <p className="mt-3 rounded-sm bg-bg-surface px-3 py-2 text-sm text-text-sub">{po.notes}</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Status history" />
            <CardBody>
              <Timeline
                items={[...po.events].reverse().map((e) => ({
                  id: e.id,
                  title: e.title,
                  detail: e.detail,
                  meta: `${fdate.dateTime(e.at)} · ${e.actor}`,
                  tone: e.type === "failed" ? "error" : e.status === "received" ? "success" : e.status === "cancelled" ? "neutral" : e.status === "pending_approval" ? "warning" : e.type === "receipt" ? "info" : "primary",
                }))}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      <ReceiveDialog open={dialog === "receive"} onOpenChange={(o) => setDialog(o ? "receive" : null)} po={po} />
      <CancelDialog open={dialog === "cancel"} onOpenChange={(o) => setDialog(o ? "cancel" : null)} po={po} />
      <ConfirmDialog
        open={dialog === "submit"}
        onOpenChange={(o) => setDialog(o ? "submit" : null)}
        icon={<Send />}
        title={poSubtotal(po) > data.profile.approvalThreshold ? "Submit for approval?" : `Send ${po.number} to ${supplier?.name}?`}
        description={`${fmt.money(poTotal(po))} · demo only — no order reaches the supplier.`}
        confirmLabel="Submit order"
        onConfirm={submit}
      >
        <label className="flex cursor-pointer items-center gap-2 rounded-sm bg-bg-surface px-3 py-2 text-sm text-text-sub">
          <Checkbox checked={failSubmit} onCheckedChange={setFailSubmit} aria-label="Simulate a submission failure" />
          Simulate a submission failure (demo)
        </label>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "approve"}
        onOpenChange={(o) => setDialog(o ? "approve" : null)}
        icon={<DoubleCheck />}
        title={`Approve ${po.number}?`}
        description={`It'll be sent to ${supplier?.name} (simulated — nothing is sent).`}
        confirmLabel="Approve & send"
        onConfirm={async () => {
          await run(() => useApp.getState().approvePO(po.id), { success: { title: `${po.number} approved`, description: "Status changed to Sent." } });
          return true;
        }}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => setDialog(o ? "delete" : null)}
        tone="danger"
        icon={<Trash />}
        title={`Delete draft ${po.number}?`}
        description="The draft and its items will be removed. This can't be undone."
        confirmLabel="Delete draft"
        onConfirm={async () => {
          const r = await run(() => useApp.getState().deleteDraftPO(po.id), { success: "Draft deleted" });
          if (r.ok) router.push("/purchase-orders");
          return r.ok;
        }}
      />
    </>
  );
}

type PODialogProps = { open: boolean; onOpenChange: (o: boolean) => void; po: PurchaseOrder };

function ReceiveDialog(props: PODialogProps) {
  return props.open ? <ReceiveBody {...props} /> : null;
}

function ReceiveBody({ open, onOpenChange, po }: PODialogProps) {
  const data = useData();
  const { run, pending, error } = useAsyncAction();
  const remainingLines = useMemo(() => po.lines.filter((l) => l.qty - l.receivedQty > 0), [po.lines]);
  const [qtys, setQtys] = useState<Record<string, number>>(() => Object.fromEntries(po.lines.filter((l) => l.qty > l.receivedQty).map((l) => [l.productId, l.qty - l.receivedQty])));
  // One receipt id per dialog session makes the receipt idempotent: a repeated submit can't add stock twice.
  const [receiptId] = useState(() => uid("rcpt"));

  const errors = Object.fromEntries(
    remainingLines.map((l) => {
      const v = qtys[l.productId];
      const rem = l.qty - l.receivedQty;
      return [l.productId, !Number.isFinite(v) || !Number.isInteger(v) ? "Whole units only" : v < 0 ? "Can't be negative" : v > rem ? `Only ${rem} outstanding` : null];
    }),
  );
  const hasError = Object.values(errors).some(Boolean);
  const total = remainingLines.reduce((s, l) => s + (Number.isFinite(qtys[l.productId]) ? qtys[l.productId] : 0), 0);
  const outstanding = remainingLines.reduce((s, l) => s + l.qty - l.receivedQty, 0);
  const partial = total < outstanding;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !pending && onOpenChange(o)}
      width="lg"
      icon={<BoxIso />}
      title={`Receive stock · ${po.number}`}
      description="Enter what actually arrived. Only these quantities are added to inventory."
      footer={
        <>
          <span className="mr-auto text-sm text-text-sub tnum">
            Receiving <span className="font-medium text-text-strong">{fmt.int(total)}</span> of {fmt.int(outstanding)} outstanding
          </span>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending}
            disabled={hasError || total === 0}
            onClick={async () => {
              const r = await run(() => useApp.getState().receivePO(po.id, receiptId, qtys), { toastOnError: false });
              if (r.ok) {
                toast.success(r.value.status === "received" ? `${po.number} received in full` : `${po.number} partially received`, `${fmt.int(r.value.units)} units added to inventory.`, {
                  action: { label: "View inventory", href: "/inventory" },
                });
                onOpenChange(false);
              }
            }}
          >
            {error ? "Retry" : partial ? "Record partial receipt" : "Receive all"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <Banner tone="error" icon={<WarningCircle />} title="Receipt wasn't recorded">
            Simulated network error — no stock was added. Your quantities are kept; select Retry.
          </Banner>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="xs" variant="secondary" onClick={() => setQtys(Object.fromEntries(remainingLines.map((l) => [l.productId, l.qty - l.receivedQty])))}>
            Fill all outstanding
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setQtys(Object.fromEntries(remainingLines.map((l) => [l.productId, 0])))}>
            Clear all
          </Button>
        </div>
        <ul className="divide-y divide-stroke-soft rounded-md border border-stroke-soft">
          {remainingLines.map((l) => {
            const p = data.products.find((x) => x.id === l.productId);
            const rem = l.qty - l.receivedQty;
            const err = errors[l.productId];
            return (
              <li key={l.productId} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                {p && <ProductThumb thumb={p.thumb} category={p.category} size="sm" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-strong">{p?.name}</p>
                  <p className="text-xs text-text-sub">
                    Ordered {l.qty} · received {l.receivedQty} · <span className="font-medium text-text-strong">{rem} outstanding</span> · {p?.stock ?? 0} on hand now
                  </p>
                </div>
                <div>
                  <QuantityInput
                    aria-label={`Quantity received for ${p?.name}`}
                    value={qtys[l.productId] ?? 0}
                    onChange={(v) => setQtys((s) => ({ ...s, [l.productId]: v }))}
                    min={0}
                    max={rem}
                    invalid={!!err}
                    size="sm"
                    className="w-[128px]"
                  />
                  {err && (
                    <p role="alert" className="mt-1 text-xs text-error-dark">
                      {err}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {partial && total > 0 && (
          <p className="flex gap-2 text-xs text-text-sub">
            <WarningCircle className="size-4 shrink-0 text-text-soft" />
            The order will be marked Partially received. You can receive the remaining {fmt.int(outstanding - total)} units later.
          </p>
        )}
      </div>
    </Modal>
  );
}

const CANCEL_REASONS = ["Supplier can't fulfil", "Ordered by mistake", "Found a better price", "Duplicate order", "Other"];

function CancelDialog(props: PODialogProps) {
  return props.open ? <CancelBody {...props} /> : null;
}

function CancelBody({ open, onOpenChange, po }: PODialogProps) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const { run } = useAsyncAction();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="danger"
      icon={<Xmark />}
      title={`Cancel ${po.number}?`}
      description="The supplier would be notified in a live store (simulated here). No stock will be received for this order."
      confirmLabel="Cancel order"
      cancelLabel="Keep order"
      onConfirm={async () => {
        setTried(true);
        if (!reason) return false;
        const r = await run(() => useApp.getState().cancelPO(po.id, [reason, note.trim()].filter(Boolean).join(" — ")), { success: { title: `${po.number} cancelled` }, error: "Couldn't cancel the order" });
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
  );
}
