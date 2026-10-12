"use client";

import { CloudSync, WarningCircle } from "iconoir-react";
import { useMemo, useState } from "react";
import { CHANNEL_LABEL } from "@/lib/domain";
import { fmt } from "@/lib/format";
import { simulateRequest } from "@/lib/simulate";
import { useApp, useData } from "@/lib/store/app-store";
import { toast } from "@/lib/store/toast-store";
import type { ChannelId, Product } from "@/lib/types";
import { CHANNEL_IDS } from "@/lib/types";
import { ProductThumb } from "@/components/domain/product-thumb";
import { ChannelStatusBadge } from "@/components/domain/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/dialog";
import { Banner } from "@/components/ui/states";

export interface PendingChange {
  product: Product;
  channel: ChannelId;
  kind: "publish" | "remove" | "retry";
}

/** Listings that differ from what channels have — what the next sync would send. */
export function usePendingChanges() {
  const data = useData();
  return useMemo(() => {
    const out: PendingChange[] = [];
    for (const p of data.products) {
      for (const ch of CHANNEL_IDS) {
        const channel = data.channels.find((c) => c.id === ch);
        if (!channel || channel.status === "disconnected") continue;
        const st = p.online.listings[ch];
        if (st === "pending") out.push({ product: p, channel: ch, kind: p.online.available && !p.archived ? "publish" : "remove" });
        else if (st === "error") out.push({ product: p, channel: ch, kind: "retry" });
      }
    }
    return out;
  }, [data.products, data.channels]);
}

/** Runs a simulated catalog sync for the given channels. */
export async function runSync(ids: ChannelId[], opts: { forceFail?: boolean } = {}) {
  const st = useApp.getState();
  st.setChannelStatus(ids, "syncing");
  try {
    await simulateRequest({ ms: 1700, forceFail: opts.forceFail });
    const n = useApp.getState().completeSync(ids, true);
    toast.success("Catalog synced", `${n ? fmt.plural(n, "listing change") : "No changes"} published to ${ids.map((i) => CHANNEL_LABEL[i]).join(", ")} (simulated).`);
    return true;
  } catch {
    useApp.getState().completeSync(ids, false);
    toast.error("Sync failed", "Simulated timeout. Pending changes were kept — retry when ready.", {
      action: { label: "Retry now", onClick: () => void runSync(ids) },
    });
    return false;
  }
}

const KIND_LABEL: Record<PendingChange["kind"], { label: string; tone: "success" | "neutral" | "warning" }> = {
  publish: { label: "Publish / update", tone: "success" },
  remove: { label: "Remove listing", tone: "neutral" },
  retry: { label: "Retry rejected", tone: "warning" },
};

/** Preview what will sync, choose channels, then run the (simulated) sync. */
type SyncDialogProps = { open: boolean; onOpenChange: (o: boolean) => void; initialChannels?: ChannelId[] };

export function SyncDialog(props: SyncDialogProps) {
  return props.open ? <SyncBody {...props} /> : null;
}

function SyncBody({ open, onOpenChange, initialChannels }: SyncDialogProps) {
  const data = useData();
  const changes = usePendingChanges();
  const [chosen, setChosen] = useState<ChannelId[]>(() => initialChannels ?? data.channels.filter((c) => c.status !== "disconnected").map((c) => c.id));
  const [fail, setFail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const scoped = changes.filter((c) => chosen.includes(c.channel));
  const byProduct = new Map<string, PendingChange[]>();
  for (const c of scoped) byProduct.set(c.product.id, [...(byProduct.get(c.product.id) ?? []), c]);

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !busy && onOpenChange(o)}
      width="lg"
      icon={<CloudSync />}
      title="Sync catalog to channels"
      description="Preview the changes that will be sent. Demo only — no external listings are changed."
      footer={
        <>
          <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm text-text-sub">
            <Checkbox checked={fail} onCheckedChange={setFail} aria-label="Simulate a failed sync" />
            Simulate a failed sync
          </label>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            leftIcon={<CloudSync />}
            loading={busy}
            disabled={chosen.length === 0}
            onClick={async () => {
              setBusy(true);
              const ok = await runSync(chosen, { forceFail: fail });
              setBusy(false);
              if (ok) onOpenChange(false);
              else {
                setFailed(true);
                setFail(false);
              }
            }}
          >
            {failed ? "Retry sync" : scoped.length ? `Sync ${fmt.plural(scoped.length, "change")}` : "Sync now"}
          </Button>
        </>
      }
    >
      {failed && (
        <Banner tone="error" icon={<WarningCircle />} title="Sync failed" className="mb-4">
          The channel timed out (simulated). Nothing was published and every pending change is kept. Select Retry sync.
        </Banner>
      )}
      <fieldset>
        <legend className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-text-soft">Channels</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {data.channels.map((c) => {
            const disabled = c.status === "disconnected";
            const count = changes.filter((x) => x.channel === c.id).length;
            return (
              <label key={c.id} className={`flex cursor-pointer items-start gap-2.5 rounded-md border border-stroke-mid p-3 ${disabled ? "cursor-not-allowed opacity-60" : "hover:bg-bg-surface"}`}>
                <Checkbox
                  checked={chosen.includes(c.id)}
                  disabled={disabled}
                  onCheckedChange={(v) => setChosen((s) => (v ? [...s, c.id] : s.filter((x) => x !== c.id)))}
                  aria-label={`Sync ${c.name}`}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-text-strong">{c.name}</span>
                  <span className="mt-1 block">
                    {disabled ? <ChannelStatusBadge status="disconnected" size="sm" /> : <span className="text-xs text-text-sub">{fmt.plural(count, "pending change")}</span>}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-text-soft">Will sync · {fmt.plural(byProduct.size, "product")}</p>
        {byProduct.size === 0 ? (
          <p className="rounded-md bg-bg-surface px-4 py-6 text-center text-sm text-text-sub">Everything is up to date. Syncing will refresh stock levels and prices only.</p>
        ) : (
          <ul className="max-h-[300px] divide-y divide-stroke-soft overflow-y-auto rounded-md border border-stroke-soft scrollbar-thin">
            {[...byProduct.values()].map((list) => {
              const p = list[0].product;
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <ProductThumb thumb={p.thumb} category={p.category} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-strong">{p.name}</span>
                  <span className="flex flex-wrap justify-end gap-1">
                    {list.map((c) => (
                      <Badge key={c.channel} size="sm" tone={KIND_LABEL[c.kind].tone}>
                        {CHANNEL_LABEL[c.channel].replace("Online ", "")} · {KIND_LABEL[c.kind].label}
                      </Badge>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
