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
    const readsAndWritesTo = item.writesTo.filter((writeTo) => item.readsFrom.some((readFrom) => readFrom.id === writeTo.id));
    const resourceReads = item.readsFrom.filter((readFrom) => !readsAndWritesTo.some((writeTo) => writeTo.id === readFrom.id));
    const resourceWrites = item.writesTo.filter((writeTo) => !readsAndWritesTo.some((readFrom) => readFrom.id === writeTo.id));
    const hasData = item.writesTo.length > 0 || item.readsFrom.length > 0;

    const sendsMessages = item.sends && item.sends.length > 0;
    const receivesMessages = item.receives && item.receives.length > 0;

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
            title={item.label}
          >
            <span className="truncate text-xs font-bold">
              <HighlightedText text={item.label} searchTerm={searchTerm} />
              <span className="text-xs text-gray-400">{item.draft ? ' (DRAFT)' : ''}</span>
            </span>
            <span
              style={{
                color: item.sidebar?.color || '#9333ea',
                backgroundColor: item.sidebar?.backgroundColor || '#faf5ff',
              }}
              className="ml-2 rounded bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600"
            >
              {item.sidebar?.badge ? item.sidebar.badge?.toUpperCase() : 'SERVICE'}
            </span>
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
          {isVisualizer && hasData && (
            <a
              href={buildUrl(`/${item.href}/data`)}
              data-active={decodedCurrentPath === `${item.href}/data`}
              className={`flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md ${
                decodedCurrentPath === `${item.href}/data` ? 'bg-purple-100 ' : 'hover:bg-purple-100'
              }`}
            >
              <span className="truncate">Data Diagram</span>
            </a>
          )}
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

          {receivesMessages && (
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
          )}
          {sendsMessages && (
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
          )}
          {!isVisualizer && hasData && (
            <CollapsibleGroup
              isCollapsed={collapsedGroups[`${item.href}-data`]}
              onToggle={() => toggleGroupCollapse(`${item.href}-data`)}
              title={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroupCollapse(`${item.href}-data`);
                  }}
                  className="truncate underline ml-2 text-xs mb-1 py-1"
                >
                  Data Stores ({readsAndWritesTo.length + resourceWrites.length + resourceReads.length})
                </button>
              }
            >
              {readsAndWritesTo.length > 0 && (
                <CollapsibleGroup
                  className="ml-4"
                  isCollapsed={collapsedGroups[`${item.href}-writesTo-data`]}
                  onToggle={() => toggleGroupCollapse(`${item.href}-writesTo-data`)}
                  title={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupCollapse(`${item.href}-writesTo-data`);
                      }}
                      className="truncate underline ml-2 text-xs mb-1 py-1"
                    >
                      Reads and writes to
                    </button>
                  }
                >
                  <MessageList messages={readsAndWritesTo} decodedCurrentPath={decodedCurrentPath} searchTerm={searchTerm} />
                </CollapsibleGroup>
              )}
              {resourceWrites.length > 0 && (
                <CollapsibleGroup
                  className="ml-4"
                  isCollapsed={collapsedGroups[`${item.href}-writesTo-data`]}
                  onToggle={() => toggleGroupCollapse(`${item.href}-writesTo-data`)}
                  title={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupCollapse(`${item.href}-writesTo-data`);
                      }}
                      className="truncate underline ml-2 text-xs mb-1 py-1"
                    >
                      Writes to
                    </button>
                  }
                >
                  <MessageList messages={resourceWrites} decodedCurrentPath={decodedCurrentPath} searchTerm={searchTerm} />
                </CollapsibleGroup>
              )}
              {resourceReads.length > 0 && (
                <CollapsibleGroup
                  className="ml-4"
                  isCollapsed={collapsedGroups[`${item.href}-readsFrom-data`]}
                  onToggle={() => toggleGroupCollapse(`${item.href}-readsFrom-data`)}
                  title={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupCollapse(`${item.href}-readsFrom-data`);
                      }}
                      className="truncate underline ml-2 text-xs mb-1 py-1"
                    >
                      Reads From
                    </button>
                  }
                >
                  <MessageList messages={resourceReads} decodedCurrentPath={decodedCurrentPath} searchTerm={searchTerm} />
                </CollapsibleGroup>
              )}
            </CollapsibleGroup>
          )}
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

