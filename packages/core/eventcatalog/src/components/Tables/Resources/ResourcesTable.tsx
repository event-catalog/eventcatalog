import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRightLeft,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  ClipboardList,
  CornerDownRight,
  KeyRound,
  Route,
  Search,
  SearchX,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react';
import { getColorAndIconForCollection } from '@utils/collections/icons';
import { getCollectionTextColorClass } from '@utils/collection-colors';
import { isIconPath, resolveIconUrl } from '@utils/icon';
import { RowActionsMenu } from '../RowActionsMenu';
import { TablePagination, useStoredPageSize } from '../TablePagination';
import type { ResourceCollection, ResourceRelationship } from '@utils/collections/resources';

export type { ResourceCollection, ResourceRelationship };

export interface ResourceItem {
  collection: ResourceCollection;
  id: string;
  name: string;
  version: string;
  summary?: string;
  icon?: string;
  href: string;
  /** Link to the resource in the visualiser, when it has a visualiser page. */
  visualiserHref?: string;
  /** Link to the resource's schema page, when it has a schema or contract. */
  schemaHref?: string;
  /** Matches the key the sidebar and the docs page favorite button use, so all three stay in sync. */
  favorite: { nodeKey: string; badge: string };
  relationship?: ResourceRelationship;
}

interface ResourcesTableProps {
  resources: ResourceItem[];
  title: string;
  description?: string;
}

// Every kind of resource with its plural label (filter pills) and singular label (Type column).
// The key order is the order the filter pills follow on the page.
const RESOURCE_TYPE_LABELS: Record<ResourceCollection, { plural: string; singular: string }> = {
  domains: { plural: 'Subdomains', singular: 'Subdomain' },
  systems: { plural: 'Systems', singular: 'System' },
  agents: { plural: 'Agents', singular: 'Agent' },
  services: { plural: 'Services', singular: 'Service' },
  flows: { plural: 'Flows', singular: 'Flow' },
  entities: { plural: 'Entities', singular: 'Entity' },
  'data-products': { plural: 'Data Products', singular: 'Data Product' },
  containers: { plural: 'Data Stores', singular: 'Data Store' },
  events: { plural: 'Events', singular: 'Event' },
  commands: { plural: 'Commands', singular: 'Command' },
  queries: { plural: 'Queries', singular: 'Query' },
  channels: { plural: 'Channels', singular: 'Channel' },
  adrs: { plural: 'Decision Records', singular: 'Decision Record' },
};

const TYPE_ORDER = Object.keys(RESOURCE_TYPE_LABELS) as ResourceCollection[];

type Direction = 'inbound' | 'outbound';

const RELATIONSHIPS: Record<ResourceRelationship, { label: string; directions: Direction[]; Icon: LucideIcon }> = {
  receives: { label: 'Receives', directions: ['inbound'], Icon: ArrowDownLeft },
  sends: { label: 'Sends', directions: ['outbound'], Icon: ArrowUpRight },
  'sends-and-receives': { label: 'Sends & receives', directions: ['inbound', 'outbound'], Icon: ArrowLeftRight },
  reads: { label: 'Reads from', directions: ['inbound'], Icon: ArrowDownLeft },
  writes: { label: 'Writes to', directions: ['outbound'], Icon: ArrowUpRight },
  'reads-and-writes': { label: 'Reads & writes', directions: ['inbound', 'outbound'], Icon: ArrowLeftRight },
  contains: { label: 'Contains', directions: [], Icon: CornerDownRight },
  owns: { label: 'Owns', directions: [], Icon: KeyRound },
  'appears-in': { label: 'Appears in', directions: [], Icon: Workflow },
  'governed-by': { label: 'Governed by', directions: [], Icon: ClipboardList },
  includes: { label: 'Includes', directions: [], Icon: Route },
  // Channel pages: the channel transports messages; services produce messages onto it or receive them from it.
  transports: { label: 'Transports', directions: [], Icon: ArrowRightLeft },
  'produces-messages': { label: 'Produces messages', directions: ['inbound'], Icon: ArrowDownLeft },
  'receives-messages': { label: 'Receives messages', directions: ['outbound'], Icon: ArrowUpRight },
  'produces-and-receives-messages': { label: 'Produces & receives', directions: ['inbound', 'outbound'], Icon: ArrowLeftRight },
  // Message pages: services, agents and data products produce or consume the message, which can trigger other messages.
  produces: { label: 'Produces', directions: ['inbound'], Icon: ArrowDownLeft },
  consumes: { label: 'Consumes', directions: ['outbound'], Icon: ArrowUpRight },
  'produces-and-consumes': { label: 'Produces & consumes', directions: ['inbound', 'outbound'], Icon: ArrowLeftRight },
  triggers: { label: 'Triggers', directions: ['outbound'], Icon: ArrowUpRight },
  'triggered-by': { label: 'Triggered by', directions: ['inbound'], Icon: ArrowDownLeft },
  'triggers-and-triggered-by': { label: 'Triggers & triggered by', directions: ['inbound', 'outbound'], Icon: ArrowLeftRight },
};

