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
import { sidebarStore } from '../../stores/sidebar-store';
import { favoritesStore, toggleFavorite as toggleFavoriteAction } from '../../stores/favorites-store';

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
  default: DocumentTextIcon,
};

const typeColors: any = {
  Domain: 'text-orange-500 bg-orange-50 ring-orange-200',
  Service: 'text-pink-500 bg-pink-50 ring-pink-200',
  Event: 'text-orange-500 bg-orange-50 ring-orange-200',
  Command: 'text-blue-500 bg-blue-50 ring-blue-200',
  Query: 'text-green-500 bg-green-50 ring-green-200',
  Entity: 'text-purple-500 bg-purple-50 ring-purple-200',
  Channel: 'text-indigo-500 bg-indigo-50 ring-indigo-200',
  Team: 'text-teal-500 bg-teal-50 ring-teal-200',
  User: 'text-cyan-500 bg-cyan-50 ring-cyan-200',
  Language: 'text-amber-500 bg-amber-50 ring-amber-200',
  OpenAPI: 'text-emerald-500 bg-emerald-50 ring-emerald-200',
  AsyncAPI: 'text-violet-500 bg-violet-50 ring-violet-200',
  Design: 'text-gray-500 bg-gray-50 ring-gray-200',
  Container: 'text-indigo-500 bg-indigo-50 ring-indigo-200',
  default: 'text-gray-500 bg-gray-50 ring-gray-200',
};

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// Helper to construct URL from key if href is missing
const getUrlForItem = (node: any, key: string) => {
  const parts = key.split(':');
  if (parts.length < 2) return null; // Need at least type:id

  const type = parts[0];
  const id = parts[1];
  const version = parts[2]; // May be undefined

  // Skip list items and other special keys
  if (type === 'list') return null;

  // Only show items that have a version to avoid duplicates
  if (!version) return null;

  // If node has href, use it, otherwise construct from key
  if (node.href) return node.href;

  // Pluralize type for URL if needed
  let pluralType = type;
  if (['event', 'command', 'domain', 'service', 'flow', 'container', 'channel'].includes(type)) {
    pluralType = type + 's';
  } else if (type === 'query') {
    pluralType = 'queries';
  }

  return `/docs/${pluralType}/${id}/${version}`;
};

