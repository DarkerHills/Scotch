"use client";

import { Check, Lock, WarningCircle } from "iconoir-react";
import { useState } from "react";
import { simulateRequest } from "@/lib/simulate";
import { useApp, useData } from "@/lib/store/app-store";
import { toast } from "@/lib/store/toast-store";
import type { Channel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Banner } from "@/components/ui/states";
import { ChannelDot } from "@/features/online/online-page";

const SCOPES = ["Read and update product listings", "Publish prices and stock availability", "Receive new orders and status updates"];

/**
 * Simulated OAuth-style authorization. States clearly that nothing is
 * connected; on "authorize" it just flips the demo channel state.
 */
type ConnectProps = { channel: Channel; open: boolean; onOpenChange: (o: boolean) => void };

export function ConnectDialog(props: ConnectProps) {
  return props.open ? <ConnectBody {...props} /> : null;
}

function ConnectBody({ channel, open, onOpenChange }: ConnectProps) {
  const data = useData();
  const [account, setAccount] = useState(() => channel.accountName || `${data.profile.name.replace(" — ", " ")} (demo)`);
  const [fail, setFail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [tried, setTried] = useState(false);

  const accountErr = tried && account.trim().length < 3 ? "Enter an account name" : undefined;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !busy && onOpenChange(o)}
      icon={<Lock />}
      title={`Connect ${channel.name}`}
      description="Simulated authorization"
      footer={
        <>
          <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm text-text-sub">
            <Checkbox checked={fail} onCheckedChange={setFail} aria-label="Simulate a failed connection" />
            Simulate a failure
          </label>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              setTried(true);
              if (account.trim().length < 3) return;
              setBusy(true);
              setError(false);
              try {
                await simulateRequest({ ms: 1300, forceFail: fail });
                useApp.getState().connectChannel(channel.id, account.trim());
                toast.success(`${channel.name} connected (demo)`, "No external account was connected. Listings were marked live in this demo.");
                onOpenChange(false);
              } catch {
                useApp.getState().setChannelStatus([channel.id], "failed");
                setError(true);
                setFail(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {error ? "Retry authorization" : "Authorize (demo)"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Banner tone="warning" icon={<WarningCircle />} title="This is a demo connection">
          No {channel.name} account will be contacted or connected, and no credentials are requested. Nothing leaves your browser.
        </Banner>
        {error && (
          <Banner tone="error" icon={<WarningCircle />} title="Connection failed">
            The simulated authorization didn&apos;t complete. Select Retry authorization.
          </Banner>
        )}
        <div className="flex items-center gap-3 rounded-md border border-stroke-soft p-4">
          <ChannelDot channel={channel.id} />
          <span className="text-sm text-text-sub">
            <span className="font-medium text-text-strong">Scotch</span> would like to access your {channel.name} store
          </span>
        </div>
        <ul className="space-y-2">
          {SCOPES.map((s) => (
            <li key={s} className="flex items-center gap-2.5 text-sm text-text-strong">
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-success-mute text-success-base">
                <Check className="size-3" strokeWidth={2.5} />
              </span>
              {s}
            </li>
          ))}
        </ul>
        <Field label="Demo account name" error={accountErr} hint="Shown on the integration page. Use any name.">
          {(f) => <Input id={f.id} invalid={f.invalid} value={account} onChange={(e) => setAccount(e.target.value)} />}
        </Field>
      </div>
    </Modal>
  );
}
