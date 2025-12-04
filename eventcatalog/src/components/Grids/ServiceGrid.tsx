import { useState, useMemo, useEffect, memo } from 'react';
import { ServerIcon, ChevronRightIcon, Squares2X2Icon, QueueListIcon, CircleStackIcon } from '@heroicons/react/24/outline';
import { RectangleGroupIcon } from '@heroicons/react/24/outline';
import { buildUrl, buildUrlWithParams } from '@utils/url-builder';
import type { CollectionEntry } from 'astro:content';
import type { CollectionMessageTypes } from '@types';
import { getCollectionStyles } from './utils';
import { SearchBar, TypeFilters, Pagination } from './components';
import type { ExtendedDomain } from './DomainGrid';
import { BoxIcon } from 'lucide-react';

// Message component for reuse
const Message = memo(({ message, collection }: { message: any; collection: string }) => {
  const { Icon, color } = getCollectionStyles(message.collection);
  return (
    <a
      href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
      className="group flex border border-gray-200 items-center gap-1 rounded-md text-[11px] font-medium hover:bg-gray-50 transition-colors duration-200 bg-white"
    >
      <div className="bg-white border-r border-gray-200 px-2 py-1.5 rounded-l-md">
        <Icon className={`h-3 w-3 text-${color}-500`} />
      </div>
      <span className="px-1 py-1 truncate max-w-[140px]">{message.data.name}</span>
    </a>
  );
});

