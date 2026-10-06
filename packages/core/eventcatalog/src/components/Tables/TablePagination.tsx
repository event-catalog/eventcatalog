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
}

/** Footer with the result count, page size picker and previous/next page controls. */
export function TablePagination<TData>({ table, pageSize, onPageSizeChange }: TablePaginationProps<TData>) {
  const totalResults = table.getPrePaginationRowModel().rows.length;

  return (
    <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-[rgb(var(--ec-page-border))]">
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
            className="cursor-pointer rounded bg-transparent px-1 py-0.5 font-medium text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] focus:bg-[rgb(var(--ec-content-hover))] focus:outline-none"
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
          className="p-1.5 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs tabular-nums text-[rgb(var(--ec-page-text-muted))] min-w-[60px] text-center">
          <span className="font-medium text-[rgb(var(--ec-page-text))]">{table.getState().pagination.pageIndex + 1}</span>
          {' / '}
          <span>{table.getPageCount() || 1}</span>
        </span>
        <button
          className="p-1.5 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
