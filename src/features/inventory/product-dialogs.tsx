"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BoxIso, Coins, EditPencil, Truck, WarningCircle } from "iconoir-react";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { marginOf, stockStatus, STOCK_STATUS_LABEL } from "@/lib/domain";
import { fmt } from "@/lib/format";
import { useAsyncAction } from "@/lib/simulate";
import { useApp, useData, type StockAdjustment } from "@/lib/store/app-store";
import { CATEGORIES, type Category, type Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StockBadge } from "@/components/domain/status";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/checkbox";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { QuantityInput } from "@/components/ui/quantity-input";
import { Select } from "@/components/ui/select";
import { Banner } from "@/components/ui/states";
import { SegmentedControl } from "@/components/ui/tabs";

/* ── Product form (add + edit) ────────────────────────────── */

const money = z.number({ message: "Enter an amount" }).finite("Enter an amount").positive("Must be greater than $0").max(100000, "That looks too high");
const count = (label: string) => z.number({ message: `Enter ${label}` }).int("Use whole units").min(0, "Can't be negative").max(99999, "That looks too high");

const productSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a product name"),
    brand: z.string().trim().min(1, "Enter a brand"),
    category: z.enum(CATEGORIES, { message: "Choose a category" }),
    size: z.string().trim().min(1, "Enter a size, e.g. 750 ml"),
    sku: z.string().trim().max(24, "Keep SKUs under 24 characters").optional(),
    barcode: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^\d{8,14}$/.test(v), "Barcodes are 8–14 digits"),
    description: z.string().trim().max(600, "Keep it under 600 characters").optional(),
    unitCost: money,
    retailPrice: money,
    stock: count("opening stock"),
    reorderPoint: count("a reorder point"),
    targetStock: count("a target"),
    packSize: z.number({ message: "Enter a case size" }).int("Use whole units").min(1, "At least 1").max(96, "That looks too high"),
    supplierId: z.string().optional(),
    availableOnline: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.retailPrice < v.unitCost) ctx.addIssue({ code: "custom", path: ["retailPrice"], message: "Retail price is below unit cost" });
    if (v.targetStock <= v.reorderPoint) ctx.addIssue({ code: "custom", path: ["targetStock"], message: "Target must be above the reorder point" });
  });

type ProductForm = z.infer<typeof productSchema>;

type ProductFormProps = { open: boolean; onOpenChange: (o: boolean) => void; product?: Product; onSaved?: (id: string) => void };

/** Dialog bodies mount only while open, so their state always starts fresh from props. */
export function ProductFormDialog(props: ProductFormProps) {
  return props.open ? <ProductFormBody {...props} /> : null;
}

