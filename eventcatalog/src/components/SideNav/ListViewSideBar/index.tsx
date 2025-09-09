import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronDownIcon, ChevronDoubleDownIcon, ChevronDoubleUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { buildUrl, buildUrlWithParams } from '@utils/url-builder';
import CollapsibleGroup from './components/CollapsibleGroup';
import MessageList from './components/MessageList';
import SpecificationsList from './components/SpecificationList';
import type { MessageItem, ServiceItem, ListViewSideBarProps, DomainItem, FlowItem, Resources } from './types';
import { PanelLeft } from 'lucide-react';
const STORAGE_KEY = 'EventCatalog:catalogSidebarCollapsedGroups';
const DEBOUNCE_DELAY = 300; // 300ms debounce delay

const HighlightedText = React.memo(({ text, searchTerm }: { text: string; searchTerm: string }) => {
  if (!searchTerm) return <>{text}</>;

  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <span key={index} className="bg-yellow-200 text-gray-900 font-semibold">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
});

export const getMessageColorByCollection = (collection: string) => {
  if (collection === 'commands') return 'bg-blue-50 text-blue-600';
  if (collection === 'queries') return 'bg-green-50 text-green-600';
  if (collection === 'events') return 'bg-orange-50 text-orange-600';
  if (collection === 'entities') return 'bg-purple-50 text-purple-600';
  return 'text-gray-600';
};

export const getMessageCollectionName = (collection: string, item: any) => {
  if (collection === 'commands') return 'Command';
  if (collection === 'queries') return 'Query';
  if (collection === 'events') return 'Event';
  if (collection === 'entities' && item.data.aggregateRoot) return 'Entity (Root)';
  if (collection === 'entities') return 'Entity';
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
    isVisualizer,
    searchTerm,
  }: {
    item: ServiceItem;
    decodedCurrentPath: string;
    collapsedGroups: { [key: string]: boolean };
    toggleGroupCollapse: (group: string) => void;
    isVisualizer: boolean;
    searchTerm: string;
  }) => {
    return (
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
            <span className="truncate text-xs font-bold">
              <HighlightedText text={item.label} searchTerm={searchTerm} />
              <span className="text-xs text-gray-400">{item.draft ? ' (DRAFT)' : ''}</span>
            </span>
            <span style={{
              color:  item.sidebar?.color || "#9333ea",
              backgroundColor: item.sidebar?.backgroundColor || "#faf5ff"
            }} className="ml-2 rounded bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">{item.sidebar?.badge ? item.sidebar.badge?.toUpperCase() : "SERVICE"}</span>
          </button>
        }
      >
        <div className="space-y-0.5 border-gray-200/80 border-l pl-3 ml-[9px] mt-1">
          <a
            href={`${item.href}`}
            data-active={decodedCurrentPath === item.href}
            className={`flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md ${
              decodedCurrentPath === item.href ? 'bg-purple-100' : 'hover:bg-purple-100'
            }`}
          >
            <span className="truncate">Overview</span>
          </a>
          {!isVisualizer && (
            <a
              href={buildUrlWithParams('/architecture/docs/messages', {
                serviceName: item.name,
                serviceId: item.id,
              })}
              data-active={window.location.href.includes(`serviceId=${item.id}`)}
              className={`flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md ${
                window.location.href.includes(`serviceId=${item.id}`) ? 'bg-purple-100' : 'hover:bg-purple-100'
              }`}
            >
              <span className="truncate flex items-center gap-1">Architecture</span>
            </a>
          )}

          {!isVisualizer && item.specifications && item.specifications.length > 0 && (
            <CollapsibleGroup
              isCollapsed={collapsedGroups[`${item.href}-specifications`]}
              onToggle={() => toggleGroupCollapse(`${item.href}-specifications`)}
              title={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroupCollapse(`${item.href}-specifications`);
                  }}
                  className="truncate underline ml-2 text-xs mb-1 py-1"
                >
                  Specifications ({item.specifications?.length})
                </button>
              }
            >
              <SpecificationsList specifications={item.specifications} id={item.id} version={item.version} />
            </CollapsibleGroup>
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
            <MessageList messages={item.receives} decodedCurrentPath={decodedCurrentPath} searchTerm={searchTerm} />
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
            <MessageList messages={item.sends} decodedCurrentPath={decodedCurrentPath} searchTerm={searchTerm} />
          </CollapsibleGroup>
          {!isVisualizer && item.entities.length > 0 && (
            <CollapsibleGroup
              isCollapsed={collapsedGroups[`${item.href}-entities`]}
              onToggle={() => toggleGroupCollapse(`${item.href}-entities`)}
              title={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroupCollapse(`${item.href}-entities`);
                  }}
                  className="truncate underline ml-2 text-xs mb-1 py-1"
                >
                  Entities ({item.entities.length})
                </button>
              }
            >
              <MessageList messages={item.entities} decodedCurrentPath={decodedCurrentPath} searchTerm={searchTerm} />
            </CollapsibleGroup>
          )}
        </div>
      </CollapsibleGroup>
    );
  }
);

