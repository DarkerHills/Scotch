"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, NavArrowLeft, NavArrowRight } from "iconoir-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SkeletonRows } from "@/components/ui/states";

export interface ColumnMeta {
  className?: string;
  headerClassName?: string;
  align?: "left" | "right" | "center";
  /** Hide below a breakpoint (tablet/mobile column reduction). */
  hideBelow?: "sm" | "md" | "lg" | "xl" | "2xl";
  label?: string;
}

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    className?: string;
    headerClassName?: string;
    align?: "left" | "right" | "center";
    hideBelow?: "sm" | "md" | "lg" | "xl" | "2xl";
    label?: string;
  }
}

const HIDE: Record<NonNullable<ColumnMeta["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
};

export function selectionColumn<T>(): ColumnDef<T> {
  return {
    id: "__select",
    enableSorting: false,
    enableHiding: false,
    size: 40,
    meta: { className: "w-10 pl-5 pr-0", headerClassName: "w-10 pl-5 pr-0" },
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all rows on this page"
        checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(v)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(v) => row.toggleSelected(v)}
      />
    ),
  };
}

const INTERACTIVE = "a,button,input,select,textarea,label,[role=checkbox],[role=switch],[role=menuitem],[data-no-row-click]";

export function DataTable<T>({
  data,
  columns,
  getRowId,
  sorting: sortingProp,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  enableRowSelection,
  columnVisibility,
  onColumnVisibilityChange,
  pagination: paginationProp,
  onPaginationChange,
  pageSizes = [10, 25, 50],
  paginate = true,
  onRowClick,
  loading,
  empty,
  rowClassName,
  className,
  caption,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  getRowId: (row: T) => string;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  enableRowSelection?: boolean | ((row: Row<T>) => boolean);
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  pageSizes?: number[];
  paginate?: boolean;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
  rowClassName?: (row: T) => string | undefined;
  className?: string;
  caption: string;
}) {
  const [innerSorting, setInnerSorting] = useState<SortingState>([]);
  const [innerPagination, setInnerPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: pageSizes[1] ?? 25 });
  const sorting = sortingProp ?? innerSorting;
  const pagination = paginationProp ?? innerPagination;

  // TanStack's hook returns stable-identity helpers; safe to use here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting, rowSelection: rowSelection ?? {}, columnVisibility: columnVisibility ?? {}, pagination },
    onSortingChange: onSortingChange ?? setInnerSorting,
    onRowSelectionChange,
    onColumnVisibilityChange,
    onPaginationChange: onPaginationChange ?? setInnerPagination,
    enableRowSelection: enableRowSelection ?? !!onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(paginate ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    autoResetPageIndex: false,
  });

  const rows = table.getRowModel().rows;
  const total = data.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <div className={className}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta;
                  const sortable = h.column.getCanSort();
                  const dir = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}
                      className={cn(
                        "h-10 whitespace-nowrap border-y border-stroke-soft bg-bg-surface px-3 text-left text-xs font-medium text-text-sub first:pl-5 last:pr-5",
                        meta?.align === "right" && "text-right",
                        meta?.align === "center" && "text-center",
                        meta?.hideBelow && HIDE[meta.hideBelow],
                        meta?.headerClassName,
                      )}
                    >
                      {h.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className={cn(
                            "group inline-flex cursor-pointer items-center gap-1 rounded-xs hover:text-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/30",
                            meta?.align === "right" && "flex-row-reverse",
                            dir && "text-text-strong",
                          )}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <span className={cn("inline-flex size-3.5 items-center", !dir && "opacity-0 group-hover:opacity-60")}>
                            {dir === "desc" ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />}
                          </span>
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          {!loading && (
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  onClick={
                    onRowClick
                      ? (e) => {
                          if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
                          onRowClick(row.original);
                        }
                      : undefined
                  }
                  className={cn(
                    "group/row transition-colors",
                    onRowClick && "cursor-pointer",
                    "hover:bg-bg-surface/80 data-[state=selected]:bg-primary-mute/50",
                    rowClassName?.(row.original),
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta;
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "border-b border-stroke-soft px-3 py-2.5 align-middle text-text-strong first:pl-5 last:pr-5",
                          meta?.align === "right" && "text-right tnum",
                          meta?.align === "center" && "text-center",
                          meta?.hideBelow && HIDE[meta.hideBelow],
                          meta?.className,
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
      {loading && <SkeletonRows />}
      {!loading && rows.length === 0 && empty}
      {paginate && !loading && total > 0 && (
        <div className="flex flex-col gap-3 px-5 py-3 text-sm text-text-sub sm:flex-row sm:items-center sm:justify-between">
          <p className="tnum" aria-live="polite">
            Showing <span className="font-medium text-text-strong">{from}–{to}</span> of <span className="font-medium text-text-strong">{total}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs sm:inline">Rows per page</span>
            <Select
              size="sm"
              aria-label="Rows per page"
              className="h-8 w-[72px]"
              value={String(pageSize)}
              onValueChange={(v) => table.setPagination({ pageIndex: 0, pageSize: Number(v) })}
              options={pageSizes.map((n) => ({ value: String(n), label: String(n) }))}
            />
            <PageButtons page={pageIndex} count={table.getPageCount()} onChange={(p) => table.setPageIndex(p)} />
          </div>
        </div>
      )}
    </div>
  );
}

export function PageButtons({ page, count, onChange }: { page: number; count: number; onChange: (p: number) => void }) {
  if (count <= 1) return null;
  const pages: (number | "…")[] = [];
  for (let i = 0; i < count; i++) {
    if (i === 0 || i === count - 1 || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      <Button size="sm" variant="ghost" icon aria-label="Previous page" disabled={page === 0} onClick={() => onChange(page - 1)}>
        <NavArrowLeft />
      </Button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1 text-text-soft">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p + 1}`}
            className={cn(
              "inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-sm px-2 text-sm tnum transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/30",
              p === page ? "bg-bg-default font-medium text-text-strong ring-1 ring-stroke-mid shadow-xs" : "text-text-sub hover:bg-bg-soft",
            )}
          >
            {p + 1}
          </button>
        ),
      )}
      <Button size="sm" variant="ghost" icon aria-label="Next page" disabled={page >= count - 1} onClick={() => onChange(page + 1)}>
        <NavArrowRight />
      </Button>
    </nav>
  );
}
