"use client";

import { Check, InfoCircle, NavArrowLeft, NavArrowRight, Page, Plus, Sparks, Trash, Truck, WarningCircle, WarningTriangle } from "iconoir-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { stockStatus } from "@/lib/domain";
import { fdate, fmt } from "@/lib/format";
import { useOnOrder, useQueryState, useRecommendations } from "@/lib/hooks";
import { simulateRequest } from "@/lib/simulate";
import { useApp, useData } from "@/lib/store/app-store";
import { toast } from "@/lib/store/toast-store";
import type { PODraft } from "@/lib/types";
import { addDays, cn, isoDate } from "@/lib/utils";
import { ProductThumb } from "@/components/domain/product-thumb";
import { StockBadge } from "@/components/domain/status";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Monogram } from "@/components/ui/display";
import { Field, Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { QuantityInput } from "@/components/ui/quantity-input";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Banner, EmptyState, Skeleton } from "@/components/ui/states";

const STEPS = [
  { n: 1, title: "Supplier & products", hint: "Choose who you're ordering from and what" },
  { n: 2, title: "Quantities & costs", hint: "Check quantities, costs and totals" },
  { n: 3, title: "Review & create", hint: "Delivery details, then save or submit" },
];

function newDraft(supplierId: string | null, leadTime: number, address: string): PODraft {
  return { editingId: null, supplierId, lines: [], expectedAt: isoDate(addDays(new Date(), leadTime)), deliverTo: address, reference: "", notes: "", source: "manual", dirty: false };
}