function ProductFormBody({ open, onOpenChange, product, onSaved }: ProductFormProps) {
  const data = useData();
  const addProduct = useApp((s) => s.addProduct);
  const updateProduct = useApp((s) => s.updateProduct);
  const { run, pending, error } = useAsyncAction();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const editing = !!product;

  const defaults = useMemo<ProductForm>(
    () =>
      product
        ? {
            name: product.name,
            brand: product.brand,
            category: product.category,
            size: product.size,
            sku: product.sku,
            barcode: product.barcode,
            description: product.description,
            unitCost: product.unitCost,
            retailPrice: product.retailPrice,
            stock: product.stock,
            reorderPoint: product.reorderPoint,
            targetStock: product.targetStock,
            packSize: product.packSize,
            supplierId: product.supplierId ?? "",
            availableOnline: product.online.available,
          }
        : {
            name: "",
            brand: "",
            category: undefined as unknown as Category,
            size: "750 ml",
            sku: "",
            barcode: "",
            description: "",
            unitCost: Number.NaN,
            retailPrice: Number.NaN,
            stock: 0,
            reorderPoint: 6,
            targetStock: 18,
            packSize: 12,
            supplierId: "",
            availableOnline: true,
          },
    [product],
  );

  const form = useForm<ProductForm>({ resolver: zodResolver(productSchema), defaultValues: defaults, mode: "onTouched" });
  const { register, handleSubmit, control, formState, reset: resetForm } = form;
  const errors = formState.errors;
  const [cost, price] = useWatch({ control, name: ["unitCost", "retailPrice"] });
  const margin = Number.isFinite(cost) && Number.isFinite(price) && price > 0 ? marginOf(price, cost) : null;

  const requestClose = (o: boolean) => {
    if (o) return onOpenChange(true);
    if (pending) return;
    if (formState.isDirty) setConfirmDiscard(true);
    else onOpenChange(false);
  };

  const onSubmit = handleSubmit(async (v) => {
    const skuTaken = v.sku && data.products.some((p) => p.sku.toLowerCase() === v.sku!.toLowerCase() && p.id !== product?.id);
    if (skuTaken) {
      form.setError("sku", { message: "Another product already uses this SKU" });
      return;
    }
    const res = await run(
      () => {
        if (editing) {
          updateProduct(product!.id, {
            name: v.name,
            brand: v.brand,
            category: v.category,
            size: v.size,
            sku: v.sku || product!.sku,
            barcode: v.barcode || product!.barcode,
            description: v.description ?? "",
            unitCost: v.unitCost,
            retailPrice: v.retailPrice,
            reorderPoint: v.reorderPoint,
            targetStock: v.targetStock,
            packSize: v.packSize,
            supplierId: v.supplierId || null,
          });
          if (v.availableOnline !== product!.online.available) useApp.getState().setOnlineAvailability([product!.id], v.availableOnline);
          return product!.id;
        }
        return addProduct({ ...v, description: v.description ?? "", supplierId: v.supplierId || null });
      },
      { success: editing ? { title: "Product updated", description: `${v.name} was saved.` } : { title: "Product added", description: `${v.name} is now in your catalog.` }, toastOnError: false },
    );
    if (res.ok) {
      onOpenChange(false);
      onSaved?.(res.value);
    }
  });

  const supplierOptions = [
    { value: "none", label: "No supplier yet" },
    ...data.suppliers.filter((s) => s.status !== "archived").map((s) => ({ value: s.id, label: s.name, description: `${s.leadTimeDays}-day lead time${s.status === "on_hold" ? " · on hold" : ""}` })),
  ];

  return (
    <>
      <Modal
        open={open}
        onOpenChange={requestClose}
        width="lg"
        icon={editing ? <EditPencil /> : <BoxIso />}
        title={editing ? `Edit ${product!.name}` : "Add a product"}
        description={editing ? "Changes apply in store immediately and reach online channels on the next sync." : "Required fields are marked. You can refine details later."}
        footer={
          <>
            {formState.isDirty && !pending && <span className="mr-auto text-xs text-text-sub">Unsaved changes</span>}
            <Button variant="secondary" onClick={() => requestClose(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onSubmit} loading={pending}>
              {error ? "Retry save" : editing ? "Save changes" : "Add product"}
            </Button>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {error && (
            <Banner tone="error" icon={<WarningCircle />} title="Couldn't save the product">
              A simulated network error interrupted the save. Your entries are kept — select “Retry save”.
            </Banner>
          )}
          <fieldset className="space-y-4">
            <legend className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-text-soft">Basics</legend>
            <Field label="Product name" error={errors.name?.message}>
              {(f) => <Input id={f.id} aria-describedby={f.describedBy} invalid={f.invalid} placeholder="e.g. Jameson Irish Whiskey" autoFocus {...register("name")} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Brand" error={errors.brand?.message}>
                {(f) => <Input id={f.id} aria-describedby={f.describedBy} invalid={f.invalid} placeholder="Jameson" {...register("brand")} />}
              </Field>
              <Field label="Category" error={errors.category?.message}>
                {(f) => (
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <Select
                        id={f.id}
                        aria-describedby={f.describedBy}
                        invalid={f.invalid}
                        value={field.value}
                        onValueChange={(v) => field.onChange(v)}
                        placeholder="Choose…"
                        options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                      />
                    )}
                  />
                )}
              </Field>
              <Field label="Size" error={errors.size?.message}>
                {(f) => <Input id={f.id} aria-describedby={f.describedBy} invalid={f.invalid} placeholder="750 ml" {...register("size")} />}
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SKU" optional hint={editing ? undefined : "Leave blank to generate one"} error={errors.sku?.message}>
                {(f) => <Input id={f.id} aria-describedby={f.describedBy} invalid={f.invalid} placeholder="WSK-750-1000" className="font-mono text-[13px]" {...register("sku")} />}
              </Field>
              <Field label="Barcode (UPC/EAN)" optional hint={editing ? undefined : "Leave blank to generate a demo barcode"} error={errors.barcode?.message}>
                {(f) => <Input id={f.id} aria-describedby={f.describedBy} invalid={f.invalid} inputMode="numeric" placeholder="080432400432" className="font-mono text-[13px]" {...register("barcode")} />}
              </Field>
            </div>
            <Field label="Description" optional error={errors.description?.message}>
              {(f) => <Textarea id={f.id} aria-describedby={f.describedBy} invalid={f.invalid} rows={2} placeholder="Tasting notes or shelf-talker copy" {...register("description")} />}
            </Field>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-text-soft">Pricing</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Unit cost" error={errors.unitCost?.message}>
                {(f) => (
                  <Input
                    id={f.id}
                    aria-describedby={f.describedBy}
                    invalid={f.invalid}
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    leading="$"
                    placeholder="0.00"
                    {...register("unitCost", { valueAsNumber: true })}
                  />
                )}
              </Field>
              <Field label="Retail price" error={errors.retailPrice?.message}>
                {(f) => (
                  <Input
                    id={f.id}
                    aria-describedby={f.describedBy}
                    invalid={f.invalid}
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    leading="$"
                    placeholder="0.00"
                    {...register("retailPrice", { valueAsNumber: true })}
                  />
                )}
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-medium text-text-strong">Estimated margin</p>
                <div
                  className={cn(
                    "flex h-10 items-center rounded-10 border border-dashed px-3 text-sm font-medium tnum",
                    margin === null ? "border-stroke-mid text-text-soft" : margin < 0.2 ? "border-warning-base/40 bg-warning-mute text-warning-dark" : "border-success-base/30 bg-success-mute text-success-dark",
                  )}
                  aria-live="polite"
                >
                  {margin === null ? "Enter cost and price" : `${fmt.pct(margin)} · ${fmt.money(price - cost)} per unit`}
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-text-soft">Stock levels</legend>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label={editing ? "On hand" : "Opening stock"} hint={editing ? "Use Adjust stock to change" : undefined} error={errors.stock?.message}>
                {(f) => (
                  <Controller
                    control={control}
                    name="stock"
                    render={({ field }) => <QuantityInput id={f.id} aria-describedby={f.describedBy} value={field.value} onChange={field.onChange} invalid={f.invalid} disabled={editing} className="w-full" />}
                  />
                )}
              </Field>
              <Field label="Reorder point" error={errors.reorderPoint?.message}>
                {(f) => (
                  <Controller control={control} name="reorderPoint" render={({ field }) => <QuantityInput id={f.id} aria-describedby={f.describedBy} value={field.value} onChange={field.onChange} invalid={f.invalid} className="w-full" />} />
                )}
              </Field>
              <Field label="Target stock" error={errors.targetStock?.message}>
                {(f) => (
                  <Controller control={control} name="targetStock" render={({ field }) => <QuantityInput id={f.id} aria-describedby={f.describedBy} value={field.value} onChange={field.onChange} invalid={f.invalid} className="w-full" />} />
                )}
              </Field>
              <Field label="Case size" error={errors.packSize?.message}>
                {(f) => (
                  <Controller control={control} name="packSize" render={({ field }) => <QuantityInput id={f.id} aria-describedby={f.describedBy} value={field.value} onChange={field.onChange} min={1} invalid={f.invalid} className="w-full" />} />
                )}
              </Field>
            </div>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-text-soft">Supplier & online</legend>
            <Field label="Primary supplier" optional>
              {(f) => (
                <Controller
                  control={control}
                  name="supplierId"
                  render={({ field }) => (
                    <Select id={f.id} value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)} options={supplierOptions} />
                  )}
                />
              )}
            </Field>
            <Controller
              control={control}
              name="availableOnline"
              render={({ field }) => (
                <label className="flex cursor-pointer items-start justify-between gap-4 rounded-10 border border-stroke-mid px-3 py-2.5 sm:mt-[26px]">
                  <span>
                    <span className="block text-sm font-medium text-text-strong">Sell online</span>
                    <span className="block text-xs text-text-sub">List on connected channels after the next sync</span>
                  </span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Sell online" />
                </label>
              )}
            />
          </fieldset>
        </form>
      </Modal>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        tone="danger"
        title="Discard unsaved changes?"
        description="You've edited this product. If you leave now, your changes won't be saved."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => {
          resetForm(defaults);
          onOpenChange(false);
        }}
      />
    </>
  );
}

