import { getColorAndIconForCollection } from '@utils/collections/icons';
import { buildUrl } from '@utils/url-builder';
import { useState, useMemo, useCallback, memo } from 'react';

type MessageTableMessage = {
  id: string;
  name: string;
  version: string;
  collection: string;
  type: string;
  summary: string;
  channels: any[];
};

type MessageTableProps = {
  format: 'receives' | 'sends' | 'all';
  limit?: number;
  showChannels?: boolean;
  collection: string;
  sends: MessageTableMessage[];
  receives: MessageTableMessage[];
};

type MessageType = 'event' | 'query' | 'command' | null;

const MessageRow = memo(
  ({ message, showChannels, collection }: { message: MessageTableMessage; showChannels?: boolean; collection: string }) => {
    const { color, Icon } = getColorAndIconForCollection(message.collection);
    const url = buildUrl(`/docs/${collection}/${message.id}/${message.version}`);
    let type = collection.slice(0, -1);
    type = type === 'querie' ? 'query' : type;

    const channels = message.channels || [];

    return (
      <tr className="group hover:bg-gray-100">
        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 relative">
          <a href={url} className="absolute inset-0 z-10" aria-label={`View details for ${message.name}`} />
          <div className="flex items-center gap-2 relative">
            <Icon className={`h-5 w-5 text-${color}-500`} />
            <span className="group-hover:text-blue-600 break-all">{message.name}</span>
          </div>
        </td>
        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 relative">
          <a href={url} className="absolute inset-0 z-10" aria-hidden="true" />
          <span>v{message.version}</span>
        </td>
        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 relative">
          <a href={url} className="absolute inset-0 z-10" aria-hidden="true" />
          <span>{type}</span>
        </td>
        <td className="px-3 py-4 text-sm text-gray-500 relative">
          <a href={url} className="absolute inset-0 z-10" aria-hidden="true" />
          <span className="line-clamp-2 break-words">{message.summary || '-'}</span>
        </td>
        {showChannels && (
          <td className="px-3 py-4 text-sm text-gray-500 relative">
            <a href={url} className="absolute inset-0 z-10" aria-hidden="true" />
            <div className="flex flex-wrap gap-1">
              {channels.length > 0
                ? channels.map((channel, index) => (
                    <span
                      key={`${channel.id}-${index}`}
                      className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
                    >
                      {channel.id}
                    </span>
                  ))
                : '-'}
            </div>
          </td>
        )}
      </tr>
    );
  }
);

const FilterButton = memo(
  ({
    type,
    label,
    typeFilter,
    setTypeFilter,
    setCurrentPage,
    count,
  }: {
    type: MessageType;
    label: string;
    typeFilter: MessageType;
    setTypeFilter: (type: MessageType) => void;
    setCurrentPage: (page: number) => void;
    count: number;
  }) => (
    <button
      onClick={() => {
        setTypeFilter(typeFilter === type ? null : type);
        setCurrentPage(1);
      }}
      className={`px-3 py-1 rounded-md text-sm font-medium ${
        typeFilter === type
          ? 'bg-black text-white border border-gray-200 hover:bg-gray-900'
          : 'bg-white text-black border border-gray-200 hover:bg-gray-100'
      }`}
    >
      {label} ({count})
    </button>
  )
);

