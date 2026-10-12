"use client";

import { CheckCircle, InfoCircle, WarningCircle, WarningTriangle, Xmark } from "iconoir-react";
import Link from "next/link";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useToasts, type ToastItem } from "@/lib/store/toast-store";

const ICON = {
  success: <CheckCircle className="size-5 text-success-base" />,
  error: <WarningCircle className="size-5 text-error-base" />,
  info: <InfoCircle className="size-5 text-info-base" />,
  warning: <WarningTriangle className="size-5 text-warning-base" />,
};

function ToastCard({ t }: { t: ToastItem }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const timer = setTimeout(() => dismiss(t.id), t.duration);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, dismiss]);
  return (
    <div
      role={t.tone === "error" ? "alert" : "status"}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-stroke-soft bg-bg-default p-3.5 pr-2.5 shadow-lg animate-toast-in sm:w-[380px]"
    >
      <span className="mt-px shrink-0">{ICON[t.tone]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-strong">{t.title}</p>
        {t.description && <p className="mt-0.5 text-xs text-text-sub">{t.description}</p>}
        {t.action &&
          (t.action.href ? (
            <Link href={t.action.href} onClick={() => dismiss(t.id)} className="mt-2 inline-block text-xs font-medium text-primary-base underline-offset-2 hover:underline">
              {t.action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                t.action?.onClick?.();
                dismiss(t.id);
              }}
              className="mt-2 inline-block cursor-pointer text-xs font-medium text-primary-base underline-offset-2 hover:underline"
            >
              {t.action.label}
            </button>
          ))}
      </div>
      <button
        type="button"
        onClick={() => dismiss(t.id)}
        aria-label="Dismiss notification"
        className={cn("inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-text-soft hover:bg-bg-soft hover:text-text-strong")}
      >
        <Xmark className="size-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-3 z-[90] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5">
      {toasts.map((t) => (
        <ToastCard key={t.id} t={t} />
      ))}
    </div>
  );
}
