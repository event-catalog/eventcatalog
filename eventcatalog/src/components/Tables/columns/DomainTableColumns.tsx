import { ServerIcon, RectangleGroupIcon } from '@heroicons/react/20/solid';
import { createColumnHelper } from '@tanstack/react-table';
import { useState } from 'react';
import { filterByName, filterCollectionByName } from '../filters/custom-filters';
import { buildUrl } from '@utils/url-builder';
import { createBadgesColumn } from './SharedColumns';
import type { TData } from '../Table';
import type { TableConfiguration } from '@types';

const columnHelper = createColumnHelper<TData<'domains'>>();

export const columns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration.columns?.name?.label || 'Domain'}</span>,
    cell: (info) => {
      const messageRaw = info.row.original;
      return (
        <a
          href={buildUrl(`/docs/${messageRaw.collection}/${messageRaw.data.id}/${messageRaw.data.version}`)}
          className="group inline-flex items-center"
        >
          <span className="inline-flex items-center rounded-md border border-gray-200 bg-white hover:border-yellow-300 hover:bg-yellow-50 transition-colors">
            <span className="flex items-center justify-center w-6 h-6 bg-yellow-500 rounded-l-md">
              <RectangleGroupIcon className="h-3 w-3 text-white" />
            </span>
            <span className="px-2 py-1 text-xs text-gray-700 group-hover:text-gray-900">
              {messageRaw.data.name}
              <span className="text-gray-400 ml-1">v{messageRaw.data.version}</span>
            </span>
          </span>
        </a>
      );
    },
    footer: (info) => info.column.id,
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
        <span className="text-sm text-gray-600 line-clamp-2" title={displayText}>
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
  columnHelper.accessor('data.services', {
    id: 'services',
    header: () => <span>Services</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'services',
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
          {visibleItems.map((service, index) => (
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
    filterFn: filterCollectionByName('services'),
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
            className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors whitespace-nowrap"
            href={buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`)}
          >
            Docs
          </a>
          <a
            className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors whitespace-nowrap"
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
