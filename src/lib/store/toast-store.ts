"use client";

import { create } from "zustand";

export type ToastTone = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, "id" | "duration"> & { duration?: number }) => number;
  dismiss: (id: number) => void;
}

let counter = 0;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { duration: t.tone === "error" ? 7000 : 4500, ...t, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

type Opts = Partial<Pick<ToastItem, "action" | "duration">>;

export const toast = {
  success: (title: string, description?: string, opts?: Opts) => useToasts.getState().push({ tone: "success", title, description, ...opts }),
  error: (title: string, description?: string, opts?: Opts) => useToasts.getState().push({ tone: "error", title, description, ...opts }),
  info: (title: string, description?: string, opts?: Opts) => useToasts.getState().push({ tone: "info", title, description, ...opts }),
  warning: (title: string, description?: string, opts?: Opts) => useToasts.getState().push({ tone: "warning", title, description, ...opts }),
};
