import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { filterByName, filterCollectionByName } from '../filters/custom-filters';
import { buildUrl } from '@utils/url-builder';
import type { TData } from '../Table';
import type { CollectionUserTypes } from '@types';
import { User, Users } from 'lucide-react';
import type { CollectionEntry } from 'astro:content';
import { ServerIcon, BoltIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/solid';

const columnHelper = createColumnHelper<TData<CollectionUserTypes>>();

export const columns = () => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>Name</span>,
    cell: (info) => {
      const messageRaw = info.row.original;
      const type = useMemo(() => messageRaw.collection.slice(0, -1), [messageRaw.collection]);
      return (
        <div className=" group ">
          <a
            href={buildUrl(`/docs/${messageRaw.collection}/${messageRaw.data.id}`)}
            className={`group-hover:text-gray-500 flex space-x-1 items-center`}
          >
            <div className={`flex items-center border border-gray-300 shadow-sm rounded-md group-hover:border-gray-400`}>
              <span className="flex items-center">
                {!messageRaw.data.avatarUrl && (
                  <span className={`bg-gray-300 group-hover:bg-gray-600 h-full rounded-tl rounded-bl p-1`}>
                    <User className="h-4 w-4 text-white" />
                  </span>
                )}
                {messageRaw.data.avatarUrl && (
                  <img src={messageRaw.data.avatarUrl} alt={messageRaw.data.name} className="h-12 w-12 rounded-md p-0.5" />
                )}

                <span className="leading-none px-2 group-hover:underline group-hover:text-primary font-light">
                  {messageRaw.data.name}
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

  columnHelper.accessor('data.role', {
    id: 'role',
    header: () => 'Role',
    cell: (info) => <span className="font-light ">{info.renderValue()}</span>,
    footer: (info) => info.column.id,
    meta: {
      showFilter: false,
      className: 'max-w-[200px]',
    },
    filterFn: filterCollectionByName('role'),
  }),

  columnHelper.accessor('data.ownedCommands', {
    header: () => <span>Owned commands</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'ownedCommands',
    },
    cell: (info) => {
      const commands = info.getValue();
      if (commands?.length === 0 || !commands)
        return <div className="font-light text-sm text-gray-400/60 text-left italic">User owns no commands</div>;

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
  columnHelper.accessor('data.ownedEvents', {
    header: () => <span>Owned Events</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'ownedEvents',
    },
    cell: (info) => {
      const events = info.getValue();
      if (events?.length === 0 || !events)
        return <div className="font-light text-sm text-gray-400/80 text-left italic">User owns no events</div>;

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
  columnHelper.accessor('data.ownedServices', {
    header: () => <span>Owned Services</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'ownedServices',
    },
    cell: (info) => {
      const services = info.getValue();
      if (services?.length === 0 || !services)
        return <div className="font-light text-sm text-gray-400/80 text-left italic">User owns no services</div>;

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
  columnHelper.accessor('data.associatedTeams', {
    header: () => <span>Teams</span>,
    meta: {
      filterVariant: 'collection',
      collectionFilterKey: 'associatedTeams',
      filteredItemHasVersion: false,
    },
    cell: (info) => {
      const teams = info.getValue();

      const isExpandable = teams?.length > 10;
      const isOpen = isExpandable ? teams?.length < 10 : true;
      const [isExpanded, setIsExpanded] = useState(isOpen);

      if (teams?.length === 0 || !teams)
        return <div className="font-light text-sm text-gray-400/80 text-left italic">User is not associated with any teams</div>;

      return (
        <div>
          {isExpandable && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="mb-2 text-sm text-gray-600 hover:text-gray-900">
              {isExpanded ? '▼' : '▶'} {teams.length} team{teams.length !== 1 ? 's' : ''}
            </button>
          )}
          {isExpanded && (
            <ul>
              {teams.map((team: CollectionEntry<'teams'>, index: number) => (
                <li key={`${team.data.id}-${index}`} className="py-1 group font-light ">
                  <a
                    href={buildUrl(`/docs/teams/${team.data.id}`)}
                    className="group-hover:text-primary flex space-x-1 items-center "
                  >
                    <div className={`flex items-center border border-gray-300 shadow-sm rounded-md`}>
                      <span className="flex items-center">
                        <span className={`bg-pink-500 h-full rounded-tl rounded-bl p-1`}>
                          <Users className="h-4 w-4 text-white" />
                        </span>
                        <span className="leading-none px-2 group-hover:underline ">{team.data.name}</span>
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
    filterFn: filterCollectionByName('associatedTeams'),
  }),
  columnHelper.accessor('data.name', {
    header: () => <span />,
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
