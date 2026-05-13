import React, { Fragment, useState, useEffect, useMemo, useRef } from 'react';
import { Combobox, Dialog, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import {
  RectangleGroupIcon,
  ServerIcon,
  BoltIcon,
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon as QueryIcon,
  CubeIcon,
  QueueListIcon,
  UserGroupIcon,
  UserIcon,
  BookOpenIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowUturnLeftIcon,
  StarIcon,
  Square2StackIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, CircleStackIcon } from '@heroicons/react/24/solid';
import { useStore } from '@nanostores/react';
import { favoritesStore, toggleFavorite as toggleFavoriteAction } from '../../stores/favorites-store';
import { buildUrl } from '@utils/url-builder';
import { resolveIconUrl } from '@utils/icon';
import {
  applyActiveFilter,
  getSearchFilters,
  getUrlForSearchItem,
  highlightQuery,
  mapPagefindResultsToSearchItems,
  type SearchItem,
  type SearchNode,
} from './search-utils';

const INDEXED_RESULT_LOAD_LIMIT = 50;
const SEARCH_RESULT_DISPLAY_LIMIT = 25;

const typeIcons: any = {
  Domain: RectangleGroupIcon,
  Service: ServerIcon,
  Event: BoltIcon,
  Command: ChatBubbleLeftIcon,
  Query: QueryIcon,
  Entity: CubeIcon,
  Channel: ArrowsRightLeftIcon,
  Team: UserGroupIcon,
  User: UserIcon,
  Language: BookOpenIcon,
  OpenAPI: DocumentTextIcon,
  AsyncAPI: DocumentTextIcon,
  Design: Square2StackIcon,
  Container: CircleStackIcon,
  'Data Product': CubeIcon,
  Flow: QueueListIcon,
  'Custom Doc': DocumentTextIcon,
  'Resource Doc': DocumentTextIcon,
  Changelog: DocumentTextIcon,
  default: DocumentTextIcon,
};

const typeColors: any = {
  Domain: 'text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 ring-orange-200 dark:ring-orange-500/30',
  Service: 'text-pink-500 dark:text-pink-400 bg-pink-50 dark:bg-pink-500/10 ring-pink-200 dark:ring-pink-500/30',
  Event: 'text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 ring-orange-200 dark:ring-orange-500/30',
  Command: 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 ring-blue-200 dark:ring-blue-500/30',
  Query: 'text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-500/10 ring-green-200 dark:ring-green-500/30',
  Entity: 'text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 ring-purple-200 dark:ring-purple-500/30',
  Channel: 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 ring-indigo-200 dark:ring-indigo-500/30',
  Team: 'text-teal-500 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 ring-teal-200 dark:ring-teal-500/30',
  User: 'text-cyan-500 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 ring-cyan-200 dark:ring-cyan-500/30',
  Language: 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 ring-amber-200 dark:ring-amber-500/30',
  OpenAPI:
    'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-500/30',
  AsyncAPI: 'text-violet-500 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 ring-violet-200 dark:ring-violet-500/30',
  Design: 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-500/10 ring-gray-200 dark:ring-gray-500/30',
  Container: 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 ring-indigo-200 dark:ring-indigo-500/30',
  'Data Product': 'text-sky-500 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 ring-sky-200 dark:ring-sky-500/30',
  Flow: 'text-fuchsia-500 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-500/10 ring-fuchsia-200 dark:ring-fuchsia-500/30',
  'Custom Doc': 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-500/10 ring-gray-200 dark:ring-gray-500/30',
  'Resource Doc': 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-500/10 ring-gray-200 dark:ring-gray-500/30',
  Changelog: 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-500/10 ring-gray-200 dark:ring-gray-500/30',
  default: 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-500/10 ring-gray-200 dark:ring-gray-500/30',
};

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const searchResultHighlightClassName =
  '[&_mark]:bg-transparent [&_mark]:p-0 [&_mark]:font-semibold [&_mark]:text-[rgb(var(--ec-accent))]';

interface SearchNodeCompact {
  k: string;
  t: string;
  b?: string;
  s?: string;
  h?: string;
  i?: string;
  li?: string;
}

interface SearchIndexPayload {
  i?: SearchNodeCompact[];
  items?: SearchNode[];
}

interface PagefindModule {
  init: () => Promise<void>;
  options?: (options: Record<string, unknown>) => Promise<void>;
  debouncedSearch: (term: string) => Promise<{ results: Array<{ id: string; score?: number; data: () => Promise<any> }> } | null>;
}

const normalizeSearchIndexPayload = (payload: SearchIndexPayload): SearchNode[] => {
  if (payload.i) {
    return payload.i.map((item) => ({
      key: item.k,
      title: item.t,
      badge: item.b,
      summary: item.s,
      href: item.h,
      icon: item.i,
      leftIcon: item.li,
    }));
  }

  return payload.items || [];
};

const loadPagefindModule = (url: string) => {
  const nativeImport = new Function('url', 'return import(url)') as (url: string) => Promise<PagefindModule>;
  return nativeImport(url);
};

export default function SearchModal() {
  const searchType = typeof __EC_SEARCH_TYPE__ !== 'undefined' ? __EC_SEARCH_TYPE__ : 'resource';
  const isIndexedSearch = searchType === 'indexed';
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchNodes, setSearchNodes] = useState<SearchNode[]>([]);
  const [indexedItems, setIndexedItems] = useState<SearchItem[]>([]);
  const [pagefind, setPagefind] = useState<PagefindModule | null>(null);
  const [isSearchingIndexed, setIsSearchingIndexed] = useState(false);
  const [isLoadingSearchIndex, setIsLoadingSearchIndex] = useState(false);
  const [searchIndexLoadError, setSearchIndexLoadError] = useState<string | null>(null);
  const favorites = useStore(favoritesStore);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleModalToggle = (event: CustomEvent) => {
      setOpen(event.detail.isOpen);
      if (event.detail.isOpen) {
        // Focus input when modal opens
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }
    };

    window.addEventListener('searchModalToggle', handleModalToggle as EventListener);
    return () => window.removeEventListener('searchModalToggle', handleModalToggle as EventListener);
  }, []);

  useEffect(() => {
    if (isIndexedSearch || !open || searchNodes.length > 0 || isLoadingSearchIndex) {
      return;
    }

    setIsLoadingSearchIndex(true);
    setSearchIndexLoadError(null);

    const apiUrl = buildUrl('/api/search-index.json', true);

    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch search index: ${response.status}`);
        }
        return response.json() as Promise<SearchIndexPayload>;
      })
      .then((payload) => {
        setSearchNodes(normalizeSearchIndexPayload(payload));
      })
      .catch((error) => {
        setSearchIndexLoadError(error instanceof Error ? error.message : 'Unable to load search index');
      })
      .finally(() => {
        setIsLoadingSearchIndex(false);
      });
  }, [isIndexedSearch, open, searchNodes.length, isLoadingSearchIndex]);

  useEffect(() => {
    if (!isIndexedSearch || !open || pagefind || isLoadingSearchIndex) {
      return;
    }

    setIsLoadingSearchIndex(true);
    setSearchIndexLoadError(null);

    const pagefindUrl = buildUrl('/pagefind/pagefind.js', true);

    loadPagefindModule(pagefindUrl)
      .then(async (module: PagefindModule) => {
        await module.options?.({
          excerptLength: 30,
          ranking: {
            metaWeights: {
              title: 5.0,
              id: 4.0,
              summary: 2.0,
              type: 1.5,
            },
          },
        });
        await module.init();
        setPagefind(module);
      })
      .catch((error) => {
        console.error(error);
        setSearchIndexLoadError(
          import.meta.env.DEV
            ? 'The local indexed search files could not be loaded. Restart the catalog dev server to rebuild the index.'
            : 'Indexed search is enabled, but the generated search index could not be loaded. Run `eventcatalog build` to create it.'
        );
      })
      .finally(() => {
        setIsLoadingSearchIndex(false);
      });
  }, [isIndexedSearch, open, pagefind, isLoadingSearchIndex]);

  const closeModal = () => {
    if ((window as any).searchModalState) {
      (window as any).searchModalState.close();
    } else {
      setOpen(false);
    }
  };

  const items = useMemo(() => {
    return searchNodes
      .map((node) => {
        const url = getUrlForSearchItem(node as any, node.key);
        if (!url) return null;

        return {
          id: url,
          name: node.title,
          url,
          type: node.badge || 'Page',
          key: node.key,
          rawNode: node,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [searchNodes]);

  useEffect(() => {
    if (!isIndexedSearch || !pagefind || query.trim() === '') {
      setIndexedItems([]);
      setIsSearchingIndexed(false);
      return;
    }

    let cancelled = false;
    setIsSearchingIndexed(true);

    const timeout = window.setTimeout(async () => {
      try {
        const search = await pagefind.debouncedSearch(query);
        if (cancelled || !search?.results) {
          return;
        }

        const results = await mapPagefindResultsToSearchItems({
          results: search.results,
          query,
          limit: INDEXED_RESULT_LOAD_LIMIT,
        });

        if (!cancelled) {
          setIndexedItems(results);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchIndexLoadError(error instanceof Error ? error.message : 'Unable to search the indexed catalog');
        }
      } finally {
        if (!cancelled) {
          setIsSearchingIndexed(false);
        }
      }
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [isIndexedSearch, pagefind, query]);

  // Get searchable items (items that match the query but not filtered by type yet)
  const searchableItems = useMemo(() => {
    if (isIndexedSearch) {
      return indexedItems;
    }

    if (query === '') {
      // When no query, show all items for filter counts
      return items;
    }

    const lowerQuery = query.toLowerCase();
    return items.filter((item) => {
      if (item.name.toLowerCase().includes(lowerQuery)) return true;
      // Key format is "type:id:version" (e.g. "service:OrdersService:0.0.3").
      // Match against the id so users can find resources by their raw id too.
      const keyParts = item.key?.split(':') ?? [];
      const id = keyParts[1];
      if (id?.toLowerCase().includes(lowerQuery)) return true;
      return !!item.rawNode.summary && item.rawNode.summary.toLowerCase().includes(lowerQuery);
    });
  }, [indexedItems, isIndexedSearch, items, query]);

  const filters = useMemo(() => {
    return getSearchFilters({
      items: query === '' ? items : searchableItems,
      query,
    });
  }, [searchableItems, items, query]);

  const showFilterTabs = filters.some((filter) => filter.count > 0);

  // Reset active filter if it no longer has results
  useEffect(() => {
    if (activeFilter !== 'all' && !filters.some((f) => f.id === activeFilter)) {
      setActiveFilter('all');
    }
  }, [filters, activeFilter]);

  const handleToggleFavorite = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();

    if (!item.key) return;

    toggleFavoriteAction({
      nodeKey: item.key,
      path: [], // Path is not easily available here, but Sidebar rebuilds it
      title: item.name,
      badge: item.rawNode.badge,
      href: item.url,
    });
  };

  const searchNodeLookup = useMemo(() => {
    return new Map(searchNodes.map((node) => [node.key, node]));
  }, [searchNodes]);

  const filteredItems = useMemo(() => {
    if (isIndexedSearch) {
      if (query === '') {
        return [];
      }

      return applyActiveFilter(searchableItems, activeFilter).slice(0, SEARCH_RESULT_DISPLAY_LIMIT);
    }

    if (query === '') {
      // Show favorites when search is empty
      if (favorites.length > 0 && activeFilter === 'all') {
        return favorites
          .slice(0, 5)
          .map((fav) => {
            const node = searchNodeLookup.get(fav.nodeKey);
            const url = node ? getUrlForSearchItem(node as any, fav.nodeKey) : fav.href;
            if (!url) return null;

            return {
              id: url,
              name: fav.title,
              url,
              type: fav.badge || node?.badge || 'Page',
              key: fav.nodeKey,
              rawNode: node || {
                title: fav.title,
                badge: fav.badge,
                summary: undefined,
                icon: undefined,
                leftIcon: undefined,
                matchedExcerpt: undefined,
              },
              isFavorite: true,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);
      }
      return [];
    }

    return applyActiveFilter(searchableItems, activeFilter).slice(0, SEARCH_RESULT_DISPLAY_LIMIT);
  }, [isIndexedSearch, searchableItems, query, activeFilter, favorites, searchNodeLookup]);

  return (
    <Transition.Root
      show={open}
      as={Fragment}
      afterLeave={() => {
        setQuery('');
        setActiveFilter('all');
      }}
      appear
    >
      <Dialog as="div" className="relative z-50" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 transition-opacity backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-2xl transform divide-y divide-[rgb(var(--ec-page-border))] overflow-hidden rounded-xl bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] shadow-2xl ring-1 ring-black/10 dark:ring-white/10 transition-all">
              <Combobox
                onChange={(item: any) => {
                  if (item?.url) {
                    window.location.href = item.url;
                    closeModal();
                  }
                }}
              >
                <div className="relative border-b border-[rgb(var(--ec-page-border))]">
                  <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[rgb(var(--ec-icon-color))]"
                    aria-hidden="true"
                  />
                  <Combobox.Input
                    ref={inputRef}
                    className={classNames(
                      'h-12 w-full border-0 bg-transparent pl-11 text-[rgb(var(--ec-page-text))] placeholder:text-[rgb(var(--ec-icon-color))] focus:ring-0 sm:text-sm focus:outline-hidden',
                      query.trim() !== '' && filteredItems.length > 0 ? 'pr-20' : 'pr-4'
                    )}
                    placeholder="Search..."
                    onChange={(event) => setQuery(event.target.value)}
                    value={query}
                    autoFocus
                    autoComplete="off"
                  />
                  {query.trim() !== '' && filteredItems.length > 0 && (
                    <kbd className="pointer-events-none absolute right-4 top-2.5 rounded-lg bg-[rgb(var(--ec-content-hover))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--ec-page-text-muted))] ring-1 ring-inset ring-[rgb(var(--ec-page-border))]">
                      ESC
                    </kbd>
                  )}
                </div>

                {/* Filter Tabs */}
                {showFilterTabs && (
                  <div
                    className="flex items-center gap-2 px-4 pt-3 pb-3.5 overflow-x-auto overscroll-x-contain border-b border-[rgb(var(--ec-page-border))]"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgb(var(--ec-page-border)) transparent',
                    }}
                  >
                    {filters.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveFilter(tab.id)}
                        className={classNames(
                          'px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap',
                          activeFilter === tab.id
                            ? 'bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent-text))]'
                            : 'bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-active))]'
                        )}
                      >
                        {tab.name}
                      </button>
                    ))}
                  </div>
                )}

                {isLoadingSearchIndex && (
                  <div className="py-10 px-6 text-center text-sm sm:px-14">
                    <MagnifyingGlassIcon className="mx-auto h-6 w-6 text-[rgb(var(--ec-icon-color))] animate-pulse" />
                    <p className="mt-4 font-semibold text-[rgb(var(--ec-page-text))]">Loading search index…</p>
                    <p className="mt-2 text-[rgb(var(--ec-page-text-muted))]">
                      {isIndexedSearch ? 'Preparing indexed search.' : 'Preparing resources for search.'}
                    </p>
                  </div>
                )}

                {searchIndexLoadError && !isLoadingSearchIndex && (
                  <div className="px-6 py-12 text-center text-sm sm:px-14">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-icon-color))] ring-1 ring-inset ring-[rgb(var(--ec-page-border))]">
                      <ExclamationCircleIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="mt-4 font-semibold text-[rgb(var(--ec-page-text))]">
                      {isIndexedSearch ? 'Indexed search is not ready' : 'Search is not ready'}
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-[rgb(var(--ec-page-text-muted))]">{searchIndexLoadError}</p>
                  </div>
                )}

                {!isLoadingSearchIndex && !searchIndexLoadError && filteredItems.length > 0 && (
                  <>
                    {!isIndexedSearch && query === '' && favorites.length > 0 && (
                      <div className="px-6 pt-3 pb-2">
                        <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">Favourites</p>
                      </div>
                    )}
                    <Combobox.Options static className="max-h-96 scroll-py-3 overflow-y-auto p-3">
                      {filteredItems.map((item) => {
                        const Icon = typeIcons[item.type] || typeIcons.default;
                        const colors = typeColors[item.type] || typeColors.default;

                        const isFavorite = !!item.key && favorites.some((fav) => fav.nodeKey === item.key);

                        return (
                          <Combobox.Option
                            key={item.id}
                            value={item}
                            className={({ active }) =>
                              classNames(
                                'flex cursor-default select-none rounded-xl p-3 group',
                                active && 'bg-[rgb(var(--ec-content-active))]'
                              )
                            }
                          >
                            {({ active }) => (
                              <>
                                <div
                                  className={classNames(
                                    'flex h-10 w-10 flex-none items-center justify-center rounded-lg ring-1 ring-inset',
                                    colors
                                  )}
                                >
                                  {item.rawNode?.leftIcon ? (
                                    <img
                                      src={resolveIconUrl(item.rawNode.leftIcon)}
                                      alt=""
                                      loading="lazy"
                                      className="h-6 w-6 object-contain"
                                    />
                                  ) : (
                                    <Icon className="h-6 w-6" aria-hidden="true" />
                                  )}
                                </div>
                                <div className="ml-4 flex-auto min-w-0">
                                  <p
                                    className={classNames(
                                      'text-sm font-medium',
                                      searchResultHighlightClassName,
                                      active ? 'text-[rgb(var(--ec-page-text))]' : 'text-[rgb(var(--ec-page-text))]'
                                    )}
                                    dangerouslySetInnerHTML={{ __html: highlightQuery(item.name, query) }}
                                  />
                                  <div className="flex items-center gap-2">
                                    {!item.rawNode.matchedExcerpt && (
                                      <p
                                        className={classNames(
                                          'text-xs flex-shrink-0',
                                          active ? 'text-[rgb(var(--ec-page-text))]' : 'text-[rgb(var(--ec-page-text-muted))]'
                                        )}
                                      >
                                        {item.type}
                                      </p>
                                    )}
                                    {item.rawNode.summary && (
                                      <p
                                        className={classNames(
                                          'text-xs truncate',
                                          active ? 'text-[rgb(var(--ec-page-text-muted))]' : 'text-[rgb(var(--ec-icon-color))]'
                                        )}
                                      >
                                        {!item.rawNode.matchedExcerpt && '• '}
                                        {item.rawNode.matchedExcerpt ? (
                                          <span
                                            className={searchResultHighlightClassName}
                                            dangerouslySetInnerHTML={{ __html: item.rawNode.matchedExcerpt }}
                                          />
                                        ) : (
                                          item.rawNode.summary
                                        )}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  {!!item.key && (
                                    <button
                                      onClick={(e) => handleToggleFavorite(e, item)}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                      className={classNames(
                                        'p-1 rounded-md transition-colors mr-2',
                                        isFavorite
                                          ? 'text-amber-400 hover:text-amber-500'
                                          : 'text-[rgb(var(--ec-icon-color))] opacity-0 group-hover:opacity-100 hover:text-amber-400'
                                      )}
                                    >
                                      {isFavorite ? <StarIconSolid className="h-5 w-5" /> : <StarIcon className="h-5 w-5" />}
                                    </button>
                                  )}
                                  {active && (
                                    <ArrowRightIcon className="h-5 w-5 text-[rgb(var(--ec-icon-color))]" aria-hidden="true" />
                                  )}
                                </div>
                              </>
                            )}
                          </Combobox.Option>
                        );
                      })}
                    </Combobox.Options>
                  </>
                )}

                {!isLoadingSearchIndex && !searchIndexLoadError && query !== '' && filteredItems.length === 0 && (
                  <div className="py-14 px-6 text-center text-sm sm:px-14">
                    {isSearchingIndexed ? (
                      <MagnifyingGlassIcon className="mx-auto h-6 w-6 text-[rgb(var(--ec-icon-color))] animate-pulse" />
                    ) : (
                      <ExclamationCircleIcon
                        type="outline"
                        name="exclamation-circle"
                        className="mx-auto h-6 w-6 text-[rgb(var(--ec-icon-color))]"
                      />
                    )}
                    <p className="mt-4 font-semibold text-[rgb(var(--ec-page-text))]">
                      {isSearchingIndexed ? 'Searching…' : 'No results found'}
                    </p>
                    <p className="mt-2 text-[rgb(var(--ec-page-text-muted))]">
                      {isSearchingIndexed
                        ? 'Searching the indexed catalog.'
                        : 'No components found for this search term. Please try again.'}
                    </p>
                  </div>
                )}

                {!isLoadingSearchIndex && !searchIndexLoadError && query === '' && filteredItems.length === 0 && (
                  <div className="py-14 px-6 text-center text-sm sm:px-14">
                    <MagnifyingGlassIcon className="mx-auto h-6 w-6 text-[rgb(var(--ec-icon-color))]" />
                    <p className="mt-4 font-semibold text-[rgb(var(--ec-page-text))]">Search for anything</p>
                    <p className="mt-2 text-[rgb(var(--ec-page-text-muted))]">
                      {isIndexedSearch
                        ? 'Search indexed catalog content, custom docs, resources and more.'
                        : 'Search for domains, services, events, commands, queries, data stores, data products, flows and more.'}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex flex-wrap items-center bg-[rgb(var(--ec-content-hover))] py-2.5 px-4 text-xs text-[rgb(var(--ec-page-text-muted))] border-t border-[rgb(var(--ec-page-border))]">
                  <div className="flex items-center mr-4">
                    <ArrowUturnLeftIcon className="h-3 w-3 mr-1" />
                    to select
                  </div>
                  <div className="flex items-center mr-4">
                    <ArrowDownIcon className="h-3 w-3 mr-1" />
                    <ArrowUpIcon className="h-3 w-3 mr-1" />
                    to navigate
                  </div>
                  <div className="flex items-center">
                    <span className="mr-1">esc</span>
                    to close
                  </div>
                </div>
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
