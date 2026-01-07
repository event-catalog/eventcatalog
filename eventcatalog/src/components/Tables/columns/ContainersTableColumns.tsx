import { createColumnHelper } from '@tanstack/react-table';
import { useState } from 'react';
import { filterByName } from '../filters/custom-filters';
import { buildUrl } from '@utils/url-builder';
import { ServerIcon } from '@heroicons/react/24/solid';
import { DatabaseIcon } from 'lucide-react';
import { createBadgesColumn } from './SharedColumns';
import type { TData } from '../Table';
import { filterCollectionByName } from '../filters/custom-filters';
import type { TableConfiguration } from '@types';
const columnHelper = createColumnHelper<TData<'containers'>>();

export const columns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration.columns?.name?.label || 'Storage'}</span>,
    cell: (info) => {
      const containerRaw = info.row.original;
      return (
        <a
          href={buildUrl(`/docs/${containerRaw.collection}/${containerRaw.data.id}/${containerRaw.data.version}`)}
          className="group inline-flex items-center"
        >
          <span className="inline-flex items-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
            <span className="flex items-center justify-center w-6 h-6 bg-blue-500 rounded-l-md">
              <DatabaseIcon className="h-3 w-3 text-white" />
            </span>
            <span className="px-2 py-1 text-xs text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-page-text))]">
              {containerRaw.data.name}
              <span className="text-[rgb(var(--ec-icon-color))] ml-1">v{containerRaw.data.version}</span>
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
      return (
        <span className="text-sm text-[rgb(var(--ec-page-text-muted))] line-clamp-2" title={summary || ''}>
          {summary}
        </span>
      );
    },
    footer: (info) => info.column.id,
    meta: {
      showFilter: false,
      className: 'max-w-md',
    },
  }),
  columnHelper.accessor('data.servicesThatWriteToContainer', {
    id: 'writes',
    header: () => <span>{tableConfiguration.columns?.writes?.label || 'Writes'}</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'servicesThatWriteToContainer',
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
          {visibleItems.map((service, index) => (
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
    filterFn: filterCollectionByName('servicesThatWriteToContainer'),
  }),
  columnHelper.accessor('data.servicesThatReadFromContainer', {
    id: 'reads',
    header: () => <span>{tableConfiguration.columns?.reads?.label || 'Reads'}</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'servicesThatReadFromContainer',
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
          {visibleItems.map((service, index) => (
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
    filterFn: filterCollectionByName('servicesThatReadFromContainer'),
  }),
  createBadgesColumn(columnHelper, tableConfiguration),
  columnHelper.accessor('data.name', {
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
    id: 'actions',
    meta: {
      showFilter: false,
    },
  }),
];
