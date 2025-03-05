import { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, ServerIcon, EnvelopeIcon, ArrowRightIcon, ArrowLeftIcon, BoltIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { RectangleGroupIcon } from '@heroicons/react/24/outline';
import { buildUrlWithParams, buildUrl } from '@utils/url-builder';
import type { CollectionEntry } from 'astro:content';
import { type CollectionMessageTypes } from '@types';

type ExtendedDomain = CollectionEntry<"domains"> & {
  sends: CollectionEntry<CollectionMessageTypes>[];
  receives: CollectionEntry<CollectionMessageTypes>[];
  services: CollectionEntry<"services">[];
}

interface DomainGridProps {
  domains: ExtendedDomain[];
}


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


export default function DomainGrid({ domains }: DomainGridProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDomains = useMemo(() => {
    let result = [...domains];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(domain =>
        domain.data.name?.toLowerCase().includes(query) ||
        domain.data.summary?.toLowerCase().includes(query) ||
        domain.data.services?.some(service => service.data.name.toLowerCase().includes(query)) ||
        domain.sends?.some(message => message.data.name.toLowerCase().includes(query)) ||
        domain.receives?.some(message => message.data.name.toLowerCase().includes(query))
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
            <p className="mt-2 text-sm text-gray-500">
              Browse and manage domains in your event-driven architecture
            </p>
          </div>

          <div className="mt-6 md:mt-0 md:ml-4 flex-shrink-0 w-full md:w-96">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                placeholder="Search domains..."
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
                  Found <span className="font-medium text-gray-900">{filteredDomains.length}</span> of <span className="font-medium text-gray-900">{domains.length}</span>
                </span>
                <span className="text-gray-400 text-xs">
                  ESC to clear
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
        {filteredDomains.map((domain) => (
          <a
            key={domain.data.id}
            href={buildUrlWithParams('/architecture/services', {
              serviceIds: domain.data.services?.map((s: any) => s.data.id).join(','),
              domainId: domain.data.id,
              domainName: domain.data.name
            })}
            className="group  border-2 border-yellow-500 bg-yellow-50 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            {/* <div className="h-2 bg-yellow-500 group-hover:bg-yellow-600 transition-colors duration-200"></div> */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <RectangleGroupIcon className="h-5 w-5 text-yellow-500" />
                  <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-yellow-500 transition-colors duration-200">
                    {domain.data.name || domain.data.id}
                  </h3>
                </div>
                <span className="ml-2 shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                  v{domain.data.version}
                </span>
              </div>

              {domain.data.summary && (
                <p className="text-gray-600 text-sm line-clamp-2 min-h-[2.5rem] mb-4">
                  {domain.data.summary}
                </p>
              )}

              <div className="space-y-6">
                {/* Services and their messages */}
                {domain.data.services?.map((service) => (
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
                      <div className="flex-1 h-full flex flex-col bg-blue-50  border border-blue-100 rounded-lg p-3">
                        <div className="space-y-1.5 flex-1">
                          {service.data.receives?.slice(0, 3).map((message) => {
                            const { Icon, color } = getCollectionStyles(message.collection);
                            return (
                              <div
                                key={`${message.id}-${message.version}`}
                                className="group flex border border-gray-200 items-center gap-1 rounded-md text-[11px] font-medium bg-white"
                              >
                                <div className="bg-white border-r border-gray-200 px-2 py-1.5 rounded-l-md">
                                  <Icon className={`h-3 w-3 text-${color}-500`} />
                                </div>
                                <span className="px-1 py-1">
                                  {message.id}
                                </span>
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
                        <div className="bg-white border-2 border-pink-100 rounded-lg p-2 shadow-sm">
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
                          {service.data.sends?.slice(0, 3).map((message) => {
                            const { Icon, color } = getCollectionStyles(message.collection);
                            return (
                              <div
                                key={`${message.id}-${message.version}`}
                                className="group flex border border-gray-200 items-center gap-1 rounded-md text-[11px] font-medium bg-white"
                              >
                                <div className="bg-white border-r border-gray-200 px-2 py-1.5 rounded-l-md">
                                  <Icon className={`h-3 w-3 text-${color}-500`} />
                                </div>
                                <span className="px-1 py-1">
                                  {message.id}
                                </span>
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
                  </div>
                ))}

                {/* Domain Stats */}
             
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