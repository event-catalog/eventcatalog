import {
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type Column,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import DebouncedInput from './DebouncedInput';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SearchX } from 'lucide-react';

import { getColumnsByCollection } from './columns';
import { useEffect, useMemo, useState } from 'react';
import type { CollectionMessageTypes, TableConfiguration } from '@types';
import { isSameVersion } from '@utils/collections/util';

declare module '@tanstack/react-table' {
  // @ts-ignore
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'collection' | 'name' | 'badges' | 'text';
    collectionFilterKey?:
      | 'producers'
      | 'consumers'
      | 'sends'
      | 'receives'
      | 'services'
      | 'ownedCommands'
      | 'ownedQueries'
      | 'ownedEvents'
      | 'ownedServices'
      | 'associatedTeams'
      | 'servicesThatWriteToContainer'
      | 'servicesThatReadFromContainer';
    filteredItemHasVersion?: boolean;
    showFilter?: boolean;
    className?: string;
  }
}

export type TCollectionTypes = 'domains' | 'services' | CollectionMessageTypes | 'flows' | 'users' | 'teams' | 'containers';

export type TData<T extends TCollectionTypes> = {
  collection: T;
  data: {
    id: string;
    name: string;
    summary: string;
    version: string;
    latestVersion?: string; // Defined on getter collection utility
    draft?: boolean | { title?: string; message: string }; // Draft property from base schema
    badges?: Array<{
      id: string; // Where is it defined?
      content: string;
      backgroundColor: string;
      textColor: string;
      icon: any; // Where is it defined?
    }>;
    // ---------------------------------------------------------------------------
    // Domains
    services?: Array<{
      collection: string; // Be more specific;
      data: {
        id: string;
        name: string;
        version: string;
      };
    }>;
    // ---------------------------------------------------------------------------
    // Services
    receives?: Array<{
      collection: string; // Be more specific;
      data: {
        id: string;
        name: string;
        version: string;
      };
    }>;
    sends?: Array<{
      collection: string; // Be more specific;
      data: {
        id: string;
        name: string;
        version: string;
      };
    }>;
    // ---------------------------------------------------------------------------
    // Messages
    producers?: Array<{
      collection: string; // Specify only 'services'?
      data: {
        id: string;
        name: string;
        version: string;
      };
    }>;
    // Only for messages
    consumers?: Array<{
      collection: string; // Specify only 'services'?
      data: {
        id: string;
        name: string;
        version: string;
      };
    }>;
    // Only for containers
    servicesThatWriteToContainer?: Array<{
      collection: string; // Specify only 'services'?
      data: {
        id: string;
        name: string;
        version: string;
      };
    }>;
    // Only for containers
    servicesThatReadFromContainer?: Array<{
      collection: string; // Specify only 'services'?
      data: {
        id: string;
        name: string;
        version: string;
      };
    }>;
    // ---------------------------------------------------------------------------
    // Users
    avatarUrl?: string;
    email?: string;
    slackDirectMessageUrl?: string;
    msTeamsDirectMessageUrl?: string;
    role?: string;
    ownedCommands: any;
    ownedEvents: any;
    ownedServices: any;
    associatedTeams: any;
    ownedQueries: any;
    // Teams
    members: any;
  };
};

