import { useState, useMemo, useEffect } from 'react';
import { EnvelopeIcon, ChevronRightIcon, ServerIcon, CircleStackIcon } from '@heroicons/react/24/outline';
import { RectangleGroupIcon } from '@heroicons/react/24/outline';
import { buildUrl, buildUrlWithParams } from '@utils/url-builder';
import type { CollectionEntry } from 'astro:content';
import type { CollectionMessageTypes } from '@types';
import { getCollectionStyles } from './utils';
import { SearchBar, TypeFilters, Pagination } from './components';

interface MessageGridProps {
  messages: CollectionEntry<CollectionMessageTypes>[];
  containers?: CollectionEntry<'containers'>[];
  embeded: boolean;
  isVisualiserEnabled: boolean;
}

interface GroupedMessages {
  all?: CollectionEntry<CollectionMessageTypes>[];
  sends?: CollectionEntry<CollectionMessageTypes>[];
  receives?: CollectionEntry<CollectionMessageTypes>[];
}

export default function MessageGrid({ messages, embeded, containers, isVisualiserEnabled }: MessageGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [urlParams, setUrlParams] = useState<{
    serviceId?: string;
    serviceName?: string;
    domainId?: string;
    domainName?: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState<CollectionMessageTypes[]>([]);
  const [producerConsumerFilter, setProducerConsumerFilter] = useState<'all' | 'no-producers' | 'no-consumers'>('all');
  const ITEMS_PER_PAGE = 15;

  // Effect to sync URL params with state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const serviceId = params.get('serviceId') || undefined;
    const serviceName = params.get('serviceName') ? decodeURIComponent(params.get('serviceName')!) : undefined;
    const domainId = params.get('domainId') || undefined;
    const domainName = params.get('domainName') || undefined;
    setUrlParams({
      serviceId,
      serviceName,
      domainId,
      domainName,
    });
  }, []);

  const filteredAndSortedMessages = useMemo(() => {
    if (urlParams === null) return [];

    let result = [...messages];

    // Filter by message type
    if (selectedTypes.length > 0) {
      result = result.filter((message) => selectedTypes.includes(message.collection));
    }

    // Apply producer/consumer filters
    if (producerConsumerFilter === 'no-producers') {
      result = result.filter((message) => !message.data.producers || message.data.producers.length === 0);
    } else if (producerConsumerFilter === 'no-consumers') {
      result = result.filter((message) => !message.data.consumers || message.data.consumers.length === 0);
    }

    // Filter by service ID or name if present
    if (urlParams.serviceId) {
      result = result.filter(
        (message) =>
          message.data.producers?.some(
            (producer: any) => producer.id === urlParams.serviceId && !producer.id.includes('/versioned/')
          ) ||
          message.data.consumers?.some(
            (consumer: any) => consumer.id === urlParams.serviceId && !consumer.id.includes('/versioned/')
          )
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (message) =>
          message.data.name?.toLowerCase().includes(query) ||
          message.data.summary?.toLowerCase().includes(query) ||
          message.data.producers?.some((producer: any) => producer.data.id?.toLowerCase().includes(query)) ||
          message.data.consumers?.some((consumer: any) => consumer.data.id?.toLowerCase().includes(query))
      );
    }

    // Sort by name by default
    result.sort((a, b) => a.data.name.localeCompare(b.data.name));

    return result;
  }, [messages, searchQuery, urlParams, selectedTypes, producerConsumerFilter]);

  // Add totalPages calculation
  const totalPages = useMemo(() => {
    if (urlParams?.serviceId || urlParams?.domainId) return 1;
    return Math.ceil(filteredAndSortedMessages.length / ITEMS_PER_PAGE);
  }, [filteredAndSortedMessages.length, urlParams]);

  // Add paginatedMessages calculation
  const paginatedMessages = useMemo(() => {
    if (urlParams?.serviceId || urlParams?.domainId) {
      return filteredAndSortedMessages;
    }

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedMessages.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedMessages, currentPage, urlParams]);

  // Reset pagination when search query or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTypes]);

  // Group messages by sends/receives when a service is selected
  const groupedMessages = useMemo<GroupedMessages>(() => {
    if (!urlParams?.serviceId) return { all: filteredAndSortedMessages };

    const serviceIdentifier = urlParams.serviceId;
    const sends = filteredAndSortedMessages.filter((message) =>
      message.data.producers?.some((producer: any) => producer.id === serviceIdentifier)
    );
    const receives = filteredAndSortedMessages.filter((message) =>
      message.data.consumers?.some((consumer: any) => consumer.id === serviceIdentifier)
    );

    return { sends, receives };
  }, [filteredAndSortedMessages, urlParams]);

  // Get the containers that are referenced by the service
  const serviceContainersReferenced = useMemo(() => {
    if (!urlParams?.serviceId || !containers) return { writesTo: [], readsFrom: [] };
    return {
      writesTo: containers.filter((container) =>
        container.data.servicesThatWriteToContainer?.some((service: any) => service.data.id === urlParams.serviceId)
      ),
      readsFrom: containers.filter((container) =>
        container.data.servicesThatReadFromContainer?.some((service: any) => service.data.id === urlParams.serviceId)
      ),
    };
  }, [containers, urlParams]);

  const renderTypeFilters = () => {
    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <TypeFilters
            selectedTypes={selectedTypes}
            onTypeChange={setSelectedTypes}
            filteredCount={filteredAndSortedMessages.filter((m) => selectedTypes.includes(m.collection)).length}
          />
        </div>

        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
          <div className="flex items-center gap-2">
            <select
              value={producerConsumerFilter}
              onChange={(e) => setProducerConsumerFilter(e.target.value as typeof producerConsumerFilter)}
              className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm sm:leading-6"
            >
              <option value="all">All Messages</option>
              <option value="no-producers">Without Producers</option>
              <option value="no-consumers">Without Consumers</option>
            </select>
            {producerConsumerFilter !== 'all' && (
              <button
                onClick={() => setProducerConsumerFilter('all')}
                className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMessageGrid = (messages: CollectionEntry<CollectionMessageTypes>[]) => (
    <div
      className={`grid ${urlParams?.serviceName ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'} gap-6`}
    >
      {messages.map((message) => {
        const { color, Icon } = getCollectionStyles(message.collection);
        return (
          <a
            key={message.data.name}
            href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
            className={`group bg-white border hover:bg-${color}-100  rounded-lg shadow-sm  hover:shadow-lg transition-all duration-200 overflow-hidden border-${color}-500 `}
          >
            <div className="p-4 py-2 flex-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {!embeded && <Icon className={`h-5 w-5 text-${color}-500`} />}
                  <h3
                    className={`font-semibold text-gray-900 truncate group-hover:text-${color}-500 transition-colors duration-200 ${embeded ? 'text-sm' : 'text-md'}`}
                  >
                    {message.data.name} (v{message.data.version})
                  </h3>
                </div>
              </div>

              {message.data.summary && <p className="text-gray-600 text-xs line-clamp-2 mb-4">{message.data.summary}</p>}

              {/* Only show stats in non-service view */}
              {!urlParams?.serviceName && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <ServerIcon className={`h-5 w-5 text-pink-500`} />
                      </div>
                      <div className="text-sm font-medium text-gray-900">{message.data.producers?.length ?? 0}</div>
                      <div className="text-xs text-gray-500">Producers</div>
                    </div>
                    <div className="text-center border-l border-gray-200">
                      <div className="flex items-center justify-center mb-1">
                        <ServerIcon className={`h-5 w-5 text-pink-500`} />
                      </div>
                      <div className="text-sm font-medium text-gray-900">{message.data.consumers?.length ?? 0}</div>
                      <div className="text-xs text-gray-500">Consumers</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );

  const renderPaginationControls = () => {
    if (totalPages <= 1 || urlParams?.serviceName || urlParams?.domainId) return null;

    return (
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredAndSortedMessages.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    );
  };

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center space-x-2 text-sm text-gray-500">
        <a href={buildUrl('/architecture/domains')} className="hover:text-gray-700 hover:underline flex items-center gap-2">
          <RectangleGroupIcon className="h-4 w-4" />
          Domains
        </a>
        <ChevronRightIcon className="h-4 w-4" />
        <a href={buildUrl('/architecture/services')} className="hover:text-gray-700 hover:underline flex items-center gap-2">
          <ServerIcon className="h-4 w-4" />
          Services
        </a>
        <ChevronRightIcon className="h-4 w-4" />
        <a href={buildUrl('/architecture/messages')} className="hover:text-gray-700 hover:underline flex items-center gap-2">
          <EnvelopeIcon className="h-4 w-4" />
          Messages
        </a>
        {urlParams?.domainId && (
          <>
            <ChevronRightIcon className="h-4 w-4" />
            <a
              href={buildUrlWithParams(`/architecture/services`, {
                domainName: urlParams.domainName,
                domainId: urlParams.domainId,
                serviceName: urlParams.serviceName,
                serviceId: urlParams.serviceId,
              })}
              className="hover:text-gray-700 hover:underline"
            >
              {urlParams.domainId}
            </a>
          </>
        )}
        {urlParams?.serviceName && (
          <>
            <ChevronRightIcon className="h-4 w-4" />
            <span className="text-gray-900">{urlParams.serviceName}</span>
          </>
        )}
      </nav>

      {/* Title Section */}
      <div className="relative border-b border-gray-200 mb-4 pb-4">
        <div className="md:flex md:items-start md:justify-between">
          <div className="min-w-0 flex-1 max-w-lg">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                {urlParams?.domainName ? `Messages in ${urlParams.serviceName}` : 'All Messages'}
              </h1>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {urlParams?.domainName
                ? `Browse messages in the ${urlParams.serviceName} service`
                : 'Browse and discover messages in your event-driven architecture'}
            </p>
          </div>

          <div className="mt-6 md:mt-0 md:ml-4 flex-shrink-0">
            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Search messages by name, summary, or services..."
              totalResults={filteredAndSortedMessages.length}
              totalItems={messages.length}
            />
          </div>
        </div>
      </div>

      <div className="mb-8">
        {/* Results count and top pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {renderTypeFilters()}
          {renderPaginationControls()}
        </div>
      </div>

      {filteredAndSortedMessages.length > 0 && (
        <div className={`rounded-xl overflow-hidden ${urlParams?.domainId ? 'bg-yellow-50 p-8 border-2 border-yellow-300' : ''}`}>
          {urlParams?.domainName && (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RectangleGroupIcon className="h-5 w-5 text-yellow-500" />
                  <a
                    href={buildUrlWithParams(`/architecture/services`, {
                      domainName: urlParams.domainName,
                      domainId: urlParams.domainId,
                    })}
                    className="text-2xl font-semibold text-gray-900 hover:underline"
                  >
                    {urlParams.domainName}
                  </a>
                </div>
                <div className="flex gap-2">
                  {isVisualiserEnabled && (
                    <a
                      href={buildUrl(`/visualiser/domains/${urlParams.domainId}`)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md transition-colors duration-200"
                    >
                      View in visualizer
                    </a>
                  )}
                  <a
                    href={buildUrl(`/docs/domains/${urlParams.domainId}`)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-black border border-gray-300 bg-white  rounded-md transition-colors duration-200"
                  >
                    Read documentation
                  </a>
                </div>
              </div>
            </>
          )}

          <div
            className={`rounded-xl overflow-hidden ${urlParams?.serviceName ? 'bg-pink-50 p-8 border-2 border-dashed border-pink-300' : ''}`}
          >
            {urlParams?.serviceName ? (
              <>
                {/* <div className="h-2 bg-pink-500 -mx-8 -mt-8 mb-8"></div> */}
                {/* Service Title */}
                <div className="flex items-center gap-2 mb-8">
                  <ServerIcon className="h-6 w-6 text-pink-500" />
                  <h2 className="text-2xl font-semibold text-gray-900">{urlParams.serviceName}</h2>
                  <div className="flex gap-2 ml-auto">
                    {isVisualiserEnabled && (
                      <a
                        href={buildUrl(`/visualiser/services/${urlParams.serviceId}`)}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md transition-colors duration-200 hover:bg-gray-50"
                      >
                        View in visualizer
                      </a>
                    )}
                    <a
                      href={buildUrl(`/docs/services/${urlParams.serviceId}`)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-black border border-gray-300 bg-white rounded-md transition-colors duration-200 hover:bg-gray-50"
                    >
                      Read documentation
                    </a>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-8 relative">
                  {/* Left Column - Receives Messages & Reads From Containers */}
                  <div className="space-y-6">
                    {/* Receives Messages Section */}
                    <div className="bg-blue-50 bg-opacity-50 border border-blue-300 border-dashed rounded-lg p-4">
                      <div className="mb-6">
                        <h2 className={`font-semibold text-gray-900 flex items-center gap-2 ${embeded ? 'text-sm' : 'text-xl'}`}>
                          <ServerIcon className="h-5 w-5 text-blue-500" />
                          Receives ({groupedMessages.receives?.length || 0})
                        </h2>
                      </div>
                      {groupedMessages.receives && groupedMessages.receives.length > 0 ? (
                        renderMessageGrid(groupedMessages.receives)
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-gray-500 text-sm">No messages</p>
                        </div>
                      )}
                    </div>

                    {/* Reads From Containers - Only show if containers exist */}
                    {serviceContainersReferenced.readsFrom && serviceContainersReferenced.readsFrom.length > 0 && (
                      <div className="bg-orange-50 border border-orange-300 border-dashed rounded-lg p-4 relative">
                        <div className="mb-6">
                          <h2
                            className={`font-semibold text-gray-900 flex items-center gap-2 ${embeded ? 'text-sm' : 'text-xl'}`}
                          >
                            <CircleStackIcon className="h-5 w-5 text-orange-500" />
                            Reads from ({serviceContainersReferenced.readsFrom.length})
                          </h2>
                        </div>
                        <div className="space-y-3">
                          {serviceContainersReferenced.readsFrom.map((container: CollectionEntry<'containers'>) => (
                            <a
                              key={container.data.id}
                              href={buildUrl(`/docs/containers/${container.data.id}/${container.data.version}`)}
                              className="group bg-white border border-orange-200 hover:bg-orange-100 rounded-lg p-3 block transition-all duration-200"
                            >
                              <div className="flex items-center gap-2">
                                <CircleStackIcon className="h-4 w-4 text-orange-500" />
                                <h3 className="font-semibold text-gray-900 text-sm group-hover:text-orange-700">
                                  {container.data.name}
                                </h3>
                              </div>
                              {container.data.summary && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{container.data.summary}</p>
                              )}
                            </a>
                          ))}
                        </div>
                        {/* Arrow from Reads From to Service */}
                        <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-16 z-10">
                          <div className="absolute left-0 w-4 h-4 border-b-[3px] border-l-[3px] border-orange-200 transform rotate-45 -translate-x-1 translate-y-[-1px] shadow-[-1px_1px_0_1px_rgba(0,0,0,0.1)]"></div>
                          <div className="w-full h-[3px] bg-orange-200 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Arrow from Receives to Service */}
                  <div className="absolute left-[30%] top-[25%] -translate-y-1/2 flex items-center justify-center w-16">
                    <div className="w-full h-[3px] bg-blue-200 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"></div>
                    <div className="absolute right-0 w-4 h-4 border-t-[3px] border-r-[3px] border-blue-200 transform rotate-45 translate-x-1 translate-y-[-1px] shadow-[1px_-1px_0_1px_rgba(0,0,0,0.1)]"></div>
                  </div>

                  {/* Service Information (Center) */}
                  <div className="bg-white border-2 border-pink-100 rounded-lg p-6 flex flex-col justify-center">
                    <div className="flex flex-col items-center gap-4">
                      <ServerIcon className="h-12 w-12 text-pink-500" />
                      <p className="text-xl font-semibold text-gray-900 text-center">{urlParams.serviceName}</p>

                      {/* Quick Stats Grid */}
                      <div className="w-full grid grid-cols-2 gap-3 mt-2">
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-2xl font-bold text-blue-600">{groupedMessages.receives?.length || 0}</div>
                          <div className="text-xs text-gray-600 mt-1">Receives</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-2xl font-bold text-green-600">{groupedMessages.sends?.length || 0}</div>
                          <div className="text-xs text-gray-600 mt-1">Sends</div>
                        </div>
                        {serviceContainersReferenced.readsFrom && serviceContainersReferenced.readsFrom.length > 0 && (
                          <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="text-2xl font-bold text-orange-600">
                              {serviceContainersReferenced.readsFrom.length}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">Reads from</div>
                          </div>
                        )}
                        {serviceContainersReferenced.writesTo && serviceContainersReferenced.writesTo.length > 0 && (
                          <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="text-2xl font-bold text-purple-600">
                              {serviceContainersReferenced.writesTo.length}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">Writes to</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Arrow from Service to Sends */}
                  <div className="absolute right-[30%] top-[25%] -translate-y-1/2 flex items-center justify-center w-16">
                    <div className="w-full h-[3px] bg-green-200 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"></div>
                    <div className="absolute right-0 w-4 h-4 border-t-[3px] border-r-[3px] border-green-200 transform rotate-45 translate-x-1 translate-y-[-1px] shadow-[1px_-1px_0_1px_rgba(0,0,0,0.1)]"></div>
                  </div>

                  {/* Right Column - Sends Messages & Writes To Containers */}
                  <div className="space-y-6">
                    {/* Sends Messages Section */}
                    <div className="bg-green-50 border border-green-300 border-dashed rounded-lg p-4">
                      <div className="mb-6">
                        <h2 className={`font-semibold text-gray-900 flex items-center gap-2 ${embeded ? 'text-sm' : 'text-xl'}`}>
                          <ServerIcon className="h-5 w-5 text-emerald-500" />
                          Sends ({groupedMessages.sends?.length || 0})
                        </h2>
                      </div>
                      {groupedMessages.sends && groupedMessages.sends.length > 0 ? (
                        renderMessageGrid(groupedMessages.sends)
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-gray-500 text-sm">No messages</p>
                        </div>
                      )}
                    </div>

                    {/* Writes To Containers - Only show if containers exist */}
                    {serviceContainersReferenced.writesTo && serviceContainersReferenced.writesTo.length > 0 && (
                      <div className="bg-purple-50 border border-purple-300 border-dashed rounded-lg p-4 relative">
                        {/* Arrow from Service to Writes To */}
                        <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-16 z-10">
                          <div className="w-full h-[3px] bg-purple-200 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"></div>
                          <div className="absolute right-0 w-4 h-4 border-t-[3px] border-r-[3px] border-purple-200 transform rotate-45 translate-x-1 translate-y-[-1px] shadow-[1px_-1px_0_1px_rgba(0,0,0,0.1)]"></div>
                        </div>
                        <div className="mb-6">
                          <h2
                            className={`font-semibold text-gray-900 flex items-center gap-2 ${embeded ? 'text-sm' : 'text-xl'}`}
                          >
                            <CircleStackIcon className="h-5 w-5 text-purple-500" />
                            Writes to ({serviceContainersReferenced.writesTo.length})
                          </h2>
                        </div>
                        <div className="space-y-3">
                          {serviceContainersReferenced.writesTo.map((container: CollectionEntry<'containers'>) => (
                            <a
                              key={container.data.id}
                              href={buildUrl(`/docs/containers/${container.data.id}/${container.data.version}`)}
                              className="group bg-white border border-purple-200 hover:bg-purple-100 rounded-lg p-3 block transition-all duration-200"
                            >
                              <div className="flex items-center gap-2">
                                <CircleStackIcon className="h-4 w-4 text-purple-500" />
                                <h3 className="font-semibold text-gray-900 text-sm group-hover:text-purple-700">
                                  {container.data.name}
                                </h3>
                              </div>
                              {container.data.summary && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{container.data.summary}</p>
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {renderMessageGrid(paginatedMessages)}
                <div className="mt-8 border-t border-gray-200">{renderPaginationControls()}</div>
              </>
            )}
          </div>
        </div>
      )}

      {filteredAndSortedMessages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No messages found matching your criteria</p>
        </div>
      )}
    </div>
  );
}
