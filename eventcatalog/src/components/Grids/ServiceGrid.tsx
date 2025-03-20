import { useState, useMemo, useEffect } from 'react';
import { ServerIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { RectangleGroupIcon } from '@heroicons/react/24/outline';
import { buildUrl, buildUrlWithParams } from '@utils/url-builder';
import type { CollectionEntry } from 'astro:content';
import type { CollectionMessageTypes } from '@types';
import { getCollectionStyles } from './utils';
import { SearchBar, TypeFilters, Pagination } from './components';

interface ServiceGridProps {
  services: CollectionEntry<'services'>[];
  embeded: boolean;
}

export default function ServiceGrid({ services, embeded }: ServiceGridProps) {
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
      serviceName,
    });
  }, []);

  const filteredAndSortedServices = useMemo(() => {
    // Don't filter until we have URL params
    if (urlParams === null) return [];

    let result = [...services];

    // Filter by service IDs if present
    if (urlParams.serviceIds?.length) {
      result = result.filter(
        (service) => urlParams.serviceIds?.includes(service.data.id) && !service.data.id.includes('/versioned/')
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (service) =>
          service.data.name?.toLowerCase().includes(query) ||
          service.data.summary?.toLowerCase().includes(query) ||
          service.data.sends?.some((message: any) => message.data.name.toLowerCase().includes(query)) ||
          service.data.receives?.some((message: any) => message.data.name.toLowerCase().includes(query))
      );
    }

    // Filter by selected message types
    if (selectedTypes.length > 0) {
      result = result.filter((service) => {
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
                {urlParams?.domainId ? `${urlParams.domainName} Architecture` : 'All Services'}
              </h1>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {urlParams?.domainId
                ? `Browse services and messages in the ${urlParams.domainId} domain`
                : 'Browse and discover services in your event-driven architecture'}
            </p>
          </div>

          <div className="mt-6 md:mt-0 md:ml-4 flex-shrink-0">
            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Search services by name, summary, or messages..."
              totalResults={filteredAndSortedServices.length}
              totalItems={services.length}
            />
          </div>
        </div>
      </div>

      <div className="mb-8">
        {/* Results count and pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TypeFilters
            selectedTypes={selectedTypes}
            onTypeChange={setSelectedTypes}
            filteredCount={filteredAndSortedServices.length}
            totalCount={services.length}
          />
          <div className="text-sm text-gray-500">
            {urlParams?.domainId || urlParams?.serviceIds?.length ? (
              <span>
                Showing {filteredAndSortedServices.length} services in the {urlParams.domainId} domain
              </span>
            ) : (
              <span>
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedServices.length)} of {filteredAndSortedServices.length}{' '}
                services
              </span>
            )}
          </div>
          {!(urlParams?.domainId || urlParams?.serviceIds?.length) && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedServices.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          )}
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

          <div className={`grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 xl:grid-cols-${embeded ? 1 : 2} gap-6`}>
            {paginatedServices.map((service) => {
              return (
                <a
                  key={service.data.id}
                  href={buildUrlWithParams('/architecture/messages', {
                    serviceName: service.data.name,
                    serviceId: service.data.id,
                    domainId: urlParams?.domainId,
                    domainName: urlParams?.domainName,
                  })}
                  className="group hover:bg-pink-50  bg-white border-2 border-dashed border-pink-400 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 w-full">
                        <ServerIcon className="h-5 w-5 text-pink-500" />
                        <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:underline transition-colors duration-200 w-full max-w-[90%]">
                          {service.data.name || service.data.id} (v{service.data.version})
                        </h3>
                      </div>
                    </div>

                    {service.data.summary && (
                      <p className="text-gray-600 text-sm line-clamp-2 min-h-[2.5rem]">{service.data.summary}</p>
                    )}

                    <div className="space-y-4">
                      {/* Messages Section */}
                      {!urlParams?.serviceName && (
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-full flex flex-col bg-blue-100 border border-blue-300 rounded-lg p-4">
                            <div className="space-y-2 flex-1">
                              {service.data.receives
                                ?.filter(
                                  (message: any) => selectedTypes.length === 0 || selectedTypes.includes(message.collection)
                                )
                                ?.map((message: any) => {
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
                                      <span className="px-1 py-1 truncate max-w-[140px]">{message.data.name}</span>
                                    </a>
                                  );
                                })}
                              {(!service.data.receives?.length ||
                                (selectedTypes.length > 0 &&
                                  !service.data.receives?.some((message: any) =>
                                    selectedTypes.includes(message.collection)
                                  ))) && (
                                <div className="text-center py-4">
                                  <p className="text-gray-500 text-[10px]">
                                    {selectedTypes.length > 0
                                      ? `Service does not receive ${selectedTypes.join(' or ')}`
                                      : 'Service does not receive any messages'}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 max-w-[200px]">
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
                              {service.data.sends
                                ?.filter(
                                  (message: any) => selectedTypes.length === 0 || selectedTypes.includes(message.collection)
                                )
                                ?.map((message: any) => {
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
                                      <span className="px-1 py-1 truncate max-w-[140px]">{message.data.name}</span>
                                    </a>
                                  );
                                })}
                              {(!service.data.sends?.length ||
                                (selectedTypes.length > 0 &&
                                  !service.data.sends?.some((message: any) => selectedTypes.includes(message.collection)))) && (
                                <div className="text-center py-4  ">
                                  <p className="text-gray-500 text-[10px]">
                                    {selectedTypes.length > 0
                                      ? `Service does not send ${selectedTypes.join(' or ')}`
                                      : 'Service does not send any messages'}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              );
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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredAndSortedServices.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
