"use client";

import type { ColumnDef, RowSelectionState, SortingState, VisibilityState } from "@tanstack/react-table";
import {
  Archive,
  BoxIso,
  Download,
  EditPencil,
  Eye,
  Globe,
  MoreHoriz,
  Plus,
  Undo,
  Truck,
  ViewColumns3,
  Xmark,
  EyeClosed,
} from "iconoir-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { productMargin, stockStatus } from "@/lib/domain";
import { fdate, fmt } from "@/lib/format";
import { useFirstLoad, useInventoryStats, useQueryState, useSupplierMap } from "@/lib/hooks";
import { useAsyncAction } from "@/lib/simulate";
import { useApp, useData } from "@/lib/store/app-store";
import { toast } from "@/lib/store/toast-store";
import { CATEGORIES, type Product, type StockStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductThumb } from "@/components/domain/product-thumb";
import { StockBadge } from "@/components/domain/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, selectionColumn } from "@/components/ui/data-table";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { FilterMenu } from "@/components/ui/filter-menu";
import { Field } from "@/components/ui/input";
import { Menu, MenuCheckboxItem, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { PageHeader } from "@/components/ui/page-header";
import { QuantityInput } from "@/components/ui/quantity-input";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState, NoResults } from "@/components/ui/states";
import { TabNav } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";
import { ExportDialog } from "@/features/inventory/export-dialog";
import { AdjustStockDialog, ProductFormDialog, SupplierDialog } from "@/features/inventory/product-dialogs";

type StatusTab = "all" | StockStatus | "archived";
const MARGIN_BANDS = [
  { value: "lt25", label: "Under 25%", test: (m: number) => m < 0.25 },
  { value: "25-35", label: "25–35%", test: (m: number) => m >= 0.25 && m < 0.35 },
  { value: "35-45", label: "35–45%", test: (m: number) => m >= 0.35 && m < 0.45 },
  { value: "gt45", label: "45% and up", test: (m: number) => m >= 0.45 },
];
const COLUMN_LABELS: Record<string, string> = {
  sku: "SKU / barcode",
  category: "Category",
  brand: "Brand",
  stock: "Stock on hand",
  reorderPoint: "Reorder point",
  unitCost: "Unit cost",
  retailPrice: "Retail price",
  margin: "Margin",
  value: "Stock value",
  supplier: "Supplier",
  status: "Status",
  updatedAt: "Last updated",
};
const DEFAULT_HIDDEN: VisibilityState = { brand: false, value: false, reorderPoint: false };

function parseSort(s: string): SortingState {
  if (!s) return [];
  return [{ id: s.replace(/^-/, ""), desc: s.startsWith("-") }];
}