export function POWizardPage() {
  const data = useData();
  const router = useRouter();
  const q = useQueryState();
  const draft = data.poDraft;
  const step = Math.min(3, Math.max(1, Number(q.get("step") || 1)));
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [simulateFail, setSimulateFail] = useState(false);
  const [busy, setBusy] = useState<null | "draft" | "submit">(null);
  const [submitError, setSubmitError] = useState<null | "draft" | "submit">(null);

  // Initialise the working draft once: edit an existing PO, start for a supplier, or resume.
  useEffect(() => {
    const st = useApp.getState();
    const d = st.stores[st.activeStoreId];
    if (!d) return;
    const editId = q.get("edit");
    const supplierParam = q.get("supplier");
    if (editId) {
      const po = d.purchaseOrders.find((p) => p.id === editId && p.status === "draft");
      if (po && d.poDraft?.editingId !== editId) {
        st.setPoDraft({
          editingId: po.id,
          supplierId: po.supplierId,
          lines: po.lines.map((l) => ({ productId: l.productId, qty: l.qty, unitCost: l.unitCost })),
          expectedAt: po.expectedAt ? isoDate(new Date(po.expectedAt)) : isoDate(addDays(new Date(), 7)),
          deliverTo: po.deliverTo,
          reference: po.reference,
          notes: po.notes,
          source: "manual",
          dirty: false,
        });
      }
    } else if (supplierParam) {
      const s = d.suppliers.find((x) => x.id === supplierParam);
      if (!d.poDraft || d.poDraft.lines.length === 0) st.setPoDraft(newDraft(supplierParam, s?.leadTimeDays ?? 7, d.profile.address));
    } else if (!d.poDraft) {
      st.setPoDraft(newDraft(null, 7, d.profile.address));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draft) {
    return (
      <>
        <Skeleton className="mb-2 h-4 w-40" />
        <Skeleton className="mb-6 h-8 w-72" />
        <Skeleton className="h-[420px] rounded-lg" />
      </>
    );
  }

  const supplier = data.suppliers.find((s) => s.id === draft.supplierId) ?? null;
  const subtotal = draft.lines.reduce((s, l) => s + (Number.isFinite(l.qty) ? l.qty : 0) * (Number.isFinite(l.unitCost) ? l.unitCost : 0), 0);
  const tax = subtotal * data.profile.taxRate;
  const total = subtotal + tax;
  const lineErrors = Object.fromEntries(
    draft.lines.map((l) => [
      l.productId,
      !Number.isFinite(l.qty) || !Number.isInteger(l.qty) ? "Enter a whole number" : l.qty < 1 ? "At least 1" : l.qty > 9999 ? "Max 9,999" : !Number.isFinite(l.unitCost) || l.unitCost <= 0 ? "Enter a unit cost" : null,
    ]),
  );
  const step1Error = !supplier ? "Choose a supplier to continue" : draft.lines.length === 0 ? "Add at least one product to continue" : supplier.status !== "active" ? `${supplier.name} is on hold — choose another supplier` : null;
  const step2Error = Object.values(lineErrors).some(Boolean) ? "Fix the highlighted quantities to continue" : draft.lines.length === 0 ? "Add at least one product" : null;
  const dateError = !draft.expectedAt ? "Choose a delivery date" : draft.expectedAt < isoDate(new Date()) ? "Delivery date can't be in the past" : null;
  const step3Error = dateError || (!draft.deliverTo.trim() ? "Add a delivery address" : null);
  const canReach = (n: number) => n === 1 || (n === 2 && !step1Error) || (n === 3 && !step1Error && !step2Error);

  const go = (n: number) => q.set({ step: n === 1 ? null : n }, { push: true });
  const next = () => {
    setAttempted((a) => ({ ...a, [step]: true }));
    if (step === 1 && step1Error) return;
    if (step === 2 && step2Error) return;
    go(step + 1);
  };

  const commit = async (mode: "draft" | "submit") => {
    setAttempted((a) => ({ ...a, 3: true }));
    if (mode === "submit" && (step1Error || step2Error || step3Error)) return false;
    if (mode === "draft" && (step1Error && !supplier)) return false;
    setBusy(mode);
    setSubmitError(null);
    try {
      await simulateRequest({ ms: mode === "submit" ? 1100 : 600, forceFail: mode === "submit" && simulateFail });
      const id = useApp.getState().commitPoDraft(mode);
      const po = useApp.getState().stores[useApp.getState().activeStoreId]?.purchaseOrders.find((p) => p.id === id);
      if (mode === "draft") toast.success(`Draft ${po?.number} saved`, "You can edit and submit it any time.");
      else if (po?.status === "pending_approval") toast.warning(`${po.number} sent for approval`, `Orders over ${fmt.money0(data.profile.approvalThreshold)} need approval before they go to the supplier.`);
      else toast.success(`${po?.number} submitted`, `Simulated send to ${supplier?.name} — no real order was placed.`);
      setSimulateFail(false);
      router.push(`/purchase-orders/${id}`);
      return true;
    } catch {
      setSubmitError(mode);
      toast.error(mode === "submit" ? "Order wasn't submitted" : "Draft wasn't saved", "Simulated network error. Your draft is kept — try again.");
      return true;
    } finally {
      setBusy(null);
    }
  };

  const title = draft.editingId ? `Edit ${data.purchaseOrders.find((p) => p.id === draft.editingId)?.number ?? "draft"}` : "New purchase order";

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchase orders", href: "/purchase-orders" }, { label: title }]}
        title={title}
        meta={draft.dirty && <span className="rounded-full bg-warning-mute px-2 py-0.5 text-xs text-warning-dark">Unsaved draft</span>}
        description={
          draft.source === "smart_ordering"
            ? "Prefilled from smart ordering recommendations."
            : draft.source === "product"
              ? "Prefilled from a product reorder suggestion."
              : "Your progress is kept if you leave this page."
        }
        actions={
          <Button variant="ghost" leftIcon={<Trash />} onClick={() => (draft.lines.length || draft.dirty ? setConfirmDiscard(true) : router.push("/purchase-orders"))}>
            Discard
          </Button>
        }
      />

      <ol className="mb-6 grid gap-2 sm:grid-cols-3" aria-label="Steps">
        {STEPS.map((s) => {
          const done = s.n < step;
          const current = s.n === step;
          const reachable = canReach(s.n);
          return (
            <li key={s.n}>
              <button
                type="button"
                disabled={!reachable && !done}
                onClick={() => (reachable || done) && go(s.n)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-md border px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed",
                  current ? "border-primary-base/30 bg-bg-default shadow-xs ring-[3px] ring-primary-base/8" : "border-stroke-soft bg-bg-default/60 hover:bg-bg-default",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    done ? "bg-primary-base text-white" : current ? "bg-primary-mute text-primary-base ring-1 ring-primary-base/30" : "bg-bg-soft text-text-sub",
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={2.5} /> : s.n}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-sm font-medium", current || done ? "text-text-strong" : "text-text-sub")}>{s.title}</span>
                  <span className="block truncate text-xs text-text-sub">{s.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {submitError && (
        <Banner
          tone="error"
          icon={<WarningCircle />}
          className="mb-4"
          title={submitError === "submit" ? "The order wasn't submitted" : "The draft wasn't saved"}
          action={
            <Button size="sm" variant="secondary" loading={!!busy} onClick={() => commit(submitError)}>
              {submitError === "submit" ? "Retry submit" : "Retry save"}
            </Button>
          }
        >
          A simulated network error interrupted the request. Nothing was sent and your draft is intact.
        </Banner>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {step === 1 && <StepProducts draft={draft} error={attempted[1] ? step1Error : null} />}
          {step === 2 && <StepQuantities draft={draft} errors={lineErrors} showErrors={!!attempted[2]} />}
          {step === 3 && <StepReview draft={draft} showErrors={!!attempted[3]} dateError={dateError} />}
        </div>
        <div>
          <Card className="xl:sticky xl:top-24">
            <CardHeader title="Order summary" description={supplier ? `${supplier.name} · ${supplier.leadTimeDays}-day lead time` : "No supplier selected"} />
            <CardBody>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-sub">Items</dt>
                  <dd className="tnum">{draft.lines.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-sub">Units</dt>
                  <dd className="tnum">{fmt.int(draft.lines.reduce((s, l) => s + (Number.isFinite(l.qty) ? l.qty : 0), 0))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-sub">Subtotal</dt>
                  <dd className="tnum">{fmt.money(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-sub">Est. tax ({fmt.pct(data.profile.taxRate, 2)})</dt>
                  <dd className="tnum">{fmt.money(tax)}</dd>
                </div>
                <div className="flex justify-between border-t border-stroke-soft pt-2 text-base font-medium">
                  <dt>Estimated total</dt>
                  <dd className="tnum">{fmt.money(total)}</dd>
                </div>
              </dl>
              {supplier && subtotal > 0 && subtotal < supplier.minimumOrder && (
                <p className="mt-3 flex gap-2 rounded-sm bg-warning-mute px-3 py-2 text-xs text-warning-dark">
                  <WarningTriangle className="size-4 shrink-0 text-warning-base" />
                  Below {supplier.name}&apos;s {fmt.money0(supplier.minimumOrder)} minimum order.
                </p>
              )}
              {subtotal > data.profile.approvalThreshold && (
                <p className="mt-3 flex gap-2 rounded-sm bg-info-mute px-3 py-2 text-xs text-info-dark">
                  <InfoCircle className="size-4 shrink-0 text-info-base" />
                  Over the {fmt.money0(data.profile.approvalThreshold)} threshold — this order will need approval before it&apos;s sent.
                </p>
              )}
              <div className="mt-5 flex flex-col gap-2">
                {step < 3 ? (
                  <Button variant="primary" size="lg" rightIcon={<NavArrowRight />} onClick={next}>
                    Continue to {STEPS[step].title.toLowerCase()}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="lg"
                      loading={busy === "submit"}
                      disabled={!!busy}
                      onClick={() => {
                        setAttempted((a) => ({ ...a, 3: true }));
                        if (!step1Error && !step2Error && !step3Error) setConfirmSubmit(true);
                      }}
                    >
                      Submit order
                    </Button>
                    <Button variant="secondary" size="lg" loading={busy === "draft"} disabled={!!busy || !supplier || draft.lines.length === 0} onClick={() => commit("draft")}>
                      Save as draft
                    </Button>
                  </>
                )}
                {step > 1 && (
                  <Button variant="ghost" leftIcon={<NavArrowLeft />} onClick={() => go(step - 1)}>
                    Back
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        icon={<Truck />}
        title={subtotal > data.profile.approvalThreshold ? "Submit for approval?" : `Send order to ${supplier?.name}?`}
        description={
          subtotal > data.profile.approvalThreshold
            ? `${fmt.money(total)} is over your ${fmt.money0(data.profile.approvalThreshold)} approval threshold, so it'll wait for approval before it's sent. This is a demo — nothing is sent.`
            : `${fmt.plural(draft.lines.length, "item")} · ${fmt.money(total)}. This is a demo — the supplier won't receive a real order.`
        }
        confirmLabel={subtotal > data.profile.approvalThreshold ? "Submit for approval" : "Submit order"}
        onConfirm={() => commit("submit")}
      >
        <label className="flex cursor-pointer items-center gap-2 rounded-sm bg-bg-surface px-3 py-2 text-sm text-text-sub">
          <Checkbox checked={simulateFail} onCheckedChange={setSimulateFail} aria-label="Simulate a submission failure" />
          Simulate a submission failure (demo)
        </label>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        tone="danger"
        icon={<Trash />}
        title="Discard this purchase order?"
        description={draft.editingId ? "Your unsaved edits will be lost. The saved draft stays as it was." : "The items you've added will be removed. This can't be undone."}
        confirmLabel="Discard"
        cancelLabel="Keep working"
        onConfirm={() => {
          useApp.getState().setPoDraft(null);
          router.push("/purchase-orders");
        }}
      />
    </>
  );
}

function StepProducts({ draft, error }: { draft: PODraft; error: string | null }) {
  const data = useData();
  const recs = useRecommendations();
  const onOrder = useOnOrder();
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const supplier = data.suppliers.find((s) => s.id === draft.supplierId) ?? null;
  const recMap = useMemo(() => new Map(recs.map((r) => [r.product.id, r])), [recs]);
  const inDraft = new Set(draft.lines.map((l) => l.productId));
  const catalog = useMemo(() => {
    const n = search.toLowerCase().trim();
    return data.products
      .filter((p) => !p.archived && (showAll || p.supplierId === draft.supplierId))
      .filter((p) => !n || `${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(n))
      .sort((a, b) => (recMap.has(b.id) ? 1 : 0) - (recMap.has(a.id) ? 1 : 0) || a.name.localeCompare(b.name));
  }, [data.products, showAll, draft.supplierId, search, recMap]);
  const suggested = catalog.filter((p) => recMap.has(p.id) && !inDraft.has(p.id));
  const actions = useApp.getState();

  const add = (pid: string) => {
    const p = data.products.find((x) => x.id === pid)!;
    actions.upsertDraftLine(pid, recMap.get(pid)?.qty ?? p.packSize, p.unitCost);
  };

  return (
    <Card>
      <CardHeader title="1. Choose supplier and products" description="Products are suggested from your reorder recommendations first." />
      <CardBody className="space-y-4">
        <Field label="Supplier" error={error === "Choose a supplier to continue" || error?.includes("on hold") ? error : undefined}>
          {(f) => (
            <Select
              id={f.id}
              invalid={f.invalid}
              aria-describedby={f.describedBy}
              value={draft.supplierId ?? undefined}
              placeholder="Choose a supplier…"
              onValueChange={(v) => {
                const s = data.suppliers.find((x) => x.id === v);
                actions.updatePoDraft({ supplierId: v, expectedAt: isoDate(addDays(new Date(), s?.leadTimeDays ?? 7)) });
              }}
              options={data.suppliers
                .filter((s) => s.status !== "archived")
                .map((s) => ({
                  value: s.id,
                  label: s.name,
                  description: s.status === "on_hold" ? "On hold — can't take new orders" : `${s.leadTimeDays}-day lead time · ${s.paymentTerms} · ${data.products.filter((p) => p.supplierId === s.id && !p.archived).length} products`,
                  disabled: s.status !== "active",
                }))}
            />
          )}
        </Field>
        {data.suppliers.length === 0 && (
          <Banner tone="info" icon={<Truck />} action={<Button asChild size="sm" variant="secondary"><Link href="/suppliers">Add a supplier</Link></Button>}>
            You don&apos;t have any suppliers yet.
          </Banner>
        )}
        {supplier && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput value={search} onChange={setSearch} placeholder={`Search ${showAll ? "all products" : `${supplier.name}'s catalog`}`} className="flex-1" />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-text-sub">
                <Checkbox checked={showAll} onCheckedChange={setShowAll} aria-label="Show products from other suppliers" />
                Include other suppliers&apos; products
              </label>
            </div>
            {suggested.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-primary-mute/60 px-4 py-3 text-sm">
                <span className="text-text-strong">
                  <span className="font-medium">{suggested.length} recommended</span> for {supplier.name} based on sales velocity and stock.
                </span>
                <Button size="sm" variant="primary" leftIcon={<Plus />} onClick={() => suggested.forEach((p) => add(p.id))}>
                  Add all recommended
                </Button>
              </div>
            )}
            {error === "Add at least one product to continue" && (
              <p role="alert" className="flex items-center gap-1.5 text-sm text-error-dark">
                <WarningCircle className="size-4 text-error-base" /> {error}
              </p>
            )}
            <div className="overflow-hidden rounded-md border border-stroke-soft">
              {catalog.length === 0 ? (
                <EmptyState compact icon={<Page />} title={search ? `No products match “${search}”` : "No products linked to this supplier"} description="Include other suppliers' products, or link products from Inventory." />
              ) : (
                <ul className="max-h-[520px] divide-y divide-stroke-soft overflow-y-auto scrollbar-thin">
                  {catalog.map((p) => {
                    const r = recMap.get(p.id);
                    const added = inDraft.has(p.id);
                    const incoming = onOrder.get(p.id)?.qty;
                    return (
                      <li key={p.id} className={cn("flex items-center gap-3 px-4 py-2.5", added && "bg-primary-mute/30")}>
                        <ProductThumb thumb={p.thumb} category={p.category} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-strong">{p.name}</p>
                          <p className="text-xs text-text-sub">
                            {p.size} · {p.stock} on hand · {fmt.money(p.unitCost)}/unit{incoming ? ` · ${incoming} on order` : ""}
                          </p>
                        </div>
                        <span className="hidden sm:inline-flex">
                          <StockBadge status={stockStatus(p)} size="sm" />
                        </span>
                        {r && !added && <span className="hidden text-xs font-medium text-primary-base md:inline">Suggest {r.qty}</span>}
                        <Button size="sm" variant={added ? "soft" : "secondary"} leftIcon={added ? <Check /> : <Plus />} onClick={() => (added ? actions.removeDraftLine(p.id) : add(p.id))} aria-pressed={added}>
                          {added ? "Added" : "Add"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function StepQuantities({ draft, errors, showErrors }: { draft: PODraft; errors: Record<string, string | null>; showErrors: boolean }) {
  const data = useData();
  const recs = useRecommendations();
  const actions = useApp.getState();
  const recMap = new Map(recs.map((r) => [r.product.id, r]));
  const supplier = data.suppliers.find((s) => s.id === draft.supplierId);
  const more = recs.filter((r) => r.supplier?.id === draft.supplierId && r.coverage === "ok" && !r.dismissedAt && !draft.lines.some((l) => l.productId === r.product.id));
  if (draft.lines.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Page />} title="This order has no products" description="Go back to step 1 to add products from your supplier's catalog." />
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden">
      <CardHeader title="2. Review quantities and costs" description="Quantities round to case sizes by default; you can override them." />
      {more.length > 0 && supplier && (
        <div className="mx-5 mb-4 flex flex-col gap-3 rounded-md bg-primary-mute/60 px-4 py-3 text-sm sm:flex-row sm:items-center">
          <Sparks className="size-5 shrink-0 text-primary-base" />
          <p className="flex-1 text-text-strong">
            <span className="font-medium">
              {more.length} more {more.length === 1 ? "product" : "products"} from {supplier.name} {more.length === 1 ? "needs" : "need"} reordering
            </span>
            <span className="text-text-sub">
              {" "}
              · {more
                .slice(0, 3)
                .map((r) => r.product.name)
                .join(", ")}
              {more.length > 3 ? "…" : ""} · combining saves a delivery
            </span>
          </p>
          <Button size="sm" variant="primary" leftIcon={<Plus />} onClick={() => more.forEach((r) => actions.upsertDraftLine(r.product.id, r.qty, r.unitCost))}>
            Add {more.length === 1 ? "it" : `all ${more.length}`}
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-y border-stroke-soft bg-bg-surface text-left text-xs text-text-sub">
              <th scope="col" className="px-5 py-2 font-medium">Product</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">On hand</th>
              <th scope="col" className="px-3 py-2 font-medium">Quantity</th>
              <th scope="col" className="px-3 py-2 font-medium">Unit cost</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Line total</th>
              <th scope="col" className="w-10 px-3 py-2">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {draft.lines.map((l) => {
              const p = data.products.find((x) => x.id === l.productId)!;
              const err = showErrors || !Number.isFinite(l.qty) ? errors[l.productId] : null;
              const r = recMap.get(l.productId);
              const offCase = Number.isFinite(l.qty) && l.qty > 0 && p.packSize > 1 && l.qty % p.packSize !== 0;
              return (
                <tr key={l.productId} className="border-b border-stroke-soft align-top">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumb thumb={p.thumb} category={p.category} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-text-strong">{p.name}</p>
                        <p className="text-xs text-text-sub">
                          {p.size} · case of {p.packSize}
                          {r && <span className="text-primary-base"> · suggested {r.qty}</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tnum text-text-sub">{p.stock}</td>
                  <td className="px-3 py-3">
                    <QuantityInput
                      aria-label={`Quantity for ${p.name}`}
                      value={l.qty}
                      onChange={(v) => actions.upsertDraftLine(l.productId, v)}
                      min={1}
                      max={9999}
                      step={p.packSize}
                      invalid={!!err}
                      size="sm"
                      className="w-[132px]"
                    />
                    {err ? (
                      <p role="alert" className="mt-1 text-xs text-error-dark">
                        {err}
                      </p>
                    ) : offCase ? (
                      <p className="mt-1 text-xs text-text-sub">Not a full case of {p.packSize}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <MoneyInput label={`Unit cost for ${p.name}`} value={l.unitCost} onChange={(v) => actions.upsertDraftLine(l.productId, l.qty, v)} />
                  </td>
                  <td className="px-3 py-3 text-right font-medium tnum">{Number.isFinite(l.qty) && Number.isFinite(l.unitCost) ? fmt.money(l.qty * l.unitCost) : "—"}</td>
                  <td className="px-3 py-3">
                    <Button size="sm" variant="ghost" icon aria-label={`Remove ${p.name}`} onClick={() => actions.removeDraftLine(l.productId)}>
                      <Trash />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StepReview({ draft, showErrors, dateError }: { draft: PODraft; showErrors: boolean; dateError: string | null }) {
  const data = useData();
  const actions = useApp.getState();
  const supplier = data.suppliers.find((s) => s.id === draft.supplierId);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="3. Delivery details" description="Shared with the supplier when the order is sent (simulated)." />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Expected delivery" error={showErrors ? (dateError ?? undefined) : undefined} hint={supplier ? `${supplier.name} usually delivers in ${supplier.leadTimeDays} days (${fdate.short(addDays(new Date(), supplier.leadTimeDays))}).` : undefined}>
              {(f) => <Input id={f.id} type="date" invalid={f.invalid} aria-describedby={f.describedBy} min={isoDate(new Date())} value={draft.expectedAt} onChange={(e) => actions.updatePoDraft({ expectedAt: e.target.value })} />}
            </Field>
            <Field label="Your reference" optional>
              {(f) => <Input id={f.id} placeholder="e.g. Holiday restock" value={draft.reference} onChange={(e) => actions.updatePoDraft({ reference: e.target.value })} />}
            </Field>
          </div>
          <Field label="Deliver to" error={showErrors && !draft.deliverTo.trim() ? "Add a delivery address" : undefined}>
            {(f) => <Textarea id={f.id} rows={2} invalid={f.invalid} value={draft.deliverTo} onChange={(e) => actions.updatePoDraft({ deliverTo: e.target.value })} />}
          </Field>
          <Field label="Notes to supplier" optional>
            {(f) => <Textarea id={f.id} rows={3} placeholder="Delivery window, dock instructions, substitutions…" value={draft.notes} onChange={(e) => actions.updatePoDraft({ notes: e.target.value })} />}
          </Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Items" description={supplier ? `Ordering from ${supplier.name}` : undefined} action={supplier && <Monogram text={supplier.monogram} color={supplier.color} size="sm" />} />
        <ul className="divide-y divide-stroke-soft border-t border-stroke-soft">
          {draft.lines.map((l) => {
            const p = data.products.find((x) => x.id === l.productId)!;
            return (
              <li key={l.productId} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <ProductThumb thumb={p.thumb} category={p.category} size="xs" />
                <span className="min-w-0 flex-1 truncate text-text-strong">
                  {p.name} <span className="text-text-sub">· {p.size}</span>
                </span>
                <span className="text-text-sub tnum">
                  {l.qty} × {fmt.money(l.unitCost)}
                </span>
                <span className="w-24 text-right font-medium tnum">{fmt.money(l.qty * l.unitCost)}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

/** Currency input that keeps what the user types and normalises to cents on blur. */
function MoneyInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [text, setText] = useState(Number.isFinite(value) ? value.toFixed(2) : "");
  return (
    <Input
      size="sm"
      type="number"
      step="0.01"
      inputMode="decimal"
      leading="$"
      aria-label={label}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value === "" ? Number.NaN : Number(e.target.value));
      }}
      onBlur={() => {
        const n = Number(text);
        if (text !== "" && Number.isFinite(n)) setText(n.toFixed(2));
      }}
      className="w-[110px]"
      invalid={!Number.isFinite(value) || value <= 0}
    />
  );
}
