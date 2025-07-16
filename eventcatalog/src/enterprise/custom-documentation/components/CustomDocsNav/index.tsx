import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDoubleDownIcon, ChevronDoubleUpIcon } from '@heroicons/react/24/outline';
import { buildUrl } from '@utils/url-builder';
import type { CustomDocsNavProps, SidebarSection, SidebarItem } from './types';
import NestedItem from './components/NestedItem';
import NoResultsFound from './components/NoResultsFound';

const STORAGE_KEY = 'EventCatalog:customDocsSidebarCollapsedGroups';
const DEBOUNCE_DELAY = 300; // 300ms debounce delay

const CustomDocsNav: React.FC<CustomDocsNavProps> = ({ sidebarItems }) => {
  const navRef = useRef<HTMLElement>(null);
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

  const currentPath = window.location.pathname;

  // Set up debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.toLowerCase());
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter sidebar items based on search term
  const filteredSidebarItems = useMemo(() => {
    if (!debouncedSearchTerm) return sidebarItems;

    const matchesSearchTerm = (text: string) => text.toLowerCase().includes(debouncedSearchTerm);

    // Helper function to check if an item or any of its nested items match the search term
    const itemContainsSearchTerm = (item: SidebarItem): boolean => {
      if (matchesSearchTerm(item.label)) return true;

      if (item.items && item.items.length > 0) {
        return item.items.some(itemContainsSearchTerm);
      }

      return false;
    };

    return sidebarItems
      .map((section) => {
        if (!section.items) {
          return matchesSearchTerm(section.label) ? section : null;
        }

        const filteredItems = section.items.filter(itemContainsSearchTerm);

        if (filteredItems.length > 0 || matchesSearchTerm(section.label)) {
          return {
            ...section,
            items: filteredItems,
          };
        }

        return null;
      })
      .filter(Boolean) as SidebarSection[];
  }, [sidebarItems, debouncedSearchTerm]);

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
    if (typeof window !== 'undefined' && isInitialized) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedGroups));
    }
  }, [collapsedGroups, isInitialized]);

  // Initialize collapsed state from section config
  useEffect(() => {
    if (isInitialized && sidebarItems && sidebarItems.length > 0) {
      const initialState = { ...collapsedGroups };

      sidebarItems.forEach((section, index) => {
        const sectionKey = `section-${index}`;
        if (section.collapsed !== undefined && initialState[sectionKey] === undefined) {
          initialState[sectionKey] = section.collapsed;
        }
      });

      setCollapsedGroups(initialState);
    }
  }, [sidebarItems, isInitialized]);

  // If we find a data-active element, scroll to it on mount
  useEffect(() => {
    const activeElement = document.querySelector('[data-active="true"]');
    if (activeElement) {
      // Add y offset to the scroll position
      setTimeout(() => {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
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

    // Collapse all sections
    filteredSidebarItems.forEach((section, index) => {
      const sectionKey = `section-${index}`;
      newCollapsedState[sectionKey] = true;

      // Collapse all nested items in the section
      const collapseNestedItems = (items: SidebarItem[], parentId: string) => {
        items.forEach((item, itemIndex) => {
          if (item.items && item.items.length > 0) {
            const itemKey = `${parentId}-${itemIndex}`;
            newCollapsedState[itemKey] = true;
            collapseNestedItems(item.items, itemKey);
          }
        });
      };

      if (section.items) {
        collapseNestedItems(section.items, sectionKey);
      }
    });

    setCollapsedGroups(newCollapsedState);
    setIsExpanded(false);
  }, [filteredSidebarItems]);

  const expandAll = useCallback(() => {
    const newCollapsedState: { [key: string]: boolean } = {};

    // Expand all sections
    filteredSidebarItems.forEach((section, index) => {
      const sectionKey = `section-${index}`;
      newCollapsedState[sectionKey] = false;

      // Expand all nested items in the section
      const expandNestedItems = (items: SidebarItem[], parentId: string) => {
        items.forEach((item, itemIndex) => {
          if (item.items && item.items.length > 0) {
            const itemKey = `${parentId}-${itemIndex}`;
            newCollapsedState[itemKey] = false;
            expandNestedItems(item.items, itemKey);
          }
        });
      };

      if (section.items) {
        expandNestedItems(section.items, sectionKey);
      }
    });

    setCollapsedGroups(newCollapsedState);
    setIsExpanded(true);
  }, [filteredSidebarItems]);

  const toggleExpandCollapse = useCallback(() => {
    if (isExpanded) {
      collapseAll();
    } else {
      expandAll();
    }
  }, [isExpanded, collapseAll, expandAll]);

  if (!isInitialized) return null;

  const hasNoResults = debouncedSearchTerm && filteredSidebarItems.length === 0;

  return (
    <nav ref={navRef} className="h-full text-gray-800 pt-4 overflow-y-auto">
      <div className="mb-2 px-3 bg-white z-10">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Quick search..."
            className="flex-1 p-2 px-2 text-sm rounded-md border border-gray-200 h-[30px]"
          />
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
        </div>
      </div>

      <div className="space-y-2 divide-y divide-gray-100/40 pb-4">
        {hasNoResults ? (
          <NoResultsFound searchTerm={debouncedSearchTerm} />
        ) : (
          filteredSidebarItems.map((section: SidebarSection, index: number) => (
            <div className="pt-2 pb-2 px-3" key={`section-${index}`}>
              <div className="space-y-0" data-section={`section-${index}`}>
                {section.items ? (
                  <div className="flex items-center">
                    <button
                      className="p-1 hover:bg-gray-100 rounded-md flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupCollapse(`section-${index}`);
                      }}
                    >
                      <div
                        className={`transition-transform duration-150 ${collapsedGroups[`section-${index}`] ? '' : 'rotate-180'}`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          aria-hidden="true"
                          data-slot="icon"
                          className="h-3 w-3 text-gray-500"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"></path>
                        </svg>
                      </div>
                    </button>
                    <button
                      className="flex items-center justify-between px-2 py-0.5 text-xs font-bold rounded-md hover:bg-purple-50 min-w-0 flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupCollapse(`section-${index}`);
                      }}
                    >
                      <span className="truncate">{section.label}</span>
                      {section.badge && section?.badge?.text && (
                        <span
                          className={`text-${section.badge.color || 'purple'}-600 ml-2 text-[10px] font-medium bg-${section.badge.color || 'purple'}-50 px-2 py-0.5 rounded uppercase`}
                        >
                          {section.badge.text}
                        </span>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="flex-grow flex items-center justify-between px-2 py-0.5 text-xs font-bold rounded-md">
                      <span className="truncate">{section.label}</span>
                      <span className="text-purple-600 ml-2 text-[10px] font-medium bg-purple-50 px-2 py-0.5 rounded uppercase">
                        Section
                      </span>
                    </span>
                  </div>
                )}

                {section.items && (
                  <div
                    className={`overflow-hidden transition-[height] duration-150 ease-out ${
                      collapsedGroups[`section-${index}`] ? 'h-0' : 'h-auto'
                    }`}
                  >
                    <div className="space-y-0.5 border-gray-200/80 border-l pl-4 ml-[9px] mt-1">
                      {section.items.map((item: SidebarItem, itemIndex: number) => (
                        <NestedItem
                          key={`item-${index}-${itemIndex}`}
                          item={item}
                          currentPath={currentPath}
                          parentId={`${index}`}
                          itemIndex={itemIndex}
                          collapsedGroups={collapsedGroups}
                          toggleGroupCollapse={toggleGroupCollapse}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {section.slug && !section.items && (
                  <a
                    href={buildUrl(`/docs/custom/${section.slug}`)}
                    className={`flex items-center px-2 py-1.5 text-xs ${
                      currentPath.endsWith(`/${section.slug}`)
                        ? 'bg-purple-100 text-purple-900 font-medium'
                        : 'text-gray-600 hover:bg-purple-100'
                    } rounded-md ml-6`}
                    data-active={currentPath.endsWith(`/${section.slug}`)}
                  >
                    <span className="truncate">{section.label}</span>
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </nav>
  );
};

export default React.memo(CustomDocsNav);
