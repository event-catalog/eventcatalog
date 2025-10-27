import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { filterByName, filterCollectionByName } from '../filters/custom-filters';
import { buildUrl } from '@utils/url-builder';
import type { TData } from '../Table';
import type { CollectionUserTypes } from '@types';
import type { CollectionEntry } from 'astro:content';
import { ServerIcon, BoltIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/solid';
import type { TableConfiguration } from '@types';
const columnHelper = createColumnHelper<TData<CollectionUserTypes>>();

export const columns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration.columns?.name?.label || 'Name'}</span>,
    cell: (info) => {
      const messageRaw = info.row.original;
      const type = useMemo(() => messageRaw.collection.slice(0, -1), [messageRaw.collection]);
      return (
        <div className=" group ">
          <a
            href={buildUrl(`/docs/${messageRaw.collection}/${messageRaw.data.id}`)}
            className={`group-hover:text-pink-500 flex space-x-1 items-center`}
          >
            <div className={`flex items-center  rounded-md group-hover:border-pink-400`}>
              <span className="flex items-center">
                <span className="flex flex-col leading-none px-2 group-hover:underline group-hover:text-primary font-light">
                  <span className="font-semibold">{messageRaw.data.name}</span>
                </span>
              </span>
            </div>
          </a>
        </div>
      );
    },
    meta: {
      filterVariant: 'name',
      filteredItemHasVersion: false,
    },
    filterFn: filterByName,
  }),

  columnHelper.accessor('data.ownedEvents', {
    id: 'ownedEvents',
    header: () => <span>{tableConfiguration.columns?.ownedEvents?.label || 'Owned events'}</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'ownedEvents',
    },
    cell: (info) => {
      const events = info.getValue();
      if (events?.length === 0 || !events)
        return <div className="font-light text-sm text-gray-400/80 text-left italic">Team owns no events</div>;

      const isExpandable = events?.length > 10;
      const isOpen = isExpandable ? events?.length < 10 : true;
      const [isExpanded, setIsExpanded] = useState(isOpen);

      return (
        <div>
          {isExpandable && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="mb-2 text-sm text-gray-600 hover:text-gray-900">
              {isExpanded ? '▼' : '▶'} {events.length} event{events.length !== 1 ? 's' : ''}
            </button>
          )}
          {isExpanded && (
            <ul>
              {events.map((event: CollectionEntry<'events'>, index: number) => (
                <li key={`${event.data.id}-${index}`} className="py-1 group font-light ">
                  <a
                    href={buildUrl(`/docs/${event.collection}/${event.data.id}/${event.data.version}`)}
                    className="group-hover:text-primary flex space-x-1 items-center "
                  >
                    <div className={`flex items-center border border-gray-300 shadow-sm rounded-md`}>
                      <span className="flex items-center">
                        <span className={`bg-orange-500 h-full rounded-tl rounded-bl p-1`}>
                          <BoltIcon className="h-4 w-4 text-white" />
                        </span>
                        <span className="leading-none px-2 group-hover:underline ">
                          {event.data.name} (v{event.data.version})
                        </span>
                      </span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    },
    footer: (info) => info.column.id,
    filterFn: filterCollectionByName('ownedEvents'),
  }),

  columnHelper.accessor('data.ownedCommands', {
    id: 'ownedCommands',
    header: () => <span>{tableConfiguration.columns?.ownedCommands?.label || 'Owned commands'}</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'ownedCommands',
    },
    cell: (info) => {
      const commands = info.getValue();
      if (commands?.length === 0 || !commands)
        return <div className="font-light text-sm text-gray-400/60 text-left italic">Team owns no commands</div>;

      const isExpandable = commands?.length > 10;
      const isOpen = isExpandable ? commands?.length < 10 : true;
      const [isExpanded, setIsExpanded] = useState(isOpen);

      return (
        <div>
          {isExpandable && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="mb-2 text-sm text-gray-600 hover:text-gray-900">
              {isExpanded ? '▼' : '▶'} {commands.length} command{commands.length !== 1 ? 's' : ''}
            </button>
          )}
          {isExpanded && (
            <ul>
              {commands.map((command: CollectionEntry<'commands'>, index: number) => (
                <li key={`${command.data.id}-${index}`} className="py-1 group font-light ">
                  <a
                    href={buildUrl(`/docs/${command.collection}/${command.data.id}/${command.data.version}`)}
                    className="group-hover:text-primary flex space-x-1 items-center "
                  >
                    <div className={`flex items-center border border-gray-300 shadow-sm rounded-md`}>
                      <span className="flex items-center">
                        <span className={`bg-blue-500 h-full rounded-tl rounded-bl p-1`}>
                          <ChatBubbleLeftIcon className="h-4 w-4 text-white" />
                        </span>
                        <span className="leading-none px-2 group-hover:underline ">
                          {command.data.name} (v{command.data.version})
                        </span>
                      </span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      );

      // return commands.length;
    },
    footer: (info) => info.column.id,
    filterFn: filterCollectionByName('ownedCommands'),
  }),

  columnHelper.accessor('data.ownedQueries', {
    id: 'ownedQueries',
    header: () => <span>{tableConfiguration.columns?.ownedQueries?.label || 'Owned queries'}</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'ownedQueries',
    },
    cell: (info) => {
      const queries = info.getValue();
      if (queries?.length === 0 || !queries)
        return <div className="font-light text-sm text-gray-400/60 text-left italic">Team owns no queries</div>;

      const isExpandable = queries?.length > 10;
      const isOpen = isExpandable ? queries?.length < 10 : true;
      const [isExpanded, setIsExpanded] = useState(isOpen);

      return (
        <div>
          {isExpandable && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="mb-2 text-sm text-gray-600 hover:text-gray-900">
              {isExpanded ? '▼' : '▶'} {queries.length} query{queries.length !== 1 ? 's' : ''}
            </button>
          )}
          {isExpanded && (
            <ul>
              {queries.map((query: CollectionEntry<'queries'>, index: number) => (
                <li key={`${query.data.id}-${index}`} className="py-1 group font-light ">
                  <a
                    href={buildUrl(`/docs/${query.collection}/${query.data.id}/${query.data.version}`)}
                    className="group-hover:text-primary flex space-x-1 items-center "
                  >
                    <div className={`flex items-center border border-gray-300 shadow-sm rounded-md`}>
                      <span className="flex items-center">
                        <span className={`bg-blue-500 h-full rounded-tl rounded-bl p-1`}>
                          <ChatBubbleLeftIcon className="h-4 w-4 text-white" />
                        </span>
                        <span className="leading-none px-2 group-hover:underline ">
                          {query.data.name} (v{query.data.version})
                        </span>
                      </span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      );

      // return commands.length;
    },
    footer: (info) => info.column.id,
    filterFn: filterCollectionByName('ownedCommands'),
  }),

  columnHelper.accessor('data.ownedServices', {
    id: 'ownedServices',
    header: () => <span>{tableConfiguration.columns?.ownedServices?.label || 'Owned Services'}</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'ownedServices',
    },
    cell: (info) => {
      const services = info.getValue();
      if (services?.length === 0 || !services)
        return <div className="font-light text-sm text-gray-400/80 text-left italic">Team owns no services</div>;

      const isExpandable = services?.length > 10;
      const isOpen = isExpandable ? services?.length < 10 : true;
      const [isExpanded, setIsExpanded] = useState(isOpen);

      return (
        <div>
          {isExpandable && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="mb-2 text-sm text-gray-600 hover:text-gray-900">
              {isExpanded ? '▼' : '▶'} {services.length} service{services.length !== 1 ? 's' : ''}
            </button>
          )}
          {isExpanded && (
            <ul>
              {services.map((service: CollectionEntry<'services'>, index: number) => (
                <li key={`${service.data.id}-${index}`} className="py-1 group font-light ">
                  <a
                    href={buildUrl(`/docs/${service.collection}/${service.data.id}/${service.data.version}`)}
                    className="group-hover:text-primary flex space-x-1 items-center "
                  >
                    <div className={`flex items-center border border-gray-300 shadow-sm rounded-md`}>
                      <span className="flex items-center">
                        <span className={`bg-green-500 h-full rounded-tl rounded-bl p-1`}>
                          <ServerIcon className="h-4 w-4 text-white" />
                        </span>
                        <span className="leading-none px-2 group-hover:underline ">
                          {service.data.name} (v{service.data.version})
                        </span>
                      </span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    },
    footer: (info) => info.column.id,
    filterFn: filterCollectionByName('ownedServices'),
  }),

  columnHelper.accessor('data.name', {
    header: () => <span>{tableConfiguration.columns?.actions?.label || 'Actions'}</span>,
    cell: (info) => {
      const domain = info.row.original;
      return (
        <a
          className="hover:text-primary hover:underline px-4 font-light"
          href={buildUrl(`/docs/${domain.collection}/${domain.data.id}`)}
        >
          View &rarr;
        </a>
      );
    },
    id: 'actions',
    meta: {
      showFilter: false,
    },
  }),
];
