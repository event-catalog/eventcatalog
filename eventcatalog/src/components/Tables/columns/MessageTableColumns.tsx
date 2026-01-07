import { ServerIcon, BoltIcon, ChatBubbleLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { filterByName, filterCollectionByName } from '../filters/custom-filters';
import { buildUrl } from '@utils/url-builder';
import { createBadgesColumn } from './SharedColumns';
import type { TData } from '../Table';
import type { CollectionMessageTypes, TableConfiguration } from '@types';

const columnHelper = createColumnHelper<TData<CollectionMessageTypes>>();

export const getColorAndIconForMessageType = (type: string) => {
  switch (type) {
    case 'event':
      return { color: 'orange', Icon: BoltIcon };
    case 'command':
      return { color: 'blue', Icon: ChatBubbleLeftIcon };
    case 'querie':
    case 'query':
      return { color: 'green', Icon: MagnifyingGlassIcon };
    default:
      return { color: 'gray', Icon: ChatBubbleLeftIcon };
  }
};

export const columns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration.columns?.name?.label || 'Name'}</span>,
    cell: (info) => {
      const messageRaw = info.row.original;
      const type = useMemo(() => messageRaw.collection.slice(0, -1), [messageRaw.collection]);
      const { color, Icon } = getColorAndIconForMessageType(type);
      return (
        <a
          href={buildUrl(`/docs/${messageRaw.collection}/${messageRaw.data.id}/${messageRaw.data.version}`)}
          className="group inline-flex items-center"
        >
          <span
            className={`inline-flex items-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] hover:border-${color}-400 dark:hover:border-${color}-500 hover:bg-${color}-50 dark:hover:bg-${color}-500/10 transition-colors`}
          >
            <span className={`flex items-center justify-center w-6 h-6 bg-${color}-500 rounded-l-md`}>
              <Icon className="h-3 w-3 text-white" />
            </span>
            <span className="px-2 py-1 text-xs text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-page-text))]">
              {messageRaw.data.name}
              <span className="text-[rgb(var(--ec-icon-color))] ml-1">v{messageRaw.data.version}</span>
            </span>
          </span>
        </a>
      );
    },
    meta: {
      filterVariant: 'name',
    },
    filterFn: filterByName,
  }),

  columnHelper.accessor('data.summary', {
    id: 'summary',
    header: () => <span>{tableConfiguration.columns?.summary?.label || 'Summary'}</span>,
    cell: (info) => {
      const summary = info.renderValue() as string;
      const isDraft = info.row.original.data.draft;
      const displayText = `${summary || ''}${isDraft ? ' (Draft)' : ''}`;
      return (
        <span className="text-sm text-[rgb(var(--ec-page-text-muted))] line-clamp-2" title={displayText}>
          {displayText}
        </span>
      );
    },
    footer: (info) => info.column.id,
    meta: {
      showFilter: false,
      className: 'max-w-[200px]',
    },
  }),

  columnHelper.accessor('data.producers', {
    id: 'producers',
    header: () => <span>{tableConfiguration.columns?.producers?.label || 'Producers'}</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'producers',
    },
    cell: (info) => {
      const producers = info.getValue();
      const [isExpanded, setIsExpanded] = useState(false);

      if (producers?.length === 0 || !producers)
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs text-[rgb(var(--ec-icon-color))] bg-[rgb(var(--ec-content-hover))] rounded-md border border-[rgb(var(--ec-page-border))]">
            No producers
          </span>
        );

      const visibleItems = isExpanded ? producers : producers.slice(0, 4);
      const hiddenCount = producers.length - 4;

      return (
        <div className="flex flex-col gap-1.5">
          {visibleItems.map((producer, index) => (
            <a
              key={`${producer.data.id}-${index}`}
              href={buildUrl(`/docs/${producer.collection}/${producer.data.id}/${producer.data.version}`)}
              className="group inline-flex items-center"
            >
              <span className="inline-flex items-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] hover:border-pink-400 dark:hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors">
                <span className="flex items-center justify-center w-6 h-6 bg-pink-500 rounded-l-md">
                  <ServerIcon className="h-3 w-3 text-white" />
                </span>
                <span className="px-2 py-1 text-xs text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-page-text))]">
                  {producer.data.name}
                  <span className="text-[rgb(var(--ec-icon-color))] ml-1">v{producer.data.version}</span>
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
    filterFn: filterCollectionByName('producers'),
  }),
  columnHelper.accessor('data.consumers', {
    id: 'consumers',
    header: () => <span>{tableConfiguration.columns?.consumers?.label || 'Consumers'}</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'consumers',
    },
    cell: (info) => {
      const consumers = info.getValue();
      const [isExpanded, setIsExpanded] = useState(false);

      if (consumers?.length === 0 || !consumers)
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs text-[rgb(var(--ec-icon-color))] bg-[rgb(var(--ec-content-hover))] rounded-md border border-[rgb(var(--ec-page-border))]">
            No consumers
          </span>
        );

      const visibleItems = isExpanded ? consumers : consumers.slice(0, 4);
      const hiddenCount = consumers.length - 4;

      return (
        <div className="flex flex-col gap-1.5">
          {visibleItems.map((consumer, index) => (
            <a
              key={`${consumer.data.id}-${index}`}
              href={buildUrl(`/docs/${consumer.collection}/${consumer.data.id}/${consumer.data.version}`)}
              className="group inline-flex items-center"
            >
              <span className="inline-flex items-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] hover:border-pink-400 dark:hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors">
                <span className="flex items-center justify-center w-6 h-6 bg-pink-500 rounded-l-md">
                  <ServerIcon className="h-3 w-3 text-white" />
                </span>
                <span className="px-2 py-1 text-xs text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-page-text))]">
                  {consumer.data.name}
                  <span className="text-[rgb(var(--ec-icon-color))] ml-1">v{consumer.data.version}</span>
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
    filterFn: filterCollectionByName('consumers'),
  }),
  createBadgesColumn(columnHelper, tableConfiguration),
  columnHelper.accessor('data.name', {
    id: 'actions',
    header: () => <span>{tableConfiguration.columns?.actions?.label || 'Actions'}</span>,
    cell: (info) => {
      const item = info.row.original;
      return (
        <div className="flex items-center gap-2">
          <a
            className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] border border-[rgb(var(--ec-page-border))] rounded-md hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))] transition-colors whitespace-nowrap"
            href={buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`)}
          >
            Docs
          </a>
          <a
            className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] border border-[rgb(var(--ec-page-border))] rounded-md hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))] transition-colors whitespace-nowrap"
            href={buildUrl(`/visualiser/${item.collection}/${item.data.id}/${item.data.version}`)}
          >
            Visualiser
          </a>
        </div>
      );
    },
    meta: {
      showFilter: false,
    },
  }),
];
