import { createColumnHelper } from '@tanstack/react-table';
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
      const color = 'blue';
      return (
        <div className=" group ">
          <a
            href={buildUrl(`/docs/${containerRaw.collection}/${containerRaw.data.id}/${containerRaw.data.version}`)}
            className={`group-hover:text-${color}-500 flex space-x-1 items-center`}
          >
            <div className={`flex items-center border border-gray-300 shadow-sm rounded-md group-hover:border-${color}-400`}>
              <span className="flex items-center">
                <span className={`bg-${color}-500 group-hover:bg-${color}-600 h-full rounded-tl rounded-bl p-1`}>
                  <DatabaseIcon className="h-4 w-4 text-white" />
                </span>
                <span className="leading-none px-2 group-hover:underline group-hover:text-primary font-light">
                  {containerRaw.data.name} (v{containerRaw.data.version})
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
    cell: (info) => <span className="font-light ">{info.renderValue()}</span>,
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
      if (services?.length === 0 || !services)
        return <div className="font-light text-sm text-gray-400/60 text-left italic">No services documented</div>;
      return (
        <ul className="">
          {services.map((service, index) => {
            return (
              <li className="py-2 group flex items-center space-x-2" key={`${service.data.id}-${index}`}>
                <a
                  href={buildUrl(`/docs/${service.collection}/${service.data.id}/${service.data.version}`)}
                  className="group-hover:text-primary flex space-x-1 items-center "
                >
                  <div className="flex items-center border border-gray-300 shadow-sm rounded-md">
                    <span className="flex items-center">
                      <span className="bg-pink-500 h-full rounded-tl rounded-bl p-1">
                        <ServerIcon className="h-4 w-4 text-white" />
                      </span>
                      <span className="font-light leading-none px-2 group-hover:underline">
                        {service.data.name} (v{service.data.version})
                      </span>
                    </span>{' '}
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
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
      if (services?.length === 0 || !services)
        return <div className="font-light text-sm text-gray-400/60 text-left italic">No services documented</div>;
      return (
        <ul className="">
          {services.map((service, index) => {
            return (
              <li className="py-2 group flex items-center space-x-2" key={`${service.data.id}-${index}`}>
                <a
                  href={buildUrl(`/docs/${service.collection}/${service.data.id}/${service.data.version}`)}
                  className="group-hover:text-primary flex space-x-1 items-center "
                >
                  <div className="flex items-center border border-gray-300 shadow-sm rounded-md">
                    <span className="flex items-center">
                      <span className="bg-pink-500 h-full rounded-tl rounded-bl p-1">
                        <ServerIcon className="h-4 w-4 text-white" />
                      </span>
                      <span className="font-light leading-none px-2 group-hover:underline">
                        {service.data.name} (v{service.data.version})
                      </span>
                    </span>{' '}
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      );
    },
    footer: (info) => info.column.id,
    filterFn: filterCollectionByName('servicesThatReadFromContainer'),
  }),
  createBadgesColumn(columnHelper, tableConfiguration),
  columnHelper.accessor('data.name', {
    header: () => <span>{tableConfiguration.columns?.actions?.label || 'Actions'}</span>,
    cell: (info) => {
      const container = info.row.original;
      return (
        <a
          className="hover:text-primary hover:underline px-4 font-light"
          href={buildUrl(`/visualiser/${container.collection}/${container.data.id}/${container.data.version}`)}
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
