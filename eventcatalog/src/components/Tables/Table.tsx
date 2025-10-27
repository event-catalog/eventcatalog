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

  return (
    <div>
      {/* <div className='text-right text-gray-400'>{table.getPrePaginationRowModel().rows.length} results</div> */}
      <div className=" bg-gray-100/20 rounded-md border-2 border-gray-200 shadow-sm ">
        <table className="min-w-full divide-y divide-gray-200 rounded-md ">
          <thead className="bg-gray-200/50">
            {table.getHeaderGroups().map((headerGroup, index) => (
              <tr key={`${headerGroup}-${index}`} className="rounded-tl-lg">
                {headerGroup.headers.map((header) => (
                  <th key={`${header.id}`} className="pl-4 pr-3 text-left text-sm font-semibold text-gray-800 sm:pl-0  ">
                    <div className="flex flex-col justify-start px-2 py-2 space-y-2">
                      <div className="text-md">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                      <div className="">
                        {header.column.columnDef.meta?.showFilter !== false && <Filter column={header.column} />}
                        {header.column.columnDef.meta?.showFilter == false && <div className="h-10" />}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-gray-300 ">
            {table.getRowModel().rows.map((row, index) => (
              <tr key={`${row.id}-${index}`}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={` py-4 pl-4 pr-3 text-sm font-medium text-gray-900  ${cell.column.columnDef.meta?.className}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <div className="h-8" />
        <div className="flex items-center gap-2 justify-end px-4  ">
          <button
            className="relative inline-flex items-center rounded-l-md bg-white px-2 py-1 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {'<<'}
          </button>
          <button
            className="relative inline-flex items-center  bg-white px-2 py-1 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {'<'}
          </button>
          <button
            className="relative inline-flex items-center  bg-white px-2 py-1 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {'>'}
          </button>
          <button
            className="relative inline-flex items-center rounded-r-md bg-white px-2 py-1 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            {'>>'}
          </button>
          <span className="flex items-center gap-1">
            <div>Page</div>
            <strong>
              {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </strong>
          </span>
          <span className="flex items-center gap-1">
            | Go to page:
            <input
              type="number"
              defaultValue={table.getState().pagination.pageIndex + 1}
              onChange={(e) => {
                const page = e.target.value ? Number(e.target.value) - 1 : 0;
                table.setPageIndex(page);
              }}
              className="border border-gray-300 p-1 rounded w-16"
            />
          </span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
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
        placeholder={`Search... ${!column?.columnDef?.meta?.filterVariant ? `(${column.getFacetedUniqueValues().size})` : ''}`}
        className="w-full p-2 border shadow rounded"
        list={column.id + 'list'}
      />
      <div className="h-1" />
    </div>
  );
}
