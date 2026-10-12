"use client";

import {
  Archive,
  BoxIso,
  Coins,
  EditPencil,
  Globe,
  Mail,
  MoreHoriz,
  NavArrowRight,
  Page,
  Phone,
  Sparks,
  Truck,
  Undo,
  WarningTriangle,
} from "iconoir-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { unitsSeries, velocityOf } from "@/lib/analytics";
import { CHANNEL_LABEL, DEFAULT_LEAD_TIME, marginOf, onlinePrice, poTotal, productMargin, stockStatus } from "@/lib/domain";
import { fdate, fmt } from "@/lib/format";
import { useHistory, useOnOrder, useRecommendations } from "@/lib/hooks";
import { useAsyncAction } from "@/lib/simulate";
import { useApp, useData } from "@/lib/store/app-store";
import { toast } from "@/lib/store/toast-store";
import { CHANNEL_IDS, type MovementType } from "@/lib/types";
import { addDays, cn, isoDate } from "@/lib/utils";
import { BarList, SERIES, TimeSeriesChart } from "@/components/charts/charts";
import { ProductThumb } from "@/components/domain/product-thumb";
import { ChannelStatusBadge, ListingBadge, POStatusBadge, PriorityBadge, StockBadge } from "@/components/domain/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DetailRow } from "@/components/ui/card";
import { Switch } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Monogram, StockMeter } from "@/components/ui/display";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { PageHeader } from "@/components/ui/page-header";
import { Banner, EmptyState } from "@/components/ui/states";
import { ContactDialog } from "@/features/suppliers/contact-dialog";
import { AdjustStockDialog, PriceDialog, ProductFormDialog, ReorderLevelsDialog, SupplierDialog } from "@/features/inventory/product-dialogs";