const MessageTable = (props: MessageTableProps) => {
  const { receives, sends, collection = 'services', limit, showChannels = false, format = 'all' } = props;
  const [receivesSearchTerm, setReceivesSearchTerm] = useState('');
  const [sendsSearchTerm, setSendsSearchTerm] = useState('');
  const [receivesPage, setReceivesPage] = useState(1);
  const [sendsPage, setSendsPage] = useState(1);
  const [receivesTypeFilter, setReceivesTypeFilter] = useState<MessageType>(null);
  const [sendsTypeFilter, setSendsTypeFilter] = useState<MessageType>(null);
  const itemsPerPage = limit || 5;

  const shouldRenderReceives = format === 'receives' || format === 'all';
  const shouldRenderSends = format === 'sends' || format === 'all';

  const filterMessages = useCallback((messages: MessageTableMessage[], searchTerm: string, typeFilter: MessageType) => {
    let filtered = messages;

    if (typeFilter) {
      filtered = filtered.filter((message) => {
        const collectionType = message.collection.slice(0, -1);
        const normalizedType = collectionType === 'querie' ? 'query' : collectionType;
        return normalizedType === typeFilter;
      });
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((message) => {
        const collectionType = message.collection.slice(0, -1);
        const normalizedType = collectionType === 'querie' ? 'query' : collectionType;

        return (
          message.name.toLowerCase().includes(lowerSearchTerm) ||
          message.summary?.toLowerCase().includes(lowerSearchTerm) ||
          normalizedType.toLowerCase().includes(lowerSearchTerm)
        );
      });
    }

    return filtered;
  }, []);

  const renderTable = (
    title: string,
    messages: any[],
    searchTerm: string,
    setSearchTerm: (value: string) => void,
    currentPage: number,
    setCurrentPage: (page: number) => void,
    typeFilter: MessageType,
    setTypeFilter: (type: MessageType) => void
  ) => {
    const filteredMessages = useMemo(
      () => filterMessages(messages, searchTerm, typeFilter),
      [messages, searchTerm, typeFilter, filterMessages]
    );

    const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedMessages = useMemo(
      () => filteredMessages.slice(startIndex, startIndex + itemsPerPage),
      [filteredMessages, startIndex, itemsPerPage]
    );

    // Get unique message types and their counts
    const messageTypeCounts = useMemo(() => {
      const counts = new Map<MessageType, number>();
      messages.forEach((message) => {
        const collectionType = message.collection.slice(0, -1);
        const normalizedType = (collectionType === 'querie' ? 'query' : collectionType) as MessageType;
        counts.set(normalizedType, (counts.get(normalizedType) || 0) + 1);
      });
      return counts;
    }, [messages]);

    const availableTypes = useMemo(
      () =>
        Array.from(
          new Set(
            messages.map((message) => {
              const collectionType = message.collection.slice(0, -1);
              return collectionType === 'querie' ? 'query' : collectionType;
            })
          )
        ) as MessageType[],
      [messages]
    );

    const filterButtons = useMemo(
      () =>
        [
          { type: 'event' as MessageType, label: 'Events' },
          { type: 'query' as MessageType, label: 'Queries' },
          { type: 'command' as MessageType, label: 'Commands' },
        ]
          .filter((button) => availableTypes.includes(button.type))
          .map((button) => ({
            ...button,
            count: messageTypeCounts.get(button.type) || 0,
          })),
      [availableTypes, messageTypeCounts]
    );

    return (
      <div className="flow-root bg-white border-gray-200 border  p-4 pb-2 rounded-lg text-gray-900">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {title} ({searchTerm || typeFilter ? `${filteredMessages.length}/${messages.length}` : messages.length})
          </h2>
          <span className="text-sm text-gray-700">
            Quickly find the message you need by searching for the name, type, or summary.
          </span>

          {/* Type filter buttons - only shown if there are filter options */}
          {filterButtons.length > 0 && (
            <div className="flex gap-2 pb-2">
              {filterButtons.map((button) => (
                <FilterButton
                  key={button.type}
                  type={button.type}
                  label={button.label}
                  count={button.count}
                  typeFilter={typeFilter}
                  setTypeFilter={setTypeFilter}
                  setCurrentPage={setCurrentPage}
                />
              ))}
            </div>
          )}

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
              placeholder={`Search by name, type, or summary...`}
              className="block w-full rounded-md border-0 py-1.5 pl-10 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1); // Reset to first page when clearing search
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                aria-label="Clear search"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="max-w-full overflow-hidden">
              <table className="min-w-full table-fixed divide-y divide-gray-300  rounded-sm bg-white ">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className={`${showChannels ? 'w-1/4' : 'w-1/3'} py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6`}
                    >
                      Name
                    </th>
                    <th scope="col" className="w-[100px] px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Version
                    </th>
                    <th scope="col" className="w-[100px] py-3.5 pl-3.5 pr-3 text-left text-sm font-semibold text-gray-900">
                      Type
                    </th>
                    <th
                      scope="col"
                      className={`${showChannels ? 'w-1/3' : 'w-1/2'} px-3 py-3.5 text-left text-sm font-semibold text-gray-900`}
                    >
                      Summary
                    </th>
                    {showChannels && (
                      <th scope="col" className="w-1/4 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Channels
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedMessages.length > 0 ? (
                    paginatedMessages.map((message) => (
                      <MessageRow
                        key={message.id}
                        message={message}
                        showChannels={showChannels}
                        collection={message.collection}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={showChannels ? 5 : 4} className="text-center py-4 text-sm text-gray-500">
                        No messages found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 -mt-2">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${currentPage === 1 ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${currentPage === totalPages ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredMessages.length)}</span> of{' '}
                  <span className="font-medium">{filteredMessages.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${currentPage === 1 ? 'text-gray-300' : 'text-gray-400 hover:bg-gray-50'} ring-1 ring-inset ring-gray-300`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${currentPage === totalPages ? 'text-gray-300' : 'text-gray-400 hover:bg-gray-50'} ring-1 ring-inset ring-gray-300`}
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`mx-auto not-prose py-4  space-y-4  my-4`}>
      <h2 className="text-2xl font-semibold">Messages for this {collection.slice(0, -1)}</h2>
      <div>
        {shouldRenderSends && (
          <div>
            {renderTable(
              'Sends messages',
              sends || [],
              sendsSearchTerm,
              setSendsSearchTerm,
              sendsPage,
              setSendsPage,
              sendsTypeFilter,
              setSendsTypeFilter
            )}
          </div>
        )}
        {shouldRenderReceives && (
          <div className={format === 'all' ? 'pt-4' : ''}>
            {renderTable(
              'Receives messages',
              receives || [],
              receivesSearchTerm,
              setReceivesSearchTerm,
              receivesPage,
              setReceivesPage,
              receivesTypeFilter,
              setReceivesTypeFilter
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageTable;
