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
  type Row,
} from '@tanstack/react-table';
import type { CollectionEntry } from 'astro:content';
import DebouncedInput from './DebouncedInput';

import { getColumnsByCollection } from './columns';
import { useMemo, useState } from 'react';
import type { CollectionTypes } from '@types';

declare module '@tanstack/react-table' {
  // @ts-ignore
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'collection' | 'name';
    collectionFilterKey?: string;
    showFilter?: boolean;
    className?: string;
  }
}

export const Table = ({
  data: initialData,
  collection,
  mode = 'simple',
}: {
  data: CollectionEntry<'events'>[];
  collection: string;
  mode: 'simple' | 'full';
}) => {
  const [data, _setData] = useState(initialData);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columns = useMemo(() => getColumnsByCollection(collection), [collection]);

  const table = useReactTable({
    // @ts-ignore
    data,
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
    },
  });

  return (
    <>
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
                      {/* @ts-ignore */}
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
    </>
  );
};

function Filter({ column }: { column: Column<any, unknown> }) {
  const { filterVariant, collectionFilterKey = '' } = column.columnDef.meta ?? {};

  const columnFilterValue = column.getFilterValue();

  const sortedUniqueValues = useMemo(() => {
    if (filterVariant === 'collection') {
      const rows = column.getFacetedRowModel().rows;
      const data = rows
        .map((row: Row<CollectionEntry<CollectionTypes>>) => {
          // @ts-ignore
          const items = row.original.data[collectionFilterKey];
          return items as CollectionEntry<CollectionTypes>[];
        })
        .flat();

      const allItems = data.map((item) => `${item.data.name} (v${item.data.version})`);
      const uniqueItemsInList = Array.from(new Set(allItems));

      return uniqueItemsInList.sort().slice(0, 2000);
    }
    if (filterVariant === 'name') {
      const rows = column.getFacetedRowModel().rows;
      const data = rows
        .map((row: Row<CollectionEntry<CollectionTypes>>) => {
          // @ts-ignore
          const data = row.original;
          return data as CollectionEntry<CollectionTypes>;
        })
        .flat();

      const allItems = data.map((item) => `${item.data.name} (v${item.data.version})`);
      const uniqueItemsInList = Array.from(new Set(allItems));

      return uniqueItemsInList.sort().slice(0, 2000);
    }
    return Array.from(column.getFacetedUniqueValues().keys()).sort().slice(0, 2000);
  }, [column.getFacetedUniqueValues(), filterVariant]);

  return (
    <>
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
    </>
  );
}
