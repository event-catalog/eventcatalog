import { useState, useMemo, useEffect } from 'react';
import { ServerIcon, MagnifyingGlassIcon, FunnelIcon, EnvelopeIcon, ChevronRightIcon, ArrowLeftIcon, ArrowRightIcon, ChatBubbleLeftIcon, BoltIcon } from '@heroicons/react/24/outline';
import { RectangleGroupIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';
import { buildUrl, buildUrlWithParams } from '@utils/url-builder';
import type { CollectionEntry } from 'astro:content';
import type { CollectionMessageTypes } from '@types';

const getCollectionStyles = (collection: CollectionMessageTypes) => {
    switch (collection) {
        case 'events':
            return { color: 'orange', Icon: BoltIcon };
        case 'commands':
            return { color: 'blue', Icon: ChatBubbleLeftIcon };
        case 'queries':
            return { color: 'green', Icon: MagnifyingGlassIcon };
        default:
            return { color: 'gray', Icon: EnvelopeIcon };
    }
};

interface ServiceGridProps {
  services: CollectionEntry<'services'>[];
}

export default function ServiceGrid({ services }: ServiceGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState<CollectionMessageTypes[]>([]);
  const ITEMS_PER_PAGE = 16;
  const [urlParams, setUrlParams] = useState<{ 
    serviceIds?: string[]; 
    domainId?: string; 
    domainName?: string;
    serviceName?: string;
  } | null>(null);

  // Effect to sync URL params with state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const serviceIds = params.get('serviceIds')?.split(',').filter(Boolean);
    const domainId = params.get('domainId') || undefined;
    const domainName = params.get('domainName') || undefined;
    const serviceName = params.get('serviceName') || undefined;
    setUrlParams({
      serviceIds,
      domainId,
      domainName,
      serviceName
    });
  }, []);

  const filteredAndSortedServices = useMemo(() => {
    // Don't filter until we have URL params
    if (urlParams === null) return [];

    let result = [...services];

    // Filter by service IDs if present
    if (urlParams.serviceIds?.length) {
      result = result.filter(service => urlParams.serviceIds?.includes(service.data.id) && !service.data.id.includes('/versioned/'));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(service =>
        service.data.name?.toLowerCase().includes(query) ||
        service.data.summary?.toLowerCase().includes(query) ||
        service.data.sends?.some((message: any) => message.data.name.toLowerCase().includes(query)) ||
        service.data.receives?.some((message: any) => message.data.name.toLowerCase().includes(query))
      );
    }

    // Filter by selected message types
    if (selectedTypes.length > 0) {
      result = result.filter(service => {
        const hasMatchingSends = service.data.sends?.some((message: any) => selectedTypes.includes(message.collection));
        const hasMatchingReceives = service.data.receives?.some((message: any) => selectedTypes.includes(message.collection));
        return hasMatchingSends || hasMatchingReceives;
      });
    }

    // Sort by name by default
    result.sort((a, b) => (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id));

    return result;
  }, [services, searchQuery, urlParams, selectedTypes]);

  // Add pagination calculation
  const paginatedServices = useMemo(() => {
    if (urlParams?.domainId || urlParams?.serviceIds?.length) {
      return filteredAndSortedServices;
    }

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedServices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedServices, currentPage, urlParams]);

  const totalPages = useMemo(() => {
    if (urlParams?.domainId || urlParams?.serviceIds?.length) return 1;
    return Math.ceil(filteredAndSortedServices.length / ITEMS_PER_PAGE);
  }, [filteredAndSortedServices.length, urlParams]);

  // Reset pagination when search query or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTypes]);

  const renderPaginationControls = () => {
    if (totalPages <= 1 || urlParams?.domainId || urlParams?.serviceIds?.length) return null;

    return (
      <div className="flex items-center justify-between border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div className="pr-4">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedServices.length)}
              </span> of{' '}
              <span className="font-medium">{filteredAndSortedServices.length}</span> results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">First</span>
                <ChevronDoubleLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Last</span>
                <ChevronDoubleRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  const renderTypeFilters = () => {
    const types: CollectionMessageTypes[] = ['events', 'commands', 'queries'];

    return (
      <div className="flex items-center gap-2">
        {types.map(type => {
          const { color, Icon } = getCollectionStyles(type);
          const isSelected = selectedTypes.includes(type);
          return (
            <button
              key={type}
              onClick={() => {
                setSelectedTypes(prev =>
                  prev.includes(type)
                    ? prev.filter(t => t !== type)
                    : [...prev, type]
                );
              }}
              className={`
                inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
                transition-colors duration-200
                ${isSelected
                  ? `bg-${color}-100 text-${color}-700 ring-2 ring-${color}-500`
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Icon className={`h-4 w-4 ${isSelected ? `text-${color}-500` : 'text-gray-400'}`} />
              <span className="capitalize">{type}</span>
              {isSelected && (
                <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-${color}-50 text-${color}-700 rounded-full`}>
                  {filteredAndSortedServices.filter(service => 
                    service.data.sends?.some((m: any) => m.collection === type) || 
                    service.data.receives?.some((m: any) => m.collection === type)
                  ).length}
                </span>
              )}
            </button>
          );
        })}
        {selectedTypes.length > 0 && (
          <button
            onClick={() => setSelectedTypes([])}
            className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
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
        {urlParams?.domainId && (
          <>
            <ChevronRightIcon className="h-4 w-4" />
            <span className="text-gray-900">{urlParams.domainId}</span>
          </>
        )}
      </nav>

      {/* Title Section */}
      <div className="relative border-b border-gray-200 mb-4 pb-4">
        <div className="md:flex md:items-start md:justify-between">
          <div className="min-w-0 flex-1 max-w-lg">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                {urlParams?.domainId ? `Services in the ${urlParams.domainName} domain (${filteredAndSortedServices.length})` : 'All Services'}
              </h1>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {urlParams?.domainId
                ? `Browse services in the ${urlParams.domainId} domain`
                : 'Browse and discover services in your event-driven architecture'}
            </p>
          </div>

          <div className="mt-6 md:mt-0 md:ml-4 flex-shrink-0 w-full md:w-96">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                placeholder="Search services by name, summary, or messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-lg border-0 py-2.5 pl-10 pr-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              />
              {searchQuery && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <span className="sr-only">Clear search</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            {searchQuery && (
              <div className="mt-2 text-sm text-gray-500 flex items-center justify-between">
                <span>
                  Found <span className="font-medium text-gray-900">{filteredAndSortedServices.length}</span> of <span className="font-medium text-gray-900">{services.length}</span>
                </span>
                <span className="text-gray-400 text-xs">
                  ESC to clear
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8">
        {/* Results count and pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {renderTypeFilters()}
          <div className="text-sm text-gray-500">
            {urlParams?.domainId || urlParams?.serviceIds?.length ? (
              <span>Showing {filteredAndSortedServices.length} services in the {urlParams.domainId} domain</span>
            ) : (
              <span>Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedServices.length)} of {filteredAndSortedServices.length} services</span>
            )}
          </div>
          {!(urlParams?.domainId || urlParams?.serviceIds?.length) && renderPaginationControls()}
        </div>
      </div>

      {filteredAndSortedServices.length > 0 && (
        <div className={`rounded-xl overflow-hidden ${urlParams?.domainId ? 'bg-yellow-50 p-8 border-2 border-yellow-400' : ''}`}>
          {urlParams?.domainName && (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RectangleGroupIcon className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-semibold text-gray-900">{urlParams.domainName}</span>
                </div>
                <div className="flex gap-2">
                  <a
                    href={buildUrl(`/visualiser/domains/${urlParams.domainId}`)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md transition-colors duration-200"
                  >
                    View in visualizer
                  </a>
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

          <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
            {paginatedServices.map((service) => {
              return <a
                key={service.data.id}
                href={buildUrlWithParams('/architecture/messages', {
                  serviceName: service.data.name,
                  serviceId: service.data.id,
                  domainId: urlParams?.domainId,
                  domainName: urlParams?.domainName
                })}
                className="group hover:bg-pink-50  bg-white border-2 border-dashed border-pink-400 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ServerIcon className="h-5 w-5 text-pink-500" />
                      <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:underline transition-colors duration-200">
                        {service.data.name || service.data.id} (v{service.data.version})
                      </h3>
                    </div>
                  </div>

                  {service.data.summary && (
                    <p className="text-gray-600 text-sm line-clamp-2 min-h-[2.5rem]">
                      {service.data.summary}
                    </p>
                  )}

                  <div className="space-y-4">
                    {/* Messages Section */}
                    {!urlParams?.serviceName && (
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-full flex flex-col bg-blue-100 border border-blue-300 rounded-lg p-4">
                                <div className="space-y-2 flex-1">
                                    {service.data.receives?.filter((message: any) => 
                                        selectedTypes.length === 0 || selectedTypes.includes(message.collection)
                                    )?.map((message: any) => {
                                        const { Icon, color } = getCollectionStyles(message.collection);
                                        return (
                                            <a
                                                key={message.data.name}
                                                href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
                                                className="group flex border border-gray-200 items-center gap-1 rounded-md text-[11px] font-medium hover:bg-gray-50 transition-colors duration-200 bg-white"
                                            >
                                                <div className="bg-white border-r border-gray-200 px-2 py-1.5 rounded-l-md">
                                                    <Icon className={`h-3 w-3 text-${color}-500`} />
                                                </div>
                                                <span className="px-1 py-1">
                                                    {message.data.name}
                                                </span>
                                            </a>
                                        );
                                    })}
                                    {(!service.data.receives?.length || (selectedTypes.length > 0 && !service.data.receives?.some((message: any) => selectedTypes.includes(message.collection)))) && (
                                        <div className="text-center py-4">
                                            <p className="text-gray-500 text-[10px]">No messages received</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="w-4 h-[2px] bg-blue-200"></div>
                                <div className="bg-white border-2 border-pink-100 rounded-lg p-4 shadow-sm">
                                    <div className="flex flex-col items-center gap-3">
                                        <ServerIcon className="h-8 w-8 text-pink-500" />
                                        <div className="text-center">
                                            <p className="text-sm font-medium text-gray-900">{service.data.name || service.data.id}</p>
                                            <p className="text-xs text-gray-500">v{service.data.version}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-4 h-[2px] bg-emerald-200"></div>
                            </div>

                            <div className="flex-1 h-full flex flex-col bg-green-100 border border-green-300 rounded-lg p-4">
                                <div className="space-y-2 flex-1">
                                    {service.data.sends?.filter((message: any) => 
                                        selectedTypes.length === 0 || selectedTypes.includes(message.collection)
                                    )?.map((message: any) => {
                                        const { Icon, color } = getCollectionStyles(message.collection);
                                        return (
                                            <a
                                                key={message.data.name}
                                                href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
                                                className="group flex border border-gray-200 items-center gap-1 rounded-md text-[11px] font-medium hover:bg-gray-50 transition-colors duration-200 bg-white"
                                            >
                                                <div className="bg-white border-r border-gray-200 px-2 py-1.5 rounded-l-md">
                                                    <Icon className={`h-3 w-3 text-${color}-500`} />
                                                </div>
                                                <span className="px-1 py-1">
                                                    {message.data.name}
                                                </span>
                                            </a>
                                        );
                                    })}
                                    {(!service.data.sends?.length || (selectedTypes.length > 0 && !service.data.sends?.some((message: any) => selectedTypes.includes(message.collection)))) && (
                                        <div className="text-center py-4  ">
                                            <p className="text-gray-500 text-[10px]">No messages sent</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                   
                  </div>
                </div>
              </a>
            })}
          </div>
        </div>
      )}

      {filteredAndSortedServices.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">
            {selectedTypes.length > 0 
              ? `No services found that ${selectedTypes.length > 1 ? 'handle' : 'handles'} ${selectedTypes.join(' or ')} messages`
              : 'No services found matching your criteria'}
          </p>
        </div>
      )}

      {/* Bottom pagination */}
      {!(urlParams?.domainId || urlParams?.serviceIds?.length) && (
        <div className="mt-8 border-t border-gray-200">
          {renderPaginationControls()}
        </div>
      )}
    </div>
  );
} 