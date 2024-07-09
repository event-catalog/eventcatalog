import React from 'react';
import ReactDOM from 'react-dom/client';

import type { Column, ColumnDef, ColumnFiltersState, RowData } from '@tanstack/react-table';

import {
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { makeData } from './makeData';
import type { Person } from './makeData';
import { collections } from 'src/content/config';

declare module '@tanstack/react-table' {
  //allows us to define custom properties for our columns
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant2?: any;
  }
}

interface Props {
  collection: any[];
  currentPath: string;
}

function App({ collection, currentPath }: Props) {
  const rerender = React.useReducer(() => ({}), {})[1];

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const columns = React.useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        accessorKey: 'name',
        size: 2,
        cell: (info) => info.getValue(),
      },
    ],
    []
  );

  const newData = collection.map((item: any) => {
    return {
      name: `${item.label} (${item.version})`,
      ...item,
    };
  });

  const [data, setData] = React.useState<Person[]>(newData);
  const refreshData = () => setData((_old) => makeData(100_000)); //stress test

  //   const newData = collection.map((item: any) => {
  //     const { items = [] } = item;
  //     return {
  //       name: 'test'
  //     };
  //   });

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      pagination: {
        pageIndex: 0,
        pageSize: 6
      }
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), //client-side filtering
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(), // client-side faceting
    getFacetedUniqueValues: getFacetedUniqueValues(), // generate unique values for select filter/autocomplete
    getFacetedMinMaxValues: getFacetedMinMaxValues(), // generate min/max values for range filter
    debugTable: true,
    debugHeaders: true,
    debugColumns: false,
  });

  return (
    <ul className=" w-full space-y-2 pb-8">
      <li className="font-semibold capitalize ">Messages ({table.getRowModel().rows.length}/{collection.length})</li>
      <li>
        <table>
          <thead className='pb-2 block w-full'>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className='w-full block'>
                {headerGroup.headers.map((header) => {
                  return (
                    <th key={header.id} colSpan={header.colSpan} className="w-full block">
                      {header.isPlaceholder ? null : (
                        <>
                          {/* <div
                            {...{
                              className: header.column.getCanSort() ? 'cursor-pointer select-none' : '',
                              onClick: header.column.getToggleSortingHandler(),
                            }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: ' 🔼',
                              desc: ' 🔽',
                            }[header.column.getIsSorted() as string] ?? null}
                          </div> */}
                          {header.column.getCanFilter() ? (
                            <div>
                              <Filter column={header.column} />
                            </div>
                          ) : null}
                        </>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="space-y-2 my-4" >
            {table.getRowModel().rows.map((row) => {
              return (
                <tr key={row.id} className="block">
                  {row.getVisibleCells().map((cell) => {
                    const item = row.original;
                    return (
                      <td key={cell.id} class="block w-full">
                        <li
                          className="px-2 w-full text-md xl:text-lg border-l border-gray-200 space-y-2 scroll-m-20"
                          id={item.href}
                        >
                          <a
                            className={`flex justify-between items-center w-full px-2 rounded-md font-normal ${currentPath.includes(item.href) ? 'bg-purple-200 text-purple-800 ' : 'font-thin'}`}
                            href={`${item.href}`}
                          >
                            <span className="block">{item.label}</span>
                            {item.version && (
                              <span className="block text-sm bg-purple-100 p-0.5 px-1 text-gray-600  rounded-md font-light">
                                v{item.version}
                              </span>
                            )}
                          </a>
                          <ul className="hidden xl:block px-4  text-gray-500 text-md space-y-2  ">
                            {item.items.map((heading: any) => {
                              return (
                                <li className="text-xs" key={heading.slug}>
                                  <a href={`${item.href}/#${heading.slug}`}>{heading.text}</a>
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      </td>
                    );
                    return (
                      <td key={cell.id}>
                        {collection.map((item: any) => {
                          return (
                            <li
                              className="px-2 w-full text-md xl:text-lg border-l border-gray-200 space-y-2 scroll-m-20"
                              id={item.href}
                            >
                              <a
                                className={`flex justify-between items-center w-full px-2 rounded-md font-normal ${currentPath.includes(item.href) ? 'bg-purple-200 text-purple-800 ' : 'font-thin'}`}
                                href={`${item.href}`}
                              >
                                <span className="block">{item.label}</span>
                                {item.version && (
                                  <span className="block text-sm bg-purple-100 p-0.5 px-1 text-gray-600  rounded-md font-light">
                                    v{item.version}
                                  </span>
                                )}
                              </a>
                              <ul className="hidden xl:block px-4  text-gray-500 text-md space-y-2  ">
                                {item.items.map((heading: any) => {
                                  return (
                                    <li className="text-xs">
                                      <a href={`${item.href}/#${heading.slug}`}>{heading.text}</a>
                                    </li>
                                  );
                                })}
                              </ul>
                            </li>
                          );
                        })}
                      </td>
                    );

                    // return <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </li>
    </ul>
  );
}

function Filter({ column }: { column: Column<any, unknown> }) {
  const { filterVariant2 } = column.columnDef.meta ?? {};

  const columnFilterValue = column.getFilterValue();

  const sortedUniqueValues = React.useMemo(
    () => (filterVariant2 === 'range' ? [] : Array.from(column.getFacetedUniqueValues().keys()).sort().slice(0, 5000)),
    [column.getFacetedUniqueValues(), filterVariant2]
  );

  return filterVariant2 === 'range' ? (
    <div>
      <div className="flex space-x-2">
        <DebouncedInput
          type="number"
          min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
          max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
          value={(columnFilterValue as [number, number])?.[0] ?? ''}
          onChange={(value) => column.setFilterValue((old: [number, number]) => [value, old?.[1]])}
          placeholder={`Min ${
            column.getFacetedMinMaxValues()?.[0] !== undefined ? `(${column.getFacetedMinMaxValues()?.[0]})` : ''
          }`}
          className="w-24 border shadow rounded"
        />
        <DebouncedInput
          type="number"
          min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
          max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
          value={(columnFilterValue as [number, number])?.[1] ?? ''}
          onChange={(value) => column.setFilterValue((old: [number, number]) => [old?.[0], value])}
          placeholder={`Max ${column.getFacetedMinMaxValues()?.[1] ? `(${column.getFacetedMinMaxValues()?.[1]})` : ''}`}
          className="w-24 border shadow rounded"
        />
      </div>
      <div className="h-1" />
    </div>
  ) : filterVariant2 === 'select' ? (
    <select onChange={(e) => column.setFilterValue(e.target.value)} value={columnFilterValue?.toString()}>
      <option value="">All</option>
      {sortedUniqueValues.map((value) => (
        //dynamically generated select options from faceted values feature
        <option value={value} key={value}>
          {value}
        </option>
      ))}
    </select>
  ) : (
    <>
      {/* Autocomplete suggestions from faceted values feature */}
      <datalist id={column.id + 'list'}>
        {sortedUniqueValues.map((value: any) => (
          <option value={value} key={value} />
        ))}
      </datalist>
      <DebouncedInput
        type="text"
        value={(columnFilterValue ?? '') as string}
        onChange={(value) => column.setFilterValue(value)}
        placeholder={`Search messages... (${column.getFacetedUniqueValues().size})`}
        className="border border-gray-200  rounded text-sm w-full"
        list={column.id + 'list'}
      />
      <div className="h-1" />
    </>
  );
}

// A typical debounced input react component
function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number;
  onChange: (value: string | number) => void;
  debounce?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value]);

  return <input {...props} value={value} onChange={(e) => setValue(e.target.value)} />;
}

export default App;
