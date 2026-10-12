"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Page, Plus, Truck } from "iconoir-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PO_STATUS_LABEL, poTotal, poUnits, RECEIVABLE_PO_STATUSES } from "@/lib/domain";
import { fdate, fmt } from "@/lib/format";
import { useFirstLoad, useQueryState, useSupplierMap } from "@/lib/hooks";
import { useApp, useData } from "@/lib/store/app-store";
import { PO_STATUSES, type POStatus, type PurchaseOrder } from "@/lib/types";
import { cn, daysBetween } from "@/lib/utils";
import { POStatusBadge } from "@/components/domain/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Monogram } from "@/components/ui/display";
import { FilterMenu } from "@/components/ui/filter-menu";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Banner, EmptyState, NoResults } from "@/components/ui/states";
import { TabNav } from "@/components/ui/tabs";
import { ProcurementTabs } from "@/features/suppliers/suppliers-page";

export function POListPage() {
  const data = useData();
  const suppliers = useSupplierMap();
  const router = useRouter();
  const q = useQueryState();
  const loading = useFirstLoad("pos", 500);
  const status = (q.get("status") || "all") as POStatus | "all" | "open";
  const supplierIds = q.getList("supplier");
  const search = q.get("q");
  const [text, setText] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => text !== search && q.set({ q: text }), 200);
    return () => clearTimeout(t);
  }, [text, search, q]);

  const draft = data.poDraft;
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data.purchaseOrders.length };
    for (const s of PO_STATUSES) c[s] = data.purchaseOrders.filter((p) => p.status === s).length;
    return c;
  }, [data.purchaseOrders]);

  const filtered = useMemo(() => {
    const n = search.toLowerCase().trim();
    return data.purchaseOrders
      .filter((po) => {
        if (status !== "all" && po.status !== status) return false;
        if (supplierIds.length && !supplierIds.includes(po.supplierId)) return false;
        if (n && !`${po.number} ${suppliers.get(po.supplierId)?.name ?? ""} ${po.reference}`.toLowerCase().includes(n)) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data.purchaseOrders, status, supplierIds, search, suppliers]);

  const columns = useMemo<ColumnDef<PurchaseOrder, unknown>[]>(
    () => [
      {
        id: "number",
        accessorFn: (p) => p.number,
        header: "Order",
        cell: ({ row: { original: p } }) => (
          <Link href={`/purchase-orders/${p.id}`} className="font-medium text-text-strong hover:underline underline-offset-2">
            {p.number}
          </Link>
        ),
      },
      {
        id: "supplier",
        accessorFn: (p) => suppliers.get(p.supplierId)?.name ?? "",
        header: "Supplier",
        cell: ({ row: { original: p } }) => {
          const s = suppliers.get(p.supplierId);
          return s ? (
            <span className="flex items-center gap-2.5">
              <Monogram text={s.monogram} color={s.color} size="sm" />
              <span className="truncate">{s.name}</span>
            </span>
          ) : null;
        },
      },
      {
        id: "items",
        accessorFn: (p) => p.lines.length,
        header: "Items",
        meta: { align: "right", hideBelow: "md" },
        cell: ({ row: { original: p } }) => (
          <span>
            {p.lines.length} <span className="text-xs text-text-sub">· {fmt.int(poUnits(p))} units</span>
          </span>
        ),
      },
      { id: "total", accessorFn: (p) => poTotal(p), header: "Total", meta: { align: "right" }, cell: ({ getValue }) => <span className="font-medium">{fmt.money(Number(getValue()))}</span> },
      { id: "created", accessorFn: (p) => p.createdAt, header: "Created", meta: { hideBelow: "lg" }, cell: ({ getValue }) => <span className="text-text-sub">{fdate.medium(String(getValue()))}</span> },
      {
        id: "expected",
        accessorFn: (p) => p.expectedAt ?? "",
        header: "Expected",
        meta: { hideBelow: "md" },
        cell: ({ row: { original: p } }) => {
          if (!p.expectedAt || p.status === "cancelled") return <span className="text-text-soft">—</span>;
          if (p.status === "received") return <span className="text-text-sub">Delivered</span>;
          const late = RECEIVABLE_PO_STATUSES.includes(p.status) && daysBetween(p.expectedAt, new Date()) > 0;
          return (
            <span className={cn("whitespace-nowrap", late ? "font-medium text-error-dark" : "text-text-sub")}>
              {fdate.short(p.expectedAt)} <span className="text-xs">· {fdate.due(p.expectedAt)}</span>
            </span>
          );
        },
      },
      { id: "status", accessorFn: (p) => PO_STATUSES.indexOf(p.status), header: "Status", cell: ({ row: { original: p } }) => <POStatusBadge status={p.status} /> },
    ],
    [suppliers],
  );

  const clear = () => {
    setText("");
    q.set({ q: null, supplier: null });
  };

  return (
    <>
      <PageHeader
        title="Suppliers & purchase orders"
        description="Draft, approve, send and receive orders. Receiving updates stock automatically."
        actions={
          <Button asChild variant="primary" leftIcon={<Plus />}>
            <Link href="/purchase-orders/new">New purchase order</Link>
          </Button>
        }
      />
      <ProcurementTabs />

      {draft && (
        <Banner
          tone="info"
          icon={<Page />}
          className="mb-4"
          title={draft.editingId ? "You're editing a draft that isn't saved yet" : "You have an unsaved purchase order"}
          action={
            <>
              <Button size="sm" variant="ghost" onClick={() => useApp.getState().setPoDraft(null)}>
                Discard
              </Button>
              <Button asChild size="sm" variant="primary">
                <Link href="/purchase-orders/new">Resume</Link>
              </Button>
            </>
          }
        >
          {draft.lines.length} {draft.lines.length === 1 ? "item" : "items"}
          {draft.supplierId ? ` for ${suppliers.get(draft.supplierId)?.name}` : ""}. Pick up where you left off.
        </Banner>
      )}

      {data.purchaseOrders.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Truck />}
            title="No purchase orders yet"
            description={data.suppliers.length ? "Create an order to restock from a supplier, or start from reorder recommendations." : "Add a supplier first, then create purchase orders to restock."}
            action={
              data.suppliers.length ? (
                <Button asChild variant="primary" leftIcon={<Plus />}>
                  <Link href="/purchase-orders/new">New purchase order</Link>
                </Button>
              ) : (
                <Button asChild variant="primary">
                  <Link href="/suppliers">Add a supplier</Link>
                </Button>
              )
            }
            secondary={
              <Button asChild variant="secondary">
                <Link href="/analytics/smart-ordering">Smart ordering</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-stroke-soft px-5">
            <TabNav
              items={(["all", ...PO_STATUSES] as const).map((s) => ({
                label: s === "all" ? "All" : PO_STATUS_LABEL[s],
                count: counts[s],
                active: status === s,
                tone: s === "pending_approval" && counts[s] > 0 ? ("warning" as const) : undefined,
                onClick: () => q.set({ status: s === "all" ? null : s }),
              }))}
            />
          </div>
          <div className="flex flex-col gap-3 px-5 py-3.5 md:flex-row md:items-center">
            <SearchInput value={text} onChange={setText} placeholder="Search PO number or supplier" className="w-full md:w-[300px]" />
            <FilterMenu
              label="Supplier"
              searchable
              options={data.suppliers.map((s) => ({ value: s.id, label: s.name, count: data.purchaseOrders.filter((p) => p.supplierId === s.id).length }))}
              selected={supplierIds}
              onChange={(v) => q.set({ supplier: v })}
            />
            <span className="text-sm text-text-sub md:ml-auto" aria-live="polite">
              {fmt.plural(filtered.length, "order")} · {fmt.money0(filtered.reduce((s, p) => s + poTotal(p), 0))}
            </span>
          </div>
          <DataTable
            caption="Purchase orders"
            data={filtered}
            columns={columns}
            getRowId={(p) => p.id}
            loading={loading}
            pageSizes={[10, 20, 50]}
            onRowClick={(p) => router.push(`/purchase-orders/${p.id}`)}
            empty={
              search || supplierIds.length ? (
                <NoResults query={search} onClear={clear} what="purchase orders" />
              ) : (
                <EmptyState compact icon={<Page />} title={`No ${status === "all" ? "" : PO_STATUS_LABEL[status as POStatus].toLowerCase()} orders`} description="Orders appear here as they move through approval, delivery and receipt." />
              )
            }
          />
        </Card>
      )}
    </>
  );
}
