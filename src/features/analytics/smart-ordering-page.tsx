"use client";

import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { CheckCircle, Eye, InfoCircle, Page, Sparks, Truck, Undo, WarningTriangle, Xmark } from "iconoir-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { unitsSeries } from "@/lib/analytics";
import { fdate, fmt } from "@/lib/format";
import { useFirstLoad, useHistory, useQueryState, useRecommendations } from "@/lib/hooks";
import { isOrderable, stockoutRisk, type Recommendation } from "@/lib/recommendations";
import { simulateRequest } from "@/lib/simulate";
import { useApp, useData } from "@/lib/store/app-store";
import { toast } from "@/lib/store/toast-store";
import { CATEGORIES } from "@/lib/types";
import { addDays, cn, groupBy, isoDate } from "@/lib/utils";
import { SERIES, TimeSeriesChart } from "@/components/charts/charts";
import { ProductThumb } from "@/components/domain/product-thumb";
import { PriorityBadge } from "@/components/domain/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, selectionColumn } from "@/components/ui/data-table";
import { Drawer, Modal } from "@/components/ui/dialog";
import { KpiCard, Monogram } from "@/components/ui/display";
import { FilterMenu } from "@/components/ui/filter-menu";
import { Tooltip } from "@/components/ui/menu";
import { PageHeader } from "@/components/ui/page-header";
import { QuantityInput } from "@/components/ui/quantity-input";
import { Select } from "@/components/ui/select";
import { Banner, EmptyState, NoResults } from "@/components/ui/states";
import { SegmentedControl } from "@/components/ui/tabs";
import { AnalyticsTabs } from "@/features/analytics/analytics-page";
import { SupplierDialog } from "@/features/inventory/product-dialogs";

type Urgency = "all" | "critical" | "high" | "medium";
type SortKey = "risk" | "cost" | "days";

