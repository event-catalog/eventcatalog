import { useEffect, useState } from 'react';
import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/** Page size for a table, remembered in the browser under `storageKey`. */
export function useStoredPageSize(storageKey: string) {
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window === 'undefined') return 10;
    const stored = Number(window.localStorage.getItem(storageKey));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : 10;
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, String(pageSize));
    }
  }, [pageSize, storageKey]);
  return [pageSize, setPageSize] as const;
}

interface TablePaginationProps<TData> {
  table: Table<TData>;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  /** Horizontal padding, to line up with the table above it (px-6 by default) */
  paddingX?: string;
}

// Previous and next: small outlined square buttons, as Vercel's (and the schema explorer's pagination)
const PAGE_BUTTON =
  'inline-flex h-7 w-7 items-center justify-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] text-[rgb(var(--ec-page-text-muted))] transition-colors hover:bg-[rgb(var(--ec-page-text)/0.05)] hover:text-[rgb(var(--ec-page-text))] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[rgb(var(--ec-page-bg))]';

/** Footer with the result count, page size picker and previous/next page controls. */
export function TablePagination<TData>({ table, pageSize, onPageSizeChange, paddingX = 'px-6' }: TablePaginationProps<TData>) {
  const totalResults = table.getPrePaginationRowModel().rows.length;

  return (
    <div
      className={`flex-shrink-0 flex items-center justify-between ${paddingX} py-3 border-t border-[rgb(var(--ec-page-border))]`}
    >
      <div className="flex items-center gap-3 text-xs text-[rgb(var(--ec-page-text-muted))]">
        {totalResults > 0 && (
          <span>
            <span className="font-medium text-[rgb(var(--ec-page-text))]">{table.getRowModel().rows.length}</span> of{' '}
            <span className="font-medium text-[rgb(var(--ec-page-text))]">{totalResults}</span> results
          </span>
        )}
        {totalResults > 0 && <span aria-hidden className="h-3 w-px bg-[rgb(var(--ec-page-border))]" />}
        <label className="flex items-center gap-1.5">
          <span>Per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="cursor-pointer rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] px-1.5 py-0.5 font-mono text-[11px] text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-page-text)/0.05)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ec-page-text)/0.15)]"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          className={PAGE_BUTTON}
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          title="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-[52px] text-center font-mono text-[11px] tabular-nums text-[rgb(var(--ec-page-text-muted))]">
          <span className="font-medium text-[rgb(var(--ec-page-text))]">{table.getState().pagination.pageIndex + 1}</span>
          {' / '}
          <span>{table.getPageCount() || 1}</span>
        </span>
        <button className={PAGE_BUTTON} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} title="Next page">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
