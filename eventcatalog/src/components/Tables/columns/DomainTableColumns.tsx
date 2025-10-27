import { ServerIcon, RectangleGroupIcon } from '@heroicons/react/20/solid';
import { createColumnHelper } from '@tanstack/react-table';
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
      const color = 'yellow';
      return (
        <div className=" group ">
          <a
            href={buildUrl(`/docs/${messageRaw.collection}/${messageRaw.data.id}/${messageRaw.data.version}`)}
            className={`group-hover:text-${color}-500 flex space-x-1 items-center`}
          >
            <div className={`flex items-center border border-gray-300 shadow-sm rounded-md group-hover:border-${color}-400`}>
              <span className="flex items-center">
                <span className={`bg-${color}-500 group-hover:bg-${color}-600 h-full rounded-tl rounded-bl p-1`}>
                  <RectangleGroupIcon className="h-4 w-4 text-white" />
                </span>
                <span className="leading-none px-2 group-hover:underline group-hover:text-primary font-light">
                  {messageRaw.data.name} (v{messageRaw.data.version})
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
  columnHelper.accessor('data.summary', {
    id: 'summary',
    header: () => <span>{tableConfiguration.columns?.summary?.label || 'Summary'}</span>,
    cell: (info) => (
      <span className="font-light ">
        {info.renderValue()} {info.row.original.data.draft ? ' (Draft)' : ''}
      </span>
    ),
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
      if (services?.length === 0 || !services)
        return <div className="text-sm text-gray-400/80 text-left italic">Domain has no services.</div>;

      return (
        <ul>
          {services.map((consumer) => {
            const color = 'pink';
            return (
              <li key={consumer.data.id} className="py-1 group ">
                <a
                  href={buildUrl(`/docs/${consumer.collection}/${consumer.data.id}/${consumer.data.version}`)}
                  className="group-hover:text-primary flex space-x-1 items-center "
                >
                  <div className={`flex items-center border border-gray-300 rounded-md`}>
                    <span className="flex items-center">
                      <span className={`bg-${color}-500 h-full rounded-tl rounded-bl p-1`}>
                        <ServerIcon className="h-4 w-4 text-white" />
                      </span>
                      <span className="leading-none px-2 group-hover:underline font-light  ">
                        {consumer.data.name} (v{consumer.data.version})
                      </span>
                    </span>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      );
    },
    filterFn: filterCollectionByName('services'),
  }),
  createBadgesColumn(columnHelper, tableConfiguration),
  columnHelper.accessor('data.name', {
    id: 'actions',
    header: () => <span>{tableConfiguration.columns?.actions?.label || 'Actions'}</span>,
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
    meta: {
      showFilter: false,
    },
  }),
];
