"use client";

import { WarningTriangle, Xmark } from "iconoir-react";
import { AlertDialog, Dialog } from "radix-ui";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonVariant } from "@/components/ui/button";

const overlay = "fixed inset-0 z-50 bg-neutral-950/30 backdrop-blur-[2px] animate-fade-in";
const panel =
  "fixed left-1/2 top-1/2 z-50 flex max-h-[min(92dvh,860px)] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-stroke-soft bg-bg-default shadow-xl animate-pop-in focus:outline-none";

const WIDTH = { sm: "max-w-[420px]", md: "max-w-[520px]", lg: "max-w-[680px]", xl: "max-w-[880px]" } as const;

/**
 * KernUI modal: radius-xl, soft stroke, header / scrollable body / footer.
 * `onOpenChange` can veto closing (used for unsaved-changes protection).
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  footer,
  width = "md",
  className,
  bodyClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: keyof typeof WIDTH;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content className={cn(panel, WIDTH[width], className)}>
          <div className="flex items-start gap-3 border-b border-stroke-soft px-5 py-4">
            {icon && (
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-soft text-text-sub [&_svg]:size-5">{icon}</span>
            )}
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-medium text-text-strong">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-sm text-text-sub">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" icon aria-label="Close" className="-mr-1.5 -mt-1">
                <Xmark />
              </Button>
            </Dialog.Close>
          </div>
          <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin", bodyClassName)}>{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stroke-soft bg-bg-surface/60 px-5 py-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Confirmation for destructive or consequential actions. Supports async
 * confirm handlers: stays open with a spinner and closes only on success.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  children,
  icon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void | boolean | Promise<boolean | void>;
  children?: ReactNode;
  icon?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const variant: ButtonVariant = tone === "danger" ? "danger" : "primary";
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={overlay} />
        <AlertDialog.Content className={cn(panel, WIDTH.sm)}>
          <div className="px-5 pt-5">
            <span
              className={cn(
                "mb-3 inline-flex size-10 items-center justify-center rounded-full [&_svg]:size-5",
                tone === "danger" ? "bg-error-mute text-error-base" : "bg-primary-mute text-primary-base",
              )}
            >
              {icon ?? <WarningTriangle />}
            </span>
            <AlertDialog.Title className="text-base font-medium text-text-strong">{title}</AlertDialog.Title>
            {description ? (
              <AlertDialog.Description className="mt-1 text-sm text-text-sub">{description}</AlertDialog.Description>
            ) : (
              <AlertDialog.Description className="sr-only">Please confirm</AlertDialog.Description>
            )}
            {children && <div className="mt-3">{children}</div>}
          </div>
          <div className="mt-5 flex justify-end gap-2 border-t border-stroke-soft bg-bg-surface/60 px-5 py-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={busy}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <Button
              variant={variant}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await onConfirm();
                  if (r !== false) onOpenChange(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/** Right-side sheet (Radix Dialog) for explanations and quick detail. */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = "max-w-[460px]",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content className={cn("fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-bg-default shadow-xl animate-slide-in-right focus:outline-none sm:rounded-l-xl", width)}>
          <div className="flex items-start gap-3 border-b border-stroke-soft px-5 py-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-medium text-text-strong">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-sm text-text-sub">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">Details</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" icon aria-label="Close" className="-mr-1.5">
                <Xmark />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t border-stroke-soft px-5 py-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
