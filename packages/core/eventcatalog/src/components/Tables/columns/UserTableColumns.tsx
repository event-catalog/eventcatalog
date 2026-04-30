import { createColumnHelper } from '@tanstack/react-table';
import { useState } from 'react';
import { filterByName, filterCollectionByName } from '../filters/custom-filters';
import { buildUrl } from '@utils/url-builder';
import type { TData } from '../Table';
import type { CollectionUserTypes } from '@types';
import type { TableConfiguration } from '@types';
import { getColorAndIconForCollection } from '@utils/collections/icons';
const columnHelper = createColumnHelper<TData<CollectionUserTypes>>();

const colorClasses: Record<string, string> = {
  orange: 'text-orange-500',
  blue: 'text-blue-500',
  green: 'text-green-500',
  pink: 'text-pink-500',
  yellow: 'text-yellow-500',
  teal: 'text-teal-500',
  purple: 'text-purple-500',
  red: 'text-red-500',
  gray: 'text-gray-500',
  cyan: 'text-cyan-500',
};

const CollectionListCell = ({
  items,
  emptyText,
}: {
  items: Array<{ collection: string; data: { id: string; name: string; version?: string } }> | undefined;
  emptyText: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!items || items.length === 0) {
    return <span className="text-xs text-[rgb(var(--ec-icon-color))]">{emptyText}</span>;
  }

  const visibleItems = isExpanded ? items : items.slice(0, 4);
  const hiddenCount = items.length - 4;

  return (
    <div className="flex flex-col gap-1">
      {visibleItems.map((item, index) => {
        const { color, Icon } = getColorAndIconForCollection(item.collection);
        const href =
          item.collection === 'teams'
            ? buildUrl(`/docs/teams/${item.data.id}`)
            : buildUrl(`/docs/${item.collection}/${item.data.id}${item.data.version ? `/${item.data.version}` : ''}`);

        return (
          <a
            key={`${item.data.id}-${index}`}
            href={href}
            className="group inline-flex items-center gap-1.5 text-[0.8rem] text-[rgb(var(--ec-icon-color))] transition-colors hover:text-[rgb(var(--ec-accent))]"
          >
            <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${colorClasses[color] || 'text-[rgb(var(--ec-icon-color))]'}`} />
            <span className="max-w-[140px] truncate" title={item.data.name}>
              {item.data.name}
            </span>
            {item.data.version && <span className="text-xs text-[rgb(var(--ec-icon-color))]">v{item.data.version}</span>}
          </a>
        );
      })}
      {hiddenCount > 0 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-[rgb(var(--ec-accent))] hover:underline text-left"
        >
          {isExpanded ? 'Show less' : `+${hiddenCount} more`}
        </button>
      )}
    </div>
  );
};

export const columns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration.columns?.name?.label || 'Name'}</span>,
    cell: (info) => {
      const user = info.row.original;
      return (
        <a
          href={buildUrl(`/docs/${user.collection}/${user.data.id}`)}
          className="group inline-flex items-center text-sm font-semibold text-[rgb(var(--ec-page-text))] transition-colors hover:text-[rgb(var(--ec-accent))]"
        >
          <span>{user.data.name}</span>
        </a>
      );
    },
    meta: {
      filterVariant: 'name',
      filteredItemHasVersion: false,
    },
    filterFn: filterByName,
  }),

  columnHelper.accessor('data.role', {
    id: 'role',
    header: () => <span>{tableConfiguration.columns?.role?.label || 'Role'}</span>,
    cell: (info) => {
      const role = info.getValue() as string | undefined;
      return role ? (
        <span className="text-[0.8rem] text-[rgb(var(--ec-icon-color))]">{role}</span>
      ) : (
        <span className="text-xs text-[rgb(var(--ec-icon-color))]">-</span>
      );
    },
    meta: {
      showFilter: false,
    },
  }),

  columnHelper.accessor(
    (row) => {
      const events = row.data.ownedEvents || [];
      const commands = row.data.ownedCommands || [];
      const queries = row.data.ownedQueries || [];
      return [...events, ...commands, ...queries];
    },
    {
      id: 'ownedMessages',
      header: () => <span>{tableConfiguration.columns?.ownedMessages?.label || 'Owned messages'}</span>,
      meta: {
        showFilter: false,
      },
      cell: (info) => (
        <CollectionListCell
          items={
            info.getValue() as Array<{ collection: string; data: { id: string; name: string; version?: string } }> | undefined
          }
          emptyText="No messages"
        />
      ),
    }
  ),

  columnHelper.accessor('data.ownedServices', {
    id: 'ownedServices',
    header: () => <span>{tableConfiguration.columns?.ownedServices?.label || 'Owned services'}</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'ownedServices',
    },
    cell: (info) => (
      <CollectionListCell
        items={info.getValue() as Array<{ collection: string; data: { id: string; name: string; version?: string } }> | undefined}
        emptyText="No services"
      />
    ),
    footer: (info) => info.column.id,
    filterFn: filterCollectionByName('ownedServices'),
  }),

  columnHelper.accessor('data.associatedTeams', {
    id: 'associatedTeams',
    header: () => <span>{tableConfiguration.columns?.associatedTeams?.label || 'Teams'}</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'associatedTeams',
      filteredItemHasVersion: false,
    },
    cell: (info) => (
      <CollectionListCell
        items={info.getValue() as Array<{ collection: string; data: { id: string; name: string; version?: string } }> | undefined}
        emptyText="No teams"
      />
    ),
    footer: (info) => info.column.id,
    filterFn: filterCollectionByName('associatedTeams'),
  }),
];
