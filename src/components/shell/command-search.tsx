"use client";

import { Command } from "cmdk";
import { BoxIso, Page, Plus, Search, ShoppingBag, Sparks, Truck } from "iconoir-react";
import { Dialog } from "radix-ui";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { CHANNEL_LABEL, poTotal, stockStatus } from "@/lib/domain";
import { fmt } from "@/lib/format";
import { useSupplierMap } from "@/lib/hooks";
import { useData } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { ProductThumb } from "@/components/domain/product-thumb";
import { OrderStatusBadge, POStatusBadge, StockBadge } from "@/components/domain/status";
import { Kbd, Monogram } from "@/components/ui/display";

function score(hay: string, q: string) {
  const h = hay.toLowerCase();
  if (h.startsWith(q)) return 3;
  if (h.includes(` ${q}`)) return 2;
  if (h.includes(q)) return 1;
  return 0;
}

/** Global ⌘K search across products, suppliers, purchase orders and online orders. */
export function CommandSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const data = useData();
  const suppliers = useSupplierMap();
  const router = useRouter();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!query) return null;
    const rank = <T,>(items: T[], text: (t: T) => string, limit: number) =>
      items
        .map((t) => ({ t, s: score(text(t), query) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, limit)
        .map((x) => x.t);
    return {
      products: rank(data.products.filter((p) => !p.archived), (p) => `${p.name} ${p.brand} ${p.sku} ${p.barcode} ${p.category} ${p.size}`, 6),
      suppliers: rank(data.suppliers, (s) => `${s.name} ${s.contactName} ${s.email}`, 4),
      pos: rank(data.purchaseOrders, (po) => `${po.number} ${suppliers.get(po.supplierId)?.name ?? ""}`, 4),
      orders: rank(data.onlineOrders, (o) => `${o.number} ${o.customer.name} ${CHANNEL_LABEL[o.channel]}`, 4),
    };
  }, [query, data, suppliers]);

  const go = (href: string) => {
    onOpenChange(false);
    setQ("");
    router.push(href);
  };
  const total = results ? results.products.length + results.suppliers.length + results.pos.length + results.orders.length : 0;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setQ("");
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-neutral-950/30 backdrop-blur-[2px] animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-[10vh] z-50 w-[calc(100vw-24px)] max-w-[640px] -translate-x-1/2 overflow-hidden rounded-xl border border-stroke-soft bg-bg-default shadow-xl animate-pop-in focus:outline-none">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <Dialog.Description className="sr-only">Search products, suppliers, purchase orders and online orders</Dialog.Description>
          <Command shouldFilter={false} loop label="Global search">
            <div className="flex items-center gap-2.5 border-b border-stroke-soft px-4">
              <Search className="size-5 text-text-soft" />
              <Command.Input
                value={q}
                onValueChange={setQ}
                autoFocus
                placeholder="Search products, SKUs, suppliers, PO or order numbers…"
                className="h-14 flex-1 bg-transparent text-base text-text-strong outline-none placeholder:text-text-soft"
              />
              <Kbd>Esc</Kbd>
            </div>
            <Command.List className="max-h-[min(60vh,480px)] overflow-y-auto p-2 scrollbar-thin">
              {!results && (
                <>
                  <Group heading="Quick actions">
                    <Item value="add-product" onSelect={() => go("/inventory?new=1")} icon={<Plus />} title="Add a product" hint="Inventory" />
                    <Item value="new-po" onSelect={() => go("/purchase-orders/new")} icon={<Truck />} title="Create a purchase order" hint="Suppliers" />
                    <Item value="smart" onSelect={() => go("/analytics/smart-ordering")} icon={<Sparks />} title="Review reorder recommendations" hint="Smart ordering" />
                    <Item value="low" onSelect={() => go("/inventory?status=low")} icon={<BoxIso />} title="Show low-stock products" hint="Inventory" />
                    <Item value="orders" onSelect={() => go("/online?tab=orders")} icon={<ShoppingBag />} title="Open online orders" hint="Online sales" />
                  </Group>
                  <p className="px-3 pb-2 pt-3 text-xs text-text-soft">Tip: try “jameson”, a SKU like “WSK-750”, “PO-1043” or a customer name.</p>
                </>
              )}
              {results && total === 0 && (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-text-strong">No results for “{q.trim()}”</p>
                  <p className="mt-1 text-sm text-text-sub">Search by product name, brand, SKU, barcode, supplier, PO number or order number.</p>
                </div>
              )}
              {results && results.products.length > 0 && (
                <Group heading="Products">
                  {results.products.map((p) => (
                    <Item
                      key={p.id}
                      value={p.id}
                      onSelect={() => go(`/inventory/${p.id}`)}
                      icon={<ProductThumb thumb={p.thumb} category={p.category} size="xs" />}
                      title={`${p.name}`}
                      hint={`${p.size} · ${p.sku} · ${p.stock} in stock`}
                      trailing={<StockBadge status={stockStatus(p)} size="sm" />}
                    />
                  ))}
                </Group>
              )}
              {results && results.suppliers.length > 0 && (
                <Group heading="Suppliers">
                  {results.suppliers.map((s) => (
                    <Item key={s.id} value={s.id} onSelect={() => go(`/suppliers/${s.id}`)} icon={<Monogram text={s.monogram} color={s.color} size="sm" />} title={s.name} hint={`${s.contactName} · ${s.leadTimeDays}-day lead time`} />
                  ))}
                </Group>
              )}
              {results && results.pos.length > 0 && (
                <Group heading="Purchase orders">
                  {results.pos.map((po) => (
                    <Item
                      key={po.id}
                      value={po.id}
                      onSelect={() => go(`/purchase-orders/${po.id}`)}
                      icon={<IconTile><Page /></IconTile>}
                      title={po.number}
                      hint={`${suppliers.get(po.supplierId)?.name ?? "—"} · ${fmt.money(poTotal(po))}`}
                      trailing={<POStatusBadge status={po.status} size="sm" />}
                    />
                  ))}
                </Group>
              )}
              {results && results.orders.length > 0 && (
                <Group heading="Online orders">
                  {results.orders.map((o) => (
                    <Item
                      key={o.id}
                      value={o.id}
                      onSelect={() => go(`/online/orders/${o.id}`)}
                      icon={<IconTile><ShoppingBag /></IconTile>}
                      title={`${o.number} · ${o.customer.name}`}
                      hint={`${CHANNEL_LABEL[o.channel]} · ${fmt.money(o.total)}`}
                      trailing={<OrderStatusBadge status={o.status} size="sm" />}
                    />
                  ))}
                </Group>
              )}
            </Command.List>
            <div className="flex items-center gap-3 border-t border-stroke-soft bg-bg-surface/60 px-4 py-2 text-xs text-text-sub">
              <span className="flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <Kbd>↵</Kbd> open
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Group({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-text-soft"
    >
      {children}
    </Command.Group>
  );
}

function IconTile({ children }: { children: ReactNode }) {
  return <span className="inline-flex size-7 items-center justify-center rounded-sm bg-bg-soft text-text-sub [&_svg]:size-4">{children}</span>;
}

function Item({ value, onSelect, icon, title, hint, trailing }: { value: string; onSelect: () => void; icon: ReactNode; title: string; hint?: string; trailing?: ReactNode }) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn("flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none data-[selected=true]:bg-bg-soft")}
    >
      <span className="inline-flex shrink-0 [&>svg]:size-[18px] [&>svg]:text-text-sub">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-text-strong">{title}</span>
        {hint && <span className="block truncate text-xs text-text-sub">{hint}</span>}
      </span>
      {trailing}
    </Command.Item>
  );
}