const DIRECTIONS: Array<{ id: Direction; label: string; Icon: LucideIcon }> = [
  { id: 'inbound', label: 'Inbound', Icon: ArrowDownLeft },
  { id: 'outbound', label: 'Outbound', Icon: ArrowUpRight },
];

const FilterPill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={[
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
      active
        ? 'border-[rgb(var(--ec-accent))] bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent))]'
        : 'border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]',
    ].join(' ')}
  >
    {children}
  </button>
);

// Small icon for a collection type (used in filter pills and the type column).
const CollectionTypeIcon = ({ collection, className }: { collection: ResourceCollection; className?: string }) => {
  const { color, Icon } = getColorAndIconForCollection(collection);
  const colorClass = getCollectionTextColorClass(color, 'text-[rgb(var(--ec-icon-color))]');
  return <Icon className={`${className ?? 'h-3.5 w-3.5'} ${colorClass}`} aria-hidden="true" />;
};

const ResourceIcon = ({ item }: { item: ResourceItem }) => {
  if (item.icon && isIconPath(item.icon)) {
    return <img src={resolveIconUrl(item.icon)} alt="" className="h-5 w-5" loading="lazy" />;
  }
  return <CollectionTypeIcon collection={item.collection} className="h-5 w-5" />;
};

const columnHelper = createColumnHelper<ResourceItem>();

const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) => {
  if (direction === 'asc') return <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />;
  if (direction === 'desc') return <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />;
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />;
};

