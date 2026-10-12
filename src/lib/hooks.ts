"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { inventorySnapshot } from "@/lib/analytics";
import { getSalesHistory } from "@/lib/data/history";
import { onOrderByProduct } from "@/lib/domain";
import { buildRecommendations } from "@/lib/recommendations";
import { useApp, useData } from "@/lib/store/app-store";

export function useHistory() {
  const storeId = useApp((s) => s.activeStoreId);
  return useMemo(() => getSalesHistory(storeId), [storeId]);
}

export function useRecommendations() {
  const data = useData();
  const history = useHistory();
  return useMemo(() => buildRecommendations(data, history), [data, history]);
}

export function useInventoryStats() {
  const products = useData().products;
  return useMemo(() => inventorySnapshot(products), [products]);
}

export function useOnOrder() {
  const pos = useData().purchaseOrders;
  return useMemo(() => onOrderByProduct(pos), [pos]);
}

export function useSupplierMap() {
  const suppliers = useData().suppliers;
  return useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);
}

export function useProductMap() {
  const products = useData().products;
  return useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
}

const visited = new Set<string>();

/**
 * Brief simulated load on the first visit to a screen in this session so
 * skeleton states are visible; instant afterwards.
 */
export function useFirstLoad(key: string, ms = 650) {
  const [loading, setLoading] = useState(() => !visited.has(key));
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      visited.add(key);
      setLoading(false);
    }, ms);
    return () => clearTimeout(t);
  }, [key, ms, loading]);
  return loading;
}

/**
 * Read/write URL search params as UI state (filters, tabs, pagination), so
 * dashboard deep links, refresh and back navigation all restore the view.
 */
export function useQueryState() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const get = useCallback((k: string) => params.get(k) ?? "", [params]);
  const getList = useCallback((k: string) => (params.get(k) ? params.get(k)!.split(",").filter(Boolean) : []), [params]);
  const set = useCallback(
    (patch: Record<string, string | string[] | number | null | undefined>, opts: { push?: boolean } = {}) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        const val = Array.isArray(v) ? v.join(",") : v === null || v === undefined ? "" : String(v);
        if (!val) next.delete(k);
        else next.set(k, val);
      }
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (opts.push) router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [params, pathname, router],
  );
  return { get, getList, set, params };
}
