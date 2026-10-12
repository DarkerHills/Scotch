"use client";

import { useCallback, useRef, useState } from "react";
import { useApp } from "@/lib/store/app-store";
import { toast } from "@/lib/store/toast-store";

export class SimulatedError extends Error {
  constructor(message = "The request timed out. This is a simulated network error.") {
    super(message);
    this.name = "SimulatedError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Mimics a network round-trip. Fails when the demo's "fail next request"
 * switch is on (or `forceFail` is passed). Callers apply store mutations
 * only after this resolves, so failures never partially modify data.
 */
export async function simulateRequest(opts: { ms?: number; forceFail?: boolean } = {}) {
  const ms = opts.ms ?? 450 + Math.random() * 450;
  await sleep(ms);
  const fail = useApp.getState().consumeFailure() || opts.forceFail;
  if (fail) throw new SimulatedError();
}

interface RunOptions {
  success?: string | { title: string; description?: string };
  error?: string;
  ms?: number;
  forceFail?: boolean;
  /** Show an error toast on failure (default true). */
  toastOnError?: boolean;
}

/** Async action helper with pending + error state and toasts. */
export function useAsyncAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(async <T,>(commit: () => T, opts: RunOptions = {}): Promise<{ ok: true; value: T } | { ok: false }> => {
    if (inFlight.current) return { ok: false };
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      await simulateRequest({ ms: opts.ms, forceFail: opts.forceFail });
      const value = commit();
      if (opts.success) {
        const s = typeof opts.success === "string" ? { title: opts.success } : opts.success;
        toast.success(s.title, s.description);
      }
      return { ok: true, value };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      if (opts.toastOnError !== false) toast.error(opts.error ?? "Couldn't save changes", "Simulated network error — nothing was changed. Try again.");
      return { ok: false };
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);
  return { run, pending, error, reset };
}
