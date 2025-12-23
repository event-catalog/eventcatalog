import { createColumnHelper } from '@tanstack/react-table';
import { filterByName } from '../filters/custom-filters';
import { buildUrl } from '@utils/url-builder';
import { QueueListIcon } from '@heroicons/react/24/solid';
import { createBadgesColumn } from './SharedColumns';
import type { TData } from '../Table';
import type { TableConfiguration } from '@types';

const columnHelper = createColumnHelper<TData<'flows'>>();

export const columns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration.columns?.name?.label || 'Flow'}</span>,
    cell: (info) => {
      const flowRaw = info.row.original;
      return (
        <a
          href={buildUrl(`/docs/${flowRaw.collection}/${flowRaw.data.id}/${flowRaw.data.version}`)}
          className="group inline-flex items-center"
        >
          <span className="inline-flex items-center rounded-md border border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50 transition-colors">
            <span className="flex items-center justify-center w-6 h-6 bg-teal-500 rounded-l-md">
              <QueueListIcon className="h-3 w-3 text-white" />
            </span>
            <span className="px-2 py-1 text-xs text-gray-700 group-hover:text-gray-900">
              {flowRaw.data.name}
              <span className="text-gray-400 ml-1">v{flowRaw.data.version}</span>
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
        <span className="text-sm text-gray-600 line-clamp-2" title={summary || ''}>
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
