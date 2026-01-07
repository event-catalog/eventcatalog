import { ServerIcon } from '@heroicons/react/24/solid';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { filterByName, filterCollectionByName } from '../filters/custom-filters';
import { buildUrl } from '@utils/url-builder';
import { getColorAndIconForCollection } from '@utils/collections/icons';
import { createBadgesColumn } from './SharedColumns';
import type { TData } from '../Table';
import type { TableConfiguration } from '@types';
const columnHelper = createColumnHelper<TData<'services'>>();

export const columns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration.columns?.name?.label || 'Service'}</span>,
    cell: (info) => {
      const messageRaw = info.row.original;
      return (
        <a
          href={buildUrl(`/docs/${messageRaw.collection}/${messageRaw.data.id}/${messageRaw.data.version}`)}
          className="group inline-flex items-center"
        >
          <span className="inline-flex items-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] hover:border-pink-400 dark:hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors">
            <span className="flex items-center justify-center w-6 h-6 bg-pink-500 rounded-l-md">
              <ServerIcon className="h-3 w-3 text-white" />
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
      className: 'max-w-md',
    },
  }),
  columnHelper.accessor('data.receives', {
    id: 'receives',
    header: () => <span>Receives</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'receives',
    },
    cell: (info) => {
      const receives = info.getValue() || [];
      const [isExpanded, setIsExpanded] = useState(false);

      const receiversWithIcons = useMemo(
        () =>
          receives?.map((consumer) => {
            return {
              ...consumer,
              ...getColorAndIconForCollection(consumer.collection),
            };
          }) || [],
        [receives]
      );

      if (receives?.length === 0 || !receives)
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs text-[rgb(var(--ec-icon-color))] bg-[rgb(var(--ec-content-hover))] rounded-md border border-[rgb(var(--ec-page-border))]">
            No messages
          </span>
        );

      const visibleItems = isExpanded ? receiversWithIcons : receiversWithIcons.slice(0, 4);
      const hiddenCount = receiversWithIcons.length - 4;

      return (
        <div className="flex flex-col gap-1.5">
          {visibleItems.map((consumer, index: number) => (
            <a
              key={`${consumer.data.id}-${index}`}
              href={buildUrl(`/docs/${consumer.collection}/${consumer.data.id}/${consumer.data.version}`)}
              className="group inline-flex items-center"
            >
              <span
                className={`inline-flex items-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] hover:border-${consumer.color}-400 dark:hover:border-${consumer.color}-500 hover:bg-${consumer.color}-50 dark:hover:bg-${consumer.color}-500/10 transition-colors`}
              >
                <span className={`flex items-center justify-center w-6 h-6 bg-${consumer.color}-500 rounded-l-md`}>
                  <consumer.Icon className="h-3 w-3 text-white" />
                </span>
                <span className="px-2 py-1 text-xs text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-page-text))]">
                  {consumer.data.name}
                  <span className="text-[rgb(var(--ec-icon-color))] ml-1">v{consumer.data.version}</span>
                </span>
              </span>
            </a>
          ))}
          {hiddenCount > 0 && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-xs text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] text-left">
              {isExpanded ? 'Show less' : `+${hiddenCount} more`}
            </button>
          )}
        </div>
      );
    },
    filterFn: filterCollectionByName('receives'),
  }),
  columnHelper.accessor('data.sends', {
    id: 'sends',
    header: () => <span>Sends</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'sends',
    },
    cell: (info) => {
      const sends = info.getValue() || [];
      const [isExpanded, setIsExpanded] = useState(false);

      const sendersWithIcons = useMemo(
        () =>
          sends?.map((sender) => {
            return {
              ...sender,
              ...getColorAndIconForCollection(sender.collection),
            };
          }) || [],
        [sends]
      );

      if (sends?.length === 0 || !sends)
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs text-[rgb(var(--ec-icon-color))] bg-[rgb(var(--ec-content-hover))] rounded-md border border-[rgb(var(--ec-page-border))]">
            No messages
          </span>
        );

      const visibleItems = isExpanded ? sendersWithIcons : sendersWithIcons.slice(0, 4);
      const hiddenCount = sendersWithIcons.length - 4;

      return (
        <div className="flex flex-col gap-1.5">
          {visibleItems.map((sender, index) => (
            <a
              key={`${sender.data.id}-${index}`}
              href={buildUrl(`/docs/${sender.collection}/${sender.data.id}/${sender.data.version}`)}
              className="group inline-flex items-center"
            >
              <span
                className={`inline-flex items-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] hover:border-${sender.color}-400 dark:hover:border-${sender.color}-500 hover:bg-${sender.color}-50 dark:hover:bg-${sender.color}-500/10 transition-colors`}
              >
                <span className={`flex items-center justify-center w-6 h-6 bg-${sender.color}-500 rounded-l-md`}>
                  <sender.Icon className="h-3 w-3 text-white" />
                </span>
                <span className="px-2 py-1 text-xs text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-page-text))]">
                  {sender.data.name}
                  <span className="text-[rgb(var(--ec-icon-color))] ml-1">v{sender.data.version}</span>
                </span>
              </span>
            </a>
          ))}
          {hiddenCount > 0 && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-xs text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] text-left">
              {isExpanded ? 'Show less' : `+${hiddenCount} more`}
            </button>
          )}
        </div>
      );
    },
    filterFn: filterCollectionByName('sends'),
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
