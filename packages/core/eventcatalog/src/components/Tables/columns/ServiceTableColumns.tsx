import { ServerIcon, DocumentTextIcon, MapIcon } from '@heroicons/react/24/solid';
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { filterByName, filterCollectionByName } from '../filters/custom-filters';
import { buildUrl } from '@utils/url-builder';
import { getColorAndIconForCollection } from '@utils/collections/icons';
import { createBadgesColumn } from './SharedColumns';
import FavoriteButton from '@components/FavoriteButton';
import type { TData } from '../Table';
import type { TableConfiguration } from '@types';
const columnHelper = createColumnHelper<TData<'services'>>();

export const columns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration.columns?.name?.label || 'Service'}</span>,
    cell: (info) => {
      const service = info.row.original;
      const isLatestVersion = service.data.version === service.data.latestVersion;
      return (
        <a
          href={buildUrl(`/docs/${service.collection}/${service.data.id}/${service.data.version}`)}
          className="group inline-flex items-center gap-2 hover:text-[rgb(var(--ec-accent))] transition-colors"
        >
          <ServerIcon className="h-4 w-4 text-pink-500 flex-shrink-0" />
          <span className="text-sm font-medium text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-accent))]">
            {service.data.name}
          </span>
          {!isLatestVersion && <span className="text-xs text-[rgb(var(--ec-icon-color))]">v{service.data.version}</span>}
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
        <span className="text-sm text-[rgb(var(--ec-icon-color))] line-clamp-2" title={displayText}>
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
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowDownIcon className="w-3.5 h-3.5" />
        Receives
      </span>
    ),
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

      if (receives?.length === 0 || !receives) return <span className="text-xs text-[rgb(var(--ec-icon-color))]">-</span>;

      const visibleItems = isExpanded ? receiversWithIcons : receiversWithIcons.slice(0, 3);
      const hiddenCount = receiversWithIcons.length - 3;

      return (
        <div className="flex flex-col gap-1">
          {visibleItems.map((consumer, index: number) => (
            <a
              key={`${consumer.data.id}-${index}`}
              href={buildUrl(`/docs/${consumer.collection}/${consumer.data.id}/${consumer.data.version}`)}
              className="group inline-flex items-center gap-1.5 text-xs hover:text-[rgb(var(--ec-accent))] transition-colors"
            >
              <consumer.Icon className={`h-3.5 w-3.5 text-${consumer.color}-500 flex-shrink-0`} />
              <span className="truncate max-w-[120px]" title={consumer.data.name}>
                {consumer.data.name}
              </span>
            </a>
          ))}
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
    },
    filterFn: filterCollectionByName('receives'),
  }),
  columnHelper.accessor('data.sends', {
    id: 'sends',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowUpIcon className="w-3.5 h-3.5" />
        Sends
      </span>
    ),
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

      if (sends?.length === 0 || !sends) return <span className="text-xs text-[rgb(var(--ec-icon-color))]">-</span>;

      const visibleItems = isExpanded ? sendersWithIcons : sendersWithIcons.slice(0, 3);
      const hiddenCount = sendersWithIcons.length - 3;

      return (
        <div className="flex flex-col gap-1">
          {visibleItems.map((sender, index) => (
            <a
              key={`${sender.data.id}-${index}`}
              href={buildUrl(`/docs/${sender.collection}/${sender.data.id}/${sender.data.version}`)}
              className="group inline-flex items-center gap-1.5 text-xs hover:text-[rgb(var(--ec-accent))] transition-colors"
            >
              <sender.Icon className={`h-3.5 w-3.5 text-${sender.color}-500 flex-shrink-0`} />
              <span className="truncate max-w-[120px]" title={sender.data.name}>
                {sender.data.name}
              </span>
            </a>
          ))}
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
    },
    filterFn: filterCollectionByName('sends'),
  }),
  createBadgesColumn(columnHelper, tableConfiguration),
  columnHelper.accessor('data.name', {
    id: 'actions',
    header: () => <span></span>,
    cell: (info) => {
      const item = info.row.original;
      const href = buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`);
      const nodeKey = `${item.collection}-${item.data.id}-${item.data.version}`;
      return (
        <div className="flex items-center gap-0.5">
          <a
            className="p-1.5 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent)/0.1)] rounded-md transition-colors"
            href={href}
            title="View documentation"
          >
            <DocumentTextIcon className="w-4 h-4" />
          </a>
          <a
            className="p-1.5 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent)/0.1)] rounded-md transition-colors"
            href={buildUrl(`/visualiser/${item.collection}/${item.data.id}/${item.data.version}`)}
            title="View in visualiser"
          >
            <MapIcon className="w-4 h-4" />
          </a>
          <FavoriteButton nodeKey={nodeKey} title={item.data.name} badge="Service" href={href} size="sm" />
        </div>
      );
    },
    meta: {
      showFilter: false,
    },
  }),
];
