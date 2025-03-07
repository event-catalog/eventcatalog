import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { buildUrl, buildUrlWithParams } from '@utils/url-builder';
import CollapsibleGroup from './components/CollapsibleGroup';
import MessageList from './components/MessageList';
import type { MessageItem, ServiceItem, ListViewSideBarProps } from './types';
const STORAGE_KEY = 'EventCatalog:catalogSidebarCollapsedGroups';
const DEBOUNCE_DELAY = 300; // 300ms debounce delay

export const getMessageColorByCollection = (collection: string) => {
  if (collection === 'commands') return 'bg-blue-50 text-blue-600';
  if (collection === 'queries') return 'bg-green-50 text-green-600';
  if (collection === 'events') return 'bg-orange-50 text-orange-600';
  return 'text-gray-600';
};

export const getMessageCollectionName = (collection: string) => {
  if (collection === 'commands') return 'Command';
  if (collection === 'queries') return 'Query';
  if (collection === 'events') return 'Event';
  return collection.slice(0, collection.length - 1).toUpperCase();
};

const NoResultsFound = React.memo(({ searchTerm }: { searchTerm: string }) => (
  <div className="px-4 py-6 text-center">
    <div className="text-gray-400 text-sm mb-2">No results found for "{searchTerm}"</div>
    <div className="text-gray-400 text-xs">
      Try:
      <ul className="mt-2 space-y-1 text-left list-disc pl-4">
        <li>Checking for typos</li>
        <li>Using fewer keywords</li>
        <li>Using more general terms</li>
      </ul>
    </div>
  </div>
));

const ServiceItem = React.memo(
  ({
    item,
    decodedCurrentPath,
    collapsedGroups,
    toggleGroupCollapse,
  }: {
    item: ServiceItem;
    decodedCurrentPath: string;
    collapsedGroups: { [key: string]: boolean };
    toggleGroupCollapse: (group: string) => void;
  }) => (
    <CollapsibleGroup
      isCollapsed={collapsedGroups[item.href]}
      onToggle={() => toggleGroupCollapse(item.href)}
      title={
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleGroupCollapse(item.href);
          }}
          className="flex justify-between items-center pl-2 w-full text-xs"
        >
          <span className="truncate text-xs font-bold">{item.label}</span>
          <span className="text-purple-600 ml-2 text-[10px] font-medium bg-purple-50 px-2 py-0.5 rounded">SERVICE</span>
        </button>
      }
    >
      <div className="space-y-0.5 border-gray-200/80 border-l pl-3 ml-[9px] mt-1">
        <a
          href={`${item.href}`}
          className={`flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md ${
            decodedCurrentPath === item.href ? 'bg-purple-100' : 'hover:bg-purple-100'
          }`}
        >
          <span className="truncate">Overview</span>
        </a>
        <a
          href={buildUrlWithParams('/architecture/docs/messages', {
            serviceName: item.name,
            serviceId: item.id,
          })}
          className={`flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md ${
            window.location.href.includes(`serviceId=${item.id}`) ? 'bg-purple-100' : 'hover:bg-purple-100'
          }`}
        >
          <span className="truncate flex items-center gap-1">Architecture</span>
        </a>
        {item.specifications && item.specifications.asyncapiPath && (
          <a
            href={buildUrl(`/docs/services/${item.id}/${item.version}/asyncapi`)}
            className={`flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md flex justify-between ${
              window.location.href.includes(`docs/services/${item.id}/${item.version}/asyncapi`)
                ? 'bg-purple-100'
                : 'hover:bg-purple-100'
            }`}
          >
            <span className="truncate flex items-center gap-1">AsyncAPI specification</span>
            <span className="text-purple-600 ml-2 text-[10px] uppercase font-medium bg-gray-50 px-4 py-0.5 rounded">
              <img src="/icons/asyncapi.svg" className="w-4 h-4" />
            </span>
          </a>
        )}
        {item.specifications && item.specifications.openapiPath && (
          <a
            href={buildUrl(`/docs/services/${item.id}/${item.version}/spec`)}
            className={`items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md flex justify-between ${
              window.location.href.includes(`docs/services/${item.id}/${item.version}/spec`)
                ? 'bg-purple-100'
                : 'hover:bg-purple-100'
            }`}
          >
            <span className="truncate flex items-center gap-1">OpenAPI specification</span>
            <span className="text-green-600 ml-2 text-[10px] uppercase font-medium bg-gray-50 px-4 py-0.5 rounded">
              <img src="/icons/openapi.svg" className="w-4 h-4" />
            </span>
          </a>
        )}
        <CollapsibleGroup
          isCollapsed={collapsedGroups[`${item.href}-receives`]}
          onToggle={() => toggleGroupCollapse(`${item.href}-receives`)}
          title={
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleGroupCollapse(`${item.href}-receives`);
              }}
              className="truncate underline ml-2 text-xs mb-1 py-1"
            >
              Receives messages ({item.receives.length})
            </button>
          }
        >
          <MessageList messages={item.receives} decodedCurrentPath={decodedCurrentPath} />
        </CollapsibleGroup>

        <CollapsibleGroup
          isCollapsed={collapsedGroups[`${item.href}-sends`]}
          onToggle={() => toggleGroupCollapse(`${item.href}-sends`)}
          title={
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleGroupCollapse(`${item.href}-sends`);
              }}
              className="truncate underline ml-2 text-xs mb-1 py-1"
            >
              Sends messages ({item.sends.length})
            </button>
          }
        >
          <MessageList messages={item.sends} decodedCurrentPath={decodedCurrentPath} />
        </CollapsibleGroup>
      </div>
    </CollapsibleGroup>
  )
);

