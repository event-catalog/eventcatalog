import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  QueueListIcon,
  RectangleGroupIcon,
  BoltIcon,
  ChatBubbleLeftIcon,
  ServerIcon,
  UserGroupIcon,
  UserIcon,
  BookOpenIcon,
  DocumentTextIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  description: string;
  url: string;
  tags: string[];
}

// Memoized SearchResult component for better performance
const SearchResultItem = React.memo<{
  item: SearchResult;
  typeConfig: any;
  currentSearch: string;
}>(({ item, typeConfig, currentSearch }) => {
  const config = typeConfig[item.type as keyof typeof typeConfig] || typeConfig.other;
  const getDisplayType = (type: string) => {
    if (type === 'other') return 'Page';
    if (type === 'asyncapi') return 'AsyncAPI';
    if (type === 'openapi') return 'OpenAPI';
    if (type === 'language') return 'Language';
    if (type === 'entities') return 'Entity';
    if (type === 'queries') return 'Query';
    // For plurals, remove 's' at the end, otherwise just capitalize
    if (type.endsWith('s')) {
      return type.charAt(0).toUpperCase() + type.slice(1, -1);
    }
    return type.charAt(0).toUpperCase() + type.slice(1);
  };
  const displayType = getDisplayType(item.type);
  const IconComponent = config.icon;

  return (
    <a href={item.url} className="block group">
      <div
        className={`bg-gradient-to-br ${config.bg} to-white border rounded-lg p-3 hover:border-purple-300 hover:shadow-md transition-all duration-200 group-hover:shadow-lg ${config.border}`}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">{item.name}</h3>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeBg} ${config.text} ${config.border} border`}
          >
            <IconComponent className="h-3 w-3" />
            {displayType}
          </span>
        </div>
        {item.description && (
          <div className="text-xs text-gray-500 mb-2 line-clamp-2 opacity-80">
            {currentSearch.trim() ? (
              <span dangerouslySetInnerHTML={{ __html: item.description }} />
            ) : (
              <span>{item.description.replace(/<[^>]*>/g, '')}</span>
            )}
          </div>
        )}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
});

// Memoized SearchResults component
const SearchResults = React.memo<{
  results: SearchResult[];
  typeConfig: any;
  currentSearch: string;
}>(({ results, typeConfig, currentSearch }) => {
  return (
    <>
      {results.map((item) => (
        <SearchResultItem key={item.id} item={item} typeConfig={typeConfig} currentSearch={currentSearch} />
      ))}
    </>
  );
});

const SearchModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [pagefind, setPagefind] = useState<any>(null);
  const [pagefindLoadError, setPagefindLoadError] = useState(false);
  const [currentSearch, setCurrentSearch] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);

  // Listen for modal state changes from Astro component
  useEffect(() => {
    const handleModalToggle = (event: CustomEvent) => {
      setIsOpen(event.detail.isOpen);
    };

    window.addEventListener('searchModalToggle', handleModalToggle as EventListener);
    return () => window.removeEventListener('searchModalToggle', handleModalToggle as EventListener);
  }, []);

  const onClose = () => {
    if ((window as any).searchModalState) {
      (window as any).searchModalState.close();
    }
  };

  // Type colors and icons - memoized to prevent recreating on every render
  const typeConfig = useMemo(
    () => ({
      domains: {
        bg: 'bg-orange-50/10',
        badgeBg: 'bg-orange-500/20',
        text: 'text-orange-800',
        border: 'border-orange-200',
        icon: RectangleGroupIcon,
      },
      services: {
        bg: 'bg-pink-50/10',
        badgeBg: 'bg-pink-500/20',
        text: 'text-pink-800',
        border: 'border-pink-200',
        icon: ServerIcon,
      },
      events: {
        bg: 'bg-orange-50/10',
        badgeBg: 'bg-orange-500/20',
        text: 'text-orange-800',
        border: 'border-orange-200',
        icon: BoltIcon,
      },
      commands: {
        bg: 'bg-blue-50/10',
        badgeBg: 'bg-blue-500/20',
        text: 'text-blue-800',
        border: 'border-blue-200',
        icon: ChatBubbleLeftIcon,
      },
      queries: {
        bg: 'bg-green-50/10',
        badgeBg: 'bg-green-500/20',
        text: 'text-green-800',
        border: 'border-green-200',
        icon: MagnifyingGlassIcon,
      },
      entities: {
        bg: 'bg-purple-50/10',
        badgeBg: 'bg-purple-500/20',
        text: 'text-purple-800',
        border: 'border-purple-200',
        icon: CubeIcon,
      },
      channels: {
        bg: 'bg-indigo-50/10',
        badgeBg: 'bg-indigo-500/20',
        text: 'text-indigo-800',
        border: 'border-indigo-200',
        icon: QueueListIcon,
      },
      teams: {
        bg: 'bg-teal-50/10',
        badgeBg: 'bg-teal-500/20',
        text: 'text-teal-800',
        border: 'border-teal-200',
        icon: UserGroupIcon,
      },
      users: {
        bg: 'bg-cyan-50/10',
        badgeBg: 'bg-cyan-500/20',
        text: 'text-cyan-800',
        border: 'border-cyan-200',
        icon: UserIcon,
      },
      language: {
        bg: 'bg-amber-50/10',
        badgeBg: 'bg-amber-500/20',
        text: 'text-amber-800',
        border: 'border-amber-200',
        icon: BookOpenIcon,
      },
      openapi: {
        bg: 'bg-emerald-50/10',
        badgeBg: 'bg-emerald-500/20',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        icon: DocumentTextIcon,
      },
      asyncapi: {
        bg: 'bg-violet-50/10',
        badgeBg: 'bg-violet-500/20',
        text: 'text-violet-800',
        border: 'border-violet-200',
        icon: DocumentTextIcon,
      },
      other: {
        bg: 'bg-gray-50/10',
        badgeBg: 'bg-gray-500/20',
        text: 'text-gray-800',
        border: 'border-gray-200',
        icon: DocumentTextIcon,
      },
    }),
    []
  );

  // Initialize Pagefind
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initPagefind = async () => {
        try {
          // Wait for Pagefind to be loaded by the Astro script
          const waitForPagefind = () =>
            new Promise<any>((resolve, reject) => {
              if ((window as any).pagefind) {
                resolve((window as any).pagefind);
              } else {
                const handler = () => {
                  window.removeEventListener('pagefindLoaded', handler);
                  resolve((window as any).pagefind);
                };

                // Set a timeout to detect if pagefind fails to load
                const timeout = setTimeout(() => {
                  window.removeEventListener('pagefindLoaded', handler);
                  reject(new Error('Pagefind failed to load - catalog may not be indexed'));
                }, 2000); // 5 second timeout

                window.addEventListener('pagefindLoaded', () => {
                  clearTimeout(timeout);
                  handler();
                });
              }
            });

          const pagefindModule = await waitForPagefind();
          await pagefindModule.init();
          setPagefind(pagefindModule);
        } catch (error) {
          console.error('Failed to initialize Pagefind:', error);
          setPagefindLoadError(true);
        }
      };

      initPagefind();
    }
  }, []);

  // Type mapping based on URL patterns - memoized callback
  const getTypeFromUrl = useCallback((url: string): string => {
    // Check for language first since it can be nested under other paths
    if (url.includes('/language/')) return 'language';
    // Check for spec types after language but before other types since they can be nested
    if (url.includes('/spec/')) return 'openapi';
    if (url.includes('/asyncapi')) return 'asyncapi';
    if (url.includes('/domains/')) return 'domains';
    if (url.includes('/services/')) return 'services';
    if (url.includes('/events/')) return 'events';
    if (url.includes('/commands/')) return 'commands';
    if (url.includes('/queries/')) return 'queries';
    if (url.includes('/entities/')) return 'entities';
    if (url.includes('/channels/')) return 'channels';
    if (url.includes('/teams/')) return 'teams';
    if (url.includes('/users/')) return 'users';
    return 'other';
  }, []);

  // Perform search
  const performSearch = useCallback(
    async (searchTerm: string): Promise<SearchResult[]> => {
      if (!pagefind || !searchTerm.trim()) {
        return [];
      }

      setIsLoading(true);

      try {
        const search = await pagefind.debouncedSearch(searchTerm);
        if (!search || !search.results) {
          return [];
        }
        const processedResults: SearchResult[] = [];

        for (const result of search.results) {
          const data = await result.data();
          const type = getTypeFromUrl(data.url);

          // Clean the title by removing any "Type | " prefix if it exists
          let cleanTitle = data.meta?.title || 'Untitled';

          // Use regex for more efficient prefix removal
          cleanTitle = cleanTitle.replace(
            /^(Domains?|Services?|Events?|Commands?|Queries?|Entities?|Channels?|Teams?|Users?|Language) \| /,
            ''
          );

          processedResults.push({
            id: result.id,
            name: cleanTitle,
            type: type,
            description: data.excerpt || '',
            url: data.url,
            tags: data.meta?.tags ? data.meta.tags.split(',').map((tag: string) => tag.trim()) : [],
          });
        }

        return processedResults;
      } catch (error) {
        console.error('Search error:', error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [pagefind]
  );

  // Filter results - memoized callback
  const filterResults = useCallback(
    (results: SearchResult[], filterType: string): SearchResult[] => {
      let filteredResults = results;

      // Apply type filter
      if (filterType !== 'all') {
        filteredResults = filteredResults.filter((item) => item.type === filterType);
      }

      // Apply exact match filter if enabled
      if (exactMatch && currentSearch.trim()) {
        filteredResults = filteredResults.filter((item) => item.name.toLowerCase().includes(currentSearch.toLowerCase()));
      }

      return filteredResults;
    },
    [exactMatch, currentSearch]
  );

  // Update results with debouncing
  const updateResults = useCallback(async () => {
    if (currentSearch.trim()) {
      const results = await performSearch(currentSearch);
      setAllResults(results);
    } else {
      setAllResults([]);
    }
  }, [currentSearch, performSearch]);

  // Search on input change with debouncing
  useEffect(() => {
    if (!currentSearch.trim()) {
      setAllResults([]);
      return;
    }

    const debounceTimer = setTimeout(() => {
      updateResults();
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [currentSearch, updateResults]);

  // Handle input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentSearch(e.target.value);
  };

  // Handle filter change
  const handleFilterChange = (filter: string) => {
    setCurrentFilter(filter);
  };

  // Get filtered results - memoized to prevent recalculation
  const filteredResults = useMemo(() => {
    return filterResults(allResults, currentFilter);
  }, [allResults, currentFilter, exactMatch, currentSearch]);

  // Get filter counts - memoized to prevent recalculation on every render
  const getFilterCounts = useMemo(() => {
    return {
      all: allResults.length,
      domains: allResults.filter((r) => r.type === 'domains').length,
      services: allResults.filter((r) => r.type === 'services').length,
      events: allResults.filter((r) => r.type === 'events').length,
      commands: allResults.filter((r) => r.type === 'commands').length,
      queries: allResults.filter((r) => r.type === 'queries').length,
      entities: allResults.filter((r) => r.type === 'entities').length,
      channels: allResults.filter((r) => r.type === 'channels').length,
      teams: allResults.filter((r) => r.type === 'teams').length,
      users: allResults.filter((r) => r.type === 'users').length,
      language: allResults.filter((r) => r.type === 'language').length,
      openapi: allResults.filter((r) => r.type === 'openapi').length,
      asyncapi: allResults.filter((r) => r.type === 'asyncapi').length,
    };
  }, [allResults]);

  const counts = getFilterCounts;

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div>
      <style>{`
        .search-results mark {
          background-color: #fef3c7;
          color: #92400e;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-weight: 500;
        }
      `}</style>
      <div className="fixed inset-0 z-[9999] overflow-y-auto" role="dialog" aria-modal="true">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-25 transition-opacity backdrop-blur-sm bg-black/10 z-[9998]"
          onClick={onClose}
        ></div>
        <div className="fixed inset-0 z-[10000] w-screen overflow-y-auto p-4 sm:p-6 md:p-10" onClick={onClose}>
          <div
            className="mx-auto max-w-6xl divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {pagefindLoadError ? (
              // Show indexing required message when Pagefind fails to load - full modal content
              <div className="flex items-center justify-center py-10 px-8">
                <div className="text-left max-w-lg">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Search Index Not Found</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed text-sm">
                      Your EventCatalog needs to be built to generate the search index. This enables fast searching across all
                      your domains, services, events, and documentation.
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-center">
                      <svg className="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Build Your Catalog
                    </h3>
                    <div className="bg-gray-900 rounded-lg p-4 mb-4">
                      <code className="text-green-400 font-mono text-sm">npm run build</code>
                    </div>
                    <p className="text-sm text-gray-600">This will generate your catalog and create the search index</p>
                  </div>

                  <div className="flex items-start text-left bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <svg
                      className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Need to update search results?</h4>
                      <p className="text-sm text-blue-700">
                        Run <code className="bg-blue-100 px-1 py-0.5 rounded text-xs font-mono">npm run build</code> again after
                        making changes to your catalog content.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Search Input */}
                <div className="relative px-6 pt-4 pb-2">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-10 top-[25px] h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for domains, services, events..."
                    className="w-full border border-gray-200 rounded-lg bg-white pl-12 pr-4 py-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    value={currentSearch}
                    onChange={handleSearchChange}
                    autoFocus
                  />
                </div>

                {/* Main Content Area */}
                <div className="flex h-[500px]">
                  {/* Left Filters */}
                  <div className="w-56 p-3 border-r border-gray-200 bg-gray-50 overflow-y-auto">
                    {/* All Resources */}
                    <div className="mb-4">
                      <div className="space-y-1">
                        <button
                          className={`w-full px-2 py-1 text-xs rounded-md transition-colors ${
                            currentFilter === 'all'
                              ? 'bg-purple-200 text-purple-900 font-semibold'
                              : 'hover:bg-purple-100 text-gray-700 hover:text-purple-800'
                          }`}
                          onClick={() => handleFilterChange('all')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span>All Resources</span>
                            </div>
                            <span className="text-xs text-gray-700 font-thin">{counts.all}</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Resources Section */}
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-gray-600 mb-2">Resources</h3>
                      <div className="space-y-1">
                        {Object.entries({
                          domains: 'Domains',
                          services: 'Services',
                          entities: 'Entities',
                          language: 'Ubiquitous Language',
                        }).map(([key, label]) => {
                          const config = typeConfig[key as keyof typeof typeConfig];
                          const IconComponent = config?.icon;

                          return (
                            <button
                              key={key}
                              className={`w-full px-2 py-1 text-xs rounded-md transition-colors ${
                                currentFilter === key
                                  ? 'bg-purple-200 text-purple-900 font-semibold'
                                  : 'hover:bg-purple-100 text-gray-700 hover:text-purple-800'
                              }`}
                              onClick={() => handleFilterChange(key)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  {IconComponent && <IconComponent className="h-3 w-3" />}
                                  <span className="font-thin">{label}</span>
                                </div>
                                <span className="text-xs text-gray-700 font-thin">{counts[key as keyof typeof counts]}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Messages Section */}
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-gray-600 mb-2">Messages</h3>
                      <div className="space-y-1">
                        {Object.entries({
                          events: 'Events',
                          commands: 'Commands',
                          queries: 'Queries',
                          channels: 'Channels',
                        }).map(([key, label]) => {
                          const config = typeConfig[key as keyof typeof typeConfig];
                          const IconComponent = config?.icon;

                          return (
                            <button
                              key={key}
                              className={`w-full px-2 py-1 text-xs rounded-md transition-colors ${
                                currentFilter === key
                                  ? 'bg-purple-200 text-purple-900 font-semibold'
                                  : 'hover:bg-purple-100 text-gray-700 hover:text-purple-800'
                              }`}
                              onClick={() => handleFilterChange(key)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  {IconComponent && <IconComponent className="h-3 w-3" />}
                                  <span className="font-thin">{label}</span>
                                </div>
                                <span className="text-xs text-gray-700 font-thin">{counts[key as keyof typeof counts]}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Organization Section */}
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-gray-600 mb-2">Organization</h3>
                      <div className="space-y-1">
                        {Object.entries({
                          teams: 'Teams',
                          users: 'Users',
                        }).map(([key, label]) => {
                          const config = typeConfig[key as keyof typeof typeConfig];
                          const IconComponent = config?.icon;

                          return (
                            <button
                              key={key}
                              className={`w-full px-2 py-1 text-xs rounded-md transition-colors ${
                                currentFilter === key
                                  ? 'bg-purple-200 text-purple-900 font-semibold'
                                  : 'hover:bg-purple-100 text-gray-700 hover:text-purple-800'
                              }`}
                              onClick={() => handleFilterChange(key)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  {IconComponent && <IconComponent className="h-3 w-3" />}
                                  <span className="font-thin">{label}</span>
                                </div>
                                <span className="text-xs text-gray-700 font-thin">{counts[key as keyof typeof counts]}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Specifications Section */}
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-gray-600 mb-2">Specifications</h3>
                      <div className="space-y-1">
                        {Object.entries({
                          openapi: 'OpenAPI Specification',
                          asyncapi: 'AsyncAPI Specification',
                        }).map(([key, label]) => {
                          const config = typeConfig[key as keyof typeof typeConfig];
                          const IconComponent = config.icon;

                          return (
                            <button
                              key={key}
                              className={`w-full px-2 py-1 text-xs rounded-md transition-colors ${
                                currentFilter === key
                                  ? 'bg-purple-200 text-purple-900 font-semibold'
                                  : 'hover:bg-purple-100 text-gray-700 hover:text-purple-800'
                              }`}
                              onClick={() => handleFilterChange(key)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <IconComponent className="h-3 w-3" />
                                  <span className="font-thin">{label}</span>
                                </div>
                                <span className="text-xs text-gray-700 font-thin">{counts[key as keyof typeof counts]}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Results */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Show stats and exact match toggle - only when there are results or search term */}
                    {currentSearch.trim() && (filteredResults.length > 0 || isLoading) && (
                      <div className="p-4 pb-2 flex items-center justify-between border-b border-gray-100">
                        <div className="text-sm text-gray-500 font-thin">
                          <span>{filteredResults.length} results</span> for "{currentSearch}"
                          {isLoading && <span className="ml-2">Loading...</span>}
                        </div>

                        {/* Exact Match Checkbox */}
                        <div className="flex items-center">
                          <input
                            id="exact-match-results"
                            type="checkbox"
                            checked={exactMatch}
                            onChange={(e) => setExactMatch(e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <label htmlFor="exact-match-results" className="ml-2 text-sm text-gray-600">
                            Exact match in title
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Main content area */}
                    <div className="flex-1 overflow-y-auto">
                      {!currentSearch.trim() ? (
                        // Show when no search term is entered - centered
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <MagnifyingGlassIcon className="mx-auto h-8 w-8 text-gray-300" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Discover your EventCatalog</h3>
                            <p className="mt-2 text-sm text-gray-500 font-thin">
                              Start typing to search for domains, services, events, and more.
                            </p>
                          </div>
                        </div>
                      ) : filteredResults.length === 0 && !isLoading ? (
                        // Show when search term exists but no results and not loading - centered
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <MagnifyingGlassIcon className="mx-auto h-8 w-8 text-gray-300" />
                            <h3 className="mt-2 text-sm font-bold text-gray-900">No results found</h3>
                            <p className="mt-1 text-sm text-gray-500 font-thin">
                              No results found for "<span className="font-medium">{currentSearch}</span>".
                            </p>
                          </div>
                        </div>
                      ) : isLoading ? (
                        // Show loading state - centered
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                            <h3 className="mt-4 text-sm font-medium text-gray-900">Searching...</h3>
                            <p className="mt-2 text-sm text-gray-500 font-thin">
                              Finding results for "<span className="font-medium">{currentSearch}</span>"
                            </p>
                          </div>
                        </div>
                      ) : (
                        // Show results in a grid with padding
                        <div className="p-4">
                          <div className="search-results grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <SearchResults results={filteredResults} typeConfig={typeConfig} currentSearch={currentSearch} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
