import { ServerIcon, BoltIcon, ChatBubbleLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
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
        <div className=" group ">
          <a
            href={buildUrl(`/docs/${messageRaw.collection}/${messageRaw.data.id}/${messageRaw.data.version}`)}
            className={`group-hover:text-${color}-500 flex space-x-1 items-center`}
          >
            <div className={`flex items-center border border-gray-300 shadow-sm rounded-md group-hover:border-${color}-400`}>
              <span className="flex items-center">
                <span className={`bg-${color}-500 group-hover:bg-${color}-600 h-full rounded-tl rounded-bl p-1`}>
                  <Icon className="h-4 w-4 text-white" />
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
      if (producers?.length === 0 || !producers)
        return <div className="font-light text-sm text-gray-400/60 text-left italic">No producers documented</div>;
      return (
        <ul className="">
          {producers.map((producer, index) => {
            return (
              <li className="py-2 group flex items-center space-x-2" key={`${producer.data.id}-${index}`}>
                <a
                  href={buildUrl(`/docs/${producer.collection}/${producer.data.id}/${producer.data.version}`)}
                  className="group-hover:text-primary flex space-x-1 items-center "
                >
                  <div className="flex items-center border border-gray-300 shadow-sm rounded-md">
                    <span className="flex items-center">
                      <span className="bg-pink-500 h-full rounded-tl rounded-bl p-1">
                        <ServerIcon className="h-4 w-4 text-white" />
                      </span>
                      <span className="font-light leading-none px-2 group-hover:underline">
                        {producer.data.name} (v{producer.data.version})
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
      if (consumers?.length === 0 || !consumers)
        return <div className="font-light text-sm text-gray-400/80 text-left italic">No consumers documented</div>;

      return (
        <ul>
          {consumers.map((consumer, index) => {
            return (
              <li key={`${consumer.data.id}-${index}`} className="py-1 group font-light ">
                <a
                  href={buildUrl(`/docs/${consumer.collection}/${consumer.data.id}/${consumer.data.version}`)}
                  className="group-hover:text-primary flex space-x-1 items-center "
                >
                  <div className="flex items-center border border-gray-300 shadow-sm rounded-md">
                    <span className="flex items-center">
                      <span className="bg-pink-500 h-full rounded-tl rounded-bl p-1">
                        <ServerIcon className="h-4 w-4 text-white" />
                      </span>
                      <span className="leading-none px-2 group-hover:underline ">
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
    footer: (info) => info.column.id,
    filterFn: filterCollectionByName('consumers'),
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
