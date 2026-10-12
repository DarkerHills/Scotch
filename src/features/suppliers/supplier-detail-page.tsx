"use client";

import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { Archive, EditPencil, Mail, MapPin, MoreHoriz, Page, Phone, Truck, Undo, WarningTriangle } from "iconoir-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OPEN_PO_STATUSES, poTotal, stockStatus } from "@/lib/domain";
import { fdate, fmt } from "@/lib/format";
import { useRecommendations } from "@/lib/hooks";
import { useAsyncAction } from "@/lib/simulate";
import { useApp, useData } from "@/lib/store/app-store";
import type { Product, PurchaseOrder } from "@/lib/types";
import { addDays, cn, isoDate, roundUpTo } from "@/lib/utils";
import { ProductThumb } from "@/components/domain/product-thumb";
import { POStatusBadge, StockBadge, SupplierStatusBadge } from "@/components/domain/status";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DetailRow } from "@/components/ui/card";
import { DataTable, selectionColumn } from "@/components/ui/data-table";
import { Monogram } from "@/components/ui/display";
import { Textarea } from "@/components/ui/input";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { PageHeader } from "@/components/ui/page-header";
import { Banner, EmptyState } from "@/components/ui/states";
import { TabNav } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";
import { ContactDialog } from "@/features/suppliers/contact-dialog";
import { SupplierFormDialog } from "@/features/suppliers/supplier-form-dialog";
import { ArchiveSupplierConfirm } from "@/features/suppliers/suppliers-page";

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const data = useData();
  const router = useRouter();
  const recs = useRecommendations();
  const supplier = data.suppliers.find((s) => s.id === id);
  const [tab, setTab] = useState<"products" | "orders" | "outstanding">("products");
  const [contact, setContact] = useState<"email" | "call" | null>(null);
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [notes, setNotes] = useState<string | null>(null);
  const { run, pending } = useAsyncAction();

  const products = useMemo(() => data.products.filter((p) => p.supplierId === id && !p.archived), [data.products, id]);
  const orders = useMemo(() => data.purchaseOrders.filter((p) => p.supplierId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data.purchaseOrders, id]);
  const outstanding = orders.filter((o) => OPEN_PO_STATUSES.includes(o.status) || o.status === "draft");
  const recMap = useMemo(() => new Map(recs.map((r) => [r.product.id, r])), [recs]);

  const productCols = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      selectionColumn<Product>(),
      {
        id: "name",
        accessorFn: (p) => p.name,
        header: "Product",
        cell: ({ row: { original: p } }) => (
          <div className="flex items-center gap-3">
            <ProductThumb thumb={p.thumb} category={p.category} size="sm" />
            <div className="min-w-0">
              <Link href={`/inventory/${p.id}`} className="block truncate font-medium text-text-strong hover:underline underline-offset-2">
                {p.name}
              </Link>
              <span className="block text-xs text-text-sub">
                {p.size} · case of {p.packSize}
              </span>
            </div>
          </div>
        ),
      },
      { id: "stock", accessorFn: (p) => p.stock, header: "Stock", meta: { align: "right" } },
      { id: "rp", accessorFn: (p) => p.reorderPoint, header: "Reorder pt.", meta: { align: "right", hideBelow: "md" } },
      { id: "cost", accessorFn: (p) => p.unitCost, header: "Unit cost", meta: { align: "right" }, cell: ({ getValue }) => fmt.money(Number(getValue())) },
      {
        id: "suggested",
        accessorFn: (p) => recMap.get(p.id)?.qty ?? 0,
        header: "Suggested",
        meta: { align: "right", hideBelow: "md" },
        cell: ({ row: { original: p } }) => {
          const r = recMap.get(p.id);
          return r ? <span className="font-medium text-primary-base">{r.qty}</span> : <span className="text-text-soft">—</span>;
        },
      },
      { id: "status", accessorFn: (p) => stockStatus(p), header: "Status", cell: ({ row: { original: p } }) => <StockBadge status={stockStatus(p)} /> },
    ],
    [recMap],
  );

  if (!supplier) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Suppliers", href: "/suppliers" }, { label: "Not found" }]} title="Supplier not found" />
        <Card>
          <EmptyState
            icon={<Truck />}
            title="This supplier doesn't exist in this store"
            action={
              <Button asChild variant="primary">
                <Link href="/suppliers">Back to suppliers</Link>
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const spend90 = orders
    .filter((o) => o.status !== "draft" && o.status !== "cancelled" && new Date(o.createdAt) > addDays(new Date(), -90))
    .reduce((s, o) => s + poTotal(o), 0);
  const openValue = outstanding.filter((o) => o.status !== "draft").reduce((s, o) => s + o.lines.reduce((a, l) => a + (l.qty - l.receivedQty) * l.unitCost, 0), 0);
  const selectedIds = Object.keys(selection).filter((k) => selection[k]);
  const canOrder = supplier.status === "active";

  const createPO = (ids: string[]) => {
    useApp.getState().setPoDraft({
      editingId: null,
      supplierId: supplier.id,
      lines: ids.map((pid) => {
        const p = data.products.find((x) => x.id === pid)!;
        return { productId: pid, qty: recMap.get(pid)?.qty ?? roundUpTo(Math.max(p.packSize, p.targetStock - p.stock), p.packSize), unitCost: p.unitCost };
      }),
      expectedAt: isoDate(addDays(new Date(), supplier.leadTimeDays)),
      deliverTo: data.profile.address,
      reference: "",
      notes: "",
      source: "manual",
      dirty: true,
    });
    router.push("/purchase-orders/new?step=2");
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Suppliers", href: "/suppliers" }, { label: supplier.name }]}
        leading={<Monogram text={supplier.monogram} color={supplier.color} size="lg" />}
        title={supplier.name}
        meta={<SupplierStatusBadge status={supplier.status} />}
        description={`${supplier.categories.join(" · ") || "No categories yet"} · customer since ${fdate.medium(supplier.createdAt)}`}
        actions={
          <>
            <Button variant="secondary" leftIcon={<Mail />} onClick={() => setContact("email")}>
              Email
            </Button>
            <Button variant="secondary" leftIcon={<Phone />} onClick={() => setContact("call")}>
              Call
            </Button>
            <Button asChild={canOrder} variant="primary" leftIcon={<Page />} disabled={!canOrder}>
              {canOrder ? <Link href={`/purchase-orders/new?supplier=${supplier.id}`}>New purchase order</Link> : <span>New purchase order</span>}
            </Button>
            <Menu>
              <MenuTrigger asChild>
                <Button variant="secondary" icon aria-label="More actions">
                  <MoreHoriz />
                </Button>
              </MenuTrigger>
              <MenuContent>
                <MenuItem icon={<EditPencil />} onSelect={() => setEditing(true)}>
                  Edit supplier
                </MenuItem>
                {supplier.status === "on_hold" ? (
                  <MenuItem icon={<Undo />} onSelect={() => run(() => useApp.getState().updateSupplier(supplier.id, { status: "active" }), { success: "Supplier reactivated" })}>
                    Reactivate account
                  </MenuItem>
                ) : supplier.status === "active" ? (
                  <MenuItem icon={<WarningTriangle />} onSelect={() => run(() => useApp.getState().updateSupplier(supplier.id, { status: "on_hold" }), { success: "Supplier put on hold" })}>
                    Put on hold
                  </MenuItem>
                ) : null}
                <MenuSeparator />
                {supplier.status === "archived" ? (
                  <MenuItem icon={<Undo />} onSelect={() => run(() => useApp.getState().updateSupplier(supplier.id, { status: "active" }), { success: "Supplier restored" })}>
                    Restore supplier
                  </MenuItem>
                ) : (
                  <MenuItem icon={<Archive />} danger onSelect={() => setArchiving(true)}>
                    Archive supplier
                  </MenuItem>
                )}
              </MenuContent>
            </Menu>
          </>
        }
      />

      {supplier.status !== "active" && (
        <Banner
          tone="warning"
          icon={<WarningTriangle />}
          title={supplier.status === "on_hold" ? "Account on hold" : "Supplier archived"}
          className="mb-4"
          action={
            <Button size="sm" variant="secondary" onClick={() => run(() => useApp.getState().updateSupplier(supplier.id, { status: "active" }), { success: "Supplier reactivated" })}>
              Reactivate
            </Button>
          }
        >
          New purchase orders can&apos;t be placed. {products.length} products rely on this supplier for reorders.
        </Banner>
      )}

      <dl className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-stroke-soft bg-stroke-soft shadow-xs md:grid-cols-5">
        {[
          ["Products supplied", fmt.int(products.length)],
          ["Open order value", fmt.money0(openValue)],
          ["Spend · 90 days", fmt.money0(spend90)],
          ["Avg. lead time", `${supplier.leadTimeDays} days`],
          ["On-time delivery", fmt.pct(supplier.onTimeRate, 0)],
        ].map(([l, v]) => (
          <div key={l} className="bg-bg-default px-4 py-3.5">
            <dt className="text-xs text-text-sub">{l}</dt>
            <dd className="mt-1 text-lg font-medium text-text-strong">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-stroke-soft px-5">
            <TabNav
              items={[
                { label: "Supplied products", onClick: () => setTab("products"), active: tab === "products", count: products.length },
                { label: "Order history", onClick: () => setTab("orders"), active: tab === "orders", count: orders.length },
                { label: "Outstanding", onClick: () => setTab("outstanding"), active: tab === "outstanding", count: outstanding.length },
              ]}
            />
          </div>
          {tab === "products" && (
            <>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-3 border-b border-stroke-soft bg-primary-mute/50 px-5 py-2.5 text-sm">
                  <span className="font-medium text-text-strong">{selectedIds.length} selected</span>
                  <Button size="sm" variant="primary" leftIcon={<Page />} disabled={!canOrder} onClick={() => createPO(selectedIds)}>
                    Create purchase order
                  </Button>
                  <button type="button" className="ml-auto cursor-pointer text-text-sub hover:text-text-strong" onClick={() => setSelection({})}>
                    Clear
                  </button>
                </div>
              )}
              <DataTable
                caption={`Products supplied by ${supplier.name}`}
                data={products}
                columns={productCols}
                getRowId={(p) => p.id}
                rowSelection={selection}
                onRowSelectionChange={setSelection}
                paginate={products.length > 10}
                pageSizes={[10, 25]}
                onRowClick={(p) => router.push(`/inventory/${p.id}`)}
                empty={<EmptyState compact icon={<Truck />} title="No products linked yet" description="Assign this supplier from a product's detail page or with a bulk action in Inventory." />}
              />
            </>
          )}
          {tab !== "products" && <OrderList orders={tab === "orders" ? orders : outstanding} empty={tab === "orders" ? "No orders placed with this supplier yet." : "Nothing outstanding — all orders are received or closed."} />}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Contact" />
            <CardBody>
              <p className="text-sm font-medium text-text-strong">{supplier.contactName}</p>
              <p className="text-xs text-text-sub">{supplier.contactRole}</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <button type="button" onClick={() => setContact("email")} className="flex w-full cursor-pointer items-center gap-2.5 text-left text-text-strong hover:underline underline-offset-2">
                    <Mail className="size-4 text-text-soft" />
                    {supplier.email}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setContact("call")} className="flex w-full cursor-pointer items-center gap-2.5 text-left text-text-strong hover:underline underline-offset-2">
                    <Phone className="size-4 text-text-soft" />
                    {supplier.phone}
                  </button>
                </li>
                <li className="flex items-start gap-2.5 text-text-sub">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-text-soft" />
                  {supplier.address || "No address on file"}
                </li>
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Terms" />
            <CardBody>
              <dl className="divide-y divide-stroke-soft">
                <DetailRow label="Payment terms">{supplier.paymentTerms}</DetailRow>
                <DetailRow label="Lead time">{supplier.leadTimeDays} days</DetailRow>
                <DetailRow label="Minimum order">{fmt.money0(supplier.minimumOrder)}</DetailRow>
                <DetailRow label="Categories">
                  <span className="flex flex-wrap justify-end gap-1">
                    {supplier.categories.map((c) => (
                      <Tag key={c}>{c}</Tag>
                    ))}
                  </span>
                </DetailRow>
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Notes" description="Visible to your team only" />
            <CardBody>
              <Textarea aria-label="Supplier notes" rows={5} value={notes ?? supplier.notes} onChange={(e) => setNotes(e.target.value)} />
              {notes !== null && notes !== supplier.notes && (
                <div className="mt-2 flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setNotes(null)} disabled={pending}>
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    loading={pending}
                    onClick={async () => {
                      const r = await run(() => useApp.getState().updateSupplier(supplier.id, { notes: notes.trim() }), { success: "Notes saved" });
                      if (r.ok) setNotes(null);
                    }}
                  >
                    Save notes
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {contact && <ContactDialog open={!!contact} onOpenChange={(o) => !o && setContact(null)} supplier={supplier} initialMode={contact} />}
      <SupplierFormDialog open={editing} onOpenChange={setEditing} supplier={supplier} />
      <ArchiveSupplierConfirm supplier={archiving ? supplier : null} onClose={() => setArchiving(false)} />
    </>
  );
}

function OrderList({ orders, empty }: { orders: PurchaseOrder[]; empty: string }) {
  if (orders.length === 0) return <EmptyState compact icon={<Page />} title={empty} />;
  return (
    <ul className="divide-y divide-stroke-soft">
      {orders.map((po) => (
        <li key={po.id}>
          <Link href={`/purchase-orders/${po.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-bg-surface">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-strong">{po.number}</p>
              <p className="text-xs text-text-sub">
                {fmt.plural(po.lines.length, "item")} · created {fdate.medium(po.createdAt)}
                {po.expectedAt && po.status !== "received" && po.status !== "cancelled" && ` · expected ${fdate.short(po.expectedAt)}`}
              </p>
            </div>
            <span className={cn("text-sm font-medium text-text-strong tnum")}>{fmt.money(poTotal(po))}</span>
            <POStatusBadge status={po.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
