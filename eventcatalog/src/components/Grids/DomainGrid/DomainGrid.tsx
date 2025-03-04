import { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, ServerIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { RectangleGroupIcon } from '@heroicons/react/24/outline';
import { buildUrlWithParams } from '@utils/url-builder';
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
        domain.data.services?.some(service => service.id.toLowerCase().includes(query)) ||
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        {filteredDomains.map((domain) => (
          <a
            key={domain.data.id}
            href={buildUrlWithParams('/resources/services', {
              serviceIds: domain.data.services?.map((s: any) => s.data.id).join(','),
              domainId: domain.data.id,
              domainName: domain.data.name
            })}
            className="group bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            <div className="h-2 bg-yellow-500 group-hover:bg-yellow-600 transition-colors duration-200"></div>
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

              <div className="space-y-4">
                {/* Stats Overview */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <ServerIcon className="h-5 w-5 text-pink-500" />
                    </div>
                    <div className="text-sm font-medium text-gray-900">{domain.data.services?.length || 0}</div>
                    <div className="text-xs text-gray-500">Services</div>
                  </div>
                  <div className="text-center border-l border-gray-200">
                    <div className="flex items-center justify-center mb-1">
                      <EnvelopeIcon className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="text-sm font-medium text-gray-900">{domain.sends?.length || 0}</div>
                    <div className="text-xs text-gray-500">Sends</div>
                  </div>
                  <div className="text-center border-l border-gray-200">
                    <div className="flex items-center justify-center mb-1">
                      <EnvelopeIcon className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-sm font-medium text-gray-900">{domain.receives?.length || 0}</div>
                    <div className="text-xs text-gray-500">Receives</div>
                  </div>
                </div>

                {/* Services Section */}
                {domain.data.services && domain.data.services.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ServerIcon className="h-4 w-4 text-pink-500" />
                      <h4 className="text-sm font-medium text-gray-700">Services</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {domain.data.services.slice(0, 3).map((service: any) => (
                        <span
                          key={service.id}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors duration-200"
                        >
                          {service.data.id}
                        </span>
                      ))}
                      {domain.data.services.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors duration-200">
                          +{domain.data.services.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Messages Section */}
                {(domain.sends?.length > 0 || domain.receives?.length > 0) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <EnvelopeIcon className="h-4 w-4 text-gray-500" />
                      <h4 className="text-sm font-medium text-gray-700">Messages</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {domain.sends?.slice(0, 1).map((message) => (
                        <span
                          key={message.data.name}
                          className="group inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors duration-200"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {message.data.name}
                        </span>
                      ))}
                      {domain.receives?.slice(0, 1).map((message) => (
                        <span
                          key={message.data.name}
                          className="group inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors duration-200"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          {message.data.name}
                        </span>
                      ))}
                      {(domain.sends?.length || 0) + (domain.receives?.length || 0) > 2 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors duration-200">
                          +{(domain.sends?.length || 0) + (domain.receives?.length || 0) - 2} more
                        </span>
                      )}
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