export default function SearchModal() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const data = useStore(sidebarStore);
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

  const closeModal = () => {
    if ((window as any).searchModalState) {
      (window as any).searchModalState.close();
    } else {
      setOpen(false);
    }
  };

  const items = useMemo(() => {
    if (!data?.nodes) return [];

    // Extract all items from nodes
    const allItems = Object.entries(data.nodes)
      .map(([key, node]) => {
        const url = getUrlForItem(node, key);
        if (!url) return null;

        return {
          id: url, // Use URL as unique ID
          name: node.title,
          url: url,
          type: node.badge || 'Page',
          key: key,
          rawNode: node,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return allItems;
  }, [data]);

  // Get searchable items (items that match the query but not filtered by type yet)
  const searchableItems = useMemo(() => {
    if (query === '') {
      // When no query, show all items for filter counts
      return items;
    }

    const lowerQuery = query.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(lowerQuery));
  }, [items, query]);

  const filters = useMemo(() => {
    // Calculate counts based on current search results (searchableItems)
    if (!searchableItems.length && query !== '') {
      // If searching and no results, still show filters but with 0 counts
      return [{ id: 'all', name: 'All (0)' }];
    }

    const itemsToCount = query === '' ? items : searchableItems;

    const counts: Record<string, number> = {
      all: itemsToCount.length,
      Domain: 0,
      Service: 0,
      Message: 0,
      Team: 0,
      Container: 0,
      Design: 0,
      Channel: 0,
    };

    itemsToCount.forEach((item) => {
      // Count specific types
      if (counts[item.type] !== undefined) {
        counts[item.type]++;
      }

      // Group counts
      if (['Event', 'Command', 'Query'].includes(item.type)) {
        counts.Message++;
      }
      if (['Team', 'User'].includes(item.type)) {
        counts.Team++;
      }
    });

    const dynamicFilters = [{ id: 'all', name: `All (${counts.all})` }];

    // Only show filters that have results when searching
    if (counts.Domain > 0) dynamicFilters.push({ id: 'Domain', name: `Domains (${counts.Domain})` });
    if (counts.Service > 0) dynamicFilters.push({ id: 'Service', name: `Services (${counts.Service})` });
    if (counts.Message > 0) dynamicFilters.push({ id: 'Message', name: `Messages (${counts.Message})` });
    if (counts.Container > 0) dynamicFilters.push({ id: 'Container', name: `Containers (${counts.Container})` });
    if (counts.Channel > 0) dynamicFilters.push({ id: 'Channel', name: `Channels (${counts.Channel})` });
    if (counts.Design > 0) dynamicFilters.push({ id: 'Design', name: `Designs (${counts.Design})` });
    if (counts.Team > 0) dynamicFilters.push({ id: 'Team', name: `Teams & Users (${counts.Team})` });

    return dynamicFilters;
  }, [searchableItems, items, query]);

  // Reset active filter if it no longer has results
  useEffect(() => {
    if (activeFilter !== 'all' && !filters.some((f) => f.id === activeFilter)) {
      setActiveFilter('all');
    }
  }, [filters, activeFilter]);

  const handleToggleFavorite = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();

    toggleFavoriteAction({
      nodeKey: item.key,
      path: [], // Path is not easily available here, but Sidebar rebuilds it
      title: item.name,
      badge: item.rawNode.badge,
      href: item.url,
    });
  };

  const filteredItems = useMemo(() => {
    if (query === '') {
      // Show favorites when search is empty
      if (favorites.length > 0 && activeFilter === 'all') {
        return favorites
          .slice(0, 5)
          .map((fav) => {
            const node = data?.nodes[fav.nodeKey];
            if (!node) return null;
            const url = getUrlForItem(node, fav.nodeKey);
            if (!url) return null;

            return {
              id: url,
              name: fav.title,
              url: url,
              type: fav.badge || 'Page',
              key: fav.nodeKey,
              rawNode: node,
              isFavorite: true,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);
      }
      return [];
    }

    // Start with searchable items (already filtered by query)
    let result = searchableItems;

    // Apply type filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'Message') {
        result = result.filter((item) => ['Event', 'Command', 'Query'].includes(item.type));
      } else if (activeFilter === 'Team') {
        result = result.filter((item) => ['Team', 'User'].includes(item.type));
      } else {
        result = result.filter((item) => item.type === activeFilter);
      }
    }

    return result.slice(0, 50); // Limit results for performance
  }, [searchableItems, query, activeFilter, favorites, data]);

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
          <div className="fixed inset-0 bg-gray-500 bg-opacity-25 transition-opacity backdrop-blur-sm" />
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
            <Dialog.Panel className="mx-auto max-w-2xl transform divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">
              <Combobox
                onChange={(item: any) => {
                  if (item?.url) {
                    window.location.href = item.url;
                    closeModal();
                  }
                }}
              >
                <div className="relative border-b border-gray-100">
                  <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <Combobox.Input
                    ref={inputRef}
                    className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm focus:outline-none"
                    placeholder="Search..."
                    onChange={(event) => setQuery(event.target.value)}
                    value={query}
                    autoFocus
                    autoComplete="off"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar border-b border-gray-100">
                  {filters.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={classNames(
                        'px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap',
                        activeFilter === tab.id ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>

                {filteredItems.length > 0 && (
                  <>
                    {query === '' && favorites.length > 0 && (
                      <div className="px-6 pt-3 pb-2">
                        <p className="text-xs text-gray-500">Favourites</p>
                      </div>
                    )}
                    <Combobox.Options static className="max-h-96 scroll-py-3 overflow-y-auto p-3">
                      {filteredItems.map((item) => {
                        const Icon = typeIcons[item.type] || typeIcons.default;
                        const colors = typeColors[item.type] || typeColors.default;

                        const isFavorite = favorites.some((fav) => fav.nodeKey === item.key);

                        return (
                          <Combobox.Option
                            key={item.id}
                            value={item}
                            className={({ active }) =>
                              classNames('flex cursor-default select-none rounded-xl p-3 group', active && 'bg-gray-100')
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
                                  <Icon className="h-6 w-6" aria-hidden="true" />
                                </div>
                                <div className="ml-4 flex-auto min-w-0">
                                  <p className={classNames('text-sm font-medium', active ? 'text-gray-900' : 'text-gray-700')}>
                                    {item.name}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <p
                                      className={classNames('text-sm flex-shrink-0', active ? 'text-gray-700' : 'text-gray-500')}
                                    >
                                      {item.type}
                                    </p>
                                    {item.rawNode.summary && (
                                      <p className={classNames('text-sm truncate', active ? 'text-gray-600' : 'text-gray-400')}>
                                        • {item.rawNode.summary}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center">
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
                                        : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-400'
                                    )}
                                  >
                                    {isFavorite ? <StarIconSolid className="h-5 w-5" /> : <StarIcon className="h-5 w-5" />}
                                  </button>
                                  {active && <ArrowRightIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />}
                                </div>
                              </>
                            )}
                          </Combobox.Option>
                        );
                      })}
                    </Combobox.Options>
                  </>
                )}

                {query !== '' && filteredItems.length === 0 && (
                  <div className="py-14 px-6 text-center text-sm sm:px-14">
                    <ExclamationCircleIcon type="outline" name="exclamation-circle" className="mx-auto h-6 w-6 text-gray-400" />
                    <p className="mt-4 font-semibold text-gray-900">No results found</p>
                    <p className="mt-2 text-gray-500">No components found for this search term. Please try again.</p>
                  </div>
                )}

                {query === '' && filteredItems.length === 0 && (
                  <div className="py-14 px-6 text-center text-sm sm:px-14">
                    <MagnifyingGlassIcon className="mx-auto h-6 w-6 text-gray-400" />
                    <p className="mt-4 font-semibold text-gray-900">Search for anything</p>
                    <p className="mt-2 text-gray-500">Search for domains, services, events, commands, queries and more.</p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex flex-wrap items-center bg-gray-50 py-2.5 px-4 text-xs text-gray-500 border-t border-gray-100">
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
