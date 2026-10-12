"use client";

import { Check, Flask, RefreshDouble, Shop, WarningCircle, Xmark } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmt } from "@/lib/format";
import { useAsyncAction } from "@/lib/simulate";
import { useApp, useData } from "@/lib/store/app-store";
import { toast } from "@/lib/store/toast-store";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Banner } from "@/components/ui/states";

export function SettingsPage() {
  const activeId = useApp((s) => s.activeStoreId);
  return <SettingsContent key={activeId} />;
}

function SettingsContent() {
  const data = useData();
  const router = useRouter();
  const failNext = useApp((s) => s.demo.failNext);
  const activeId = useApp((s) => s.activeStoreId);
  const { run, pending, error } = useAsyncAction();
  const [name, setName] = useState(data.profile.name);
  const [address, setAddress] = useState(data.profile.address);
  const [tax, setTax] = useState((data.profile.taxRate * 100).toFixed(2));
  const [threshold, setThreshold] = useState(String(data.profile.approvalThreshold));
  const [tried, setTried] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const errs = {
    name: name.trim().length < 2 ? "Enter a store name" : null,
    address: address.trim().length < 5 ? "Enter the store address" : null,
    tax: !Number.isFinite(Number(tax)) || Number(tax) < 0 || Number(tax) > 20 ? "Enter a rate between 0 and 20%" : null,
    threshold: !Number.isFinite(Number(threshold)) || Number(threshold) < 0 ? "Enter an amount" : null,
  };
  const dirty =
    name !== data.profile.name || address !== data.profile.address || Number(tax) !== Number((data.profile.taxRate * 100).toFixed(2)) || Number(threshold) !== data.profile.approvalThreshold;

  return (
    <>
      <PageHeader title="Settings" description={`Store preferences and demo controls for ${data.profile.name}.`} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Store profile" description="Used on purchase orders, receipts and online listings." icon={<Shop />} />
          <CardBody className="space-y-4">
            {error && (
              <Banner tone="error" icon={<WarningCircle />} title="Settings weren't saved">
                Simulated network error — your changes are kept. Select Save again.
              </Banner>
            )}
            <Field label="Store name" error={tried ? (errs.name ?? undefined) : undefined}>
              {(f) => <Input id={f.id} invalid={f.invalid} value={name} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Field label="Address" error={tried ? (errs.address ?? undefined) : undefined} hint="Default delivery address on new purchase orders">
              {(f) => <Textarea id={f.id} rows={2} invalid={f.invalid} value={address} onChange={(e) => setAddress(e.target.value)} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sales & purchase tax rate" error={tried ? (errs.tax ?? undefined) : undefined}>
                {(f) => <Input id={f.id} type="number" step="0.01" invalid={f.invalid} trailing="%" value={tax} onChange={(e) => setTax(e.target.value)} />}
              </Field>
              <Field label="PO approval threshold" error={tried ? (errs.threshold ?? undefined) : undefined} hint="Purchase orders above this subtotal need approval before they're sent">
                {(f) => <Input id={f.id} type="number" step="50" leading="$" invalid={f.invalid} value={threshold} onChange={(e) => setThreshold(e.target.value)} />}
              </Field>
            </div>
          </CardBody>
          <CardFooter className="justify-end">
            {dirty && <span className="mr-auto text-xs text-text-sub">Unsaved changes</span>}
            <Button
              variant="ghost"
              disabled={!dirty || pending}
              onClick={() => {
                setName(data.profile.name);
                setAddress(data.profile.address);
                setTax((data.profile.taxRate * 100).toFixed(2));
                setThreshold(String(data.profile.approvalThreshold));
                setTried(false);
              }}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              loading={pending}
              disabled={!dirty}
              onClick={async () => {
                setTried(true);
                if (Object.values(errs).some(Boolean)) return;
                await run(() => useApp.getState().updateProfile({ name: name.trim(), address: address.trim(), taxRate: Number(tax) / 100, approvalThreshold: Number(threshold) }), {
                  success: { title: "Settings saved", description: `Approval threshold is ${fmt.money0(Number(threshold))}.` },
                  toastOnError: false,
                });
              }}
            >
              Save changes
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Demo controls" icon={<Flask />} description="Reach states that a healthy store rarely shows." />
            <CardBody className="space-y-4">
              <label className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium text-text-strong">Fail the next request</span>
                  <span className="block text-xs text-text-sub">The next save, submit, receipt or sync errors once; retrying succeeds.</span>
                </span>
                <Switch checked={failNext} onCheckedChange={(v) => useApp.getState().setFailNext(v)} aria-label="Fail the next request" />
              </label>
              <div className="flex flex-col gap-2 border-t border-stroke-soft pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    useApp.getState().switchStore(activeId === "empty" ? "downtown" : "empty");
                    router.push("/");
                  }}
                >
                  {activeId === "empty" ? "Exit empty-state preview" : "Preview empty states"}
                </Button>
                <Button variant="danger-soft" leftIcon={<RefreshDouble />} onClick={() => setResetOpen(true)}>
                  Reset this store&apos;s demo data
                </Button>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="What's real in this demo" />
            <CardBody>
              <ul className="space-y-2 text-sm">
                {[
                  [true, "Inventory, stock, POs and receipts update instantly in your browser"],
                  [true, "Changes persist across refreshes (local storage)"],
                  [false, "No emails, calls or supplier orders are sent"],
                  [false, "No payments, marketplaces or accounts are connected"],
                  [false, "Recommendations are rule-based, not machine learning"],
                ].map(([ok, t]) => (
                  <li key={String(t)} className="flex gap-2.5">
                    <span className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full ${ok ? "bg-success-mute text-success-base" : "bg-bg-soft text-text-sub"}`}>
                      {ok ? <Check className="size-3" strokeWidth={2.5} /> : <Xmark className="size-3" strokeWidth={2.5} />}
                    </span>
                    <span className="text-text-sub">{t}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        tone="danger"
        icon={<RefreshDouble />}
        title="Reset demo data?"
        description="Every change in this store — stock, purchase orders, receipts, channels and settings — is replaced with the original seeded data."
        confirmLabel="Reset data"
        onConfirm={() => {
          useApp.getState().resetStore();
          toast.success("Demo data reset");
        }}
      />
    </>
  );
}