const ListViewSideBar: React.FC<ListViewSideBarProps> = ({ resources, currentPath, showOrphanedMessages }) => {
  const navRef = useRef<HTMLElement>(null);
  const [data] = useState(resources);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSearchPinned, setIsSearchPinned] = useState(false);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const savedState = saved ? JSON.parse(saved) : {};
      const currentPath = window.location.pathname;

      // Default all sections to collapsed
      const defaultCollapsedState: { [key: string]: boolean } = {
        'all-services-group': true,
        'flows-group': true,
        'data-group': true,
        'designs-group': true,
        'messagesNotInService-group': true,
      };

      // Default all domains, services, and their subsections to collapsed
      resources.domains?.forEach((domain: any) => {
        const isDomainActive = currentPath.includes(domain.href);
        defaultCollapsedState[domain.href] = !isDomainActive;
        defaultCollapsedState[`${domain.href}-entities`] = true;
        defaultCollapsedState[`${domain.href}-subdomains`] = true;
        defaultCollapsedState[`${domain.href}-services`] = true;
      });

      resources.services?.forEach((service: any) => {
        const isServiceActive = currentPath.includes(service.href);
        defaultCollapsedState[service.href] = !isServiceActive;
        defaultCollapsedState[`${service.href}-specifications`] = true;
        defaultCollapsedState[`${service.href}-receives`] = true;
        defaultCollapsedState[`${service.href}-sends`] = true;
        defaultCollapsedState[`${service.href}-entities`] = true;
        defaultCollapsedState[`${service.href}-data`] = true;
        defaultCollapsedState[`${service.href}-writesTo-data`] = true;
        defaultCollapsedState[`${service.href}-readsFrom-data`] = true;
      });

      setIsInitialized(true);
      return { ...defaultCollapsedState, ...savedState };
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

  // Handle scroll for sticky search bar
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const handleScroll = () => {
      const scrollTop = nav.scrollTop;
      const scrollThreshold = 50; // Pin after scrolling 50px

      // Scrolling down past threshold
      if (scrollTop > scrollThreshold && scrollTop > lastScrollTop) {
        setIsSearchPinned(true);
      }
      // Scrolling up near the top
      else if (scrollTop <= scrollThreshold) {
        setIsSearchPinned(false);
      }

      setLastScrollTop(scrollTop);
    };

    nav.addEventListener('scroll', handleScroll);
    return () => nav.removeEventListener('scroll', handleScroll);
  }, [lastScrollTop]);

  // Store collapsed groups in local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedGroups));
    }
  }, [collapsedGroups]);

  // If we find a data-active element, scroll to it on mount and open its section
  useEffect(() => {
    const activeElement = document.querySelector('[data-active="true"]');
    if (activeElement) {
      // Add y offset to the scroll position
      activeElement.scrollIntoView({ behavior: 'instant', block: 'center' });

      // Check which section the active element belongs to and open it
      const newCollapsedState = { ...collapsedGroups };

      // Check if active page is in a domain
      data.domains?.forEach((domain: any) => {
        if (decodedCurrentPath.includes(domain.href)) {
          newCollapsedState[domain.href] = false;

          // Check if it's in domain entities
          const isInDomainEntities = domain.entities?.some((entity: any) => decodedCurrentPath.includes(entity.href));
          if (isInDomainEntities) {
            newCollapsedState[`${domain.href}-entities`] = false;
          }

          // Check if it's in domain services
          const isInDomainServices = domain.services?.some((service: any) => decodedCurrentPath.includes(service.data.id));
          if (isInDomainServices) {
            newCollapsedState[`${domain.href}-services`] = false;
          }

          // Check if it's in a subdomain
          const subdomains = domain.domains || [];
          subdomains.forEach((subdomain: any) => {
            const actualSubdomain = data.domains?.find((d: any) => d.id === subdomain.data.id);
            if (actualSubdomain && decodedCurrentPath.includes(actualSubdomain.href)) {
              newCollapsedState[`${domain.href}-subdomains`] = false;
              newCollapsedState[actualSubdomain.href] = false;

              // Check subdomain entities
              const isInSubdomainEntities = actualSubdomain.entities?.some((entity: any) =>
                decodedCurrentPath.includes(entity.href)
              );
              if (isInSubdomainEntities) {
                newCollapsedState[`${actualSubdomain.href}-entities`] = false;
              }

              // Check subdomain services
              const isInSubdomainServices = actualSubdomain.services?.some((service: any) =>
                decodedCurrentPath.includes(service.data.id)
              );
              if (isInSubdomainServices) {
                newCollapsedState[`${actualSubdomain.href}-services`] = false;
              }
            }
          });
        }
      });

      // Check if active page is a service
      data.services?.forEach((service: ServiceItem) => {
        if (decodedCurrentPath.includes(service.href)) {
          newCollapsedState['all-services-group'] = false;
          newCollapsedState[service.href] = false;

          // Open specific service sections if active
          if (decodedCurrentPath.includes('/data')) {
            newCollapsedState[`${service.href}-data`] = false;
          }
        }
      });

      // Check if active page is a flow
      const isFlow = data.flows?.some((flow: FlowItem) => decodedCurrentPath === flow.href);
      if (isFlow) {
        newCollapsedState['flows-group'] = false;
      }

      // Check if active page is a container/data store
      const isContainer = data.containers?.some((container: any) => decodedCurrentPath === container.href);
      if (isContainer) {
        newCollapsedState['data-group'] = false;
      }

      // Check if active page is a design
      const isDesign = data.designs?.some((design: any) => decodedCurrentPath === design.href);
      if (isDesign) {
        newCollapsedState['designs-group'] = false;
      }

      // Check if active page is an orphaned message
      const isOrphanedMessage = data.messagesNotInService?.some((msg: MessageItem) => decodedCurrentPath === msg.href);
      if (isOrphanedMessage) {
        newCollapsedState['messagesNotInService-group'] = false;
      }

      setCollapsedGroups(newCollapsedState);
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
      newCollapsedState[`${domain.href}-services`] = true;
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
      newCollapsedState[`${domain.href}-services`] = false;
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

  // Helper function to get services for a specific domain (only direct services, not from subdomains)
  const getServicesForDomain = useMemo(() => {
    return (domain: any, allServices: ServiceItem[], allDomains: any[]) => {
      const domainServices = domain.services || [];
      const subdomains = getSubdomainsForParent(domain, allDomains);

      // Get all service IDs from subdomains
      const subdomainServiceIds = subdomains.flatMap((subdomain: any) => (subdomain.services || []).map((s: any) => s.data.id));

      // Filter services that belong to this domain but NOT to any of its subdomains
      return allServices.filter(
        (service: ServiceItem) =>
          domainServices.some((domainService: any) => domainService.data.id === service.id) &&
          !subdomainServiceIds.includes(service.id)
      );
    };
  }, [getSubdomainsForParent]);

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
            title={item.label}
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
            title={item.label}
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
    ({
      item,
      nestingLevel = 0,
      className = '',
      isSubdomain = false,
    }: {
      item: any;
      nestingLevel?: number;
      className?: string;
      isSubdomain?: boolean;
    }) => {
      const marginLeft = nestingLevel > 0 ? `ml-${nestingLevel * 4}` : '';
      const hasEntities = item.entities && item.entities.length > 0;

      // Get services for this domain
      const domainServices = getServicesForDomain(item, filteredData['services'] || [], filteredData['domains'] || []);

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
              title={`${item.label} - Overview`}
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

            {/* Render services before entities */}
            {domainServices.length > 0 && (
              <CollapsibleGroup
                isCollapsed={collapsedGroups[`${item.href}-services`]}
                onToggle={() => toggleGroupCollapse(`${item.href}-services`)}
                title={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGroupCollapse(`${item.href}-services`);
                    }}
                    className="truncate underline ml-2 text-xs mb-1 py-1"
                  >
                    Services ({domainServices.length})
                  </button>
                }
              >
                <div className="space-y-2 pl-4">
                  {domainServices.map((service: ServiceItem) => (
                    <ServiceItem
                      key={service.href}
                      item={service}
                      decodedCurrentPath={decodedCurrentPath}
                      collapsedGroups={collapsedGroups}
                      toggleGroupCollapse={toggleGroupCollapse}
                      isVisualizer={isVisualizer}
                      searchTerm={debouncedSearchTerm}
                    />
                  ))}
                </div>
              </CollapsibleGroup>
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
    <nav ref={navRef} className="space-y-4 text-gray-800 px-3 py-4 overflow-auto h-full">
      <div
        className={`flex gap-2 transition-all duration-200 ${
          isSearchPinned ? 'sticky -top-5 z-10 bg-white shadow-md -mx-3 px-3 py-2 border-b border-gray-200' : ''
        }`}
      >
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
                                    <DomainContent item={subdomain} nestingLevel={3} className="ml-6" isSubdomain={true} />
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

            {/* All Services Group */}
            {filteredData['services'] && filteredData['services'].length > 0 && (
              <div className="pt-4 pb-2">
                <CollapsibleGroup
                  isCollapsed={collapsedGroups['all-services-group']}
                  onToggle={() => toggleGroupCollapse('all-services-group')}
                  title={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupCollapse('all-services-group');
                      }}
                      className="flex justify-between items-center pl-2 w-full text-xs"
                    >
                      <span className="truncate text-xs font-bold">All Services ({filteredData['services'].length})</span>
                      <span className="ml-2 rounded bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">
                        SERVICES
                      </span>
                    </button>
                  }
                >
                  <div className="space-y-4 border-gray-200/80 border-l pl-3 ml-[9px] mt-3">
                    {filteredData['services'].map((item: any) => {
                      // Ensure service is collapsed by default if not in collapsedGroups
                      if (collapsedGroups[item.href] === undefined) {
                        collapsedGroups[item.href] = true;
                      }

                      return (
                        <ServiceItem
                          key={item.href}
                          item={item}
                          decodedCurrentPath={decodedCurrentPath}
                          collapsedGroups={collapsedGroups}
                          toggleGroupCollapse={toggleGroupCollapse}
                          isVisualizer={isVisualizer}
                          searchTerm={debouncedSearchTerm}
                        />
                      );
                    })}
                  </div>
                </CollapsibleGroup>
              </div>
            )}

            {/* Flows Group */}
            {filteredData['flows'] && filteredData['flows'].length > 0 && (
              <div className="pt-4 pb-2">
                <CollapsibleGroup
                  isCollapsed={collapsedGroups['flows-group']}
                  onToggle={() => toggleGroupCollapse('flows-group')}
                  title={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupCollapse('flows-group');
                      }}
                      className="flex justify-between items-center pl-2 w-full text-xs"
                    >
                      <span className="truncate text-xs font-bold">All Flows ({filteredData['flows'].length})</span>
                      <span className="ml-2 rounded bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-600">FLOWS</span>
                    </button>
                  }
                >
                  <div className="space-y-2 border-gray-200/80 border-l pl-3 ml-[9px] mt-3">
                    {filteredData['flows'].map((item: any) => (
                      <div key={item.href} data-active={decodedCurrentPath === item.href}>
                        <a
                          href={item.href}
                          data-active={decodedCurrentPath === item.href}
                          className={`flex items-center justify-between px-2 py-0.5 text-xs font-thin rounded-md ${
                            decodedCurrentPath === item.href ? 'bg-purple-100 text-purple-900' : 'hover:bg-purple-100'
                          }`}
                          title={item.label}
                        >
                          <span className="truncate">
                            <HighlightedText text={item.label} searchTerm={debouncedSearchTerm} />
                          </span>
                          <span className={`ml-2 text-[10px] font-medium px-2 uppercase py-0.5 rounded bg-teal-50 text-teal-600`}>
                            FLOW
                          </span>
                        </a>
                      </div>
                    ))}
                  </div>
                </CollapsibleGroup>
              </div>
            )}

            {/* Data Group */}
            {filteredData['containers'] && filteredData['containers'].length > 0 && (
              <div className="pt-4 pb-2">
                <CollapsibleGroup
                  isCollapsed={collapsedGroups['data-group']}
                  onToggle={() => toggleGroupCollapse('data-group')}
                  title={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupCollapse('data-group');
                      }}
                      className="flex justify-between items-center pl-2 w-full text-xs"
                    >
                      <span className="truncate text-xs font-bold">All Data Stores ({filteredData['containers'].length})</span>
                      <span className="ml-2 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">DATA</span>
                    </button>
                  }
                >
                  <div className="space-y-2 border-gray-200/80 border-l pl-3 ml-[9px] mt-3">
                    {filteredData['containers'].map((item: any) => (
                      <div key={item.href} data-active={decodedCurrentPath === item.href}>
                        <a
                          href={item.href}
                          data-active={decodedCurrentPath === item.href}
                          className={`flex items-center justify-between px-2 py-0.5 text-xs font-thin rounded-md ${
                            decodedCurrentPath === item.href ? 'bg-purple-100 text-purple-900' : 'hover:bg-purple-100'
                          }`}
                          title={item.label}
                        >
                          <span className="truncate">
                            <HighlightedText text={item.label} searchTerm={debouncedSearchTerm} />
                          </span>
                          <span className={`ml-2 text-[10px] font-medium px-2 uppercase py-0.5 rounded bg-blue-50 text-blue-600`}>
                            DATA
                          </span>
                        </a>
                      </div>
                    ))}
                  </div>
                </CollapsibleGroup>
              </div>
            )}

            {filteredData['designs'] && filteredData['designs'].length > 0 && (
              <div className="pt-4 pb-2">
                <CollapsibleGroup
                  isCollapsed={collapsedGroups['designs-group']}
                  onToggle={() => toggleGroupCollapse('designs-group')}
                  title={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupCollapse('designs-group');
                      }}
                      className="flex justify-between items-center pl-2 w-full text-xs"
                    >
                      <span className="truncate text-xs font-bold">All Designs ({filteredData['designs'].length})</span>
                      <span className="ml-2 rounded bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-600">DESIGNS</span>
                    </button>
                  }
                >
                  <div className="space-y-2 border-gray-200/80 border-l pl-3 ml-[9px] mt-3">
                    {filteredData['designs'].map((item: any) => (
                      <div key={item.href} data-active={decodedCurrentPath === item.href}>
                        <a
                          href={item.href}
                          data-active={decodedCurrentPath === item.href}
                          className={`flex items-center justify-between px-2 py-0.5 text-xs font-thin rounded-md ${
                            decodedCurrentPath === item.href ? 'bg-purple-100 text-purple-900' : 'hover:bg-purple-100'
                          }`}
                          title={item.label}
                        >
                          <span className="truncate">
                            <HighlightedText text={item.label} searchTerm={debouncedSearchTerm} />
                          </span>
                          <span className={`ml-2 text-[10px] font-medium px-2 uppercase py-0.5 rounded bg-teal-50 text-teal-600`}>
                            DESIGN
                          </span>
                        </a>
                      </div>
                    ))}
                  </div>
                </CollapsibleGroup>
              </div>
            )}

            {filteredData['messagesNotInService'] && filteredData['messagesNotInService'].length > 0 && showOrphanedMessages && (
              <div className="pt-4 pb-2">
                <CollapsibleGroup
                  isCollapsed={collapsedGroups['messagesNotInService-group']}
                  onToggle={() => toggleGroupCollapse('messagesNotInService-group')}
                  title={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupCollapse('messagesNotInService-group');
                      }}
                      className="flex justify-between items-center pl-2 w-full text-xs"
                    >
                      <span className="truncate text-xs font-bold">Orphaned Messages</span>
                    </button>
                  }
                >
                  <div className="space-y-2 border-gray-200/80 border-l pl-3 ml-[9px] mt-3">
                    {filteredData['messagesNotInService'].map((item: any) => (
                      <div key={item.href} data-active={decodedCurrentPath === item.href}>
                        <a
                          href={item.href}
                          data-active={decodedCurrentPath === item.href}
                          className={`flex items-center justify-between px-2 py-0.5 text-xs font-thin rounded-md ${
                            decodedCurrentPath === item.href ? 'bg-purple-100 text-purple-900' : 'hover:bg-purple-100'
                          }`}
                          title={item.label}
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
                      </div>
                    ))}
                  </div>
                </CollapsibleGroup>
              </div>
            )}
          </>
        )}
      </div>
    </nav>
  );
};

export default React.memo(ListViewSideBar);