export const Table = <T extends TCollectionTypes>({
  data: initialData,
  collection,
  mode = 'simple',
  checkboxLatestId,
  checkboxDraftsId,
  tableConfiguration,
}: {
  data: TData<T>[];
  collection: T;
  checkboxLatestId: string;
  checkboxDraftsId: string;
  mode?: 'simple' | 'full';
  tableConfiguration?: TableConfiguration;
}) => {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      setColumnFilters([{ id: 'name', value: id }]);
    }
  }, []);

  const [showOnlyLatest, setShowOnlyLatest] = useState(true);
  const [onlyShowDrafts, setOnlyShowDrafts] = useState(false);

  useEffect(() => {
    const checkbox = document.getElementById(checkboxLatestId);
    function handleChange(evt: Event) {
      const checked = (evt.target as HTMLInputElement).checked;
      setShowOnlyLatest(checked);
    }

    checkbox?.addEventListener('change', handleChange);

    return () => checkbox?.removeEventListener('change', handleChange);
  }, [checkboxLatestId]);

  useEffect(() => {
    const checkbox = document.getElementById(checkboxDraftsId);
    function handleChange(evt: Event) {
      const checked = (evt.target as HTMLInputElement).checked;
      setOnlyShowDrafts(checked);
    }

    checkbox?.addEventListener('change', handleChange);

    return () => checkbox?.removeEventListener('change', handleChange);
  }, [checkboxDraftsId]);

  // Filter data based on checkbox states
  const filteredData = useMemo(() => {
    return initialData.filter((row) => {
      // Check if item is a draft
      const isDraft = row.data.draft === true || (typeof row.data.draft === 'object' && row.data.draft !== null);

      // If "Only show drafts" is enabled, show only drafts
      if (onlyShowDrafts && !isDraft) {
        return false;
      }

      // If "Only show drafts" is enabled, don't apply other filters
      if (onlyShowDrafts) {
        return true;
      }

      // Check latest version filter (only when not showing only drafts)
      if (showOnlyLatest) {
        return isSameVersion(row.data.version, row.data.latestVersion);
      }

      return true;
    });
  }, [initialData, showOnlyLatest, onlyShowDrafts]);

  const columns = useMemo(
    () => getColumnsByCollection(collection, tableConfiguration ?? ({ columns: {} } as TableConfiguration)),
    [collection, tableConfiguration]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(), // client-side faceting
    getFacetedUniqueValues: getFacetedUniqueValues(), // generate unique values for select filter/autocomplete
    getFacetedMinMaxValues: getFacetedMinMaxValues(), // generate min/max values for range filter
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      columnFilters,
      columnVisibility: Object.fromEntries(
        Object.entries(tableConfiguration?.columns ?? {}).map(([key, value]) => [key, value.visible ?? true])
      ),
    },
  });

  const totalResults = table.getPrePaginationRowModel().rows.length;
  const hasResults = table.getRowModel().rows.length > 0;

  return (
    <div>
      <div className="rounded-lg border border-[rgb(var(--ec-page-border))] overflow-hidden">
        <table className="min-w-full divide-y divide-[rgb(var(--ec-page-border))]">
          <thead className="bg-[rgb(var(--ec-content-hover))] sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup, index) => (
              <tr key={`${headerGroup}-${index}`}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={`${header.id}`}
                    className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider"
                  >
                    <div className="flex flex-col gap-2">
                      <div>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</div>
                      <div>
                        {header.column.columnDef.meta?.showFilter !== false && <Filter column={header.column} />}
                        {header.column.columnDef.meta?.showFilter == false && <div className="h-9" />}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] divide-y divide-[rgb(var(--ec-page-border))]">
            {hasResults ? (
              table.getRowModel().rows.map((row, index) => (
                <tr key={`${row.id}-${index}`} className="hover:bg-[rgb(var(--ec-content-hover))] transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-4 py-3 text-sm text-[rgb(var(--ec-page-text))] ${cell.column.columnDef.meta?.className || ''}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={table.getAllColumns().length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-[rgb(var(--ec-page-text-muted))]">
                    <SearchX className="w-10 h-10 text-[rgb(var(--ec-icon-color))] mb-3 opacity-50" />
                    <p className="text-sm font-medium text-[rgb(var(--ec-page-text-muted))]">No results found</p>
                    <p className="text-xs text-[rgb(var(--ec-icon-color))] mt-1">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1 py-4">
        <div className="text-sm text-[rgb(var(--ec-page-text-muted))]">
          {totalResults > 0 && (
            <span>
              Showing <span className="font-medium text-[rgb(var(--ec-page-text))]">{table.getRowModel().rows.length}</span> of{' '}
              <span className="font-medium text-[rgb(var(--ec-page-text))]">{totalResults}</span> results
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))]">
            <button
              className="p-2 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors rounded-l-lg"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors border-l border-[rgb(var(--ec-page-border))]"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-2 text-sm text-[rgb(var(--ec-page-text-muted))] border-l border-r border-[rgb(var(--ec-page-border))] min-w-[100px] text-center">
              Page <span className="font-medium text-[rgb(var(--ec-page-text))]">{table.getState().pagination.pageIndex + 1}</span> of{' '}
              <span className="font-medium text-[rgb(var(--ec-page-text))]">{table.getPageCount() || 1}</span>
            </span>
            <button
              className="p-2 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors border-r border-[rgb(var(--ec-page-border))]"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors rounded-r-lg"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="px-3 py-2 text-sm text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-lg hover:border-[rgb(var(--ec-icon-color))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent)/0.2)] transition-colors"
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize} per page
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

