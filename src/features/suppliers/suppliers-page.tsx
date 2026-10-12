"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Archive, EditPencil, Eye, Mail, MoreHoriz, Page, Plus, Truck, Undo } from "iconoir-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { OPEN_PO_STATUSES } from "@/lib/domain";
import { fdate, fmt } from "@/lib/format";
import { useFirstLoad, useQueryState } from "@/lib/hooks";
import { useAsyncAction } from "@/lib/simulate";
import { useApp, useData } from "@/lib/store/app-store";
import { CATEGORIES, type Supplier } from "@/lib/types";
import { SupplierStatusBadge } from "@/components/domain/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Monogram } from "@/components/ui/display";
import { FilterMenu } from "@/components/ui/filter-menu";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState, NoResults } from "@/components/ui/states";
import { TabNav } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";
import { ContactDialog } from "@/features/suppliers/contact-dialog";
import { SupplierFormDialog } from "@/features/suppliers/supplier-form-dialog";

/** Shared section navigation for the "Suppliers & purchase orders" area. */
export function ProcurementTabs() {
  const pathname = usePathname();
  const data = useData();
  const open = data.purchaseOrders.filter((p) => OPEN_PO_STATUSES.includes(p.status) || p.status === "draft").length;
  return (
    <div className="mb-5 border-b border-stroke-soft">
      <TabNav
        items={[
          { label: "Suppliers", href: "/suppliers", active: pathname.startsWith("/suppliers"), count: data.suppliers.filter((s) => s.status !== "archived").length },
          { label: "Purchase orders", href: "/purchase-orders", active: pathname.startsWith("/purchase-orders"), count: open },
        ]}
      />
    </div>
  );
}