const ListViewSideBar: React.FC<ListViewSideBarProps> = ({ resources, currentPath }) => {
  const navRef = useRef<HTMLElement>(null);
  const [data] = useState(resources);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      setIsInitialized(true);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const decodedCurrentPath = window.location.pathname;
  const isVisualizer = window.location.pathname.includes('/visualiser/');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.toLowerCase());
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter data based on search term
  const filteredData: Resources = useMemo(() => {
    if (!debouncedSearchTerm) return data;

    const filterItem = (item: { label: string; id?: string }) => {
      return (
        item.label.toLowerCase().includes(debouncedSearchTerm) || (item.id && item.id.toLowerCase().includes(debouncedSearchTerm))
      );
    };

    const filterMessages = (messages: MessageItem[]) => {
      return messages.filter(
        (message) =>
          message.data.name.toLowerCase().includes(debouncedSearchTerm) || message.id.toLowerCase().includes(debouncedSearchTerm)
      );
    };

    // Enhanced domain filtering that considers parent-subdomain relationships
    const filterDomains = (domains: any[]) => {
      const filteredDomains: any[] = [];

      domains.forEach((domain: any) => {
        const domainMatches = filterItem(domain);

        // Check if this domain is a subdomain of another domain
        const isSubdomain = domains.some((parentDomain: any) => {
          const subdomains = parentDomain.domains || [];
          return subdomains.some((subdomain: any) => subdomain.data.id === domain.id);
        });

        // If this is a parent domain, check if any of its subdomains match
        let hasMatchingSubdomains = false;
        if (!isSubdomain) {
          const subdomains = domain.domains || [];
          hasMatchingSubdomains = domains.some((potentialSubdomain: any) =>
            subdomains.some((subdomain: any) => subdomain.data.id === potentialSubdomain.id && filterItem(potentialSubdomain))
          );
        }

        // Include domain if:
        // 1. The domain itself matches the search
        // 2. It's a parent domain and has matching subdomains
        // 3. It's a subdomain and matches the search
        if (domainMatches || hasMatchingSubdomains || (isSubdomain && domainMatches)) {
          filteredDomains.push(domain);
        }

        // If this is a subdomain that matches, also include its parent domain
        if (isSubdomain && domainMatches) {
          const parentDomain = domains.find((parentDomain: any) => {
            const subdomains = parentDomain.domains || [];
            return subdomains.some((subdomain: any) => subdomain.data.id === domain.id);
          });

          if (parentDomain && !filteredDomains.some((d: any) => d.id === parentDomain.id)) {
            filteredDomains.push(parentDomain);
          }
        }
      });

      return filteredDomains;
    };

    return {
      'context-map': data['context-map']?.filter(filterItem) || [],
      domains: data.domains ? filterDomains(data.domains) : [],
      services:
        data.services
          ?.map((service: ServiceItem) => ({
            ...service,
            sends: filterMessages(service.sends),
            receives: filterMessages(service.receives),
            isVisible:
              filterItem(service) ||
              service.sends.some(
                (msg: MessageItem) =>
                  msg.data.name.toLowerCase().includes(debouncedSearchTerm) || msg.id.toLowerCase().includes(debouncedSearchTerm)
              ) ||
              service.receives.some(
                (msg: MessageItem) =>
                  msg.data.name.toLowerCase().includes(debouncedSearchTerm) || msg.id.toLowerCase().includes(debouncedSearchTerm)
              ),
          }))
          .filter((service: ServiceItem & { isVisible: boolean }) => service.isVisible) || [],
      flows: data.flows?.filter(filterItem) || [],
      designs: data.designs?.filter(filterItem) || [],
      messagesNotInService:
        data.messagesNotInService?.filter(
          (msg: MessageItem) =>
            msg.label.toLowerCase().includes(debouncedSearchTerm) || msg.id.toLowerCase().includes(debouncedSearchTerm)
        ) || [],
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
      activeElement.scrollIntoView({ behavior: 'instant', block: 'center' });
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

  const collapseAll = useCallback(() => {
    const newCollapsedState: { [key: string]: boolean } = {};

    // Collapse all domains
    filteredData.domains?.forEach((domain: any) => {
      newCollapsedState[domain.href] = true;
      newCollapsedState[`${domain.href}-entities`] = true;
      newCollapsedState[`${domain.href}-subdomains`] = true;
    });

    // Collapse all services
    filteredData.services?.forEach((service: any) => {
      newCollapsedState[service.href] = true;
      newCollapsedState[`${service.href}-specifications`] = true;
      newCollapsedState[`${service.href}-receives`] = true;
      newCollapsedState[`${service.href}-sends`] = true;
      newCollapsedState[`${service.href}-entities`] = true;
    });

    setCollapsedGroups(newCollapsedState);
    setIsExpanded(false);
  }, [filteredData]);

  const expandAll = useCallback(() => {
    const newCollapsedState: { [key: string]: boolean } = {};

    // Expand all domains
    filteredData.domains?.forEach((domain: any) => {
      newCollapsedState[domain.href] = false;
      newCollapsedState[`${domain.href}-entities`] = false;
      newCollapsedState[`${domain.href}-subdomains`] = false;
    });

    // Expand all services
    filteredData.services?.forEach((service: any) => {
      newCollapsedState[service.href] = false;
      newCollapsedState[`${service.href}-specifications`] = false;
      newCollapsedState[`${service.href}-receives`] = false;
      newCollapsedState[`${service.href}-sends`] = false;
      newCollapsedState[`${service.href}-entities`] = false;
    });

    setCollapsedGroups(newCollapsedState);
    setIsExpanded(true);
  }, [filteredData]);

  const toggleExpandCollapse = useCallback(() => {
    if (isExpanded) {
      collapseAll();
    } else {
      expandAll();
    }
  }, [isExpanded, collapseAll, expandAll]);

  const hideSidebar = useCallback(() => {
    // Dispatch custom event that the Astro layout will listen for
    window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: { action: 'hide' } }));
  }, []);

  const isDomainSubDomain = useMemo(() => {
    return (domain: any) => {
      const domains = data.domains || [];
      return domains.some((d: any) => {
        const subdomains = d.domains || [];
        return subdomains.some((subdomain: any) => subdomain.data.id === domain.id);
      });
    };
  }, [data.domains]);

  // Helper function to get parent domains (domains that are not subdomains)
  const getParentDomains = useMemo(() => {
    return (domains: any[]) => {
      return domains.filter((domain: any) => !isDomainSubDomain(domain));
    };
  }, [isDomainSubDomain]);

  // Helper function to get subdomains for a specific parent domain
  const getSubdomainsForParent = useMemo(() => {
    return (parentDomain: any, allDomains: any[]) => {
      const subdomains = parentDomain.domains || [];
      return allDomains.filter((domain: any) => subdomains.some((subdomain: any) => subdomain.data.id === domain.id));
    };
  }, []);

  // Component to render a single domain item
  const DomainItem = React.memo(
    ({ item, isSubdomain = false, nestingLevel = 0 }: { item: any; isSubdomain?: boolean; nestingLevel?: number }) => {
      const marginLeft = nestingLevel > 0 ? `ml-${nestingLevel * 4}` : '';

      return (
        <div className={`flex items-center ${marginLeft}`}>
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
              decodedCurrentPath === item.href ? 'bg-purple-100' : 'hover:bg-purple-100'
            }`}
          >
            <span className="truncate">
              <HighlightedText text={item.label} searchTerm={debouncedSearchTerm} />
            </span>
            <span className="text-yellow-600 ml-2 text-[10px] font-medium bg-yellow-50 px-2 py-0.5 rounded">
              {isSubdomain ? 'SUBDOMAIN' : 'DOMAIN'}
            </span>
          </button>
        </div>
      );
    }
  );

  // Component to render domain content (Overview, Architecture, etc.)
  const DomainContent = React.memo(
    ({ item, nestingLevel = 0, className = '' }: { item: any; nestingLevel?: number; className?: string }) => {
      const marginLeft = nestingLevel > 0 ? `ml-${nestingLevel * 4}` : '';
      const hasEntities = item.entities && item.entities.length > 0;

      return (
        <div
          className={`overflow-hidden transition-[height] duration-150 ease-out ${collapsedGroups[item.href] ? 'h-0' : 'h-auto'} ${className}`}
        >
          <div className={`space-y-0.5 border-gray-200/80 border-l pl-4  mt-1 ${marginLeft ? marginLeft : 'ml-[9px]'}`}>
            <a
              href={`${item.href}`}
              data-active={decodedCurrentPath === item.href}
              className={`flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md ${
                decodedCurrentPath === item.href ? 'bg-purple-100 ' : 'hover:bg-purple-100'
              }`}
            >
              <span className="truncate">Overview</span>
            </a>
            {isVisualizer && hasEntities && (
              <a
                href={buildUrl(`/${item.href}/entity-map`)}
                data-active={decodedCurrentPath === `${item.href}/entity-map`}
                className={`flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md ${
                  decodedCurrentPath === `${item.href}/entity-map` ? 'bg-purple-100 ' : 'hover:bg-purple-100'
                }`}
              >
                <span className="truncate">Entity Map</span>
              </a>
            )}
            {!isVisualizer && (
              <a
                href={buildUrlWithParams('/architecture/docs/services', {
                  serviceIds: item.services.map((service: any) => service.data.id).join(','),
                  domainId: item.id,
                  domainName: item.name,
                })}
                data-active={window.location.href.includes(`domainId=${item.id}`)}
                className={`flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md ${
                  window.location.href.includes(`domainId=${item.id}`) ? 'bg-purple-100 ' : 'hover:bg-purple-100'
                }`}
              >
                <span className="truncate">Architecture</span>
              </a>
            )}
            {!isVisualizer && (
              <a
                href={buildUrl(`/docs/domains/${item.id}/language`)}
                data-active={decodedCurrentPath.includes(`/docs/domains/${item.id}/language`)}
                className={`flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md ${
                  decodedCurrentPath.includes(`/docs/domains/${item.id}/language`) ? 'bg-purple-100 ' : 'hover:bg-purple-100'
                }`}
              >
                <span className="truncate">Ubiquitous Language</span>
              </a>
            )}
            {item.entities.length > 0 && !isVisualizer && (
              <CollapsibleGroup
                isCollapsed={collapsedGroups[`${item.href}-entities`]}
                onToggle={() => toggleGroupCollapse(`${item.href}-entities`)}
                title={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGroupCollapse(`${item.href}-entities`);
                    }}
                    className="truncate underline ml-2 text-xs mb-1 py-1"
                  >
                    Entities ({item.entities.length})
                  </button>
                }
              >
                <MessageList messages={item.entities} decodedCurrentPath={decodedCurrentPath} searchTerm={debouncedSearchTerm} />
              </CollapsibleGroup>
            )}
          </div>
        </div>
      );
    }
  );

  if (!isInitialized) return null;

  const hasNoResults =
    debouncedSearchTerm &&
    !filteredData['context-map']?.length &&
    !filteredData.domains?.length &&
    !filteredData.services?.length &&
    !filteredData.flows?.length &&
    !filteredData.messagesNotInService?.length;

  return (
    <nav ref={navRef} className="space-y-4 text-gray-800 px-3 py-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Quick search..."
          className="flex-1 p-2 text-sm rounded-md border border-gray-200 h-[30px]"
        />
        <div className="flex gap-1">
          <button
            onClick={toggleExpandCollapse}
            title={isExpanded ? 'Collapse All' : 'Expand All'}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-200 h-[30px] flex items-center justify-center"
          >
            {isExpanded ? (
              <ChevronDoubleUpIcon className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronDoubleDownIcon className="h-4 w-4 text-gray-600" />
            )}
          </button>
          <button
            onClick={hideSidebar}
            title="Hide Sidebar"
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-200 h-[30px] flex items-center justify-center"
          >
            <PanelLeft className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>
      <div className="space-y-2 divide-y divide-gray-200/80">
        {hasNoResults ? (
          <NoResultsFound searchTerm={debouncedSearchTerm} />
        ) : (
          <>
            {/* Bounded Context Map (Visualiser only) */}
            {filteredData['context-map'] && filteredData.domains && filteredData.domains.length > 0 && (
              <div className="pt-0">
                <ul className="space-y-1">
                  {filteredData['context-map'].map((item: any) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        data-active={decodedCurrentPath === item.href}
                        className={`flex items-center justify-between px-2 py-0.5 text-xs font-bold rounded-md ${
                          decodedCurrentPath === item.href ? 'bg-purple-100 text-purple-900' : 'hover:bg-purple-100'
                        }`}
                      >
                        <span className="truncate flex flex-col items-start">
                          <HighlightedText text={item.label} searchTerm={debouncedSearchTerm} />
                          <span className="text-[10px] text-gray-500 font-light">Explore integrations between domains</span>
                        </span>
                        <span className="text-blue-600 ml-2 text-[10px] font-medium bg-blue-50 px-2 py-0.5 rounded">DOMAINS</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Domains */}
            {filteredData['domains'] && (
              <div className={`${isVisualizer ? 'pt-4 pb-2' : 'p-0'}`}>
                <ul className="space-y-2">
                  {getParentDomains(filteredData['domains'] || []).map((parentDomain: any) => {
                    const subdomains = getSubdomainsForParent(parentDomain, filteredData['domains'] || []);

                    return (
                      <li key={parentDomain.href} className="space-y-0" data-active={decodedCurrentPath === parentDomain.href}>
                        <DomainItem item={parentDomain} isSubdomain={false} />
                        <DomainContent item={parentDomain} />

                        {/* Render nested subdomains */}
                        {subdomains.length > 0 && !collapsedGroups[parentDomain.href] && (
                          <div className="space-y-0.5 border-gray-200/80 border-l pl-4 ml-[9px] mt-2">
                            <CollapsibleGroup
                              isCollapsed={collapsedGroups[`${parentDomain.href}-subdomains`]}
                              onToggle={() => toggleGroupCollapse(`${parentDomain.href}-subdomains`)}
                              title={
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGroupCollapse(`${parentDomain.href}-subdomains`);
                                  }}
                                  className="truncate underline ml-2 text-xs mb-1 py-1"
                                >
                                  Subdomains ({subdomains.length})
                                </button>
                              }
                            >
                              <div className="space-y-2">
                                {subdomains.map((subdomain: any) => (
                                  <div
                                    key={subdomain.href}
                                    className="space-y-0"
                                    data-active={decodedCurrentPath === subdomain.href}
                                  >
                                    <DomainItem item={subdomain} isSubdomain={true} nestingLevel={1} />
                                    <DomainContent item={subdomain} nestingLevel={3} className="ml-6" />
                                  </div>
                                ))}
                              </div>
                            </CollapsibleGroup>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {filteredData['services'] && (
              <div className="pt-4 pb-2">
                <ul className="space-y-4">
                  {filteredData['services'].map((item: any) => (
                    <li key={item.href} data-active={decodedCurrentPath === item.href}>
                      <ServiceItem
                        key={item.href}
                        item={item}
                        decodedCurrentPath={decodedCurrentPath}
                        collapsedGroups={collapsedGroups}
                        toggleGroupCollapse={toggleGroupCollapse}
                        isVisualizer={isVisualizer}
                        searchTerm={debouncedSearchTerm}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {filteredData['messagesNotInService'] && filteredData['messagesNotInService'].length > 0 && (
              <div className="pt-4 pb-2">
                <ul className="space-y-4">
                  {filteredData['messagesNotInService'].map((item: any) => (
                    <li key={item.href} className="space-y-0" data-active={decodedCurrentPath === item.href}>
                      <a
                        href={item.href}
                        data-active={decodedCurrentPath === item.href}
                        className={`flex items-center justify-between px-2 py-0.5 text-xs font-bold rounded-md ${
                          decodedCurrentPath === item.href ? 'bg-purple-100 text-purple-900' : 'hover:bg-purple-100'
                        }`}
                      >
                        <span className="truncate">
                          <HighlightedText text={item.label} searchTerm={debouncedSearchTerm} />
                        </span>
                        <span
                          className={`ml-2 text-[10px] font-medium px-2 uppercase py-0.5 rounded ${getMessageColorByCollection(item.collection)}`}
                        >
                          {getMessageCollectionName(item.collection, item)}
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
                        data-active={decodedCurrentPath === item.href}
                        className={`flex items-center justify-between px-2 py-0.5 text-xs font-bold rounded-md ${
                          decodedCurrentPath === item.href ? 'bg-cyan-100 text-cyan-900' : 'hover:bg-purple-100'
                        }`}
                      >
                        <span className="truncate">
                          <HighlightedText text={item.label} searchTerm={debouncedSearchTerm} />
                        </span>
                        <span className="text-cyan-600 ml-2 text-[10px] font-medium bg-cyan-50 px-2 py-0.5 rounded">FLOW</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {filteredData['designs'] && isVisualizer && (
              <div className="pt-4 pb-2">
                <ul className="space-y-4">
                  {filteredData['designs'].map((item: any) => (
                    <li key={item.href} className="space-y-0" data-active={decodedCurrentPath === item.href}>
                      <a
                        href={item.href}
                        data-active={decodedCurrentPath === item.href}
                        className={`flex items-center justify-between px-2 py-0.5 text-xs font-bold rounded-md ${
                          decodedCurrentPath === item.href ? 'bg-cyan-100 text-cyan-900' : 'hover:bg-purple-100'
                        }`}
                      >
                        <span className="truncate">
                          <HighlightedText text={item.label} searchTerm={debouncedSearchTerm} />
                        </span>
                        <span className="text-cyan-600 ml-2 text-[10px] font-medium bg-cyan-50 px-2 py-0.5 rounded">DESIGN</span>
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