/* ── Stock adjustment ─────────────────────────────────────── */

const REASONS: Record<StockAdjustment["mode"], string[]> = {
  add: ["Received outside a purchase order", "Customer return", "Transfer in from another store", "Count correction"],
  remove: ["Damaged / breakage", "Theft / loss", "Tasting / sample", "Expired or recalled", "Transfer out to another store"],
  set: ["Cycle count", "Full inventory count"],
};

type ProductDialogProps = { open: boolean; onOpenChange: (o: boolean) => void; product: Product };

export function AdjustStockDialog(props: ProductDialogProps) {
  return props.open ? <AdjustStockBody {...props} /> : null;
}

function AdjustStockBody({ open, onOpenChange, product }: ProductDialogProps) {
  const adjustStock = useApp((s) => s.adjustStock);
  const { run, pending, error } = useAsyncAction();
  const [mode, setMode] = useState<StockAdjustment["mode"]>("add");
  const [qty, setQty] = useState<number>(Number.NaN);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const qtyError = !Number.isFinite(qty)
    ? "Enter a quantity"
    : !Number.isInteger(qty)
      ? "Use whole units"
      : mode === "set"
        ? qty < 0
          ? "Can't be negative"
          : null
        : qty <= 0
          ? "Enter at least 1"
          : mode === "remove" && qty > product.stock
            ? `Only ${product.stock} on hand`
            : null;
  const reasonError = !reason ? "Choose a reason" : null;
  const after = !Number.isFinite(qty) ? product.stock : mode === "add" ? product.stock + qty : mode === "remove" ? product.stock - qty : qty;
  const afterStatus = stockStatus({ stock: Math.max(0, after), reorderPoint: product.reorderPoint });

  const submit = async () => {
    setSubmitted(true);
    if (qtyError || reasonError) return;
    const res = await run(() => adjustStock(product.id, { mode, qty, reason, note }), {
      success: { title: "Stock updated", description: `${product.name}: ${product.stock} → ${Math.max(0, after)} on hand.` },
      toastOnError: false,
    });
    if (res.ok) onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !pending && onOpenChange(o)}
      icon={<BoxIso />}
      title="Adjust stock"
      description={`${product.name} · ${product.size}`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={pending}>
            {error ? "Retry" : "Update stock"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <Banner tone="error" icon={<WarningCircle />} title="Stock wasn't updated">
            Simulated network error — nothing changed. Your entries are kept; select Retry.
          </Banner>
        )}
        <SegmentedControl
          aria-label="Adjustment type"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setReason("");
          }}
          options={[
            { value: "add", label: "Add stock" },
            { value: "remove", label: "Remove stock" },
            { value: "set", label: "Set count" },
          ]}
          className="w-full [&>button]:flex-1 [&>button]:justify-center"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={mode === "set" ? "Counted quantity" : "Quantity"} error={submitted ? (qtyError ?? undefined) : undefined}>
            {(f) => <QuantityInput id={f.id} aria-describedby={f.describedBy} value={qty} onChange={setQty} invalid={submitted && !!qtyError} className="w-full" />}
          </Field>
          <Field label="Reason" error={submitted ? (reasonError ?? undefined) : undefined}>
            {(f) => (
              <Select
                id={f.id}
                size="md"
                aria-describedby={f.describedBy}
                invalid={submitted && !!reasonError}
                value={reason || undefined}
                onValueChange={setReason}
                placeholder="Choose a reason…"
                options={REASONS[mode].map((r) => ({ value: r, label: r }))}
              />
            )}
          </Field>
        </div>
        <Field label="Note" optional>
          {(f) => <Textarea id={f.id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Two bottles broken during delivery" />}
        </Field>
        <div className="flex items-center justify-between gap-4 rounded-md bg-bg-surface px-4 py-3">
          <div className="text-sm">
            <span className="text-text-sub">On hand</span>
            <p className="mt-0.5 text-lg font-medium text-text-strong tnum">
              {product.stock} <span className="text-text-soft">→</span> <span className={cn(after < 0 && "text-error-dark")}>{Math.max(0, after)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs text-text-sub">Status after update</p>
            <StockBadge status={afterStatus} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ── Price ────────────────────────────────────────────────── */

export function PriceDialog(props: ProductDialogProps) {
  return props.open ? <PriceBody {...props} /> : null;
}

function PriceBody({ open, onOpenChange, product }: ProductDialogProps) {
  const updateProduct = useApp((s) => s.updateProduct);
  const setOnlinePrice = useApp((s) => s.setOnlinePrice);
  const { run, pending, error } = useAsyncAction();
  const [price, setPrice] = useState(() => product.retailPrice.toFixed(2));
  const [online, setOnline] = useState(() => (product.online.price ?? product.retailPrice).toFixed(2));
  const [separate, setSeparate] = useState(product.online.price !== null);

  const p = Number(price);
  const o = Number(online);
  const priceErr = !price || !Number.isFinite(p) || p <= 0 ? "Enter a price above $0" : p < product.unitCost ? `Below unit cost (${fmt.money(product.unitCost)})` : null;
  const onlineErr = separate && (!online || !Number.isFinite(o) || o <= 0) ? "Enter a price above $0" : separate && o < product.unitCost ? "Below unit cost" : null;

  return (
    <Modal
      open={open}
      onOpenChange={(v) => !pending && onOpenChange(v)}
      icon={<Coins />}
      title="Change price"
      description={`${product.name} · unit cost ${fmt.money(product.unitCost)}`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending}
            disabled={!!priceErr || !!onlineErr}
            onClick={async () => {
              const r = await run(
                () => {
                  updateProduct(product.id, { retailPrice: Math.round(p * 100) / 100 });
                  setOnlinePrice(product.id, separate ? Math.round(o * 100) / 100 : null);
                },
                { success: { title: "Price updated", description: `${product.name} now sells for ${fmt.money(p)} in store.` }, toastOnError: false },
              );
              if (r.ok) onOpenChange(false);
            }}
          >
            {error ? "Retry" : "Save price"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <Banner tone="error" icon={<WarningCircle />} title="Price wasn't saved">
            Simulated network error — select Retry. Your entry is kept.
          </Banner>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="In-store price" error={priceErr ?? undefined}>
            {(f) => <Input id={f.id} invalid={!!priceErr} type="number" step="0.01" leading="$" value={price} onChange={(e) => setPrice(e.target.value)} />}
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium text-text-strong">Margin</p>
            <p className="flex h-10 items-center rounded-10 bg-bg-surface px-3 text-sm font-medium text-text-strong tnum">{priceErr ? "—" : fmt.pct(marginOf(p, product.unitCost))}</p>
          </div>
        </div>
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-10 border border-stroke-mid px-3 py-2.5">
          <span>
            <span className="block text-sm font-medium text-text-strong">Use a different online price</span>
            <span className="block text-xs text-text-sub">Covers delivery-marketplace fees. Applies after the next catalog sync.</span>
          </span>
          <Switch checked={separate} onCheckedChange={setSeparate} aria-label="Use a different online price" />
        </label>
        {separate && (
          <Field label="Online price" error={onlineErr ?? undefined} hint={!onlineErr && o > 0 ? `${fmt.pct(marginOf(o, product.unitCost))} margin online` : undefined}>
            {(f) => <Input id={f.id} invalid={!!onlineErr} type="number" step="0.01" leading="$" value={online} onChange={(e) => setOnline(e.target.value)} />}
          </Field>
        )}
      </div>
    </Modal>
  );
}

/* ── Reorder levels ───────────────────────────────────────── */

type ReorderProps = ProductDialogProps & { velocity: number; leadTime: number };

export function ReorderLevelsDialog(props: ReorderProps) {
  return props.open ? <ReorderLevelsBody {...props} /> : null;
}

function ReorderLevelsBody({ open, onOpenChange, product, velocity, leadTime }: ReorderProps) {
  const updateProduct = useApp((s) => s.updateProduct);
  const { run, pending, error } = useAsyncAction();
  const [rp, setRp] = useState(product.reorderPoint);
  const [target, setTarget] = useState(product.targetStock);
  const suggestedRp = Math.max(3, Math.ceil(velocity * (leadTime + 3)));
  const err = !Number.isInteger(rp) || rp < 0 ? "Enter a whole number" : !Number.isInteger(target) || target <= rp ? "Target must be above the reorder point" : null;
  return (
    <Modal
      open={open}
      onOpenChange={(v) => !pending && onOpenChange(v)}
      icon={<BoxIso />}
      title="Update reorder threshold"
      description="You'll be alerted and see a reorder suggestion when stock reaches the reorder point."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending}
            disabled={!!err}
            onClick={async () => {
              const r = await run(() => updateProduct(product.id, { reorderPoint: rp, targetStock: target }), {
                success: { title: "Reorder threshold updated", description: `Reorder at ${rp}, restock to ${target}.` },
                toastOnError: false,
              });
              if (r.ok) onOpenChange(false);
            }}
          >
            {error ? "Retry" : "Save thresholds"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <Banner tone="error" icon={<WarningCircle />} title="Thresholds weren't saved">
            Simulated network error — select Retry.
          </Banner>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reorder point" error={err && err.startsWith("Enter") ? err : undefined}>
            {(f) => <QuantityInput id={f.id} value={rp} onChange={setRp} className="w-full" />}
          </Field>
          <Field label="Target stock" error={err && err.startsWith("Target") ? err : undefined}>
            {(f) => <QuantityInput id={f.id} value={target} onChange={setTarget} className="w-full" />}
          </Field>
        </div>
        <div className="rounded-md bg-bg-surface px-4 py-3 text-sm text-text-sub">
          Based on {fmt.dec1(velocity)} sales/day and a {leadTime}-day lead time + 3 safety days, a reorder point of{" "}
          <span className="font-medium text-text-strong">{suggestedRp}</span> is suggested.{" "}
          {suggestedRp !== rp && (
            <button type="button" className="cursor-pointer font-medium text-primary-base underline-offset-2 hover:underline" onClick={() => setRp(suggestedRp)}>
              Use {suggestedRp}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ── Supplier ─────────────────────────────────────────────── */

type SupplierDialogProps = { open: boolean; onOpenChange: (o: boolean) => void; productIds: string[]; current?: string | null; title?: string };

export function SupplierDialog(props: SupplierDialogProps) {
  return props.open ? <SupplierBody {...props} /> : null;
}

function SupplierBody({ open, onOpenChange, productIds, current, title = "Change supplier" }: SupplierDialogProps) {
  const data = useData();
  const bulkUpdate = useApp((s) => s.bulkUpdateProducts);
  const { run, pending, error } = useAsyncAction();
  const [value, setValue] = useState<string>(current ?? "");
  const supplier = data.suppliers.find((s) => s.id === value);
  return (
    <Modal
      open={open}
      onOpenChange={(v) => !pending && onOpenChange(v)}
      icon={<Truck />}
      title={title}
      description={productIds.length === 1 ? "Future reorder suggestions and purchase orders will use this supplier." : `Applies to ${productIds.length} selected products.`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending}
            disabled={!value || value === current}
            onClick={async () => {
              const r = await run(() => bulkUpdate(productIds, { supplierId: value }), {
                success: { title: "Supplier updated", description: `${fmt.plural(productIds.length, "product")} now ordered from ${supplier?.name}.` },
                toastOnError: false,
              });
              if (r.ok) onOpenChange(false);
            }}
          >
            {error ? "Retry" : "Save supplier"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && (
          <Banner tone="error" icon={<WarningCircle />} title="Supplier wasn't changed">
            Simulated network error — select Retry.
          </Banner>
        )}
        <Field label="Supplier">
          {(f) => (
            <Select
              id={f.id}
              value={value || undefined}
              onValueChange={setValue}
              placeholder="Choose a supplier…"
              options={data.suppliers
                .filter((s) => s.status !== "archived")
                .map((s) => ({ value: s.id, label: s.name, description: `${s.leadTimeDays}-day lead time · ${s.paymentTerms}${s.status === "on_hold" ? " · on hold" : ""}` }))}
            />
          )}
        </Field>
        {supplier?.status === "on_hold" && (
          <Banner tone="warning" icon={<WarningCircle />} title={`${supplier.name} is on hold`}>
            Reorder suggestions for these products can&apos;t be turned into purchase orders until the account is active.
          </Banner>
        )}
      </div>
    </Modal>
  );
}

export { STOCK_STATUS_LABEL };
