"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Truck, WarningCircle } from "iconoir-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useAsyncAction } from "@/lib/simulate";
import { useApp } from "@/lib/store/app-store";
import type { Supplier } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { QuantityInput } from "@/components/ui/quantity-input";
import { Select } from "@/components/ui/select";
import { Banner } from "@/components/ui/states";

const schema = z.object({
  name: z.string().trim().min(2, "Enter the supplier's name"),
  contactName: z.string().trim().min(2, "Enter a contact person"),
  contactRole: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number")
    .regex(/^[\d\s()+\-.]+$/, "Use digits, spaces and ( ) - + only"),
  address: z.string().trim().optional(),
  leadTimeDays: z.number({ message: "Enter a lead time" }).int("Whole days only").min(1, "At least 1 day").max(90, "That looks too long"),
  paymentTerms: z.string().min(1, "Choose payment terms"),
  minimumOrder: z.number({ message: "Enter a minimum" }).min(0, "Can't be negative"),
  notes: z.string().optional(),
});
type Form = z.infer<typeof schema>;

const TERMS = ["COD", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60"];

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  supplier?: Supplier;
  onSaved?: (id: string) => void;
}) {
  const addSupplier = useApp((s) => s.addSupplier);
  const updateSupplier = useApp((s) => s.updateSupplier);
  const { run, pending, error, reset } = useAsyncAction();
  const [confirm, setConfirm] = useState(false);
  const defaults = useMemo<Form>(
    () => ({
      name: supplier?.name ?? "",
      contactName: supplier?.contactName ?? "",
      contactRole: supplier?.contactRole ?? "",
      email: supplier?.email ?? "",
      phone: supplier?.phone ?? "",
      address: supplier?.address ?? "",
      leadTimeDays: supplier?.leadTimeDays ?? 7,
      paymentTerms: supplier?.paymentTerms ?? "Net 30",
      minimumOrder: supplier?.minimumOrder ?? 250,
      notes: supplier?.notes ?? "",
    }),
    [supplier],
  );
  const { register, handleSubmit, control, formState, reset: resetForm } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: defaults, mode: "onTouched" });
  const e = formState.errors;

  useEffect(() => {
    if (open) {
      resetForm(defaults);
      reset();
    }
  }, [open, defaults, resetForm, reset]);

  const close = (o: boolean) => {
    if (o) return onOpenChange(true);
    if (pending) return;
    if (formState.isDirty) setConfirm(true);
    else onOpenChange(false);
  };

  const submit = handleSubmit(async (v) => {
    const r = await run(
      () => {
        if (supplier) {
          updateSupplier(supplier.id, { ...v, contactRole: v.contactRole ?? "", address: v.address ?? "", notes: v.notes ?? "" });
          return supplier.id;
        }
        return addSupplier({ ...v, contactRole: v.contactRole ?? "", address: v.address ?? "", notes: v.notes ?? "", categories: [], status: "active" });
      },
      { success: supplier ? { title: "Supplier updated" } : { title: "Supplier added", description: `${v.name} is ready for purchase orders.` }, toastOnError: false },
    );
    if (r.ok) {
      onOpenChange(false);
      onSaved?.(r.value);
    }
  });

  return (
    <>
      <Modal
        open={open}
        onOpenChange={close}
        width="lg"
        icon={<Truck />}
        title={supplier ? `Edit ${supplier.name}` : "Add a supplier"}
        description="Contact details are used for mock emails and calls only."
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} loading={pending}>
              {error ? "Retry save" : supplier ? "Save changes" : "Add supplier"}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} noValidate className="space-y-4">
          {error && (
            <Banner tone="error" icon={<WarningCircle />} title="Couldn't save the supplier">
              Simulated network error — your entries are kept. Select Retry save.
            </Banner>
          )}
          <Field label="Supplier name" error={e.name?.message}>
            {(f) => <Input id={f.id} invalid={f.invalid} aria-describedby={f.describedBy} autoFocus placeholder="e.g. Coastal Wine Co." {...register("name")} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact person" error={e.contactName?.message}>
              {(f) => <Input id={f.id} invalid={f.invalid} aria-describedby={f.describedBy} {...register("contactName")} />}
            </Field>
            <Field label="Role" optional>
              {(f) => <Input id={f.id} placeholder="Account manager" {...register("contactRole")} />}
            </Field>
            <Field label="Email" error={e.email?.message}>
              {(f) => <Input id={f.id} type="email" invalid={f.invalid} aria-describedby={f.describedBy} placeholder="orders@supplier.example" {...register("email")} />}
            </Field>
            <Field label="Phone" error={e.phone?.message}>
              {(f) => <Input id={f.id} type="tel" invalid={f.invalid} aria-describedby={f.describedBy} placeholder="(555) 010-0000" {...register("phone")} />}
            </Field>
          </div>
          <Field label="Address" optional>
            {(f) => <Input id={f.id} {...register("address")} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Lead time (days)" error={e.leadTimeDays?.message}>
              {(f) => <Controller control={control} name="leadTimeDays" render={({ field }) => <QuantityInput id={f.id} value={field.value} onChange={field.onChange} min={1} max={90} invalid={f.invalid} className="w-full" />} />}
            </Field>
            <Field label="Payment terms" error={e.paymentTerms?.message}>
              {(f) => <Controller control={control} name="paymentTerms" render={({ field }) => <Select id={f.id} value={field.value} onValueChange={field.onChange} options={TERMS.map((t) => ({ value: t, label: t }))} />} />}
            </Field>
            <Field label="Minimum order ($)" error={e.minimumOrder?.message}>
              {(f) => <Controller control={control} name="minimumOrder" render={({ field }) => <QuantityInput id={f.id} value={field.value} onChange={field.onChange} step={50} invalid={f.invalid} className="w-full" />} />}
            </Field>
          </div>
          <Field label="Notes" optional>
            {(f) => <Textarea id={f.id} rows={3} {...register("notes")} />}
          </Field>
        </form>
      </Modal>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="danger"
        title="Discard unsaved changes?"
        description="Your edits to this supplier haven't been saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {
          resetForm(defaults);
          onOpenChange(false);
        }}
      />
    </>
  );
}
