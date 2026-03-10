import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex-shrink-0 border-t border-[rgb(var(--ec-page-border))] px-3.5 py-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] disabled:opacity-30 disabled:cursor-not-allowed rounded-md hover:bg-[rgb(var(--ec-content-hover))] transition-colors"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
          Prev
        </button>
        <span className="text-xs tabular-nums text-[rgb(var(--ec-page-text-muted))]">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] disabled:opacity-30 disabled:cursor-not-allowed rounded-md hover:bg-[rgb(var(--ec-content-hover))] transition-colors"
        >
          Next
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