const ListViewSideBar: React.FC<ListViewSideBarProps> = ({ resources, currentPath }) => {
  const navRef = useRef<HTMLElement>(null);
  const [data] = useState(resources);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      setIsInitialized(true);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const decodedCurrentPath = window.location.pathname;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.toLowerCase());
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm) return data;

    const filterItem = (item: { label: string }) => {
      return item.label.toLowerCase().includes(debouncedSearchTerm);
    };

    const filterMessages = (messages: MessageItem[]) => {
      return messages.filter((message) => message.data.name.toLowerCase().includes(debouncedSearchTerm));
    };

    return {
      domains: data.domains?.filter(filterItem) || [],
      services:
        data.services
          ?.map((service: ServiceItem) => ({
            ...service,
            sends: filterMessages(service.sends),
            receives: filterMessages(service.receives),
            isVisible:
              filterItem(service) ||
              service.sends.some((msg: MessageItem) => msg.data.name.toLowerCase().includes(debouncedSearchTerm)) ||
              service.receives.some((msg: MessageItem) => msg.data.name.toLowerCase().includes(debouncedSearchTerm)),
          }))
          .filter((service: ServiceItem & { isVisible: boolean }) => service.isVisible) || [],
      flows: data.flows?.filter(filterItem) || [],
      messagesNotInService:
        data.messagesNotInService?.filter((msg: MessageItem) => msg.label.toLowerCase().includes(debouncedSearchTerm)) || [],
    };
  }, [data, debouncedSearchTerm]);

  // Auto-expand groups when searching
  useEffect(() => {
    if (debouncedSearchTerm) {
      // Expand all groups when searching
      const newCollapsedState = { ...collapsedGroups };
      Object.keys(newCollapsedState).forEach((key) => {
        newCollapsedState[key] = false;
      });
      setCollapsedGroups(newCollapsedState);
    }
  }, [debouncedSearchTerm]);

  // Store collapsed groups in local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedGroups));
    }
  }, [collapsedGroups]);

  // If we find a data-active element, scroll to it on mount
  useEffect(() => {
    const activeElement = document.querySelector('[data-active="true"]');
    if (activeElement) {
      // Add y offset to the scroll position
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const toggleGroupCollapse = useCallback((group: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  if (!isInitialized) return null;

  const hasNoResults =
    debouncedSearchTerm &&
    !filteredData.domains?.length &&
    !filteredData.services?.length &&
    !filteredData.flows?.length &&
    !filteredData.messagesNotInService?.length;

  return (
    <nav ref={navRef} className="space-y-4 text-gray-800 px-3 py-4">
      <input
        type="text"
        value={searchTerm}
        onChange={handleSearchChange}
        placeholder="Quick search..."
        className="w-full p-2 text-sm rounded-md border border-gray-200 h-[30px]"
      />
      <div className="space-y-2 divide-y divide-gray-200/80">
        {hasNoResults ? (
          <NoResultsFound searchTerm={debouncedSearchTerm} />
        ) : (
          <>
            {/* Domains */}
            {filteredData['domains'] && (
              <div>
                <ul className="space-y-2">
                  {filteredData['domains'].map((item: any) => (
                    <li key={item.href} className="space-y-0" data-active={decodedCurrentPath === item.href}>
                      <div className="flex items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupCollapse(item.href);
                          }}
                          className="p-1 hover:bg-gray-100 rounded-md"
                        >
                          <div className={`transition-transform duration-150 ${collapsedGroups[item.href] ? '' : 'rotate-180'}`}>
                            <ChevronDownIcon className="h-3 w-3 text-gray-500" />
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupCollapse(item.href);
                          }}
                          className={`flex-grow flex items-center justify-between px-2 py-0.5 text-xs font-bold rounded-md ${
                            decodedCurrentPath === item.href
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          <span className="text-yellow-600 ml-2 text-[10px] font-medium bg-yellow-50 px-2 py-0.5 rounded">
                            DOMAIN
                          </span>
                        </button>
                      </div>
                      <div
                        className={`overflow-hidden transition-[height] duration-150 ease-out ${
                          collapsedGroups[item.href] ? 'h-0' : 'h-auto'
                        }`}
                      >
                        <div className="space-y-0.5 border-gray-200/80 border-l pl-4 ml-[9px] mt-1">
                          <a
                            href={`${item.href}`}
                            className={`flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md ${
                              decodedCurrentPath === item.href ? 'bg-purple-100 ' : 'hover:bg-purple-100'
                            }`}
                          >
                            <span className="truncate">Overview</span>
                          </a>
                          <a
                            href={buildUrlWithParams('/architecture/docs/services', {
                              serviceIds: item.services.map((service: any) => service.data.id).join(','),
                              domainId: item.id,
                              domainName: item.name,
                            })}
                            className={`flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md ${
                              window.location.href.includes(`domainId=${item.id}`) ? 'bg-purple-100 ' : 'hover:bg-purple-100'
                            }`}
                          >
                            <span className="truncate">Architecture</span>
                          </a>
                          <a
                            href={buildUrl(`/docs/domains/${item.id}/language`)}
                            className={`flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md ${
                              decodedCurrentPath.includes(`/docs/domains/${item.id}/language`)
                                ? 'bg-purple-100 '
                                : 'hover:bg-purple-100'
                            }`}
                          >
                            <span className="truncate">Ubiquitous Language</span>
                          </a>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {filteredData['services'] && (
              <div className="pt-4 pb-2">
                <ul className="space-y-4">
                  {filteredData['services'].map((item: any) => (
                    <ServiceItem
                      key={item.href}
                      item={item}
                      decodedCurrentPath={decodedCurrentPath}
                      collapsedGroups={collapsedGroups}
                      toggleGroupCollapse={toggleGroupCollapse}
                    />
                  ))}
                </ul>
              </div>
            )}

            {filteredData['messagesNotInService'] && (
              <div className="pt-4 pb-2">
                <ul className="space-y-4">
                  {filteredData['messagesNotInService'].map((item: any) => (
                    <li key={item.href} className="space-y-0" data-active={decodedCurrentPath === item.href}>
                      <a
                        href={item.href}
                        className={`flex items-center justify-between px-2 py-0.5 text-xs font-bold rounded-md ${
                          decodedCurrentPath === item.href ? 'bg-purple-100 text-purple-900' : 'hover:bg-purple-100'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        <span
                          className={`ml-2 text-[10px] font-medium px-2 uppercase py-0.5 rounded ${getMessageColorByCollection(item.collection)}`}
                        >
                          {getMessageCollectionName(item.collection)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {filteredData['flows'] && (
              <div className="pt-4 pb-2">
                <ul className="space-y-4">
                  {filteredData['flows'].map((item: any) => (
                    <li key={item.href} className="space-y-0" data-active={decodedCurrentPath === item.href}>
                      <a
                        href={item.href}
                        className={`flex items-center justify-between px-2 py-0.5 text-xs font-bold rounded-md ${
                          decodedCurrentPath === item.href ? 'bg-cyan-100 text-cyan-900' : 'hover:bg-purple-100'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        <span className="text-cyan-600 ml-2 text-[10px] font-medium bg-cyan-50 px-2 py-0.5 rounded">FLOW</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </nav>
  );
};

export default React.memo(ListViewSideBar);
