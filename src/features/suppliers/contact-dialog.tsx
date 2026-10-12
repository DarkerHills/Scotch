"use client";

import { Mail, Phone, PhoneDisabled, WarningCircle } from "iconoir-react";
import { useEffect, useState } from "react";
import { useAsyncAction } from "@/lib/simulate";
import type { Product, Supplier } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Monogram } from "@/components/ui/display";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Banner } from "@/components/ui/states";
import { SegmentedControl } from "@/components/ui/tabs";

/**
 * Mock supplier contact. Composes an email or starts a simulated call —
 * nothing is sent and no call is placed.
 */
type ContactProps = { open: boolean; onOpenChange: (o: boolean) => void; supplier: Supplier; product?: Product; initialMode?: "email" | "call" };

export function ContactDialog(props: ContactProps) {
  return props.open ? <ContactBody {...props} /> : null;
}

function ContactBody({ open, onOpenChange, supplier, product, initialMode = "email" }: ContactProps) {
  const first = supplier.contactName.split(" ")[0];
  const [mode, setMode] = useState<"email" | "call">(initialMode);
  const [subject, setSubject] = useState(product ? `Availability check: ${product.name} (${product.size})` : "Question about our account");
  const [body, setBody] = useState(
    product
      ? `Hi ${first},\n\nCould you confirm current availability and pricing for ${product.name} (${product.size}, SKU ${product.sku})? We're planning a reorder this week.\n\nThanks,\nAlex — Oak & Barrel`
      : `Hi ${first},\n\n\n\nThanks,\nAlex — Oak & Barrel`,
  );
  const [calling, setCalling] = useState<null | number>(null);
  const [submitted, setSubmitted] = useState(false);
  const { run, pending, error } = useAsyncAction();

  useEffect(() => {
    if (calling === null) return;
    const t = setInterval(() => setCalling((c) => (c === null ? null : c + 1)), 1000);
    return () => clearInterval(t);
  }, [calling]);

  const subjectErr = submitted && !subject.trim() ? "Add a subject" : undefined;
  const bodyErr = submitted && body.trim().length < 5 ? "Write a short message" : undefined;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (pending) return;
        setCalling(null);
        onOpenChange(o);
      }}
      icon={mode === "email" ? <Mail /> : <Phone />}
      title={`Contact ${supplier.name}`}
      description="Demo only — no email is sent and no call is placed."
      width="md"
      footer={
        mode === "email" ? (
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={<Mail />}
              loading={pending}
              onClick={async () => {
                setSubmitted(true);
                if (!subject.trim() || body.trim().length < 5) return;
                const r = await run(() => undefined, {
                  success: { title: "Demo email logged", description: `Nothing was sent to ${supplier.email}.` },
                  toastOnError: false,
                });
                if (r.ok) onOpenChange(false);
              }}
            >
              {error ? "Retry" : "Send (demo)"}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-md bg-bg-surface p-3">
          <Monogram text={supplier.monogram} color={supplier.color} />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-text-strong">{supplier.contactName}</p>
            <p className="truncate text-text-sub">
              {supplier.contactRole} · {supplier.email}
            </p>
          </div>
          <SegmentedControl
            aria-label="Contact method"
            size="xs"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setCalling(null);
            }}
            options={[
              { value: "email", label: "Email" },
              { value: "call", label: "Call" },
            ]}
          />
        </div>
        {mode === "email" ? (
          <>
            {error && (
              <Banner tone="error" icon={<WarningCircle />} title="Couldn't log the email">
                Simulated network error — your draft is kept. Select Retry.
              </Banner>
            )}
            <Field label="To">{(f) => <Input id={f.id} value={supplier.email} readOnly className="bg-bg-surface" />}</Field>
            <Field label="Subject" error={subjectErr}>
              {(f) => <Input id={f.id} invalid={!!subjectErr} value={subject} onChange={(e) => setSubject(e.target.value)} />}
            </Field>
            <Field label="Message" error={bodyErr}>
              {(f) => <Textarea id={f.id} invalid={!!bodyErr} rows={7} value={body} onChange={(e) => setBody(e.target.value)} />}
            </Field>
          </>
        ) : (
          <div className="flex flex-col items-center py-6 text-center">
            <span className={`mb-4 inline-flex size-16 items-center justify-center rounded-full ${calling !== null ? "bg-success-mute text-success-base animate-pulse" : "bg-bg-soft text-text-sub"} [&_svg]:size-7`}>
              <Phone />
            </span>
            <p className="text-2xl font-medium tracking-[-0.01em] text-text-strong tnum">{supplier.phone}</p>
            <p className="mt-1 text-sm text-text-sub">
              {calling === null ? `${supplier.contactName} · ${supplier.contactRole}` : `Simulated call · ${String(Math.floor(calling / 60)).padStart(2, "0")}:${String(calling % 60).padStart(2, "0")}`}
            </p>
            <div className="mt-5">
              {calling === null ? (
                <Button variant="primary" leftIcon={<Phone />} onClick={() => setCalling(0)}>
                  Start demo call
                </Button>
              ) : (
                <Button variant="danger" leftIcon={<PhoneDisabled />} onClick={() => setCalling(null)}>
                  End call
                </Button>
              )}
            </div>
            <p className="mt-4 max-w-xs text-xs text-text-soft">No real call is placed. In production this would open your phone app or a softphone.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
