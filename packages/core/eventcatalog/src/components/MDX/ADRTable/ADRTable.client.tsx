import { buildUrl } from '@utils/url-builder';
import { ADR_STATUS_VALUES, adrStatusBadgeColor, formatAdrStatus, type AdrStatus } from '@utils/collections/adr-constants';
import { useState, useMemo, memo, type CSSProperties } from 'react';

type AdrTableItem = {
  id: string;
  name: string;
  version: string;
  status: AdrStatus;
  date: string | null;
  summary: string;
};

type ADRTableProps = {
  adrs: AdrTableItem[];
  limit?: number;
  resourceName: string;
  // React-ready style object for the ADR resource reference (colour + CSS custom
  // props), computed server-side so we match the `[[adr|...]]` wiki reference look
  // without pulling server-only utils into the client bundle.
  refStyle: CSSProperties;
};

type SortKey = 'name' | 'status' | 'date';
type SortDirection = 'asc' | 'desc';

// Tailwind classes per status colour. The colour names come from adrStatusBadgeColor.
const STATUS_BADGE_CLASSES: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-800 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300',
  green: 'bg-green-100 text-green-800 ring-green-600/20 dark:bg-green-500/15 dark:text-green-300',
  red: 'bg-red-100 text-red-800 ring-red-600/20 dark:bg-red-500/15 dark:text-red-300',
  gray: 'bg-gray-100 text-gray-700 ring-gray-500/20 dark:bg-gray-500/15 dark:text-gray-300',
  purple: 'bg-purple-100 text-purple-800 ring-purple-600/20 dark:bg-purple-500/15 dark:text-purple-300',
};