// Messages Container component
const MessagesContainer = memo(
  ({ messages, type, selectedTypes }: { messages: any[]; type: 'receives' | 'sends'; selectedTypes: string[] }) => {
    const bgColor = type === 'receives' ? 'blue' : 'green';
    const MAX_MESSAGES_DISPLAYED = 4;

    const filteredMessages = messages?.filter(
      (message: any) => selectedTypes.length === 0 || selectedTypes.includes(message.collection)
    );

    const messagesToShow = filteredMessages?.slice(0, MAX_MESSAGES_DISPLAYED);
    const remainingMessagesCount = filteredMessages ? filteredMessages.length - MAX_MESSAGES_DISPLAYED : 0;

    return (
      <div className={`flex-1 h-full flex flex-col bg-${bgColor}-100 border border-${bgColor}-300 rounded-lg p-4`}>
        <div className="space-y-2 flex-1">
          {messagesToShow?.map((message: any) => (
            <Message key={message.data.name} message={message} collection={message.collection} />
          ))}
          {remainingMessagesCount > 0 && (
            <div className="text-center py-1">
              <p className="text-gray-500 text-[10px]">+ {remainingMessagesCount} more</p>
            </div>
          )}
          {(!messages?.length ||
            (selectedTypes.length > 0 && !messages?.some((message: any) => selectedTypes.includes(message.collection)))) && (
            <div className="text-center py-4">
              <p className="text-gray-500 text-[10px]">
                {selectedTypes.length > 0
                  ? `Service does not ${type} ${selectedTypes.join(' or ')}`
                  : `Service does not ${type} any messages`}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
);

// Service Card component
const ServiceCard = memo(({ service, urlParams, selectedTypes }: { service: any; urlParams: any; selectedTypes: string[] }) => {
  return (
    <a
      href={buildUrlWithParams('/architecture/messages', {
        serviceName: service.data.name,
        serviceId: service.data.id,
        domainId: urlParams?.domainId,
        domainName: urlParams?.domainName,
      })}
      className="group hover:bg-pink-50 bg-white border-2 border-dashed border-pink-400 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden "
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

        {service.data.summary && <p className="text-gray-600 text-sm line-clamp-2 min-h-[2.5rem]">{service.data.summary}</p>}

        {!urlParams?.serviceName && (
          <div className="flex items-center gap-4 mt-4">
            <MessagesContainer messages={service.data.receives} type="receives" selectedTypes={selectedTypes} />

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

            <MessagesContainer messages={service.data.sends} type="sends" selectedTypes={selectedTypes} />
          </div>
        )}

        {/* Container lists at the bottom */}
        {((service.data.readsFrom && service.data.readsFrom.length > 0) ||
          (service.data.writesTo && service.data.writesTo.length > 0)) && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
            {/* Reads From */}
            {service.data.readsFrom && service.data.readsFrom.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CircleStackIcon className="h-4 w-4 text-orange-500" />
                  <h4 className="text-xs font-semibold text-gray-700">Reads from</h4>
                </div>
                <div className="flex flex-wrap gap-1">
                  {service.data.readsFrom.slice(0, 3).map((container: any) => (
                    <a
                      key={container.id}
                      href={buildUrl(`/docs/containers/${container.data.id}/${container.data.version}`)}
                      className="group inline-flex items-center gap-1 px-2 py-1 bg-orange-100 border border-orange-300 rounded-md text-[11px] font-medium hover:bg-orange-200 transition-colors duration-200"
                    >
                      <CircleStackIcon className="h-3 w-3 text-orange-600" />
                      <span className="text-orange-800">{container.data.name}</span>
                    </a>
                  ))}
                  {service.data.readsFrom.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500">
                      + {service.data.readsFrom.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Writes To */}
            {service.data.writesTo && service.data.writesTo.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CircleStackIcon className="h-4 w-4 text-purple-500" />
                  <h4 className="text-xs font-semibold text-gray-700">Writes to</h4>
                </div>
                <div className="flex flex-wrap gap-1">
                  {service.data.writesTo.slice(0, 3).map((container: any) => (
                    <a
                      key={container.id}
                      href={buildUrl(`/docs/containers/${container.data.id}/${container.data.version}`)}
                      className="group inline-flex items-center gap-1 px-2 py-1 bg-purple-100 border border-purple-300 rounded-md text-[11px] font-medium hover:bg-purple-200 transition-colors duration-200"
                    >
                      <CircleStackIcon className="h-3 w-3 text-purple-600" />
                      <span className="text-purple-800">{container.data.name}</span>
                    </a>
                  ))}
                  {service.data.writesTo.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500">
                      + {service.data.writesTo.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </a>
  );
});

// Domain Section component
const DomainSection = memo(
  ({
    domain,
    services,
    urlParams,
    selectedTypes,
    isMultiColumn,
    isVisualiserEnabled,
  }: {
    domain: any;
    services: any[];
    urlParams: any;
    selectedTypes: string[];
    isMultiColumn: boolean;
    isVisualiserEnabled: boolean;
  }) => {
    const subdomains = domain.data.domains || [];
    const allSubDomainServices = subdomains.map((subdomain: any) => subdomain.data.services || []).flat();

    const servicesWithoutSubdomains = services.filter((service) => {
      return !allSubDomainServices.some((s: any) => s.id === service.data.id);
    });

    return (
      <div className="space-y-6">
        {servicesWithoutSubdomains.length > 0 && (
          <div
            className={`grid gap-6 ${isMultiColumn ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2' : 'grid-cols-1'}`}
          >
            {servicesWithoutSubdomains.map((service) => (
              <ServiceCard key={service.data.id} service={service} urlParams={urlParams} selectedTypes={selectedTypes} />
            ))}
          </div>
        )}

        {subdomains.map((subdomainRef: any) => {
          const subdomain = domain.data.domains?.find((d: any) => d.data.id === subdomainRef.data.id);
          if (!subdomain) return null;

          const subdomainServices = services.filter((service) =>
            subdomain.data.services?.some((s: any) => s.id === service.data.id)
          );

          if (subdomainServices.length === 0) return null;

          return (
            <div key={subdomain.data.id} className="bg-orange-50 border-2 border-orange-400 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RectangleGroupIcon className="h-5 w-5 text-orange-500" />
                  <h3 className="text-xl font-semibold text-gray-900">{subdomain.data.name} (Subdomain)</h3>
                </div>
                <div className="flex gap-2">
                  {isVisualiserEnabled && (
                    <a
                      href={buildUrl(`/visualiser/domains/${subdomain.data.id}`)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md transition-colors duration-200"
                    >
                      View in visualizer
                    </a>
                  )}
                  <a
                    href={buildUrl(`/docs/domains/${subdomain.data.id}`)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-black border border-gray-300 bg-white rounded-md transition-colors duration-200"
                  >
                    Read documentation
                  </a>
                </div>
              </div>

              {/* Entities */}
              {subdomain.data.entities && subdomain.data.entities.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BoxIcon className="h-4 w-4 text-purple-500" />
                    <h4 className="text-xs font-semibold text-gray-700">Entities</h4>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {subdomain.data.entities.map((entity: any) => (
                      <a
                        key={entity.id}
                        href={buildUrl(`/docs/entities/${entity.id}`)}
                        className="group inline-flex items-center gap-1 px-2 py-1 bg-purple-100 border border-purple-300 rounded-md text-[11px] font-medium hover:bg-purple-200 transition-colors duration-200"
                      >
                        <BoxIcon className="h-3 w-3 text-purple-600" />
                        <span className="text-purple-800">{entity.id}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={`grid gap-6 ${isMultiColumn ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2' : 'grid-cols-1'}`}
              >
                {subdomainServices.map((service) => (
                  <ServiceCard
                    key={service.data.id}
                    service={service}
                    urlParams={{
                      ...urlParams,
                      domainId: subdomain.data.id,
                      domainName: `${subdomain.data.name} (Subdomain)`,
                    }}
                    selectedTypes={selectedTypes}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);

interface ServiceGridProps {
  services: CollectionEntry<'services'>[];
  domains: ExtendedDomain[];
  embeded: boolean;
  isVisualiserEnabled: boolean;
}

// Main ServiceGrid component
export default function ServiceGrid({ services, domains, embeded, isVisualiserEnabled }: ServiceGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState<CollectionMessageTypes[]>([]);
  const [isMultiColumn, setIsMultiColumn] = useState(false);
  const ITEMS_PER_PAGE = 16;
  const [urlParams, setUrlParams] = useState<{
    serviceIds?: string[];
    domainId?: string;
    domainName?: string;
    serviceName?: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUrlParams({
      serviceIds: params.get('serviceIds')?.split(',').filter(Boolean),
      domainId: params.get('domainId') || undefined,
      domainName: params.get('domainName') || undefined,
      serviceName: params.get('serviceName') || undefined,
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('EventCatalog:ServiceColumnLayout');
      if (saved !== null) {
        setIsMultiColumn(saved === 'multi');
      }
    }
  }, []);

  const toggleColumnLayout = () => {
    const newValue = !isMultiColumn;
    setIsMultiColumn(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('EventCatalog:ServiceColumnLayout', newValue ? 'multi' : 'single');
    }
  };

  const filteredAndSortedServices = useMemo(() => {
    if (urlParams === null) return [];

    let result = [...services];

    if (urlParams.serviceIds?.length) {
      result = result.filter(
        (service) => urlParams.serviceIds?.includes(service.data.id) && !service.data.id.includes('/versioned/')
      );
    }

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

    if (selectedTypes.length > 0) {
      result = result.filter((service) => {
        const hasMatchingSends = service.data.sends?.some((message: any) => selectedTypes.includes(message.collection));
        const hasMatchingReceives = service.data.receives?.some((message: any) => selectedTypes.includes(message.collection));
        return hasMatchingSends || hasMatchingReceives;
      });
    }

    result.sort((a, b) => (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id));
    return result;
  }, [services, searchQuery, urlParams, selectedTypes]);

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

          <div className="mt-6 md:mt-0 md:ml-4 flex-shrink-0 flex items-center gap-3">
            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Search services by name, summary, or messages..."
              totalResults={filteredAndSortedServices.length}
              totalItems={services.length}
            />
            <button
              onClick={toggleColumnLayout}
              className="flex items-center justify-center p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
              title={isMultiColumn ? 'Switch to single column' : 'Switch to multi column'}
            >
              {isMultiColumn ? (
                <QueueListIcon className="h-5 w-5 text-gray-600" />
              ) : (
                <Squares2X2Icon className="h-5 w-5 text-gray-600" />
              )}
            </button>
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
          {urlParams?.domainName ? (
            domains
              .filter((domain: ExtendedDomain) => domain.data.id === urlParams.domainId)
              .map((domain: ExtendedDomain) => (
                <DomainSection
                  key={domain.data.id}
                  domain={domain}
                  services={paginatedServices}
                  urlParams={urlParams}
                  selectedTypes={selectedTypes}
                  isMultiColumn={isMultiColumn}
                  isVisualiserEnabled={isVisualiserEnabled}
                />
              ))
          ) : (
            <div
              className={`grid gap-6 ${isMultiColumn ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2' : 'grid-cols-1'}`}
            >
              {paginatedServices.map((service) => (
                <ServiceCard key={service.data.id} service={service} urlParams={urlParams} selectedTypes={selectedTypes} />
              ))}
            </div>
          )}
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