export function ResourcesTable({ resources, title, description }: ResourcesTableProps) {
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useStoredPageSize('eventcatalog-resources-page-size');
  const [selectedTypes, setSelectedTypes] = useState<ResourceCollection[]>([]);
  const [selectedDirections, setSelectedDirections] = useState<Direction[]>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);

  // Only show type filters that actually have resources in this system.
  const availableTypes = useMemo(
    () => TYPE_ORDER.filter((type) => resources.some((resource) => resource.collection === type)),
    [resources]
  );

  // Every built-in page sets a relationship; keep the column out if a caller passes none.
  const hasRelationships = useMemo(() => resources.some((resource) => resource.relationship), [resources]);

  // Like the type filters, only offer direction filters when there is more than one direction to pick from.
  const availableDirections = useMemo(
    () =>
      DIRECTIONS.filter(({ id }) =>
        resources.some((resource) => resource.relationship && RELATIONSHIPS[resource.relationship].directions.includes(id))
      ),
    [resources]
  );
  const showDirectionFilters = availableDirections.length > 1;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return resources.filter((resource) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(resource.collection)) {
        return false;
      }
      if (selectedDirections.length > 0) {
        const directions = resource.relationship ? RELATIONSHIPS[resource.relationship].directions : [];
        if (!directions.some((direction) => selectedDirections.includes(direction))) return false;
      }
      if (query) {
        const haystack = `${resource.name} ${resource.id} ${resource.summary ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [resources, search, selectedTypes, selectedDirections]);

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
      columnHelper.accessor((row) => RESOURCE_TYPE_LABELS[row.collection].singular, {
        id: 'type',
        header: 'Type',
        cell: (info) => {
          const { collection } = info.row.original;
          return (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-[rgb(var(--ec-page-text-muted))]">
              <CollectionTypeIcon collection={collection} />
              {RESOURCE_TYPE_LABELS[collection].singular}
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => (row.relationship ? RELATIONSHIPS[row.relationship].label : ''), {
        id: 'relationship',
        header: 'Relationship',
        cell: (info) => {
          const { relationship } = info.row.original;
          if (!relationship) return <span className="text-sm text-[rgb(var(--ec-page-text-muted))]">—</span>;
          const { label, Icon } = RELATIONSHIPS[relationship];
          return (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-[rgb(var(--ec-page-border))] px-2 py-0.5 text-xs font-medium text-[rgb(var(--ec-page-text))]">
              <Icon className="h-3.5 w-3.5 text-[rgb(var(--ec-accent))]" aria-hidden="true" />
              {label}
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
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: (info) => {
          const resource = info.row.original;
          return (
            <RowActionsMenu
              title={resource.name}
              href={resource.href}
              visualiserHref={resource.visualiserHref}
              schemaHref={resource.schemaHref}
              favorite={resource.favorite}
            />
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnVisibility: { relationship: hasRelationships } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize } },
  });

  useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  const toggleType = (type: ResourceCollection) => {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const toggleDirection = (direction: Direction) => {
    setSelectedDirections((prev) => (prev.includes(direction) ? prev.filter((d) => d !== direction) : [...prev, direction]));
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header: title on the left, type filters and search on the right */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-6 py-5">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-[rgb(var(--ec-page-text))] md:text-4xl">{title}</h2>
          {description && (
            <p className="max-w-3xl pt-2 text-base font-light text-[rgb(var(--ec-page-text-muted))]">{description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {showDirectionFilters &&
            availableDirections.map(({ id, label, Icon }) => (
              <FilterPill key={id} active={selectedDirections.includes(id)} onClick={() => toggleDirection(id)}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </FilterPill>
            ))}
          {showDirectionFilters && availableTypes.length > 1 && (
            <span aria-hidden className="mx-1 h-4 w-px bg-[rgb(var(--ec-page-border))]" />
          )}
          {availableTypes.length > 1 &&
            availableTypes.map((type) => (
              <FilterPill key={type} active={selectedTypes.includes(type)} onClick={() => toggleType(type)}>
                <CollectionTypeIcon collection={type} />
                {RESOURCE_TYPE_LABELS[type].plural}
              </FilterPill>
            ))}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--ec-icon-color))]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter..."
              aria-label="Filter resources"
              className="w-64 rounded-md border-0 bg-[rgb(var(--ec-page-bg))] py-1.5 pl-9 pr-3 text-sm font-light text-[rgb(var(--ec-header-text))] shadow-xs ring-1 ring-inset ring-[rgb(var(--ec-dropdown-border))] placeholder:text-[rgb(var(--ec-icon-color))] focus:outline-hidden focus:ring-2 focus:ring-[rgb(var(--ec-accent))]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear filter"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto px-6 pb-5">
        <div className="overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border)/0.72)] bg-[rgb(var(--ec-dropdown-bg)/0.66)]">
          <table className="min-w-full divide-y divide-[rgb(var(--ec-page-border)/0.62)]">
            <thead className="sticky top-0 z-10 bg-[rgb(var(--ec-content-hover)/0.45)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const isSummary = header.column.id === 'summary';
                    return (
                      <th
                        key={header.id}
                        className={[
                          'px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]',
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
            <tbody className="divide-y divide-[rgb(var(--ec-page-border)/0.5)]">
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-center text-[rgb(var(--ec-page-text-muted))]">
                      <SearchX className="h-6 w-6" aria-hidden="true" />
                      <p className="text-sm">No resources found.</p>
                    </div>
                  </td>
                </tr>
              )}
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-[rgb(var(--ec-content-hover)/0.38)]">
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
      </div>

      <TablePagination table={table} pageSize={pageSize} onPageSizeChange={setPageSize} />
    </div>
  );
}

export default ResourcesTable;