const MOVEMENT_LABEL: Record<MovementType, string> = {
  receipt: "Received",
  adjustment: "Adjustment",
  online_sale: "Online sale",
  count: "Stock count",
  created: "Created",
};

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const data = useData();
  const router = useRouter();
  const history = useHistory();
  const recs = useRecommendations();
  const onOrder = useOnOrder();
  const product = data.products.find((p) => p.id === id);
  const [dialog, setDialog] = useState<null | "edit" | "adjust" | "price" | "levels" | "supplier" | "archive" | "contact">(null);
  const { run } = useAsyncAction();

  const pid = product?.id;
  const velocity = pid ? velocityOf(history, pid) : 0;
  const series = pid ? unitsSeries(history, pid, 30) : [];
  // Daily POS sales from the shared sales history, merged with recorded movements.
  const salesMovements = series
    .slice(-14)
    .filter((d) => d.units > 0)
    .map((d) => ({ id: `pos-${d.date}`, at: `${d.date}T21:00:00`, type: "pos" as const, qty: -d.units, reason: "In-store sales (POS)" }));

  if (!product) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Not found" }]} title="Product not found" />
        <Card>
          <EmptyState
            icon={<BoxIso />}
            title="This product doesn't exist in this store"
            description="It may belong to another demo store, or the demo data was reset."
            action={
              <Button asChild variant="primary">
                <Link href="/inventory">Back to inventory</Link>
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const status = stockStatus(product);
  const supplier = data.suppliers.find((s) => s.id === product.supplierId) ?? null;
  const leadTime = supplier?.leadTimeDays ?? DEFAULT_LEAD_TIME;
  const daysLeft = velocity > 0 ? product.stock / velocity : Infinity;
  const rec = recs.find((r) => r.product.id === product.id);
  const incoming = onOrder.get(product.id);
  const productPOs = data.purchaseOrders.filter((po) => po.lines.some((l) => l.productId === product.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const draftPO = productPOs.find((po) => po.status === "draft");
  const movements = [
    ...data.movements.filter((m) => m.productId === product.id).map((m) => ({ ...m, kind: "stored" as const })),
    ...salesMovements.map((m) => ({ ...m, kind: "pos" as const })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const units30 = series.reduce((s, d) => s + d.units, 0);

  const startReorder = () => {
    if (!rec || !supplier) return;
    useApp.getState().setPoDraft({
      editingId: null,
      supplierId: supplier.id,
      lines: [{ productId: product.id, qty: rec.qty, unitCost: product.unitCost }],
      expectedAt: isoDate(addDays(new Date(), supplier.leadTimeDays)),
      deliverTo: data.profile.address,
      reference: "",
      notes: "",
      source: "product",
      dirty: true,
    });
    router.push("/purchase-orders/new?step=2");
  };

  const toggleOnline = async (v: boolean) => {
    await run(() => useApp.getState().setOnlineAvailability([product.id], v), {
      success: { title: v ? "Available online" : "Hidden from online channels", description: "The change reaches channels on the next catalog sync." },
    });
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: product.category, href: `/inventory?category=${encodeURIComponent(product.category)}` }, { label: product.name }]}
        leading={<ProductThumb thumb={product.thumb} category={product.category} size="lg" dimmed={product.archived} alt={`${product.name} bottle`} />}
        title={product.name}
        meta={product.archived ? <Badge tone="neutral" look="stroke">Archived</Badge> : <StockBadge status={status} />}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{product.size}</span>
            <span className="font-mono text-xs">SKU {product.sku}</span>
            <span className="font-mono text-xs">UPC {product.barcode}</span>
          </span>
        }
        actions={
          product.archived ? (
            <Button
              variant="primary"
              leftIcon={<Undo />}
              onClick={() => {
                useApp.getState().restoreProducts([product.id]);
                toast.success("Product restored");
              }}
            >
              Restore product
            </Button>
          ) : (
            <>
              <Button variant="secondary" leftIcon={<EditPencil />} onClick={() => setDialog("edit")}>
                Edit
              </Button>
              <Button variant="primary" leftIcon={<BoxIso />} onClick={() => setDialog("adjust")}>
                Adjust stock
              </Button>
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="secondary" icon aria-label="More actions">
                    <MoreHoriz />
                  </Button>
                </MenuTrigger>
                <MenuContent>
                  <MenuItem icon={<Coins />} onSelect={() => setDialog("price")}>
                    Change price
                  </MenuItem>
                  <MenuItem icon={<WarningTriangle />} onSelect={() => setDialog("levels")}>
                    Update reorder threshold
                  </MenuItem>
                  <MenuItem icon={<Truck />} onSelect={() => setDialog("supplier")}>
                    Change supplier
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem icon={<Archive />} danger onSelect={() => setDialog("archive")}>
                    Archive product
                  </MenuItem>
                </MenuContent>
              </Menu>
            </>
          )
        }
      />

      {product.archived && (
        <Banner tone="neutral" icon={<Archive />} title="This product is archived" className="mb-4">
          It&apos;s hidden from inventory lists, reorder suggestions and online channels. History is kept.
        </Banner>
      )}

      {rec && !product.archived && !rec.dismissedAt && (
        <Card className="mb-4 overflow-hidden border-primary-base/15">
          <div className="flex flex-col gap-4 bg-[linear-gradient(100deg,var(--color-primary-mute)_0%,#ffffff_70%)] p-5 md:flex-row md:items-center">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-base text-white [&_svg]:size-5">
              <Sparks />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-medium text-text-strong">{rec.headline}</p>
                <PriorityBadge priority={rec.priority} />
              </div>
              <p className="mt-1 text-sm text-text-sub">{rec.reason}</p>
              {rec.coverage === "ok" ? (
                <p className="mt-2 text-sm text-text-strong">
                  Est. <span className="font-medium">{fmt.money(rec.total)}</span> from <span className="font-medium">{supplier?.name}</span> · arrives around{" "}
                  {fdate.short(addDays(new Date(), leadTime))}
                </p>
              ) : (
                <p className="mt-2 text-sm font-medium text-warning-dark">
                  {rec.coverage === "no_supplier" ? "No supplier assigned — choose one to reorder." : `${supplier?.name} is on hold — choose another supplier to reorder.`}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {rec.coverage === "ok" ? (
                draftPO ? (
                  <Button asChild variant="secondary" leftIcon={<Page />}>
                    <Link href={`/purchase-orders/${draftPO.id}`}>Open draft {draftPO.number}</Link>
                  </Button>
                ) : (
                  <Button variant="primary" leftIcon={<Page />} onClick={startReorder}>
                    Create draft PO
                  </Button>
                )
              ) : (
                <Button variant="primary" leftIcon={<Truck />} onClick={() => setDialog("supplier")}>
                  Assign supplier
                </Button>
              )}
              <Button asChild variant="ghost">
                <Link href={`/analytics/smart-ordering?focus=${product.id}`}>Why this amount?</Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader
                title="Stock"
                action={
                  !product.archived && (
                    <Button size="xs" variant="ghost" onClick={() => setDialog("levels")}>
                      Edit thresholds
                    </Button>
                  )
                }
              />
              <CardBody>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-3xl font-medium tracking-[-0.02em]", status === "out" ? "text-error-dark" : status === "low" ? "text-warning-dark" : "text-text-strong")}>{fmt.int(product.stock)}</span>
                  <span className="text-sm text-text-sub">on hand</span>
                </div>
                <StockMeter stock={product.stock} reorderPoint={product.reorderPoint} target={product.targetStock} className="mt-4" />
                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-text-sub">
                      <span className="h-3 w-0.5 rounded-full bg-warning-base/80" aria-hidden /> Reorder point
                    </dt>
                    <dd className="mt-0.5 font-medium text-text-strong tnum">{product.reorderPoint}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-text-sub">
                      <span className="h-3 w-0.5 rounded-full bg-neutral-400" aria-hidden /> Target
                    </dt>
                    <dd className="mt-0.5 font-medium text-text-strong tnum">{product.targetStock}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-sub">On order</dt>
                    <dd className="mt-0.5 font-medium text-text-strong tnum">{incoming?.qty ?? 0}</dd>
                  </div>
                </dl>
                {incoming && (
                  <div className="mt-4 space-y-1.5">
                    {incoming.poIds.map((pid) => {
                      const po = data.purchaseOrders.find((p) => p.id === pid)!;
                      const line = po.lines.find((l) => l.productId === product.id)!;
                      return (
                        <Link key={pid} href={`/purchase-orders/${pid}`} className="flex items-center gap-2 rounded-sm bg-bg-surface px-3 py-2 text-sm hover:bg-bg-soft">
                          <Truck className="size-4 text-text-sub" />
                          <span className="flex-1">
                            <span className="font-medium text-text-strong">{line.qty - line.receivedQty} incoming</span> <span className="text-text-sub">on {po.number}</span>
                          </span>
                          {po.expectedAt && <span className="text-xs text-text-sub">{fdate.due(po.expectedAt)}</span>}
                          <NavArrowRight className="size-4 text-text-soft" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Sales velocity" description="Trailing 30 days" />
              <CardBody>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-text-sub">Avg. daily sales</p>
                    <p className="mt-0.5 text-3xl font-medium tracking-[-0.02em] text-text-strong">{fmt.dec1(velocity)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-sub">Days of stock left</p>
                    <p className={cn("mt-0.5 text-3xl font-medium tracking-[-0.02em]", Number.isFinite(daysLeft) && daysLeft < leadTime ? "text-error-dark" : "text-text-strong")}>
                      {velocity <= 0 ? "—" : product.stock <= 0 ? "0" : Math.floor(daysLeft)}
                    </p>
                  </div>
                </div>
                <p className="mt-1 text-xs text-text-sub">
                  {fmt.int(units30)} sold in 30 days · {leadTime}-day supplier lead time
                  {Number.isFinite(daysLeft) && velocity > 0 && daysLeft < leadTime && product.stock > 0 && <span className="text-error-dark"> · runs out before a delivery could arrive</span>}
                </p>
                <div className="mt-3">
                  <TimeSeriesChart
                    data={series.map((d) => ({ date: d.date, units: d.units }))}
                    series={[{ key: "units", label: "Units sold", color: SERIES[1], kind: "bar" }]}
                    height={120}
                    format={(n) => fmt.int(n)}
                    tooltipFormat={(n) => `${fmt.int(n)} units`}
                  />
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Stock movement history" description="Receipts, adjustments, counts and daily sales" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <caption className="sr-only">Stock movements for {product.name}</caption>
                <thead>
                  <tr className="border-y border-stroke-soft bg-bg-surface text-left text-xs text-text-sub">
                    <th scope="col" className="px-5 py-2 font-medium">Date</th>
                    <th scope="col" className="px-3 py-2 font-medium">Type</th>
                    <th scope="col" className="px-3 py-2 font-medium">Detail</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Change</th>
                    <th scope="col" className="px-5 py-2 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, 14).map((m) => (
                    <tr key={m.id} className="border-b border-stroke-soft last:border-0">
                      <td className="whitespace-nowrap px-5 py-2.5 text-text-sub">{fdate.dateTime(m.at)}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={m.kind === "pos" ? "neutral" : m.type === "receipt" ? "success" : m.type === "online_sale" ? "verified" : m.qty < 0 ? "warning" : "info"} size="sm">
                          {m.kind === "pos" ? "POS sales" : MOVEMENT_LABEL[m.type as MovementType]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-text-strong">
                        {m.kind === "stored" && m.ref ? (
                          <Link href={m.ref.kind === "po" ? `/purchase-orders/${m.ref.id}` : `/online/orders/${m.ref.id}`} className="hover:underline underline-offset-2">
                            {m.reason} · {m.ref.label}
                          </Link>
                        ) : (
                          m.reason
                        )}
                        {m.kind === "stored" && m.note && <span className="block text-xs text-text-sub">{m.note}</span>}
                      </td>
                      <td className={cn("px-3 py-2.5 text-right font-medium tnum", m.qty > 0 ? "text-success-dark" : m.qty < 0 ? "text-text-strong" : "text-text-sub")}>{fmt.signedInt(m.qty)}</td>
                      <td className="px-5 py-2.5 text-right text-text-sub tnum">{m.kind === "stored" ? m.balance : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {productPOs.length > 0 && (
            <Card>
              <CardHeader title="Purchase orders" description="Orders that include this product" />
              <CardBody className="px-3">
                <ul>
                  {productPOs.slice(0, 5).map((po) => {
                    const line = po.lines.find((l) => l.productId === product.id)!;
                    return (
                      <li key={po.id}>
                        <Link href={`/purchase-orders/${po.id}`} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-bg-surface">
                          <Page className="size-4 text-text-sub" />
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="font-medium text-text-strong">{po.number}</span>
                            <span className="text-text-sub">
                              {" "}
                              · {line.qty} units · {fdate.short(po.createdAt)}
                            </span>
                          </span>
                          <span className="hidden text-sm text-text-sub sm:inline tnum">{fmt.money(poTotal(po))}</span>
                          <POStatusBadge status={po.status} size="sm" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Pricing"
              action={
                !product.archived && (
                  <Button size="xs" variant="ghost" onClick={() => setDialog("price")}>
                    Change price
                  </Button>
                )
              }
            />
            <CardBody>
              <dl className="divide-y divide-stroke-soft">
                <DetailRow label="Unit cost">{fmt.money(product.unitCost)}</DetailRow>
                <DetailRow label="Retail price">{fmt.money(product.retailPrice)}</DetailRow>
                <DetailRow label="Estimated margin">
                  <span className={cn(productMargin(product) < 0.25 && "text-warning-dark")}>
                    {fmt.pct(productMargin(product))} · {fmt.money(product.retailPrice - product.unitCost)}
                  </span>
                </DetailRow>
                <DetailRow label="Online price">
                  {product.online.price === null ? (
                    <span className="font-normal text-text-sub">Same as in store</span>
                  ) : (
                    <>
                      {fmt.money(product.online.price)} <span className="font-normal text-text-sub">· {fmt.pct(marginOf(product.online.price, product.unitCost))}</span>
                    </>
                  )}
                </DetailRow>
                <DetailRow label="Stock value">{fmt.money(product.stock * product.unitCost)}</DetailRow>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Supplier"
              action={
                !product.archived && (
                  <Button size="xs" variant="ghost" onClick={() => setDialog("supplier")}>
                    Change
                  </Button>
                )
              }
            />
            <CardBody>
              {supplier ? (
                <>
                  <Link href={`/suppliers/${supplier.id}`} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-bg-surface">
                    <Monogram text={supplier.monogram} color={supplier.color} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text-strong">{supplier.name}</span>
                      <span className="block text-xs text-text-sub">
                        {supplier.contactName} · {supplier.contactRole}
                      </span>
                    </span>
                    <NavArrowRight className="size-4 text-text-soft" />
                  </Link>
                  {supplier.status === "on_hold" && (
                    <Banner tone="warning" icon={<WarningTriangle />} className="mt-3">
                      Account on hold — new orders can&apos;t be placed.
                    </Banner>
                  )}
                  <dl className="mt-2 divide-y divide-stroke-soft">
                    <DetailRow label="Lead time">{supplier.leadTimeDays} days</DetailRow>
                    <DetailRow label="Payment terms">{supplier.paymentTerms}</DetailRow>
                    <DetailRow label="Case size">{product.packSize} units</DetailRow>
                    <DetailRow label="On-time delivery">{fmt.pct(supplier.onTimeRate, 0)}</DetailRow>
                  </dl>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="secondary" size="sm" leftIcon={<Mail />} onClick={() => setDialog("contact")}>
                      Email
                    </Button>
                    <Button variant="secondary" size="sm" leftIcon={<Phone />} onClick={() => setDialog("contact")}>
                      Call
                    </Button>
                  </div>
                </>
              ) : (
                <EmptyState
                  compact
                  icon={<Truck />}
                  title="No supplier assigned"
                  description="Assign one to get reorder suggestions you can turn into purchase orders."
                  action={
                    <Button size="sm" variant="primary" onClick={() => setDialog("supplier")}>
                      Assign supplier
                    </Button>
                  }
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Online availability"
              action={<Switch checked={product.online.available} disabled={product.archived} onCheckedChange={toggleOnline} aria-label="Available online" />}
            />
            <CardBody>
              <p className="-mt-1 mb-3 text-sm text-text-sub">
                {product.online.available ? `Selling online at ${fmt.money(onlinePrice(product))}.` : "In-store only. Turn on to list on connected channels."}
              </p>
              <ul className="divide-y divide-stroke-soft">
                {CHANNEL_IDS.map((ch) => {
                  const channel = data.channels.find((c) => c.id === ch)!;
                  return (
                    <li key={ch} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                      <Link href={`/integrations/${ch}`} className="flex min-w-0 items-center gap-2 hover:underline underline-offset-2">
                        <Globe className="size-4 shrink-0 text-text-soft" />
                        <span className="truncate text-text-strong">{CHANNEL_LABEL[ch]}</span>
                      </Link>
                      {channel.status === "disconnected" ? (
                        <ChannelStatusBadge status="disconnected" size="sm" />
                      ) : (
                        <ListingBadge status={product.online.listings[ch]} removal={!product.online.available} />
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-text-sub">
                {product.online.lastSyncedAt ? `Last synced ${fdate.relative(product.online.lastSyncedAt)}` : "Never synced"} ·{" "}
                <Link href="/online?tab=catalog" className="font-medium text-text-strong hover:underline underline-offset-2">
                  Manage catalog
                </Link>
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <dl className="divide-y divide-stroke-soft">
                <DetailRow label="Category">{product.category}</DetailRow>
                <DetailRow label="Brand">{product.brand}</DetailRow>
                <DetailRow label="Size">{product.size}</DetailRow>
                <DetailRow label="Case size">{product.packSize}</DetailRow>
                <DetailRow label="Added">{fdate.medium(product.createdAt)}</DetailRow>
              </dl>
              <p className="mt-3 text-sm leading-6 text-text-sub">{product.description}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Category share" description="This product vs. its category, last 30 days" />
            <CardBody>
              <CategoryShare productId={product.id} />
            </CardBody>
          </Card>
        </div>
      </div>

      <ProductFormDialog open={dialog === "edit"} onOpenChange={(o) => setDialog(o ? "edit" : null)} product={product} />
      <AdjustStockDialog open={dialog === "adjust"} onOpenChange={(o) => setDialog(o ? "adjust" : null)} product={product} />
      <PriceDialog open={dialog === "price"} onOpenChange={(o) => setDialog(o ? "price" : null)} product={product} />
      <ReorderLevelsDialog open={dialog === "levels"} onOpenChange={(o) => setDialog(o ? "levels" : null)} product={product} velocity={velocity} leadTime={leadTime} />
      <SupplierDialog open={dialog === "supplier"} onOpenChange={(o) => setDialog(o ? "supplier" : null)} productIds={[product.id]} current={product.supplierId} />
      {supplier && <ContactDialog open={dialog === "contact"} onOpenChange={(o) => setDialog(o ? "contact" : null)} supplier={supplier} product={product} />}
      <ConfirmDialog
        open={dialog === "archive"}
        onOpenChange={(o) => setDialog(o ? "archive" : null)}
        tone="danger"
        icon={<Archive />}
        title={`Archive ${product.name}?`}
        description="It'll be hidden from inventory lists, reorder suggestions and online channels. Sales history is kept and you can restore it any time."
        confirmLabel="Archive product"
        onConfirm={async () => {
          const r = await run(() => useApp.getState().archiveProducts([product.id]), { success: { title: "Product archived", description: "Restore it from the Archived tab." }, error: "Couldn't archive" });
          return r.ok;
        }}
      />
    </>
  );
}

function CategoryShare({ productId }: { productId: string }) {
  const data = useData();
  const history = useHistory();
  const product = data.products.find((p) => p.id === productId)!;
  const items = useMemo(() => {
    const peers = data.products.filter((p) => p.category === product.category && !p.archived);
    return peers
      .map((p) => {
        const s = history.units[p.id] ?? [];
        const units = s.slice(-30).reduce((a, b) => a + b, 0);
        return { key: p.id, label: p.id === productId ? <span className="font-medium">{p.name}</span> : p.name, value: units };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [data.products, history, product.category, productId]);
  return <BarList items={items} format={(n) => `${fmt.int(n)} units`} />;
}
