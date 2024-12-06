import { createColumnHelper } from '@tanstack/react-table';
import type { CollectionEntry } from 'astro:content';
import { filterByName } from '../filters/custom-filters';
import { buildUrl } from '@utils/url-builder';
import { QueueListIcon } from '@heroicons/react/24/solid';
import { createBadgesColumn } from './SharedColumns';

const columnHelper = createColumnHelper<CollectionEntry<'flows'>>();

export const columns = () => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>Flow</span>,
    cell: (info) => {
      const flowRaw = info.row.original;
      const color = 'teal';
      return (
        <div className=" group ">
          <a
            href={buildUrl(`/docs/${flowRaw.collection}/${flowRaw.data.id}/${flowRaw.data.version}`)}
            className={`group-hover:text-${color}-500 flex space-x-1 items-center`}
          >
            <div className={`flex items-center border border-gray-300 shadow-sm rounded-md group-hover:border-${color}-400`}>
              <span className="flex items-center">
                <span className={`bg-${color}-500 group-hover:bg-${color}-600 h-full rounded-tl rounded-bl p-1`}>
                  <QueueListIcon className="h-4 w-4 text-white" />
                </span>
                <span className="leading-none px-2 group-hover:underline group-hover:text-primary font-light">
                  {flowRaw.data.name} (v{flowRaw.data.version})
                </span>
              </span>
            </div>
          </a>
        </div>
      );
    },
    footer: (info) => info.column.id,
    meta: {
      filterVariant: 'name',
    },
    filterFn: filterByName,
  }),
  columnHelper.accessor('data.version', {
    header: () => <span>Version</span>,
    cell: (info) => {
      const service = info.row.original;
      return (
        <div className="text-left font-light">{`v${info.getValue()} ${service.data.latestVersion === service.data.version ? '(latest)' : ''}`}</div>
      );
    },
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor('data.summary', {
    id: 'summary',
    header: () => 'Summary',
    cell: (info) => <span className="font-light ">{info.renderValue()}</span>,
    footer: (info) => info.column.id,
    meta: {
      showFilter: false,
      className: 'max-w-md',
    },
  }),
  createBadgesColumn(columnHelper),
  columnHelper.accessor('data.name', {
    header: () => <span />,
    cell: (info) => {
      const domain = info.row.original;
      return (
        <a
          className="hover:text-primary hover:underline px-4 font-light"
          href={buildUrl(`/visualiser/${domain.collection}/${domain.data.id}/${domain.data.version}`)}
        >
          Visualiser &rarr;
        </a>
      );
    },
    id: 'actions',
    meta: {
      showFilter: false,
    },
  }),
];
