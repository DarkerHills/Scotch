"use client";

import { Download, WarningCircle } from "iconoir-react";
import { useMemo, useState } from "react";
import { productMargin, stockStatus, STOCK_STATUS_LABEL } from "@/lib/domain";
import { fmt } from "@/lib/format";
import { simulateRequest } from "@/lib/simulate";
import { toast } from "@/lib/store/toast-store";
import type { Product, Supplier } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Banner } from "@/components/ui/states";

const HEADERS = ["Name", "Size", "SKU", "Barcode", "Category", "Brand", "Stock", "Reorder point", "Unit cost", "Retail price", "Margin", "Supplier", "Status"];

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV export with a preview of exactly what will be downloaded. */
export function ExportDialog({
  open,
  onOpenChange,
  products,
  suppliers,
  scopeLabel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: Product[];
  suppliers: Map<string, Supplier>;
  scopeLabel: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const rows = useMemo(
    () =>
      products.map((p) => [
        p.name,
        p.size,
        p.sku,
        p.barcode,
        p.category,
        p.brand,
        p.stock,
        p.reorderPoint,
        p.unitCost.toFixed(2),
        p.retailPrice.toFixed(2),
        `${(productMargin(p) * 100).toFixed(1)}%`,
        suppliers.get(p.supplierId ?? "")?.name ?? "",
        p.archived ? "Archived" : STOCK_STATUS_LABEL[stockStatus(p)],
      ]),
    [products, suppliers],
  );

  const download = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await simulateRequest({ ms: 600 });
      const csv = [HEADERS, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `scotch-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export ready", `${fmt.plural(rows.length, "product")} saved as CSV.`);
      onOpenChange(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !busy && onOpenChange(o)}
      width="xl"
      icon={<Download />}
      title="Export inventory"
      description={`${fmt.plural(rows.length, "product")} · ${scopeLabel}. The file is generated in your browser.`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" leftIcon={<Download />} loading={busy} onClick={download} disabled={rows.length === 0}>
            {failed ? "Retry download" : "Download CSV"}
          </Button>
        </>
      }
    >
      {failed && (
        <Banner tone="error" icon={<WarningCircle />} title="Export failed" className="mb-4">
          Simulated network error while preparing the file. Select Retry download.
        </Banner>
      )}
      <p className="mb-2 text-xs text-text-sub">Preview (first 8 rows)</p>
      <div className="overflow-auto rounded-md border border-stroke-soft scrollbar-thin">
        <table className="w-full whitespace-nowrap text-xs">
          <thead className="bg-bg-surface">
            <tr>
              {HEADERS.map((h) => (
                <th key={h} scope="col" className="px-3 py-2 text-left font-medium text-text-sub">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-[11px]">
            {rows.slice(0, 8).map((r, i) => (
              <tr key={i} className="border-t border-stroke-soft">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-1.5 text-text-strong">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 8 && <p className="mt-2 text-xs text-text-sub">…and {rows.length - 8} more rows</p>}
    </Modal>
  );
}