export function SmartOrderingPage() {
  const data = useData();
  const recs = useRecommendations();
  const router = useRouter();
  const q = useQueryState();
  const loading = useFirstLoad("smart", 650);
  const urgency = (q.get("urgency") || "all") as Urgency;
  const cats = q.getList("category");
  const sups = q.getList("supplier");
  const sort = (q.get("sort") || "risk") as SortKey;
  const focus = q.get("focus");
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [showDismissed, setShowDismissed] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [created, setCreated] = useState<string[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [assignFor, setAssignFor] = useState<string | null>(null);

  const drafts = useMemo(() => {
    const m = new Map<string, { id: string; number: string }>();
    for (const po of data.purchaseOrders) if (po.status === "draft") for (const l of po.lines) m.set(l.productId, { id: po.id, number: po.number });
    return m;
  }, [data.purchaseOrders]);

  const active = recs.filter((r) => !r.dismissedAt);
  const dismissed = recs.filter((r) => r.dismissedAt);
  const filtered = useMemo(() => {
    const list = active.filter((r) => {
      if (urgency !== "all" && r.priority !== urgency) return false;
      if (cats.length && !cats.includes(r.product.category)) return false;
      if (sups.length && !sups.includes(r.supplier?.id ?? "none")) return false;
      return true;
    });
    return list.sort((a, b) => (sort === "cost" ? b.total - a.total : sort === "days" ? a.daysLeft - b.daysLeft : stockoutRisk(b) - stockoutRisk(a)));
  }, [active, urgency, cats, sups, sort]);

  const selectable = (r: Recommendation) => isOrderable(r) && !drafts.has(r.product.id);
  const selected = filtered.filter((r) => selection[r.product.id] && selectable(r));
  const selectedTotal = selected.reduce((s, r) => s + r.total, 0);
  const groups = groupBy(selected, (r) => r.supplier!.id);
  const critical = active.filter((r) => r.priority === "critical");
  const coverageIssues = active.filter((r) => !isOrderable(r));
  const orderable = active.filter(isOrderable);
  const focused = recs.find((r) => r.product.id === focus) ?? null;

  const create = async () => {
    setCreating(true);
    setCreateError(false);
    try {
      await simulateRequest({ ms: 900 });
      const supplierIds = Object.keys(groups);
      if (supplierIds.length === 1) {
        const s = data.suppliers.find((x) => x.id === supplierIds[0])!;
        useApp.getState().setPoDraft({
          editingId: null,
          supplierId: s.id,
          lines: groups[s.id].map((r) => ({ productId: r.product.id, qty: r.qty, unitCost: r.unitCost })),
          expectedAt: isoDate(addDays(new Date(), s.leadTimeDays)),
          deliverTo: data.profile.address,
          reference: "Smart ordering",
          notes: "",
          source: "smart_ordering",
          dirty: true,
        });
        toast.success("Items carried into a purchase order", `Review quantities for ${s.name}, then save or submit.`);
        router.push("/purchase-orders/new?step=2");
        return;
      }
      const ids = useApp.getState().createDraftPOs(supplierIds.map((sid) => ({ supplierId: sid, lines: groups[sid].map((r) => ({ productId: r.product.id, qty: r.qty, unitCost: r.unitCost })) })));
      setSelection({});
      setConfirm(false);
      setCreated(ids);
    } catch {
      setCreateError(true);
    } finally {
      setCreating(false);
    }
  };

  const columns = useMemo<ColumnDef<Recommendation, unknown>[]>(
    () => [
      selectionColumn<Recommendation>(),
      {
        id: "product",
        accessorFn: (r) => r.product.name,
        header: "Product",
        meta: { className: "min-w-[260px]" },
        cell: ({ row: { original: r } }) => {
          const d = drafts.get(r.product.id);
          return (
            <div className="flex items-start gap-3">
              <ProductThumb thumb={r.product.thumb} category={r.product.category} size="md" />
              <div className="min-w-0">
                <Link href={`/inventory/${r.product.id}`} className="block truncate font-medium text-text-strong hover:underline underline-offset-2">
                  {r.product.name}
                </Link>
                <p className="text-xs text-text-sub">
                  {r.product.size} · {shortReason(r)}
                </p>
                {r.coverage !== "ok" && (
                  <button type="button" onClick={() => setAssignFor(r.product.id)} className="mt-0.5 flex cursor-pointer items-center gap-1 text-xs font-medium text-warning-dark hover:underline xl:hidden">
                    <WarningTriangle className="size-3.5 text-warning-base" />
                    {r.coverage === "no_supplier" ? "No supplier — assign one" : `${r.supplier?.name} on hold — reassign`}
                  </button>
                )}
                {d && (
                  <Link href={`/purchase-orders/${d.id}`} className="mt-1 inline-flex">
                    <Badge tone="info" size="sm" icon={<Page />}>
                      In draft {d.number}
                    </Badge>
                  </Link>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "stock",
        accessorFn: (r) => r.product.stock,
        header: "Stock",
        meta: { align: "right" },
        cell: ({ row: { original: r } }) => (
          <div>
            <span className={cn("font-medium", r.product.stock === 0 && "text-error-dark")}>{r.product.stock}</span>
            <span className="block text-2xs text-text-soft">min {r.product.reorderPoint}</span>
          </div>
        ),
      },
      { id: "velocity", accessorFn: (r) => r.velocity, header: "Avg / day", meta: { align: "right", hideBelow: "2xl" }, cell: ({ getValue }) => fmt.dec1(Number(getValue())) },
      {
        id: "days",
        accessorFn: (r) => r.daysLeft,
        header: "Days left",
        meta: { hideBelow: "md" },
        cell: ({ row: { original: r } }) => <DaysBar daysLeft={r.daysLeft} leadTime={r.leadTime} />,
      },
      {
        id: "qty",
        accessorFn: (r) => r.qty,
        header: "Order qty",
        cell: ({ row: { original: r } }) => (
          <div>
            <QuantityInput
              aria-label={`Order quantity for ${r.product.name}`}
              value={r.qty}
              onChange={(v) => {
                if (Number.isInteger(v) && v > 0) useApp.getState().setRecQty(r.product.id, v === r.suggestedQty ? null : v);
              }}
              min={1}
              step={r.product.packSize}
              size="sm"
              className="w-[118px]"
              disabled={!isOrderable(r)}
            />
            {r.qty !== r.suggestedQty && (
              <button type="button" onClick={() => useApp.getState().setRecQty(r.product.id, null)} className="mt-0.5 cursor-pointer text-2xs text-primary-base hover:underline">
                Reset to {r.suggestedQty}
              </button>
            )}
          </div>
        ),
      },
      {
        id: "supplier",
        accessorFn: (r) => r.supplier?.name ?? "",
        header: "Supplier",
        meta: { hideBelow: "xl", className: "max-w-[180px]" },
        cell: ({ row: { original: r } }) =>
          r.coverage === "ok" ? (
            <div className="min-w-0">
              <span className="block truncate text-text-strong">{r.supplier!.name}</span>
              <span className="block text-xs text-text-sub">{r.leadTime}-day lead time</span>
            </div>
          ) : (
            <button type="button" onClick={() => setAssignFor(r.product.id)} className="flex cursor-pointer items-start gap-1.5 text-left text-xs text-warning-dark hover:underline">
              <WarningTriangle className="mt-px size-3.5 shrink-0 text-warning-base" />
              {r.coverage === "no_supplier" ? "No supplier — assign one" : `${r.supplier?.name} on hold — reassign`}
            </button>
          ),
      },
      {
        id: "total",
        accessorFn: (r) => r.total,
        header: "Est. cost",
        meta: { align: "right" },
        cell: ({ row: { original: r } }) => (
          <div>
            <span className="font-medium">{fmt.money0(r.total)}</span>
            <span className="block text-2xs text-text-soft">{fmt.money(r.unitCost)} ea</span>
          </div>
        ),
      },
      { id: "priority", accessorFn: (r) => ({ critical: 0, high: 1, medium: 2 })[r.priority], header: "Priority", cell: ({ row: { original: r } }) => <PriorityBadge priority={r.priority} /> },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        meta: { align: "right", className: "w-[84px]" },
        cell: ({ row: { original: r } }) => (
          <div className="flex justify-end gap-0.5">
            <Tooltip content="Why this recommendation?">
              <Button size="sm" variant="ghost" icon aria-label={`Explain recommendation for ${r.product.name}`} onClick={() => q.set({ focus: r.product.id })}>
                <InfoCircle />
              </Button>
            </Tooltip>
            <Tooltip content="Dismiss">
              <Button
                size="sm"
                variant="ghost"
                icon
                aria-label={`Dismiss recommendation for ${r.product.name}`}
                onClick={() => {
                  useApp.getState().dismissRec(r.product.id);
                  setSelection((s) => ({ ...s, [r.product.id]: false }));
                  toast.info("Recommendation dismissed", r.product.name, { action: { label: "Undo", onClick: () => useApp.getState().restoreRec(r.product.id) } });
                }}
              >
                <Xmark />
              </Button>
            </Tooltip>
          </div>
        ),
      },
    ],
    [drafts, q],
  );

  const clear = () => q.set({ urgency: null, category: null, supplier: null });

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Rule-based reorder suggestions from sales velocity, stock, open orders, lead times and target levels. Illustrative — not a machine-learning forecast."
      />
      <AnalyticsTabs active="smart" />

      {recs.length === 0 && !loading ? (
        <Card>
          <EmptyState
            icon={<CheckCircle />}
            title="No reorders needed right now"
            description={data.products.length ? "Every product is above its reorder point with enough stock to cover supplier lead times." : "Add products and record sales to get reorder suggestions."}
            action={
              <Button asChild variant="secondary">
                <Link href="/inventory">View inventory</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Recommendation summary">
            <KpiCard loading={loading} icon={<Sparks />} label="Recommendations" value={fmt.int(active.length)} sub={`${dismissed.length} dismissed`} />
            <KpiCard loading={loading} icon={<WarningTriangle />} tone="error" label="Critical" value={fmt.int(critical.length)} sub="Out, or runs out before delivery" />
            <KpiCard loading={loading} icon={<Page />} label="Est. reorder cost" value={fmt.money0(orderable.reduce((s, r) => s + r.total, 0))} sub={`${orderable.length} ready to order`} />
            <KpiCard loading={loading} icon={<Truck />} label="Suppliers involved" value={fmt.int(new Set(orderable.map((r) => r.supplier!.id)).size)} sub={`${coverageIssues.length} need a supplier`} tone={coverageIssues.length ? "warning" : undefined} />
          </section>

          {critical.length > 0 && (
            <Banner
              tone="error"
              icon={<WarningTriangle />}
              className="mt-4"
              title={`${critical.length} products will run out before a new delivery can arrive`}
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    q.set({ urgency: "critical" });
                    setSelection(Object.fromEntries(critical.filter(selectable).map((r) => [r.product.id, true])));
                  }}
                >
                  Select critical items
                </Button>
              }
            >
              {critical
                .slice(0, 3)
                .map((r) => r.product.name)
                .join(", ")}
              {critical.length > 3 ? ` and ${critical.length - 3} more` : ""}.
            </Banner>
          )}
          {coverageIssues.length > 0 && (
            <Banner tone="warning" icon={<Truck />} className="mt-3" title="Insufficient supplier coverage">
              {coverageIssues.map((r) => r.product.name).join(", ")} {coverageIssues.length === 1 ? "has" : "have"} no active supplier, so {coverageIssues.length === 1 ? "it" : "they"} can&apos;t be added to a purchase order yet.
            </Banner>
          )}

          <Card className="mt-4 overflow-hidden">
            <div className="flex flex-col gap-3 px-5 py-3.5 lg:flex-row lg:items-center">
              <SegmentedControl
                aria-label="Urgency"
                value={urgency}
                onChange={(v) => q.set({ urgency: v === "all" ? null : v })}
                options={[
                  { value: "all", label: "All", count: active.length },
                  { value: "critical", label: "Critical", count: critical.length },
                  { value: "high", label: "High", count: active.filter((r) => r.priority === "high").length },
                  { value: "medium", label: "Medium", count: active.filter((r) => r.priority === "medium").length },
                ]}
              />
              <div className="flex flex-wrap items-center gap-2">
                <FilterMenu label="Category" options={CATEGORIES.filter((c) => active.some((r) => r.product.category === c)).map((c) => ({ value: c, label: c, count: active.filter((r) => r.product.category === c).length }))} selected={cats} onChange={(v) => q.set({ category: v })} />
                <FilterMenu
                  label="Supplier"
                  options={[...new Map(active.filter((r) => r.supplier).map((r) => [r.supplier!.id, r.supplier!])).values()].map((s) => ({ value: s.id, label: s.name, count: active.filter((r) => r.supplier?.id === s.id).length }))}
                  selected={sups}
                  onChange={(v) => q.set({ supplier: v })}
                />
                <Select
                  size="sm"
                  aria-label="Sort recommendations"
                  className="h-9 w-[190px]"
                  value={sort}
                  onValueChange={(v) => q.set({ sort: v === "risk" ? null : v })}
                  options={[
                    { value: "risk", label: "Sort: stockout risk" },
                    { value: "days", label: "Sort: days left" },
                    { value: "cost", label: "Sort: reorder cost" },
                  ]}
                />
              </div>
              {dismissed.length > 0 && (
                <Button size="sm" variant="ghost" className="lg:ml-auto" leftIcon={<Eye />} onClick={() => setShowDismissed((v) => !v)} aria-expanded={showDismissed}>
                  {showDismissed ? "Hide" : "Show"} dismissed ({dismissed.length})
                </Button>
              )}
            </div>
            <DataTable
              caption="Reorder recommendations"
              data={filtered}
              columns={columns}
              getRowId={(r) => r.product.id}
              loading={loading}
              paginate={false}
              rowSelection={selection}
              onRowSelectionChange={setSelection}
              enableRowSelection={(row) => selectable(row.original)}
              onRowClick={(r) => q.set({ focus: r.product.id })}
              rowClassName={(r) => (!isOrderable(r) ? "bg-warning-mute/30" : undefined)}
              empty={active.length === 0 ? <EmptyState compact icon={<CheckCircle />} title="All recommendations dismissed" description="Restore any you want to act on from the dismissed list." /> : <NoResults onClear={clear} what="recommendations" />}
            />
            {showDismissed && dismissed.length > 0 && (
              <div className="border-t border-stroke-soft bg-bg-surface/60 px-5 py-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-text-soft">Dismissed</p>
                <ul className="divide-y divide-stroke-soft">
                  {dismissed.map((r) => (
                    <li key={r.product.id} className="flex items-center gap-3 py-2 text-sm">
                      <ProductThumb thumb={r.product.thumb} category={r.product.category} size="xs" />
                      <span className="min-w-0 flex-1 truncate text-text-strong">{r.product.name}</span>
                      <span className="hidden text-xs text-text-sub sm:inline">Dismissed {fdate.relative(r.dismissedAt!)}</span>
                      <Button size="xs" variant="secondary" leftIcon={<Undo />} onClick={() => useApp.getState().restoreRec(r.product.id)}>
                        Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          {selected.length > 0 && <div className="h-20" aria-hidden />}
        </>
      )}

      {selected.length > 0 && (
        <div className="fixed inset-x-3 bottom-3 z-30 lg:left-[280px] lg:right-8" role="region" aria-label="Selection summary">
          <div className="mx-auto flex max-w-[1100px] flex-col gap-3 rounded-lg bg-bg-strong px-5 py-3 text-white shadow-xl animate-pop-in sm:flex-row sm:items-center">
            <div className="flex-1 text-sm">
              <span className="font-medium">{fmt.plural(selected.length, "product")} selected</span>
              <span className="text-white/60"> · {fmt.plural(Object.keys(groups).length, "supplier")} · </span>
              <span className="font-medium">Est. {fmt.money(selectedTotal)}</span>
              <span className="text-white/60"> before tax</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setSelection({})}>
                Clear
              </Button>
              <Button size="sm" className="bg-white text-primary-base hover:bg-green-50" leftIcon={<Page />} onClick={() => setConfirm(true)}>
                Create purchase order{Object.keys(groups).length > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={confirm}
        onOpenChange={(o) => !creating && setConfirm(o)}
        icon={<Page />}
        width="lg"
        title={Object.keys(groups).length > 1 ? `Create ${Object.keys(groups).length} draft purchase orders?` : "Carry items into a purchase order?"}
        description={Object.keys(groups).length > 1 ? "One draft per supplier. Nothing is sent until you submit each order." : "You'll review quantities and delivery details before anything is submitted."}
        footer={
          <>
            <span className="mr-auto text-sm text-text-sub">
              Estimated total <span className="font-medium text-text-strong">{fmt.money(selectedTotal * (1 + data.profile.taxRate))}</span> incl. tax
            </span>
            <Button variant="secondary" onClick={() => setConfirm(false)} disabled={creating}>
              Cancel
            </Button>
            <Button variant="primary" loading={creating} onClick={create}>
              {createError ? "Retry" : Object.keys(groups).length > 1 ? "Create drafts" : "Continue to order"}
            </Button>
          </>
        }
      >
        {createError && (
          <Banner tone="error" icon={<WarningTriangle />} title="Purchase orders weren't created" className="mb-4">
            Simulated network error — nothing was created and your selection is kept. Select Retry.
          </Banner>
        )}
        <div className="space-y-3">
          {Object.entries(groups).map(([sid, items]) => {
            const s = items[0].supplier!;
            return (
              <div key={sid} className="rounded-md border border-stroke-soft">
                <div className="flex items-center gap-3 border-b border-stroke-soft px-4 py-2.5">
                  <Monogram text={s.monogram} color={s.color} size="sm" />
                  <span className="flex-1 text-sm font-medium text-text-strong">{s.name}</span>
                  <span className="text-sm font-medium tnum">{fmt.money(items.reduce((a, r) => a + r.total, 0))}</span>
                </div>
                <ul className="divide-y divide-stroke-soft">
                  {items.map((r) => (
                    <li key={r.product.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{r.product.name}</span>
                      <span className="text-text-sub tnum">
                        {r.qty} × {fmt.money(r.unitCost)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={!!created}
        onOpenChange={(o) => !o && setCreated(null)}
        icon={<CheckCircle />}
        title={`${created?.length ?? 0} draft purchase orders created`}
        description="Review and submit each one when you're ready. Drafts don't count as incoming stock until submitted."
        footer={
          <Button variant="primary" onClick={() => setCreated(null)}>
            Done
          </Button>
        }
      >
        <ul className="divide-y divide-stroke-soft rounded-md border border-stroke-soft">
          {(created ?? []).map((id) => {
            const po = data.purchaseOrders.find((p) => p.id === id);
            const s = data.suppliers.find((x) => x.id === po?.supplierId);
            if (!po || !s) return null;
            return (
              <li key={id}>
                <Link href={`/purchase-orders/${id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-bg-surface">
                  <Monogram text={s.monogram} color={s.color} size="sm" />
                  <span className="flex-1 text-sm">
                    <span className="font-medium text-text-strong">{po.number}</span> <span className="text-text-sub">· {s.name}</span>
                  </span>
                  <span className="text-sm font-medium text-primary-base">Review</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Modal>

      <ExplainDrawer rec={focused} onClose={() => q.set({ focus: null })} onAssign={(id) => setAssignFor(id)} />
      <SupplierDialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)} productIds={assignFor ? [assignFor] : []} current={data.products.find((p) => p.id === assignFor)?.supplierId} title="Assign a supplier" />
    </>
  );
}

function shortReason(r: Recommendation) {
  if (r.product.stock <= 0) return "Sold out";
  if (!Number.isFinite(r.daysLeft)) return "At reorder point";
  const d = Math.max(0, Math.floor(r.daysLeft));
  if (r.daysLeft < r.leadTime) return `Runs out in ~${d}d · lead time ${r.leadTime}d`;
  if (r.product.stock <= r.product.reorderPoint) return `At reorder point · ~${d}d left`;
  return `Reaches reorder point soon · ~${d}d left`;
}

function DaysBar({ daysLeft, leadTime }: { daysLeft: number; leadTime: number }) {
  const scale = Math.max(leadTime * 2, 14);
  const d = Number.isFinite(daysLeft) ? daysLeft : scale;
  const pct = Math.min(100, (d / scale) * 100);
  const lt = (leadTime / scale) * 100;
  const tone = d <= 0 || d < leadTime ? "bg-error-base" : d < leadTime + 3 ? "bg-warning-base" : "bg-info-base";
  return (
    <div className="w-[120px]">
      <div className="flex items-baseline justify-between text-sm">
        <span className={cn("font-medium tnum", d < leadTime && "text-error-dark")}>{Number.isFinite(daysLeft) ? `${Math.floor(daysLeft)} days` : "—"}</span>
        <span className="text-2xs text-text-soft">LT {leadTime}d</span>
      </div>
      <div className="relative mt-1 h-1.5 rounded-full bg-bg-subtle" role="img" aria-label={`${Math.floor(d)} days of stock vs ${leadTime}-day lead time`}>
        <div className={cn("absolute inset-y-0 left-0 rounded-full", tone)} style={{ width: `${Math.max(pct, 3)}%` }} />
        <span className="absolute -top-0.5 h-2.5 w-0.5 rounded-full bg-text-strong/50" style={{ left: `${lt}%` }} />
      </div>
    </div>
  );
}

function ExplainDrawer({ rec, onClose, onAssign }: { rec: Recommendation | null; onClose: () => void; onAssign: (id: string) => void }) {
  const history = useHistory();
  const series = useMemo(() => (rec ? unitsSeries(history, rec.product.id, 30) : []), [history, rec]);
  return (
    <Drawer
      open={!!rec}
      onOpenChange={(o) => !o && onClose()}
      title={rec ? rec.headline : ""}
      description="How this suggestion was calculated"
      footer={
        rec && (
          <>
            <Button asChild variant="secondary">
              <Link href={`/inventory/${rec.product.id}`}>Open product</Link>
            </Button>
            {!isOrderable(rec) && (
              <Button variant="primary" onClick={() => onAssign(rec.product.id)}>
                Assign supplier
              </Button>
            )}
          </>
        )
      }
    >
      {rec && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <ProductThumb thumb={rec.product.thumb} category={rec.product.category} size="lg" />
            <div>
              <p className="font-medium text-text-strong">{rec.product.name}</p>
              <p className="text-sm text-text-sub">{rec.product.size}</p>
              <div className="mt-1.5">
                <PriorityBadge priority={rec.priority} />
              </div>
            </div>
          </div>
          <p className="rounded-md bg-bg-surface px-4 py-3 text-sm leading-6 text-text-strong">{rec.reason}</p>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-text-soft">Inputs</p>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-stroke-soft bg-stroke-soft text-sm">
              {[
                ["Stock on hand", rec.product.stock],
                ["Avg. daily sales (30d)", fmt.dec1(rec.velocity)],
                ["Days of stock left", Number.isFinite(rec.daysLeft) ? fmt.dec1(rec.daysLeft) : "—"],
                ["Supplier lead time", `${rec.leadTime} days`],
                ["Reorder point", rec.product.reorderPoint],
                ["Target stock", rec.product.targetStock],
                ["Already on order", rec.onOrder],
                ["Case size", rec.product.packSize],
              ].map(([k, v]) => (
                <div key={String(k)} className="bg-bg-default px-3 py-2.5">
                  <dt className="text-xs text-text-sub">{k}</dt>
                  <dd className="mt-0.5 font-medium text-text-strong tnum">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-text-soft">Calculation</p>
            <ol className="space-y-2 text-sm">
              <li className="flex justify-between gap-3">
                <span className="text-text-sub">Target − stock − on order</span>
                <span className="font-medium tnum">
                  {rec.product.targetStock} − {rec.product.stock} − {rec.onOrder} = {rec.math.need}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-text-sub">Round up to full cases of {rec.product.packSize}</span>
                <span className="font-medium tnum">{rec.suggestedQty}</span>
              </li>
              {rec.qty !== rec.suggestedQty && (
                <li className="flex justify-between gap-3">
                  <span className="text-text-sub">Your edited quantity</span>
                  <span className="font-medium tnum">{rec.qty}</span>
                </li>
              )}
              <li className="flex justify-between gap-3 border-t border-stroke-soft pt-2">
                <span className="text-text-sub">Estimated cost</span>
                <span className="font-medium tnum">
                  {rec.qty} × {fmt.money(rec.unitCost)} = {fmt.money(rec.total)}
                </span>
              </li>
            </ol>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-text-soft">Units sold · last 30 days</p>
            <TimeSeriesChart data={series} series={[{ key: "units", label: "Units sold", color: SERIES[1], kind: "bar" }]} height={120} format={(n) => fmt.int(n)} tooltipFormat={(n) => `${fmt.int(n)} units`} />
          </div>
          <p className="flex gap-2 text-xs text-text-sub">
            <InfoCircle className="size-4 shrink-0 text-text-soft" />
            Priority is Critical when stock is out or will run out before a delivery could arrive, High at or below the reorder point, and Medium when the reorder point is ~3 days away.
          </p>
        </div>
      )}
    </Drawer>
  );
}
