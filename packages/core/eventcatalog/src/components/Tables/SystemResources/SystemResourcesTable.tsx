import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, SearchX } from 'lucide-react';
import { getColorAndIconForCollection } from '@utils/collections/icons';
import { getCollectionTextColorClass } from '@utils/collection-colors';
import { isIconPath, resolveIconUrl } from '@utils/icon';

export type SystemResourceCollection = 'services' | 'flows' | 'entities' | 'containers' | 'events' | 'commands' | 'queries';

export interface SystemResourceItem {
  collection: SystemResourceCollection;
  id: string;
  name: string;
  version: string;
  summary?: string;
  icon?: string;
  href: string;
}

interface SystemResourcesTableProps {
  resources: SystemResourceItem[];
}

const TYPE_LABELS: Record<SystemResourceCollection, string> = {
  services: 'Services',
  flows: 'Flows',
  entities: 'Entities',
  containers: 'Data Stores',
  events: 'Events',
  commands: 'Commands',
  queries: 'Queries',
};

// Order the type filter pills follow on the page.
const TYPE_ORDER: SystemResourceCollection[] = ['services', 'flows', 'entities', 'containers', 'events', 'commands', 'queries'];

// Small icon for a collection type (used in filter pills and the type column).
const CollectionTypeIcon = ({ collection, className }: { collection: SystemResourceCollection; className?: string }) => {
  const { color, Icon } = getColorAndIconForCollection(collection);
  const colorClass = getCollectionTextColorClass(color, 'text-[rgb(var(--ec-icon-color))]');
  return <Icon className={`${className ?? 'h-3.5 w-3.5'} ${colorClass}`} aria-hidden="true" />;
};

const ResourceIcon = ({ item }: { item: SystemResourceItem }) => {
  if (item.icon && isIconPath(item.icon)) {
    return <img src={resolveIconUrl(item.icon)} alt="" className="h-5 w-5" loading="lazy" />;
  }
  return <CollectionTypeIcon collection={item.collection} className="h-5 w-5" />;
};

const columnHelper = createColumnHelper<SystemResourceItem>();

const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) => {
  if (direction === 'asc') return <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />;
  if (direction === 'desc') return <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />;
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />;
};

export function SystemResourcesTable({ resources }: SystemResourcesTableProps) {
  const [search, setSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<SystemResourceCollection[]>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);

  // Only show type filters that actually have resources in this system.
  const availableTypes = useMemo(
    () => TYPE_ORDER.filter((type) => resources.some((resource) => resource.collection === type)),
    [resources]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return resources.filter((resource) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(resource.collection)) {
        return false;
      }
      if (query) {
        const haystack = `${resource.name} ${resource.id} ${resource.summary ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [resources, search, selectedTypes]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => {
          const resource = info.row.original;
          return (
            <a href={resource.href} className="group flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))]">
                <ResourceIcon item={resource} />
              </span>
              <span className="text-sm font-medium text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-accent))]">
                {resource.name}
              </span>
            </a>
          );
        },
      }),
      columnHelper.accessor((row) => TYPE_LABELS[row.collection], {
        id: 'type',
        header: 'Type',
        cell: (info) => {
          const { collection } = info.row.original;
          return (
            <span className="inline-flex items-center gap-1.5 text-sm text-[rgb(var(--ec-page-text-muted))]">
              <CollectionTypeIcon collection={collection} />
              {TYPE_LABELS[collection]}
            </span>
          );
        },
      }),
      columnHelper.accessor('version', {
        header: 'Version',
        cell: (info) => (
          <span className="inline-flex items-center rounded-md border border-[rgb(var(--ec-page-border))] px-2 py-0.5 text-xs text-[rgb(var(--ec-page-text-muted))]">
            v{info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor((row) => row.summary ?? '', {
        id: 'summary',
        header: 'Summary',
        enableSorting: false,
        cell: (info) => (
          <span className="line-clamp-2 text-sm text-[rgb(var(--ec-page-text-muted))]">{info.getValue() || '-'}</span>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const toggleType = (type: SystemResourceCollection) => {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls: search + type filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--ec-icon-color))]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search resources..."
            className="w-full rounded-md border border-[rgb(var(--ec-input-border))] bg-[rgb(var(--ec-input-bg))] py-2 pl-9 pr-3 text-sm text-[rgb(var(--ec-input-text))] placeholder:text-[rgb(var(--ec-page-text-muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent)/0.4)]"
          />
        </div>

        {availableTypes.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {availableTypes.map((type) => {
              const active = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'border-[rgb(var(--ec-accent))] bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent))]'
                      : 'border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]',
                  ].join(' ')}
                >
                  <CollectionTypeIcon collection={type} />
                  {TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[rgb(var(--ec-page-border))]">
        <table className="min-w-full divide-y divide-[rgb(var(--ec-page-border))]">
          <thead className="bg-[rgb(var(--ec-card-bg))]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSummary = header.column.id === 'summary';
                  return (
                    <th
                      key={header.id}
                      className={[
                        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]',
                        isSummary ? 'hidden md:table-cell' : '',
                      ].join(' ')}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-[rgb(var(--ec-page-text))]"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon direction={header.column.getIsSorted()} />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))]">
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12">
                  <div className="flex flex-col items-center justify-center gap-2 text-center text-[rgb(var(--ec-page-text-muted))]">
                    <SearchX className="h-6 w-6" aria-hidden="true" />
                    <p className="text-sm">No resources found.</p>
                  </div>
                </td>
              </tr>
            )}
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-[rgb(var(--ec-card-bg))]">
                {row.getVisibleCells().map((cell) => {
                  const isSummary = cell.column.id === 'summary';
                  return (
                    <td key={cell.id} className={['px-4 py-3', isSummary ? 'hidden max-w-md md:table-cell' : ''].join(' ')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">
        Showing {filtered.length} of {resources.length} resources
      </p>
    </div>
  );
}

export default SystemResourcesTable;
