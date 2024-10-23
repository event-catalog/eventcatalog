import { ServerIcon, BoltIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/solid';
import { createColumnHelper } from '@tanstack/react-table';
import type { CollectionEntry } from 'astro:content';
import { useMemo } from 'react';
import { filterByName, filterCollectionByName } from '../filters/custom-filters';
import { buildUrl } from '@utils/url-builder';
import { getColorAndIconForMessageType } from './MessageTableColumns';

const columnHelper = createColumnHelper<CollectionEntry<'services'>>();

export const columns = () => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>Service</span>,
    cell: (info) => {
      const messageRaw = info.row.original;
      const color = 'pink';
      return (
        <div className="group font-light">
          <a
            href={buildUrl(`/docs/${messageRaw.collection}/${messageRaw.data.id}/${messageRaw.data.version}`)}
            className={`group-hover:text-${color}-500 flex space-x-1 items-center`}
          >
            <div className={`flex items-center border border-gray-300 shadow-sm rounded-md group-hover:border-${color}-400`}>
              <span className="flex items-center">
                <span className={`bg-${color}-500 group-hover:bg-${color}-600 h-full rounded-tl rounded-bl p-1`}>
                  <ServerIcon className="h-4 w-4 text-white" />
                </span>
                <span className="leading-none px-2 group-hover:underline group-hover:text-primary">
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
  // columnHelper.accessor('data.version', {
  //   header: () => <span>Version</span>,
  //   cell: (info) => {
  //     const service = info.row.original;
  //     return <div className="text-left">{`v${info.getValue()} ${service.data.latestVersion === service.data.version ? '(latest)': ''}`}</div>
  //   },
  //   footer: (info) => info.column.id,
  // }),
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
  columnHelper.accessor('data.receives', {
    header: () => <span>Receives</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'receives',
    },
    cell: (info) => {
      const receives = info.getValue();
      if (receives?.length === 0 || !receives)
        return <div className="text-sm text-gray-400/80 text-left italic">Service receives no messages.</div>;

      return (
        <ul>
          {receives.map((consumer: any, index:number) => {
            const type = consumer.collection.slice(0, -1);
            const { color, Icon } = useMemo(() => getColorAndIconForMessageType(type), [type]);
            return (
              <li key={`${consumer.data.id}-${index}`} className="py-1 group font-light ">
                <a
                  href={buildUrl(`/docs/${consumer.collection}/${consumer.data.id}/${consumer.data.version}`)}
                  className="group-hover:text-primary flex space-x-1 items-center "
                >
                  <div className={`flex items-center border border-gray-300 shadow-sm rounded-md`}>
                    <span className="flex items-center">
                      <span className={`bg-${color}-500 h-full rounded-tl rounded-bl p-1`}>
                        <Icon className="h-4 w-4 text-white" />
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
    // footer: (info) => info.column.id,
    filterFn: filterCollectionByName('receives'),
  }),
  columnHelper.accessor('data.sends', {
    header: () => <span>Sends</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'sends',
    },
    cell: (info) => {
      const sends = info.getValue();
      if (sends?.length === 0 || !sends)
        return <div className="text-sm text-gray-400/80 text-left italic">Service sends no messages.</div>;

      return (
        <ul>
          {sends.map((consumer: any, index:number) => {
            const type = consumer.collection.slice(0, -1);
            const color = type === 'event' ? 'orange' : 'blue';
            const Icon = type === 'event' ? BoltIcon : ChatBubbleLeftIcon;
            return (
              <li key={`${consumer.data.id}-${index}`} className="py-1 group font-light">
                <a
                  href={buildUrl(`/docs/${consumer.collection}/${consumer.data.id}/${consumer.data.version}`)}
                  className="group-hover:text-primary flex space-x-1 items-center "
                >
                  <div className={`flex items-center border border-gray-300 shadow-sm rounded-md`}>
                    <span className="flex items-center">
                      <span className={`bg-${color}-500 h-full rounded-tl rounded-bl p-1`}>
                        <Icon className="h-4 w-4 text-white" />
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
    // footer: (info) => info.column.id,
    filterFn: filterCollectionByName('sends'),
  }),
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
