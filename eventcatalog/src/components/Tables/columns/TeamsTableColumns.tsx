import { createColumnHelper } from '@tanstack/react-table';
import { useState } from 'react';
import { filterByName, filterCollectionByName } from '../filters/custom-filters';
import { buildUrl } from '@utils/url-builder';
import type { TData } from '../Table';
import type { CollectionUserTypes } from '@types';
import type { CollectionEntry } from 'astro:content';
import { ServerIcon, BoltIcon, ChatBubbleLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { Users } from 'lucide-react';
import type { TableConfiguration } from '@types';
const columnHelper = createColumnHelper<TData<CollectionUserTypes>>();

const getMessageIconAndColor = (collection: string) => {
  if (collection === 'events') return { Icon: BoltIcon, color: 'orange' };
  if (collection === 'commands') return { Icon: ChatBubbleLeftIcon, color: 'blue' };
  if (collection === 'queries') return { Icon: MagnifyingGlassIcon, color: 'green' };
  return { Icon: ChatBubbleLeftIcon, color: 'gray' };
};

export const columns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration.columns?.name?.label || 'Name'}</span>,
    cell: (info) => {
      const team = info.row.original;
      return (
        <a href={buildUrl(`/docs/${team.collection}/${team.data.id}`)} className="group inline-flex items-center">
          <span className="inline-flex items-center rounded-md border border-gray-200 bg-white hover:border-pink-300 hover:bg-pink-50 transition-colors">
            <span className="flex items-center justify-center w-6 h-6 bg-pink-500 rounded-l-md">
              <Users className="h-3 w-3 text-white" />
            </span>
            <span className="px-2 py-1 text-xs text-gray-700 group-hover:text-gray-900">{team.data.name}</span>
          </span>
        </a>
      );
    },
    meta: {
      filterVariant: 'name',
      filteredItemHasVersion: false,
    },
    filterFn: filterByName,
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
      cell: (info) => {
        const messages = info.getValue() as Array<
          CollectionEntry<'events'> | CollectionEntry<'commands'> | CollectionEntry<'queries'>
        >;
        const [isExpanded, setIsExpanded] = useState(false);

        if (messages?.length === 0 || !messages)
          return (
            <span className="inline-flex items-center px-2 py-1 text-xs text-gray-400 bg-gray-50 rounded-md border border-gray-100">
              No messages
            </span>
          );

        const visibleItems = isExpanded ? messages : messages.slice(0, 4);
        const hiddenCount = messages.length - 4;

        return (
          <div className="flex flex-col gap-1.5">
            {visibleItems.map((message, index: number) => {
              const { Icon, color } = getMessageIconAndColor(message.collection);
              return (
                <a
                  key={`${message.data.id}-${index}`}
                  href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
                  className="group inline-flex items-center"
                >
                  <span
                    className={`inline-flex items-center rounded-md border border-gray-200 bg-white hover:border-${color}-300 hover:bg-${color}-50 transition-colors`}
                  >
                    <span className={`flex items-center justify-center w-6 h-6 bg-${color}-500 rounded-l-md`}>
                      <Icon className="h-3 w-3 text-white" />
                    </span>
                    <span className="px-2 py-1 text-xs text-gray-700 group-hover:text-gray-900">
                      {message.data.name}
                      <span className="text-gray-400 ml-1">v{message.data.version}</span>
                    </span>
                  </span>
                </a>
              );
            })}
            {hiddenCount > 0 && (
              <button onClick={() => setIsExpanded(!isExpanded)} className="text-xs text-gray-500 hover:text-gray-700 text-left">
                {isExpanded ? 'Show less' : `+${hiddenCount} more`}
              </button>
            )}
          </div>
        );
      },
    }
  ),

  columnHelper.accessor('data.ownedServices', {
    id: 'ownedServices',
    header: () => <span>{tableConfiguration.columns?.ownedServices?.label || 'Owned services'}</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'ownedServices',
    },
    cell: (info) => {
      const services = info.getValue();
      const [isExpanded, setIsExpanded] = useState(false);

      if (services?.length === 0 || !services)
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs text-gray-400 bg-gray-50 rounded-md border border-gray-100">
            No services
          </span>
        );

      const visibleItems = isExpanded ? services : services.slice(0, 4);
      const hiddenCount = services.length - 4;

      return (
        <div className="flex flex-col gap-1.5">
          {visibleItems.map((service: CollectionEntry<'services'>, index: number) => (
            <a
              key={`${service.data.id}-${index}`}
              href={buildUrl(`/docs/${service.collection}/${service.data.id}/${service.data.version}`)}
              className="group inline-flex items-center"
            >
              <span className="inline-flex items-center rounded-md border border-gray-200 bg-white hover:border-pink-300 hover:bg-pink-50 transition-colors">
                <span className="flex items-center justify-center w-6 h-6 bg-pink-500 rounded-l-md">
                  <ServerIcon className="h-3 w-3 text-white" />
                </span>
                <span className="px-2 py-1 text-xs text-gray-700 group-hover:text-gray-900">
                  {service.data.name}
                  <span className="text-gray-400 ml-1">v{service.data.version}</span>
                </span>
              </span>
            </a>
          ))}
          {hiddenCount > 0 && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-xs text-gray-500 hover:text-gray-700 text-left">
              {isExpanded ? 'Show less' : `+${hiddenCount} more`}
            </button>
          )}
        </div>
      );
    },
    footer: (info) => info.column.id,
    filterFn: filterCollectionByName('ownedServices'),
  }),

  columnHelper.accessor('data.name', {
    header: () => <span>{tableConfiguration.columns?.actions?.label || 'Actions'}</span>,
    cell: (info) => {
      const item = info.row.original;
      return (
        <a
          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors whitespace-nowrap"
          href={buildUrl(`/docs/${item.collection}/${item.data.id}`)}
        >
          View team
        </a>
      );
    },
    id: 'actions',
    meta: {
      showFilter: false,
    },
  }),
];