function Filter<T extends TCollectionTypes>({ column }: { column: Column<TData<T>, unknown> }) {
  const { filterVariant, collectionFilterKey, filteredItemHasVersion = true } = column.columnDef.meta ?? {};

  const columnFilterValue = column.getFilterValue();

  const sortedUniqueValues = useMemo(() => {
    if (filterVariant === 'collection' && collectionFilterKey) {
      const rows = column.getFacetedRowModel().rows;
      const data = rows.map((row) => row.original.data?.[collectionFilterKey] ?? []).flat();

      const allItems = data.map((item) =>
        filteredItemHasVersion ? `${item?.data.name} (v${item?.data.version})` : `${item?.data.name}`
      );
      const uniqueItemsInList = Array.from(new Set(allItems));

      return uniqueItemsInList.sort().slice(0, 2000);
    }
    if (filterVariant === 'name') {
      const rows = column.getFacetedRowModel().rows;
      const data = rows
        .map((row) => {
          const data = row.original;
          return data;
        })
        .flat();

      const allItems = data.map((item) =>
        filteredItemHasVersion ? `${item.data.name} (v${item.data.version})` : `${item.data.name}`
      );
      const uniqueItemsInList = Array.from(new Set(allItems));

      return uniqueItemsInList.sort().slice(0, 2000);
    }
    if (filterVariant === 'badges') {
      const allBadges = column.getFacetedUniqueValues().keys();
      // join all badges into a single array
      const allBadgesArray = Array.from(allBadges)
        .flat()
        .filter((b) => !!b);
      const allBadgesString = allBadgesArray.map((badge) => badge.content);
      const uniqueBadges = Array.from(new Set(allBadgesString));
      return uniqueBadges.sort().slice(0, 2000);
    }
    return Array.from(column.getFacetedUniqueValues().keys()).sort().slice(0, 2000);
  }, [column.getFacetedUniqueValues(), filterVariant]);

  const uniqueCount = column.getFacetedUniqueValues().size;

  return (
    <div>
      {/* Autocomplete suggestions from faceted values feature */}
      <datalist id={column.id + 'list'}>
        {sortedUniqueValues.map((value: any, index) => (
          <option value={value} key={`${value}-${index}`} />
        ))}
      </datalist>
      <DebouncedInput
        type="text"
        value={(columnFilterValue ?? '') as string}
        onChange={(value) => column.setFilterValue(value)}
        placeholder={!column?.columnDef?.meta?.filterVariant ? `Search (${uniqueCount})...` : 'Search...'}
        className="w-full px-3 py-2 text-sm bg-[rgb(var(--ec-input-bg))] text-[rgb(var(--ec-input-text))] border border-[rgb(var(--ec-input-border))] rounded-lg placeholder:text-[rgb(var(--ec-input-placeholder))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent)/0.2)] focus:border-[rgb(var(--ec-accent))] transition-colors"
        list={column.id + 'list'}
      />
    </div>
  );
}