export function InventoryPage() {
  const data = useData();
  const suppliers = useSupplierMap();
  const stats = useInventoryStats();
  const router = useRouter();
  const q = useQueryState();
  const loading = useFirstLoad("inventory", 600);

  const search = q.get("q");
  const status = (q.get("status") || "all") as StatusTab;
  const categories = q.getList("category");
  const brands = q.getList("brand");
  const supplierIds = q.getList("supplier");
  const margin = q.get("margin");
  const sorting = parseSort(q.get("sort"));
  const page = Math.max(0, Number(q.get("page") || 1) - 1);
  const pageSize = Number(q.get("size") || 25);

  const [searchText, setSearchText] = useState(search);
  const [syncedSearch, setSyncedSearch] = useState(search);
  if (search !== syncedSearch) {
    // URL changed elsewhere (clear filters, back button): reflect it in the box.
    setSyncedSearch(search);
    setSearchText(search);
  }
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchText !== search) q.set({ q: searchText, page: null });
    }, 200);
    return () => clearTimeout(t);
  }, [searchText, search, q]);

  const [selection, setSelection] = useState<RowSelectionState>({});
  const [visibility, setVisibility] = useState<VisibilityState>(() => ({ ...DEFAULT_HIDDEN, value: sorting[0]?.id === "value" }));
  const newParam = q.get("new") === "1";
  const [adding, setAdding] = useState(newParam);
  const [seenNew, setSeenNew] = useState(newParam);
  if (newParam !== seenNew) {
    setSeenNew(newParam);
    if (newParam) setAdding(true);
  }
  const [editing, setEditing] = useState<Product | null>(null);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [archiving, setArchiving] = useState<Product[] | null>(null);
  const [supplierFor, setSupplierFor] = useState<string[] | null>(null);
  const [reorderFor, setReorderFor] = useState<string[] | null>(null);
  const [exporting, setExporting] = useState<Product[] | null>(null);

  useEffect(() => {
    if (newParam) q.set({ new: null });
  }, [newParam, q]);

  const counts = useMemo(() => {
    const active = data.products.filter((p) => !p.archived);
    return {
      all: active.length,
      healthy: stats.healthy,
      low: stats.low,
      out: stats.out,
      archived: data.products.length - active.length,
    };
  }, [data.products, stats]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const band = MARGIN_BANDS.find((b) => b.value === margin);
    return data.products.filter((p) => {
      if (status === "archived" ? !p.archived : p.archived) return false;
      if (status !== "all" && status !== "archived" && stockStatus(p) !== status) return false;
      if (categories.length && !categories.includes(p.category)) return false;
      if (brands.length && !brands.includes(p.brand)) return false;
      if (supplierIds.length && !supplierIds.includes(p.supplierId ?? "none")) return false;
      if (band && !band.test(productMargin(p))) return false;
      if (needle) {
        const hay = `${p.name} ${p.brand} ${p.sku} ${p.barcode} ${p.size}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data.products, search, status, categories, brands, supplierIds, margin]);

  // Only rows still visible count as selected (filters can hide selected rows).
  const visibleSelection = useMemo(() => {
    const ids = new Set(filtered.map((p) => p.id));
    return Object.fromEntries(Object.entries(selection).filter(([id, on]) => on && ids.has(id)));
  }, [filtered, selection]);
  const selectedIds = Object.keys(visibleSelection);
  const selectedProducts = data.products.filter((p) => selectedIds.includes(p.id));
  const activeFilters = categories.length + brands.length + supplierIds.length + (margin ? 1 : 0);
  const clearAll = () => {
    setSearchText("");
    q.set({ q: null, category: null, brand: null, supplier: null, margin: null, page: null });
  };

  const brandOptions = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of data.products) if (!p.archived) m.set(p.brand, (m.get(p.brand) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([b, n]) => ({ value: b, label: b, count: n }));
  }, [data.products]);

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      selectionColumn<Product>(),
      {
        id: "name",
        accessorFn: (p) => p.name,
        header: "Product",
        meta: { className: "min-w-[240px]" },
        cell: ({ row: { original: p } }) => (
          <div className="flex items-center gap-3">
            <ProductThumb thumb={p.thumb} category={p.category} size="md" dimmed={p.archived} />
            <div className="min-w-0">
              <Link href={`/inventory/${p.id}`} className="block max-w-[280px] truncate font-medium text-text-strong hover:underline underline-offset-2 focus-visible:underline">
                {p.name}
              </Link>
              <span className="block text-xs text-text-sub">
                {p.size}
                {!p.online.available && !p.archived && <span className="text-text-soft"> · in-store only</span>}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "sku",
        accessorFn: (p) => p.sku,
        header: "SKU / barcode",
        meta: { hideBelow: "md" },
        cell: ({ row: { original: p } }) => (
          <div className="font-mono text-xs">
            <span className="block text-text-strong">{p.sku}</span>
            <span className="block text-text-soft">{p.barcode}</span>
          </div>
        ),
      },
      { id: "category", accessorFn: (p) => p.category, header: "Category", meta: { hideBelow: "xl" }, cell: ({ getValue }) => <span className="text-text-sub">{String(getValue())}</span> },
      { id: "brand", accessorFn: (p) => p.brand, header: "Brand", meta: { hideBelow: "xl" }, cell: ({ getValue }) => <span className="text-text-sub">{String(getValue())}</span> },
      {
        id: "stock",
        accessorFn: (p) => p.stock,
        header: "Stock",
        meta: { align: "right" },
        cell: ({ row: { original: p } }) => {
          const st = stockStatus(p);
          return (
            <button
              type="button"
              onClick={() => setAdjusting(p)}
              disabled={p.archived}
              className={cn(
                "cursor-pointer rounded-xs px-1 font-medium tnum hover:bg-bg-soft disabled:cursor-default disabled:hover:bg-transparent",
                st === "out" ? "text-error-dark" : st === "low" ? "text-warning-dark" : "text-text-strong",
              )}
              aria-label={`Adjust stock for ${p.name}, ${p.stock} on hand, reorder point ${p.reorderPoint}`}
            >
              <span className="block">{fmt.int(p.stock)}</span>
              <span className="block text-2xs font-normal text-text-soft">min {p.reorderPoint}</span>
            </button>
          );
        },
      },
      { id: "reorderPoint", accessorFn: (p) => p.reorderPoint, header: "Reorder pt.", meta: { align: "right", hideBelow: "lg" }, cell: ({ getValue }) => <span className="text-text-sub">{String(getValue())}</span> },
      { id: "unitCost", accessorFn: (p) => p.unitCost, header: "Unit cost", meta: { align: "right", hideBelow: "2xl" }, cell: ({ getValue }) => <span className="text-text-sub">{fmt.money(Number(getValue()))}</span> },
      { id: "retailPrice", accessorFn: (p) => p.retailPrice, header: "Price", meta: { align: "right" }, cell: ({ getValue }) => fmt.money(Number(getValue())) },
      {
        id: "margin",
        accessorFn: (p) => productMargin(p),
        header: "Margin",
        meta: { align: "right", hideBelow: "md" },
        cell: ({ getValue }) => {
          const m = Number(getValue());
          return <span className={cn(m < 0.25 ? "text-warning-dark" : "text-text-strong")}>{fmt.pct(m)}</span>;
        },
      },
      { id: "value", accessorFn: (p) => p.stock * p.unitCost, header: "Stock value", meta: { align: "right" }, cell: ({ getValue }) => fmt.money0(Number(getValue())) },
      {
        id: "supplier",
        accessorFn: (p) => suppliers.get(p.supplierId ?? "")?.name ?? "",
        header: "Supplier",
        meta: { hideBelow: "lg", className: "max-w-[170px]" },
        cell: ({ row: { original: p } }) => {
          const s = suppliers.get(p.supplierId ?? "");
          return s ? (
            <Link href={`/suppliers/${s.id}`} className="block truncate text-text-sub hover:text-text-strong hover:underline underline-offset-2">
              {s.name}
            </Link>
          ) : (
            <span className="text-text-soft">No supplier</span>
          );
        },
      },
      {
        id: "status",
        accessorFn: (p) => ({ out: 0, low: 1, healthy: 2 })[stockStatus(p)],
        header: "Status",
        cell: ({ row: { original: p } }) => (p.archived ? <Tag>Archived</Tag> : <StockBadge status={stockStatus(p)} />),
      },
      {
        id: "updatedAt",
        accessorFn: (p) => p.updatedAt,
        header: "Updated",
        meta: { hideBelow: "2xl" },
        cell: ({ getValue }) => <span className="whitespace-nowrap text-xs text-text-sub">{fdate.relative(String(getValue()))}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Actions</span>,
        meta: { className: "w-10", align: "right" },
        cell: ({ row: { original: p } }) => (
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="sm" icon aria-label={`Actions for ${p.name}`}>
                <MoreHoriz />
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem icon={<Eye />} onSelect={() => router.push(`/inventory/${p.id}`)}>
                View details
              </MenuItem>
              {!p.archived && (
                <>
                  <MenuItem icon={<BoxIso />} onSelect={() => setAdjusting(p)}>
                    Adjust stock
                  </MenuItem>
                  <MenuItem icon={<EditPencil />} onSelect={() => setEditing(p)}>
                    Edit product
                  </MenuItem>
                  <MenuItem
                    icon={p.online.available ? <EyeClosed /> : <Globe />}
                    onSelect={() => {
                      useApp.getState().setOnlineAvailability([p.id], !p.online.available);
                      toast.success(p.online.available ? "Hidden from online channels" : "Available online", "Change reaches channels on the next catalog sync.", {
                        action: { label: "Review catalog sync", href: "/online?tab=catalog" },
                      });
                    }}
                  >
                    {p.online.available ? "Hide from online channels" : "Make available online"}
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem icon={<Archive />} danger onSelect={() => setArchiving([p])}>
                    Archive product
                  </MenuItem>
                </>
              )}
              {p.archived && (
                <MenuItem
                  icon={<Undo />}
                  onSelect={() => {
                    useApp.getState().restoreProducts([p.id]);
                    toast.success("Product restored", `${p.name} is back in your active catalog.`);
                  }}
                >
                  Restore product
                </MenuItem>
              )}
            </MenuContent>
          </Menu>
        ),
      },
    ],
    [suppliers, router],
  );

  const noProducts = data.products.length === 0;

  return (
    <>
      <PageHeader
        title="Inventory"
        description={noProducts ? "Your catalog, stock levels and pricing in one place." : `${fmt.plural(counts.all, "active product")} · ${fmt.money0(stats.value)} at cost · ${fmt.money0(stats.retailValue)} at retail`}
        actions={
          <>
            <Button variant="secondary" leftIcon={<Download />} onClick={() => setExporting(filtered)} disabled={noProducts}>
              Export
            </Button>
            <Button variant="primary" leftIcon={<Plus />} onClick={() => setAdding(true)}>
              Add product
            </Button>
          </>
        }
      />

      {noProducts ? (
        <Card>
          <EmptyState
            icon={<BoxIso />}
            title="No products in your catalog yet"
            description="Add products to track stock, set reorder points and sell online. In a live store you'd import them from your POS or a supplier price list."
            action={
              <Button variant="primary" leftIcon={<Plus />} onClick={() => setAdding(true)}>
                Add your first product
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-stroke-soft px-5">
            <TabNav
              items={(
                [
                  ["all", "All products"],
                  ["healthy", "In stock"],
                  ["low", "Low stock"],
                  ["out", "Out of stock"],
                  ["archived", "Archived"],
                ] as [StatusTab, string][]
              ).map(([v, label]) => ({
                label,
                count: counts[v],
                active: status === v,
                tone: (v === "low" || v === "out") && counts[v] > 0 ? ("warning" as const) : undefined,
                onClick: () => {
                  setSelection({});
                  q.set({ status: v === "all" ? null : v, page: null });
                },
              }))}
            />
          </div>

          <div className="flex flex-col gap-3 px-5 py-3.5 lg:flex-row lg:items-center">
            <SearchInput value={searchText} onChange={setSearchText} placeholder="Search name, brand, SKU or barcode" className="w-full lg:w-[320px]" />
            <div className="flex flex-wrap items-center gap-2">
              <FilterMenu label="Category" options={CATEGORIES.map((c) => ({ value: c, label: c, count: data.products.filter((p) => !p.archived && p.category === c).length }))} selected={categories} onChange={(v) => q.set({ category: v, page: null })} />
              <FilterMenu label="Brand" searchable options={brandOptions} selected={brands} onChange={(v) => q.set({ brand: v, page: null })} />
              <FilterMenu
                label="Supplier"
                searchable
                options={[...data.suppliers.map((s) => ({ value: s.id, label: s.name, count: data.products.filter((p) => !p.archived && p.supplierId === s.id).length })), { value: "none", label: "No supplier" }]}
                selected={supplierIds}
                onChange={(v) => q.set({ supplier: v, page: null })}
              />
              <FilterMenu label="Margin" single options={MARGIN_BANDS.map(({ value, label }) => ({ value, label }))} selected={margin ? [margin] : []} onChange={(v) => q.set({ margin: v[0] ?? null, page: null })} />
              {(activeFilters > 0 || search) && (
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Clear all
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 lg:ml-auto">
              <span className="text-sm text-text-sub tnum" aria-live="polite">
                {fmt.plural(filtered.length, "result")}
              </span>
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="secondary" size="sm" leftIcon={<ViewColumns3 />}>
                    Columns
                  </Button>
                </MenuTrigger>
                <MenuContent className="w-[220px]">
                  <MenuLabel>Show columns</MenuLabel>
                  {Object.entries(COLUMN_LABELS).map(([id, label]) => (
                    <MenuCheckboxItem key={id} checked={visibility[id] !== false} onCheckedChange={(v) => setVisibility((s) => ({ ...s, [id]: v }))}>
                      {label}
                    </MenuCheckboxItem>
                  ))}
                  <MenuSeparator />
                  <MenuItem onSelect={() => setVisibility(DEFAULT_HIDDEN)}>Reset to default</MenuItem>
                </MenuContent>
              </Menu>
            </div>
          </div>

          {activeFilters > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-5 pb-3">
              {categories.map((c) => (
                <Tag key={c} onRemove={() => q.set({ category: categories.filter((x) => x !== c) })} removeLabel={`Remove ${c} filter`}>
                  {c}
                </Tag>
              ))}
              {brands.map((b) => (
                <Tag key={b} onRemove={() => q.set({ brand: brands.filter((x) => x !== b) })} removeLabel={`Remove ${b} filter`}>
                  {b}
                </Tag>
              ))}
              {supplierIds.map((s) => (
                <Tag key={s} onRemove={() => q.set({ supplier: supplierIds.filter((x) => x !== s) })} removeLabel="Remove supplier filter">
                  {s === "none" ? "No supplier" : suppliers.get(s)?.name}
                </Tag>
              ))}
              {margin && (
                <Tag onRemove={() => q.set({ margin: null })} removeLabel="Remove margin filter">
                  Margin {MARGIN_BANDS.find((b) => b.value === margin)?.label}
                </Tag>
              )}
            </div>
          )}

          {selectedIds.length > 0 && (
            <div className="sticky top-16 z-20 mx-3 mb-2 flex flex-wrap items-center gap-2 rounded-md bg-bg-strong px-3 py-2 text-sm text-white shadow-lg animate-pop-in" role="region" aria-label="Bulk actions">
              <span className="mr-1 font-medium tnum">{selectedIds.length} selected</span>
              <span className="mx-1 h-4 w-px bg-white/20" />
              {status !== "archived" ? (
                <>
                  <BulkButton onClick={() => setReorderFor(selectedIds)}>Set reorder point</BulkButton>
                  <BulkButton onClick={() => setSupplierFor(selectedIds)} icon={<Truck />}>
                    Change supplier
                  </BulkButton>
                  <BulkButton
                    icon={<Globe />}
                    onClick={() => {
                      useApp.getState().setOnlineAvailability(selectedIds, true);
                      toast.success(`${fmt.plural(selectedIds.length, "product")} available online`, "Changes reach channels on the next catalog sync.", { action: { label: "Review sync", href: "/online?tab=catalog" } });
                    }}
                  >
                    Sell online
                  </BulkButton>
                  <BulkButton
                    icon={<EyeClosed />}
                    onClick={() => {
                      useApp.getState().setOnlineAvailability(selectedIds, false);
                      toast.success(`${fmt.plural(selectedIds.length, "product")} hidden online`, "They'll be removed from channels on the next sync.");
                    }}
                  >
                    Hide online
                  </BulkButton>
                  <BulkButton icon={<Download />} onClick={() => setExporting(selectedProducts)}>
                    Export
                  </BulkButton>
                  <BulkButton icon={<Archive />} danger onClick={() => setArchiving(selectedProducts)}>
                    Archive
                  </BulkButton>
                </>
              ) : (
                <BulkButton
                  icon={<Undo />}
                  onClick={() => {
                    useApp.getState().restoreProducts(selectedIds);
                    toast.success(`${fmt.plural(selectedIds.length, "product")} restored`);
                    setSelection({});
                  }}
                >
                  Restore
                </BulkButton>
              )}
              <button type="button" onClick={() => setSelection({})} className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white">
                <Xmark className="size-4" /> Clear
              </button>
            </div>
          )}

          <DataTable
            caption="Inventory"
            data={filtered}
            columns={columns}
            getRowId={(p) => p.id}
            loading={loading}
            sorting={sorting}
            onSortingChange={(updater) => {
              const next = typeof updater === "function" ? updater(sorting) : updater;
              const s = next[0];
              q.set({ sort: s ? `${s.desc ? "-" : ""}${s.id}` : null, page: null });
              if (s?.id === "value") setVisibility((v) => ({ ...v, value: true }));
            }}
            rowSelection={visibleSelection}
            onRowSelectionChange={setSelection}
            columnVisibility={visibility}
            onColumnVisibilityChange={setVisibility}
            pagination={{ pageIndex: page, pageSize }}
            onPaginationChange={(updater) => {
              const next = typeof updater === "function" ? updater({ pageIndex: page, pageSize }) : updater;
              q.set({ page: next.pageIndex > 0 ? next.pageIndex + 1 : null, size: next.pageSize !== 25 ? next.pageSize : null });
            }}
            onRowClick={(p) => router.push(`/inventory/${p.id}`)}
            rowClassName={(p) => (p.archived ? "opacity-70" : undefined)}
            empty={
              status === "archived" && !search && activeFilters === 0 ? (
                <EmptyState icon={<Archive />} title="No archived products" description="Products you archive are hidden from lists, reports and channels, and can be restored here." />
              ) : (
                <NoResults query={search} onClear={clearAll} what="products" />
              )
            }
          />
        </Card>
      )}

      <ProductFormDialog open={adding} onOpenChange={setAdding} onSaved={(id) => router.push(`/inventory/${id}`)} />
      {editing && <ProductFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} product={editing} />}
      {adjusting && <AdjustStockDialog open={!!adjusting} onOpenChange={(o) => !o && setAdjusting(null)} product={data.products.find((p) => p.id === adjusting.id) ?? adjusting} />}
      <SupplierDialog open={!!supplierFor} onOpenChange={(o) => !o && setSupplierFor(null)} productIds={supplierFor ?? []} title={`Change supplier for ${fmt.plural(supplierFor?.length ?? 0, "product")}`} />
      <BulkReorderDialog ids={reorderFor} onClose={() => setReorderFor(null)} />
      <ArchiveConfirm products={archiving} onClose={() => setArchiving(null)} onDone={() => setSelection({})} />
      <ExportDialog
        open={!!exporting}
        onOpenChange={(o) => !o && setExporting(null)}
        products={exporting ?? []}
        suppliers={suppliers}
        scopeLabel={exporting === filtered ? (activeFilters || search || status !== "all" ? "current filtered view" : "all active products") : "selected products"}
      />
    </>
  );
}

function BulkButton({ children, onClick, icon, danger }: { children: React.ReactNode; onClick: () => void; icon?: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium transition-colors [&_svg]:size-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        danger ? "text-red-200 hover:bg-error-base/25" : "text-white hover:bg-white/10",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function ArchiveConfirm({ products, onClose, onDone }: { products: Product[] | null; onClose: () => void; onDone: () => void }) {
  const archive = useApp((s) => s.archiveProducts);
  const { run } = useAsyncAction();
  const n = products?.length ?? 0;
  return (
    <ConfirmDialog
      open={!!products}
      onOpenChange={(o) => !o && onClose()}
      tone="danger"
      icon={<Archive />}
      title={n === 1 ? `Archive ${products![0].name}?` : `Archive ${n} products?`}
      description="Archived products are hidden from inventory lists, reorder suggestions and online channels. Sales history is kept, and you can restore them any time."
      confirmLabel={n === 1 ? "Archive product" : `Archive ${n} products`}
      onConfirm={async () => {
        const ids = products!.map((p) => p.id);
        const r = await run(() => archive(ids), {
          success: { title: n === 1 ? "Product archived" : `${n} products archived`, description: "Find them under the Archived tab." },
          error: "Couldn't archive",
        });
        if (r.ok) onDone();
        return r.ok;
      }}
    />
  );
}

function BulkReorderDialog({ ids, onClose }: { ids: string[] | null; onClose: () => void }) {
  const bulkUpdate = useApp((s) => s.bulkUpdateProducts);
  const { run, pending } = useAsyncAction();
  const [value, setValue] = useState(10);
  return (
    <Modal
      open={!!ids}
      onOpenChange={(o) => !o && !pending && onClose()}
      title={`Set reorder point for ${fmt.plural(ids?.length ?? 0, "product")}`}
      description="Products at or below this level show as low stock and get reorder suggestions."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending}
            disabled={!Number.isInteger(value) || value < 0}
            onClick={async () => {
              const r = await run(() => bulkUpdate(ids!, { reorderPoint: value }), { success: { title: "Reorder points updated", description: `Set to ${value} for ${fmt.plural(ids!.length, "product")}.` } });
              if (r.ok) onClose();
            }}
          >
            Apply to {ids?.length ?? 0}
          </Button>
        </>
      }
    >
      <Field label="Reorder point" hint="Target stock is raised automatically if it would fall below this.">
        {(f) => <QuantityInput id={f.id} value={value} onChange={setValue} className="w-40" />}
      </Field>
    </Modal>
  );
}