export function SuppliersPage() {
  const data = useData();
  const router = useRouter();
  const q = useQueryState();
  const loading = useFirstLoad("suppliers", 500);
  const [text, setText] = useState(q.get("q"));
  const search = q.get("q");
  const status = q.getList("status");
  const cats = q.getList("category");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [contact, setContact] = useState<Supplier | null>(null);
  const [archiving, setArchiving] = useState<Supplier | null>(null);
  const { run } = useAsyncAction();

  useEffect(() => {
    const t = setTimeout(() => text !== search && q.set({ q: text }), 200);
    return () => clearTimeout(t);
  }, [text, search, q]);

  const stats = useMemo(() => {
    const m = new Map<string, { products: number; last: string | null; open: number; openValue: number }>();
    for (const s of data.suppliers) m.set(s.id, { products: 0, last: null, open: 0, openValue: 0 });
    for (const p of data.products) if (p.supplierId && !p.archived && m.has(p.supplierId)) m.get(p.supplierId)!.products++;
    for (const po of data.purchaseOrders) {
      const st = m.get(po.supplierId);
      if (!st) continue;
      if (po.status !== "draft" && po.status !== "cancelled" && (!st.last || po.createdAt > st.last)) st.last = po.createdAt;
      if (OPEN_PO_STATUSES.includes(po.status)) {
        st.open++;
        st.openValue += po.lines.reduce((s, l) => s + (l.qty - l.receivedQty) * l.unitCost, 0);
      }
    }
    return m;
  }, [data]);

  const filtered = useMemo(() => {
    const n = search.toLowerCase().trim();
    return data.suppliers.filter((s) => {
      const st = status.length ? status : ["active", "on_hold"];
      if (!st.includes(s.status)) return false;
      if (cats.length && !s.categories.some((c) => cats.includes(c))) return false;
      if (n && !`${s.name} ${s.contactName} ${s.email} ${s.categories.join(" ")}`.toLowerCase().includes(n)) return false;
      return true;
    });
  }, [data.suppliers, search, status, cats]);

  const columns = useMemo<ColumnDef<Supplier, unknown>[]>(
    () => [
      {
        id: "name",
        accessorFn: (s) => s.name,
        header: "Supplier",
        meta: { className: "min-w-[220px]" },
        cell: ({ row: { original: s } }) => (
          <div className="flex items-center gap-3">
            <Monogram text={s.monogram} color={s.color} />
            <div className="min-w-0">
              <Link href={`/suppliers/${s.id}`} className="block truncate font-medium text-text-strong hover:underline underline-offset-2">
                {s.name}
              </Link>
              <span className="block text-xs text-text-sub">{s.paymentTerms} · min. {fmt.money0(s.minimumOrder)}</span>
            </div>
          </div>
        ),
      },
      {
        id: "contact",
        accessorFn: (s) => s.contactName,
        header: "Contact",
        meta: { hideBelow: "md" },
        cell: ({ row: { original: s } }) => (
          <div className="min-w-0 text-sm">
            <span className="block text-text-strong">{s.contactName}</span>
            <span className="block truncate text-xs text-text-sub">{s.email}</span>
          </div>
        ),
      },
      {
        id: "categories",
        enableSorting: false,
        header: "Categories",
        meta: { hideBelow: "xl" },
        cell: ({ row: { original: s } }) => (
          <div className="flex max-w-[240px] flex-wrap gap-1">
            {s.categories.slice(0, 3).map((c) => (
              <Tag key={c}>{c}</Tag>
            ))}
            {s.categories.length > 3 && <Tag>+{s.categories.length - 3}</Tag>}
          </div>
        ),
      },
      { id: "products", accessorFn: (s) => stats.get(s.id)?.products ?? 0, header: "Products", meta: { align: "right" } },
      { id: "lead", accessorFn: (s) => s.leadTimeDays, header: "Lead time", meta: { align: "right", hideBelow: "lg" }, cell: ({ getValue }) => `${getValue()} days` },
      {
        id: "open",
        accessorFn: (s) => stats.get(s.id)?.openValue ?? 0,
        header: "Open orders",
        meta: { align: "right", hideBelow: "lg" },
        cell: ({ row: { original: s } }) => {
          const st = stats.get(s.id)!;
          return st.open ? (
            <span>
              {fmt.money0(st.openValue)} <span className="text-xs text-text-sub">· {st.open}</span>
            </span>
          ) : (
            <span className="text-text-soft">—</span>
          );
        },
      },
      {
        id: "last",
        accessorFn: (s) => stats.get(s.id)?.last ?? "",
        header: "Last order",
        meta: { hideBelow: "xl" },
        cell: ({ getValue }) => <span className="text-text-sub">{getValue() ? fdate.medium(String(getValue())) : "Never"}</span>,
      },
      { id: "status", accessorFn: (s) => s.status, header: "Status", cell: ({ row: { original: s } }) => <SupplierStatusBadge status={s.status} /> },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        meta: { className: "w-10", align: "right" },
        cell: ({ row: { original: s } }) => (
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="sm" icon aria-label={`Actions for ${s.name}`}>
                <MoreHoriz />
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem icon={<Eye />} onSelect={() => router.push(`/suppliers/${s.id}`)}>
                View profile
              </MenuItem>
              <MenuItem icon={<Page />} disabled={s.status !== "active"} onSelect={() => router.push(`/purchase-orders/new?supplier=${s.id}`)}>
                New purchase order
              </MenuItem>
              <MenuItem icon={<Mail />} onSelect={() => setContact(s)}>
                Contact (demo)
              </MenuItem>
              <MenuItem icon={<EditPencil />} onSelect={() => setEditing(s)}>
                Edit supplier
              </MenuItem>
              <MenuSeparator />
              {s.status === "archived" ? (
                <MenuItem icon={<Undo />} onSelect={() => run(() => useApp.getState().updateSupplier(s.id, { status: "active" }), { success: "Supplier restored" })}>
                  Restore supplier
                </MenuItem>
              ) : (
                <MenuItem icon={<Archive />} danger onSelect={() => setArchiving(s)}>
                  Archive supplier
                </MenuItem>
              )}
            </MenuContent>
          </Menu>
        ),
      },
    ],
    [stats, router, run],
  );

  const activeFilters = status.length + cats.length;
  const clear = () => {
    setText("");
    q.set({ q: null, status: null, category: null });
  };

  return (
    <>
      <PageHeader
        title="Suppliers & purchase orders"
        description="Manage vendor relationships, restock products and receive deliveries."
        actions={
          <>
            <Button variant="secondary" leftIcon={<Plus />} onClick={() => setAdding(true)}>
              Add supplier
            </Button>
            <Button asChild variant="primary" leftIcon={<Page />}>
              <Link href="/purchase-orders/new">New purchase order</Link>
            </Button>
          </>
        }
      />
      <ProcurementTabs />
      {data.suppliers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Truck />}
            title="No suppliers yet"
            description="Add the distributors you buy from to create purchase orders and get reorder suggestions."
            action={
              <Button variant="primary" leftIcon={<Plus />} onClick={() => setAdding(true)}>
                Add your first supplier
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 px-5 py-3.5 md:flex-row md:items-center">
            <SearchInput value={text} onChange={setText} placeholder="Search suppliers, contacts or categories" className="w-full md:w-[320px]" />
            <div className="flex flex-wrap gap-2">
              <FilterMenu
                label="Status"
                options={[
                  { value: "active", label: "Active", count: data.suppliers.filter((s) => s.status === "active").length },
                  { value: "on_hold", label: "On hold", count: data.suppliers.filter((s) => s.status === "on_hold").length },
                  { value: "archived", label: "Archived", count: data.suppliers.filter((s) => s.status === "archived").length },
                ]}
                selected={status}
                onChange={(v) => q.set({ status: v })}
              />
              <FilterMenu label="Category" options={CATEGORIES.map((c) => ({ value: c, label: c }))} selected={cats} onChange={(v) => q.set({ category: v })} />
              {(activeFilters > 0 || search) && (
                <Button variant="ghost" size="sm" onClick={clear}>
                  Clear all
                </Button>
              )}
            </div>
            <span className="text-sm text-text-sub md:ml-auto" aria-live="polite">
              {fmt.plural(filtered.length, "supplier")}
            </span>
          </div>
          <DataTable
            caption="Suppliers"
            data={filtered}
            columns={columns}
            getRowId={(s) => s.id}
            loading={loading}
            paginate={false}
            onRowClick={(s) => router.push(`/suppliers/${s.id}`)}
            rowClassName={(s) => (s.status === "archived" ? "opacity-60" : undefined)}
            empty={<NoResults query={search} onClear={clear} what="suppliers" />}
          />
        </Card>
      )}
      <SupplierFormDialog open={adding} onOpenChange={setAdding} onSaved={(id) => router.push(`/suppliers/${id}`)} />
      {editing && <SupplierFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} supplier={editing} />}
      {contact && <ContactDialog open={!!contact} onOpenChange={(o) => !o && setContact(null)} supplier={contact} />}
      <ArchiveSupplierConfirm supplier={archiving} onClose={() => setArchiving(null)} />
    </>
  );
}

export function ArchiveSupplierConfirm({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const data = useData();
  const { run } = useAsyncAction();
  const linked = supplier ? data.products.filter((p) => p.supplierId === supplier.id && !p.archived).length : 0;
  const open = supplier ? data.purchaseOrders.filter((p) => p.supplierId === supplier.id && OPEN_PO_STATUSES.includes(p.status)).length : 0;
  return (
    <ConfirmDialog
      open={!!supplier}
      onOpenChange={(o) => !o && onClose()}
      tone="danger"
      icon={<Archive />}
      title={`Archive ${supplier?.name ?? "supplier"}?`}
      description={`It will be hidden from supplier lists and can't receive new purchase orders. ${linked} linked products keep their history but will show “insufficient supplier coverage” in reorder suggestions.${open ? ` ${open} open orders stay active.` : ""}`}
      confirmLabel="Archive supplier"
      onConfirm={async () => {
        const r = await run(() => useApp.getState().updateSupplier(supplier!.id, { status: "archived" }), { success: { title: "Supplier archived", description: "Restore it from the Status filter." } });
        return r.ok;
      }}
    />
  );
}
