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
          <span className="inline-flex items-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] hover:border-pink-400 dark:hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors">
            <span className="flex items-center justify-center w-6 h-6 bg-pink-500 rounded-l-md">
              <Users className="h-3 w-3 text-white" />
            </span>
            <span className="px-2 py-1 text-xs text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-page-text))]">
              {team.data.name}
            </span>
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
            <span className="inline-flex items-center px-2 py-1 text-xs text-[rgb(var(--ec-icon-color))] bg-[rgb(var(--ec-content-hover))] rounded-md border border-[rgb(var(--ec-page-border))]">
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
                    className={`inline-flex items-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] hover:border-${color}-400 dark:hover:border-${color}-500 hover:bg-${color}-50 dark:hover:bg-${color}-500/10 transition-colors`}
                  >
                    <span className={`flex items-center justify-center w-6 h-6 bg-${color}-500 rounded-l-md`}>
                      <Icon className="h-3 w-3 text-white" />
                    </span>
                    <span className="px-2 py-1 text-xs text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-page-text))]">
                      {message.data.name}
                      <span className="text-[rgb(var(--ec-icon-color))] ml-1">v{message.data.version}</span>
                    </span>
                  </span>
                </a>
              );
            })}
            {hiddenCount > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] text-left"
              >
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
          <span className="inline-flex items-center px-2 py-1 text-xs text-[rgb(var(--ec-icon-color))] bg-[rgb(var(--ec-content-hover))] rounded-md border border-[rgb(var(--ec-page-border))]">
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
              <span className="inline-flex items-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] hover:border-pink-400 dark:hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors">
                <span className="flex items-center justify-center w-6 h-6 bg-pink-500 rounded-l-md">
                  <ServerIcon className="h-3 w-3 text-white" />
                </span>
                <span className="px-2 py-1 text-xs text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-page-text))]">
                  {service.data.name}
                  <span className="text-[rgb(var(--ec-icon-color))] ml-1">v{service.data.version}</span>
                </span>
              </span>
            </a>
          ))}
          {hiddenCount > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] text-left"
            >
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
          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] border border-[rgb(var(--ec-page-border))] rounded-md hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))] transition-colors whitespace-nowrap"
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
