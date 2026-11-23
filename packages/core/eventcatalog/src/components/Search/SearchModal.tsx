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
import { Bot, ClipboardList, Group } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { favoritesStore, toggleFavorite as toggleFavoriteAction } from '../../stores/favorites-store';
import { sidebarStore } from '../../stores/sidebar-store';
import SearchResultPreview from './SearchResultPreview';
import { buildUrl } from '@utils/url-builder';
import { resolveIconUrl } from '@utils/icon';
import {
  applyActiveFilter,
  getSearchFilters,
  getUrlForSearchItem,
  highlightQuery,
  mapPagefindResultsToSearchItems,
  rankResourceSearchItems,
  type SearchItem,
  type SearchNode,
} from './search-utils';

const INDEXED_RESULT_LOAD_LIMIT = 50;
const SEARCH_RESULT_DISPLAY_LIMIT = 25;

const typeIcons: any = {
  Agent: Bot,
  Domain: RectangleGroupIcon,
  System: Group,
  'Decision record': ClipboardList,
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

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// The keys in the footer, as small keycaps
const footerKeyClassName =
  'inline-flex h-5 min-w-5 items-center justify-center rounded border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-text)/0.04)] px-1 font-mono text-[10px] text-[rgb(var(--ec-page-text-muted))]';

// Monochrome: what matched in the text colour and bold, not in the theme's accent
const searchResultHighlightClassName =
  '[&_mark]:bg-transparent [&_mark]:p-0 [&_mark]:font-semibold [&_mark]:text-[rgb(var(--ec-page-text))]';

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
  /** The keys of the resources changed most recently, newest first (only with lastUpdated on) */
  r?: string[];
}

/** How many rows fit the results area beside the preview: favourites, then recent changes fill up to this */
const EMPTY_QUERY_LIST_ROWS = 9;

/** How many resources an empty search lists when there's nothing recent to show */
const EMPTY_QUERY_BROWSE_LIMIT = 20;

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

/**
 * A result's icon on a neutral chip. One with an icon of its own (a technology's logo) is the image in greys, as on the
 * docs pages (ec-mono-icon): black logos land on the same grey as the other icons, and logos keep their detail (a mask
 * would flatten ones drawn with white detail, like OpenAPI's, and needs CORS for icons on other servers)
 */
const ResultIcon = ({
  item,
  size = 'sm',
}: {
  item: { type: string; rawNode?: { leftIcon?: string } };
  /** Small in the list, so more results fit */
  size?: 'sm' | 'lg';
}) => {
  const Icon = typeIcons[item.type] || typeIcons.default;
  const box = size === 'lg' ? 'h-10 w-10 rounded-lg' : 'h-7 w-7 rounded-md';
  const glyph = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
  return (
    <div
      className={classNames(
        'flex flex-none items-center justify-center bg-[rgb(var(--ec-page-text)/0.03)] text-[rgb(var(--ec-page-text-muted))] ring-1 ring-inset ring-[rgb(var(--ec-page-border))]',
        box
      )}
    >
      {item.rawNode?.leftIcon ? (
        <img
          src={resolveIconUrl(item.rawNode.leftIcon)}
          alt=""
          loading="lazy"
          className={classNames(glyph, 'object-contain ec-mono-icon')}
        />
      ) : (
        <Icon className={glyph} aria-hidden="true" />
      )}
    </div>
  );
};