const StatusBadge = memo(({ status }: { status: AdrStatus }) => {
  const color = adrStatusBadgeColor[status] || 'gray';
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE_CLASSES[color] || STATUS_BADGE_CLASSES.gray}`}
    >
      {formatAdrStatus(status)}
    </span>
  );
});

const formatDate = (iso: string | null) => {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' }).format(
    new Date(iso)
  );
};

const AdrRow = memo(({ adr, refStyle }: { adr: AdrTableItem; refStyle: CSSProperties }) => {
  const url = buildUrl(`/docs/adrs/${adr.id}/${adr.version}`);
  return (
    <tr className="group hover:bg-[rgb(var(--ec-content-hover))]">
      <td className="py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 relative">
        <a href={url} className="absolute inset-0 z-10" aria-label={`View details for ${adr.name}`} />
        <span className="rounded px-1 -mx-1 break-words transition-colors hover:bg-[var(--ec-resource-ref-bg)]" style={refStyle}>
          {adr.name}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm relative">
        <a href={url} className="absolute inset-0 z-10" aria-hidden="true" />
        <StatusBadge status={adr.status} />
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-[rgb(var(--ec-page-text-muted))] relative">
        <a href={url} className="absolute inset-0 z-10" aria-hidden="true" />
        <span>{formatDate(adr.date)}</span>
      </td>
      <td className="px-3 py-4 text-sm text-[rgb(var(--ec-page-text-muted))] relative">
        <a href={url} className="absolute inset-0 z-10" aria-hidden="true" />
        <span className="line-clamp-2 break-words">{adr.summary || '-'}</span>
      </td>
    </tr>
  );
});

const FilterButton = memo(
  ({
    status,
    active,
    count,
    onToggle,
  }: {
    status: AdrStatus;
    active: boolean;
    count: number;
    onToggle: (status: AdrStatus) => void;
  }) => (
    <button
      onClick={() => onToggle(status)}
      className={`px-3 py-1 rounded-md text-sm font-medium border border-[rgb(var(--ec-page-border))] ${
        active
          ? 'bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))] hover:bg-[rgb(var(--ec-button-bg-hover))]'
          : 'bg-[rgb(var(--ec-page-bg))] text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))]'
      }`}
    >
      {formatAdrStatus(status)} ({count})
    </button>
  )
);

const SortHeader = ({
  label,
  sortKey,
  activeSort,
  direction,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeSort: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) => {
  const isActive = activeSort === sortKey;
  return (
    <th scope="col" className={className}>
      <button
        onClick={() => onSort(sortKey)}
        className="group inline-flex items-center gap-1 text-left font-semibold text-[rgb(var(--ec-page-text))]"
      >
        {label}
        <span
          className={`text-xs ${isActive ? 'text-[rgb(var(--ec-page-text))]' : 'text-[rgb(var(--ec-page-text-muted))] opacity-0 group-hover:opacity-100'}`}
        >
          {isActive ? (direction === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
};

const ADRTable = ({ adrs, limit, resourceName, refStyle }: ADRTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<AdrStatus>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = limit || 10;

  const toggleStatus = (status: AdrStatus) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
    setCurrentPage(1);
  };

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'date' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  // Counts per status across the full (unfiltered) set, for the filter buttons.
  const statusCounts = useMemo(() => {
    const counts = new Map<AdrStatus, number>();
    adrs.forEach((adr) => counts.set(adr.status, (counts.get(adr.status) || 0) + 1));
    return counts;
  }, [adrs]);

  const availableStatuses = useMemo(
    () => ADR_STATUS_VALUES.filter((status) => (statusCounts.get(status) || 0) > 0),
    [statusCounts]
  );

  const filtered = useMemo(() => {
    let result = adrs;

    if (statusFilters.size > 0) {
      result = result.filter((adr) => statusFilters.has(adr.status));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (adr) =>
          adr.name.toLowerCase().includes(term) ||
          adr.summary.toLowerCase().includes(term) ||
          adr.status.toLowerCase().includes(term)
      );
    }

    const sorted = [...result].sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortKey === 'status') comparison = a.status.localeCompare(b.status);
      else comparison = Number(new Date(a.date || 0)) - Number(new Date(b.date || 0));
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [adrs, statusFilters, searchTerm, sortKey, sortDirection]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = useMemo(() => filtered.slice(startIndex, startIndex + itemsPerPage), [filtered, startIndex, itemsPerPage]);

  const hasFilters = statusFilters.size > 0 || searchTerm.length > 0;

  return (
    <div className="mx-auto not-prose py-4 space-y-4 my-4">
      <div className="flow-root bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] p-4 pb-2 rounded-lg text-[rgb(var(--ec-page-text))]">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Architecture Decision Records ({hasFilters ? `${filtered.length}/${adrs.length}` : adrs.length})
          </h2>
          <span className="text-sm text-[rgb(var(--ec-page-text-muted))]">
            Decisions that apply to this {resourceName}. Search, filter by status, or sort by clicking a column.
          </span>

          {availableStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2">
              {availableStatuses.map((status) => (
                <FilterButton
                  key={status}
                  status={status}
                  active={statusFilters.has(status)}
                  count={statusCounts.get(status) || 0}
                  onToggle={toggleStatus}
                />
              ))}
            </div>
          )}

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-5 w-5 text-[rgb(var(--ec-icon-color))]"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, status, or summary..."
              className="block w-full rounded-md border-0 py-1.5 pl-10 pr-10 text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-input-bg))] ring-1 ring-inset ring-[rgb(var(--ec-input-border))] placeholder:text-[rgb(var(--ec-input-placeholder))] focus:ring-2 focus:ring-inset focus:ring-[rgb(var(--ec-accent))] sm:text-sm sm:leading-6"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                aria-label="Clear search"
              >
                <svg
                  className="h-5 w-5 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-icon-hover))]"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="max-w-full overflow-hidden">
              <table className="min-w-full table-fixed divide-y divide-[rgb(var(--ec-page-border))] rounded-xs bg-[rgb(var(--ec-page-bg))]">
                <thead>
                  <tr>
                    <SortHeader
                      label="Name"
                      sortKey="name"
                      activeSort={sortKey}
                      direction={sortDirection}
                      onSort={onSort}
                      className="w-2/5 py-3.5 pl-4 pr-3 text-left text-sm sm:pl-6"
                    />
                    <SortHeader
                      label="Status"
                      sortKey="status"
                      activeSort={sortKey}
                      direction={sortDirection}
                      onSort={onSort}
                      className="w-[120px] px-3 py-3.5 text-left text-sm"
                    />
                    <SortHeader
                      label="Date"
                      sortKey="date"
                      activeSort={sortKey}
                      direction={sortDirection}
                      onSort={onSort}
                      className="w-[140px] px-3 py-3.5 text-left text-sm"
                    />
                    <th scope="col" className="w-2/5 px-3 py-3.5 text-left text-sm font-semibold text-[rgb(var(--ec-page-text))]">
                      Summary
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--ec-page-border))]">
                  {paginated.length > 0 ? (
                    paginated.map((adr) => <AdrRow key={`${adr.id}-${adr.version}`} adr={adr} refStyle={refStyle} />)
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-sm text-[rgb(var(--ec-page-text-muted))]">
                        No decision records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] px-4 py-3 sm:px-6 -mt-2">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] px-4 py-2 text-sm font-medium ${currentPage === 1 ? 'text-[rgb(var(--ec-page-text-muted))] opacity-50' : 'text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))]'}`}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative ml-3 inline-flex items-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] px-4 py-2 text-sm font-medium ${currentPage === totalPages ? 'text-[rgb(var(--ec-page-text-muted))] opacity-50' : 'text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))]'}`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-[rgb(var(--ec-page-text-muted))]">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(startIndex + itemsPerPage, filtered.length)}</span> of{' '}
                  <span className="font-medium">{filtered.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${currentPage === 1 ? 'text-[rgb(var(--ec-page-text-muted))] opacity-50' : 'text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-content-hover))]'} ring-1 ring-inset ring-[rgb(var(--ec-page-border))]`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${currentPage === totalPages ? 'text-[rgb(var(--ec-page-text-muted))] opacity-50' : 'text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-content-hover))]'} ring-1 ring-inset ring-[rgb(var(--ec-page-border))]`}
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ADRTable;
