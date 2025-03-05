import { useState, useMemo, useEffect } from 'react';
import { ServerIcon, MagnifyingGlassIcon, FunnelIcon, EnvelopeIcon, ChevronRightIcon, ArrowLeftIcon, ArrowRightIcon, ChatBubbleLeftIcon, BoltIcon } from '@heroicons/react/24/outline';
import { RectangleGroupIcon } from '@heroicons/react/24/outline';
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

    // Sort by name by default
    result.sort((a, b) => (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id));

    return result;
  }, [services, searchQuery, urlParams]);

  return (
    <div>
      {/* Breadcrumb */}
      {urlParams?.domainId && (
        <nav className="mb-4 flex items-center space-x-2 text-sm text-gray-500">
          <a href={buildUrl('/architecture/domains')} className="hover:text-gray-700 hover:underline flex items-center gap-2">
            <RectangleGroupIcon className="h-4 w-4" />
            Domains
          </a>
          <ChevronRightIcon className="h-4 w-4" />
          <span className="text-gray-900">{urlParams.domainId}</span>
        </nav>
      )}

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
        {/* Results count */}
        <div className="text-sm text-gray-500">
          {urlParams?.domainId ? (
            <span>Showing {filteredAndSortedServices.length} services in the {urlParams.domainId} domain</span>
          ) : (
            <span>Showing {filteredAndSortedServices.length} of {services.length} services</span>
          )}
        </div>
      </div>

      {filteredAndSortedServices.length > 0 && (
        <div className={`rounded-xl overflow-hidden ${urlParams?.domainId ? 'bg-yellow-50 p-8 border-2 border-yellow-400' : ''}`}>
          {urlParams?.domainName && (
            <>
              {/* <div className="h-2 bg-yellow-500 -mx-8 -mt-8 mb-8"></div> */}
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
            {filteredAndSortedServices.map((service) => {
              return <a
                key={service.data.id}
                href={buildUrlWithParams('/architecture/messages', {
                  serviceName: service.data.name,
                  serviceId: service.data.id,
                  domainId: urlParams?.domainId,
                  domainName: urlParams?.domainName
                })}
                className="group bg-white border-2 border-dashed border-pink-400 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                {/* <div className="h-2 bg-pink-500 group-hover:bg-pink-600 transition-colors duration-200"></div> */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ServerIcon className="h-5 w-5 text-pink-500" />
                      <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-pink-500 transition-colors duration-200">
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
                    {/* Stats Overview */}
                    {/* <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1 gap-1">
                          <EnvelopeIcon className="h-5 w-5 text-blue-500" />
                          <ArrowRightIcon className="h-4 w-4 text-blue-500" />
                          <ServerIcon className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="text-sm font-medium text-gray-900">{service.data.receives?.length || 0}</div>
                        <div className="text-xs text-gray-500">Receives</div>
                      </div>
                      <div className="text-center border-l border-gray-200">
                        <div className="flex items-center justify-center mb-1 gap-1">
                          <ServerIcon className="h-5 w-5 text-emerald-500" />
                          <ArrowRightIcon className="h-4 w-4 text-emerald-500" />
                          <EnvelopeIcon className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="text-sm font-medium text-gray-900">{service.data.sends?.length || 0}</div>
                        <div className="text-xs text-gray-500">Sends</div>
                      </div>
                    </div> */}

                    {/* Messages Section */}
                    {!urlParams?.serviceName && (
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-full flex flex-col bg-blue-100 border border-blue-300 rounded-lg p-4">
                                <div className="space-y-2 flex-1">
                                    {service.data.receives?.map((message: any) => {
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
                                    {!service.data.receives?.length && (
                                        <div className="text-center py-12">
                                            <p className="text-gray-500">No messages received</p>
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

                            <div className="flex-1 h-full flex flex-col bg-green-100   border border-green-300  rounded-lg p-4">
                                <div className="space-y-2 flex-1">
                                    {service.data.sends?.map((message: any) => {
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
                                    {!service.data.sends?.length && (
                                        <div className="text-center py-12">
                                            <p className="text-gray-500">No messages sent</p>
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
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No services found matching your criteria</p>
        </div>
      )}
    </div>
  );
} 