export default function SearchModal() {
  const searchType = typeof __EC_SEARCH_TYPE__ !== 'undefined' ? __EC_SEARCH_TYPE__ : 'resource';
  const isIndexedSearch = searchType === 'indexed';
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchNodes, setSearchNodes] = useState<SearchNode[]>([]);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const [indexedItems, setIndexedItems] = useState<SearchItem[]>([]);
  const [pagefind, setPagefind] = useState<PagefindModule | null>(null);
  const [isSearchingIndexed, setIsSearchingIndexed] = useState(false);
  const [isLoadingSearchIndex, setIsLoadingSearchIndex] = useState(false);
  const [searchIndexLoadError, setSearchIndexLoadError] = useState<string | null>(null);
  const favorites = useStore(favoritesStore);
  // The sidebar data (loaded on every page) holds how resources connect, which the result preview shows
  const sidebar = useStore(sidebarStore);
  const previewedRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleModalToggle = (event: CustomEvent) => {
      setOpen(event.detail.isOpen);
      if (event.detail.isOpen && typeof event.detail.query === 'string') setQuery(event.detail.query);
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
        setRecentKeys(payload.r ?? []);
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

    return rankResourceSearchItems(items, query);
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

  // Before anything's typed: favourites, else what changed recently, else the first resources (of the type picked)
  const recentItems = useMemo(() => {
    const byKey = new Map(items.map((item) => [item.key, item]));
    return recentKeys.map((key) => byKey.get(key)).filter((item): item is NonNullable<typeof item> => !!item);
  }, [items, recentKeys]);
  const emptyQueryList =
    query !== '' || isIndexedSearch
      ? undefined
      : activeFilter !== 'all'
        ? 'type'
        : favorites.length > 0
          ? 'favourites'
          : recentItems.length > 0
            ? 'recent'
            : 'browse';
  // Favourites carry their section headings in the list (Favourites, then Recently updated); the others one label above it
  const emptyQueryLabel = emptyQueryList
    ? { type: undefined, favourites: undefined, recent: 'Recently updated', browse: 'Browse the catalog' }[emptyQueryList]
    : undefined;
  const favouriteKeys = useMemo(() => new Set(favorites.map((fav) => fav.nodeKey)), [favorites]);

  const filteredItems = useMemo(() => {
    if (isIndexedSearch) {
      if (query === '') {
        return [];
      }

      return applyActiveFilter(searchableItems, activeFilter).slice(0, SEARCH_RESULT_DISPLAY_LIMIT);
    }

    if (query === '') {
      if (emptyQueryList === 'favourites') {
        const favouriteItems = favorites
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
        // Then what changed recently, in the room left (leaving out the favourites already listed)
        const recent = recentItems
          .filter((item) => !favouriteKeys.has(item.key))
          .slice(0, Math.max(0, EMPTY_QUERY_LIST_ROWS - favouriteItems.length));
        return [...favouriteItems, ...recent];
      }
      if (emptyQueryList === 'recent') return recentItems;
      return applyActiveFilter(items, activeFilter).slice(0, EMPTY_QUERY_BROWSE_LIMIT);
    }

    return applyActiveFilter(searchableItems, activeFilter).slice(0, SEARCH_RESULT_DISPLAY_LIMIT);
  }, [
    isIndexedSearch,
    searchableItems,
    query,
    activeFilter,
    favorites,
    favouriteKeys,
    searchNodeLookup,
    emptyQueryList,
    recentItems,
    items,
  ]);

  // The heading a row starts a section with, in the favourites list: "Favourites", then "Recently updated"
  const sectionOf = (item: (typeof filteredItems)[number]) =>
    emptyQueryList === 'favourites' ? (item.key && favouriteKeys.has(item.key) ? 'Favourites' : 'Recently updated') : undefined;

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
            <Dialog.Panel className="mx-auto max-w-2xl md:max-w-4xl transform divide-y divide-[rgb(var(--ec-page-border))] overflow-hidden rounded-xl bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] shadow-2xl ring-1 ring-black/10 dark:ring-white/10 transition-all">
              <Combobox
                onChange={(item: any) => {
                  if (item?.url) {
                    window.location.href = item.url;
                    closeModal();
                  }
                }}
              >
                {({ activeOption }: { activeOption: (typeof filteredItems)[number] | null }) => {
                  // The result previewed (and shown highlighted): the one highlighted, else the last one that was (while the
                  // pointer crosses to the preview to click it), else the first
                  if (activeOption) previewedRef.current = activeOption;
                  const last = previewedRef.current;
                  const previewed = activeOption ?? (last && filteredItems.includes(last) ? last : (filteredItems[0] ?? null));
                  return (
                    <>
                      <div className="relative border-b border-[rgb(var(--ec-page-border))]">
                        <MagnifyingGlassIcon
                          className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[rgb(var(--ec-icon-color))]"
                          aria-hidden="true"
                        />
                        <Combobox.Input
                          ref={inputRef}
                          className={classNames(
                            'h-12 w-full border-0 bg-transparent pl-11 text-[rgb(var(--ec-page-text))] placeholder:text-[rgb(var(--ec-page-text-muted)/0.55)] focus:ring-0 sm:text-sm focus:outline-hidden',
                            query.trim() !== '' && filteredItems.length > 0 ? 'pr-20' : 'pr-4'
                          )}
                          placeholder="Search..."
                          onChange={(event) => setQuery(event.target.value)}
                          // Enter opens the result previewed, highlighted before any arrow key is pressed
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !activeOption && previewed?.url) {
                              event.preventDefault();
                              window.location.href = previewed.url;
                              closeModal();
                            }
                          }}
                          value={query}
                          autoFocus
                          autoComplete="off"
                        />
                        {query.trim() !== '' && filteredItems.length > 0 && (
                          <kbd className="pointer-events-none absolute right-4 top-3 rounded border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-text)/0.04)] px-1.5 py-0.5 font-mono text-[11px] text-[rgb(var(--ec-page-text-muted))]">
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
                                'h-7 px-3 text-xs font-medium rounded-full border transition-colors whitespace-nowrap',
                                activeFilter === tab.id
                                  ? 'border-transparent bg-[rgb(var(--ec-page-text))] text-[rgb(var(--ec-page-bg))]'
                                  : 'border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-page-text)/0.05)] hover:text-[rgb(var(--ec-page-text))]'
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
                          {emptyQueryLabel && (
                            <div className="px-6 pt-3 pb-2">
                              <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">{emptyQueryLabel}</p>
                            </div>
                          )}
                          {/* A fixed height beside the preview, so the modal doesn't grow and shrink as results are highlighted */}
                          <div className="flex md:h-96">
                            <Combobox.Options
                              static
                              // The dialog keeps focus in the modal; as a modal itself the list makes the preview beside it inert (no scrolling or clicking)
                              modal={false}
                              className="max-h-96 min-w-0 flex-1 scroll-py-2 overflow-y-auto p-2 md:max-h-none"
                            >
                              {filteredItems.map((item, index) => {
                                const isFavorite = !!item.key && favorites.some((fav) => fav.nodeKey === item.key);
                                const section = sectionOf(item);
                                const startsSection =
                                  !!section && (index === 0 || sectionOf(filteredItems[index - 1]) !== section);

                                return (
                                  <Fragment key={item.key ?? item.id}>
                                    {startsSection && (
                                      <p
                                        role="presentation"
                                        className={classNames(
                                          'px-2.5 pb-1.5 text-xs text-[rgb(var(--ec-page-text-muted))]',
                                          index === 0 ? 'pt-1' : 'pt-4'
                                        )}
                                      >
                                        {section}
                                      </p>
                                    )}
                                    <Combobox.Option
                                      value={item}
                                      className={({ active }) =>
                                        classNames(
                                          'flex cursor-default select-none items-center rounded-lg px-2.5 py-2 group',
                                          (active || item === previewed) && 'bg-[rgb(var(--ec-page-text)/0.06)]'
                                        )
                                      }
                                    >
                                      {({ active }) => (
                                        <>
                                          <ResultIcon item={item} />
                                          <div className="ml-3 flex-auto min-w-0">
                                            <div className="flex items-baseline gap-3">
                                              <p
                                                className={classNames(
                                                  'min-w-0 flex-1 truncate text-[13px] font-medium leading-5 text-[rgb(var(--ec-page-text))]',
                                                  searchResultHighlightClassName
                                                )}
                                                dangerouslySetInnerHTML={{ __html: highlightQuery(item.name, query) }}
                                              />
                                              {/* Wide screens: the type on the right, one line a result (the preview has the summary) */}
                                              {!item.rawNode.matchedExcerpt && (
                                                <span className="hidden shrink-0 text-xs text-[rgb(var(--ec-page-text-muted))] md:block">
                                                  {item.type}
                                                </span>
                                              )}
                                            </div>
                                            <div
                                              className={classNames(
                                                'flex items-center gap-2 leading-4',
                                                !item.rawNode.matchedExcerpt && 'md:hidden'
                                              )}
                                            >
                                              {!item.rawNode.matchedExcerpt && (
                                                <p
                                                  className={classNames(
                                                    'text-xs flex-shrink-0',
                                                    active
                                                      ? 'text-[rgb(var(--ec-page-text))]'
                                                      : 'text-[rgb(var(--ec-page-text-muted))]'
                                                  )}
                                                >
                                                  {item.type}
                                                </p>
                                              )}
                                              {item.rawNode.summary && (
                                                <p
                                                  className={classNames(
                                                    'text-xs truncate',
                                                    active
                                                      ? 'text-[rgb(var(--ec-page-text-muted))]'
                                                      : 'text-[rgb(var(--ec-icon-color))]'
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
                                                {isFavorite ? (
                                                  <StarIconSolid className="h-5 w-5" />
                                                ) : (
                                                  <StarIcon className="h-5 w-5" />
                                                )}
                                              </button>
                                            )}
                                            {active && (
                                              <ArrowRightIcon
                                                className="h-5 w-5 text-[rgb(var(--ec-icon-color))]"
                                                aria-hidden="true"
                                              />
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </Combobox.Option>
                                  </Fragment>
                                );
                              })}
                            </Combobox.Options>
                            {previewed && (
                              <SearchResultPreview result={previewed} nodes={sidebar?.nodes} onNavigate={closeModal} />
                            )}
                          </div>
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
                      <div className="flex flex-wrap items-center gap-4 py-2.5 px-4 text-xs text-[rgb(var(--ec-page-text-muted))] border-t border-[rgb(var(--ec-page-border))]">
                        <div className="flex items-center gap-1.5">
                          <kbd className={footerKeyClassName}>
                            <ArrowUturnLeftIcon className="h-3 w-3" />
                          </kbd>
                          to select
                        </div>
                        <div className="flex items-center gap-1.5">
                          <kbd className={footerKeyClassName}>
                            <ArrowDownIcon className="h-3 w-3" />
                          </kbd>
                          <kbd className={footerKeyClassName}>
                            <ArrowUpIcon className="h-3 w-3" />
                          </kbd>
                          to navigate
                        </div>
                        <div className="flex items-center gap-1.5">
                          <kbd className={footerKeyClassName}>esc</kbd>
                          to close
                        </div>
                      </div>
                    </>
                  );
                }}
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
