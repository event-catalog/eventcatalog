import { useState, useMemo, useEffect } from 'react';
import {
  ServerIcon,
  EnvelopeIcon,
  RectangleGroupIcon,
  Squares2X2Icon,
  QueueListIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';
import { buildUrlWithParams, buildUrl } from '@utils/url-builder';
import type { CollectionEntry } from 'astro:content';
import { type CollectionMessageTypes } from '@types';
import { getCollectionStyles } from './utils';
import { SearchBar } from './components';
import { BoxIcon } from 'lucide-react';

export interface ExtendedDomain extends CollectionEntry<'domains'> {
  sends: CollectionEntry<CollectionMessageTypes>[];
  receives: CollectionEntry<CollectionMessageTypes>[];
  services: CollectionEntry<'services'>[];
  domains: CollectionEntry<'domains'>[];
}

interface DomainGridProps {
  domains: ExtendedDomain[];
  embeded: boolean;
}

export default function DomainGrid({ domains, embeded }: DomainGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMultiColumn, setIsMultiColumn] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('EventCatalog:ArchitectureColumnLayout');
      if (saved !== null) {
        setIsMultiColumn(saved === 'multi');
      }
    }
  }, []);

  const toggleColumnLayout = () => {
    const newValue = !isMultiColumn;
    setIsMultiColumn(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('EventCatalog:ArchitectureColumnLayout', newValue ? 'multi' : 'single');
    }
  };

  const filteredDomains = useMemo(() => {
    let result = [...domains];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (domain) =>
          domain.data.name?.toLowerCase().includes(query) ||
          domain.data.summary?.toLowerCase().includes(query) ||
          domain.data.services?.some((service: any) => service.data.name.toLowerCase().includes(query)) ||
          domain.sends?.some((message: any) => message.data.name.toLowerCase().includes(query)) ||
          domain.receives?.some((message: any) => message.data.name.toLowerCase().includes(query))
      );
    }

    // Sort by name by default
    result.sort((a, b) => (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id));

    return result;
  }, [domains, searchQuery]);

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center space-x-2 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <RectangleGroupIcon className="h-4 w-4" />
          <span className="text-gray-900">Domains</span>
        </div>
      </nav>

      <div className="relative border-b border-gray-200  mb-4 pb-4">
        <div className="md:flex md:items-start md:justify-between">
          <div className="min-w-0 flex-1 max-w-lg">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Domains ({filteredDomains.length})
            </h1>
            <p className="mt-2 text-sm text-gray-500">Browse and manage domains in your event-driven architecture</p>
          </div>

          <div className="mt-6 md:mt-0 md:ml-4 flex-shrink-0 flex items-center gap-3">
            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Search domains..."
              totalResults={filteredDomains.length}
              totalItems={domains.length}
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

      <div className={`grid gap-6 ${isMultiColumn ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2' : 'grid-cols-1'}`}>
        {filteredDomains.map((domain) => (
          <a
            key={domain.data.id}
            href={buildUrlWithParams('/architecture/services', {
              serviceIds: domain.data.services?.map((s: any) => s.data.id).join(','),
              domainId: domain.data.id,
              domainName: domain.data.name,
            })}
            className="group hover:bg-orange-100  border-2 border-orange-400/50 bg-yellow-50 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <RectangleGroupIcon className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:underline transition-colors duration-200">
                    {domain.data.name || domain.data.id}
                  </h3>
                </div>
                <span className="ml-2 shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                  v{domain.data.version}
                </span>
              </div>

              <p className="text-gray-600 text-sm line-clamp-2 min-h-[2.5rem]">
                {domain.data.summary || <span className="italic">No summary available</span>}
              </p>

              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-orange-200">
                  <RectangleGroupIcon className="h-4 w-4 text-yellow-500" />
                  <div className="flex">
                    <p className="text-sm font-medium text-gray-900">{domain.data.domains?.length || 0} Subdomains</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-pink-200">
                  <ServerIcon className="h-4 w-4 text-pink-500" />
                  <div className="flex">
                    <p className="text-sm font-medium text-gray-900">{domain.data.services?.length || 0} Services</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200 ">
                  <EnvelopeIcon className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {(domain.sends?.length || 0) + (domain.receives?.length || 0)} Messages
                    </p>
                  </div>
                </div>
                {domain.data.entities && domain.data.entities.length > 0 && (
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200 ">
                    <BoxIcon className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{domain.data.entities?.length} Entities</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* Subdomains and there services */}
                {domain.data.domains?.slice(0, 2).map((subdomain: any) => (
                  <div
                    key={subdomain.data.id}
                    className="block space-y-2 bg-white border-2 border-dashed border-orange-400 p-4 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RectangleGroupIcon className="h-4 w-4 text-orange-500" />
                        <h4 className="text-sm font-medium text-gray-900">
                          {subdomain.data.name || subdomain.data.id} (Subdomain)
                        </h4>
                      </div>
                      <span className="text-xs text-gray-500">v{subdomain.data.version}</span>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-pink-200">
                        <ServerIcon className="h-4 w-4 text-pink-500" />
                        <div className="flex">
                          <p className="text-sm font-medium text-gray-900">{subdomain.data.services?.length || 0} Services</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                        <EnvelopeIcon className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {(subdomain.sends?.length || 0) + (subdomain.receives?.length || 0)} Messages
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Services and their messages */}
                {domain.data.services?.slice(0, 2).map((service: any) => (
                  <div
                    key={service.data.id}
                    className="block space-y-2 bg-white border-2 border-dashed border-pink-400 p-4 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ServerIcon className="h-4 w-4 text-pink-500" />
                        <h4 className="text-sm font-medium text-gray-900">{service.data.name || service.data.id}</h4>
                      </div>
                      <span className="text-xs text-gray-500">v{service.data.version}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-full flex flex-col bg-blue-50  border border-blue-300 rounded-lg p-3">
                        <div className="space-y-1.5 flex-1">
                          {service.data.receives?.slice(0, 3).map((message: any) => {
                            const { Icon, color } = getCollectionStyles(message.collection);
                            return (
                              <div
                                key={`${message.id}-${message.version}`}
                                className="group flex border border-gray-200 items-center gap-1 rounded-md text-[11px] font-medium bg-white"
                              >
                                <div className="bg-white border-r border-gray-200 px-2 py-1.5 rounded-l-md">
                                  <Icon className={`h-3 w-3 text-${color}-500`} />
                                </div>
                                <span className="px-1 py-1 truncate max-w-[140px]">{message.id}</span>
                              </div>
                            );
                          })}
                          {service.data.receives && service.data.receives.length > 3 && (
                            <div className="text-center py-1">
                              <p className="text-gray-500 text-[10px]">+ {service.data.receives.length - 3} more</p>
                            </div>
                          )}
                          {!service.data.receives?.length && (
                            <div className="text-center py-6">
                              <p className="text-gray-500 text-xs">No messages received</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-4 h-[2px] bg-blue-200"></div>
                        <div className="bg-white border-2 border-gray-300 rounded-lg p-2 shadow-sm">
                          <div className="flex flex-col items-center gap-2">
                            <ServerIcon className="h-6 w-6 text-pink-500" />
                            <div className="text-center">
                              <p className="text-xs font-medium text-gray-900">{service.data.name || service.data.id}</p>
                              <p className="text-[10px] text-gray-500">v{service.data.version}</p>
                            </div>
                          </div>
                        </div>
                        <div className="w-4 h-[2px] bg-emerald-200"></div>
                      </div>

                      <div className="flex-1 h-full flex flex-col bg-green-100  border border-green-300 rounded-lg p-3">
                        <div className="space-y-1.5 flex-1">
                          {service.data.sends?.slice(0, 3).map((message: any) => {
                            const { Icon, color } = getCollectionStyles(message.collection);
                            return (
                              <div
                                key={`${message.id}-${message.version}`}
                                className="group flex border border-gray-200 items-center gap-1 rounded-md text-[11px] font-medium bg-white"
                              >
                                <div className="bg-white border-r border-gray-200 px-2 py-1.5 rounded-l-md">
                                  <Icon className={`h-3 w-3 text-${color}-500`} />
                                </div>

                                <span className="px-1 py-1 truncate max-w-[140px]">{message.id}</span>
                              </div>
                            );
                          })}
                          {service.data.sends && service.data.sends.length > 3 && (
                            <div className="text-center py-1">
                              <p className="text-gray-500 text-xs">+ {service.data.sends.length - 3} more</p>
                            </div>
                          )}
                          {!service.data.sends?.length && (
                            <div className="text-center py-6">
                              <p className="text-gray-500 text-xs">No messages sent</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Container lists at the bottom */}
                    {((service.data.readsFrom && service.data.readsFrom.length > 0) ||
                      (service.data.writesTo && service.data.writesTo.length > 0)) && (
                      <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4">
                        {/* Reads From */}
                        {service.data.readsFrom && service.data.readsFrom.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CircleStackIcon className="h-4 w-4 text-orange-500" />
                              <h4 className="text-xs font-semibold text-gray-700">Reads from</h4>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {service.data.readsFrom.slice(0, 3).map((container: any) => (
                                <span
                                  key={container.id}
                                  className="group inline-flex items-center gap-1 px-2 py-1 bg-orange-100 border border-orange-300 rounded-md text-[11px] font-medium hover:bg-orange-200 transition-colors duration-200"
                                >
                                  <CircleStackIcon className="h-3 w-3 text-orange-600" />
                                  <span className="text-orange-800">{container.id}</span>
                                </span>
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
                                <span
                                  key={container.id}
                                  className="group inline-flex items-center gap-1 px-2 py-1 bg-purple-100 border border-purple-300 rounded-md text-[11px] font-medium hover:bg-purple-200 transition-colors duration-200"
                                >
                                  <CircleStackIcon className="h-3 w-3 text-purple-600" />
                                  <span className="text-purple-800">{container.id}</span>
                                </span>
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
                ))}
                {domain.data.domains && domain.data.domains.length > 2 && (
                  <div className="block space-y-2 bg-white border-2 border-dashed border-orange-400 p-4 rounded-lg transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RectangleGroupIcon className="h-4 w-4 text-orange-500/70" />
                        <h4 className="text-sm font-medium text-gray-600">+{domain.data.domains.length - 2} more subdomains</h4>
                      </div>
                    </div>
                  </div>
                )}
                {domain.data.services && domain.data.services.length > 2 && (
                  <div className="block space-y-2 bg-white border-2 border-dashed border-pink-400 p-4 rounded-lg transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ServerIcon className="h-4 w-4 text-pink-500/70" />
                        <h4 className="text-sm font-medium text-gray-600">+{domain.data.services.length - 2} more services</h4>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>

      {filteredDomains.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No domains found matching your criteria</p>
        </div>
      )}
    </div>
  );
}
