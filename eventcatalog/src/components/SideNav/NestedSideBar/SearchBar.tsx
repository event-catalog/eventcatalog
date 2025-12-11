'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronRight,
  Boxes,
  Server,
  Zap,
  MessageSquare,
  Search as SearchIcon,
  Database,
  Waypoints,
  SquareMousePointer,
  ListOrdered,
  ArrowLeftRight,
} from 'lucide-react';
import type { NavNode } from './sidebar-builder';

const cn = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

const getBadgeClasses = (badge: string): string => {
  const badgeColors: Record<string, string> = {
    domain: 'bg-blue-100 text-blue-700',
    service: 'bg-green-100 text-green-700',
    event: 'bg-amber-100 text-amber-700',
    command: 'bg-pink-100 text-pink-700',
    query: 'bg-purple-100 text-purple-700',
    message: 'bg-indigo-100 text-indigo-700',
    design: 'bg-teal-100 text-teal-700',
    channel: 'bg-indigo-100 text-indigo-700',
  };
  return badgeColors[badge.toLowerCase()] || 'bg-gray-100 text-gray-600';
};

type SearchResult = {
  nodeKey: string;
  node: NavNode;
  matchType: 'name' | 'id';
};

type Props = {
  nodes: Record<string, NavNode>;
  onSelectResult: (nodeKey: string, node: NavNode) => void;
  onSearchChange?: (isSearching: boolean) => void;
};

export default function SearchBar({ nodes, onSelectResult, onSearchChange }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<Set<string>>(new Set());
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Pre-process searchable nodes to avoid iterating object on every render
  const searchableNodes = useMemo(() => {
    return Object.entries(nodes).filter(([_, node]) => node.type !== 'group');
  }, [nodes]);

  // Get available badges from nodes
  const availableBadges = useMemo(() => {
    const badges = new Set<string>();

    for (const [_, node] of searchableNodes) {
      if (node.badge) {
        badges.add(node.badge);
      }
    }
    return badges;
  }, [searchableNodes]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchChange?.(value.trim().length > 0);
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearchChange?.(false);
  };

  const filterTypes = [
    { key: 'channel', label: 'Channels', badge: 'Channel', icon: ArrowLeftRight },
    { key: 'command', label: 'Commands', badge: 'Command', icon: MessageSquare },
    { key: 'container', label: 'Data Stores', badge: 'Container', icon: Database },
    { key: 'design', label: 'Designs', badge: 'Design', icon: SquareMousePointer },
    { key: 'domain', label: 'Domains', badge: 'Domain', icon: Boxes },
    { key: 'event', label: 'Events', badge: 'Event', icon: Zap },
    { key: 'flow', label: 'Flows', badge: 'Flow', icon: Waypoints },
    { key: 'query', label: 'Queries', badge: 'Query', icon: SearchIcon },
    { key: 'service', label: 'Services', badge: 'Service', icon: Server },
  ].filter((filter) => availableBadges.has(filter.badge));

  const toggleSearchFilter = (filterKey: string) => {
    setSearchFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filterKey)) {
        next.delete(filterKey);
      } else {
        next.add(filterKey);
      }
      return next;
    });
  };

  const searchResults = useCallback((): SearchResult[] => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    const badgeToFilterKey: Record<string, string> = {
      Domain: 'domain',
      Service: 'service',
      Event: 'event',
      Command: 'command',
      Query: 'query',
      Container: 'container',
      Flow: 'flow',
      Design: 'design',
    };

    // Use the memoized array instead of Object.entries(nodes)
    for (const [key, node] of searchableNodes) {
      if (searchFilters.size > 0) {
        const filterKey = node.badge ? badgeToFilterKey[node.badge] : null;
        if (!filterKey || !searchFilters.has(filterKey)) continue;
      }

      if (node.title.toLowerCase().includes(query)) {
        results.push({ nodeKey: key, node, matchType: 'name' });
        continue;
      }

      const keyParts = key.split(':');
      if (keyParts.length >= 3) {
        const id = keyParts[2].toLowerCase();
        if (id.includes(query)) {
          results.push({ nodeKey: key, node, matchType: 'id' });
        }
      }
    }

    return results
      .sort((a, b) => {
        const aExact = a.node.title.toLowerCase() === query;
        const bExact = b.node.title.toLowerCase() === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.node.title.localeCompare(b.node.title);
      })
      .slice(0, 20);
  }, [searchQuery, searchableNodes, searchFilters]);

  const handleSelectResult = (nodeKey: string, node: NavNode) => {
    onSelectResult(nodeKey, node);
    clearSearch();
  };

  const results = searchResults();
  const showSearchResults = searchQuery.trim().length > 0;

  return (
    <>
      {/* Search Input */}
      <div className="px-3 py-2 bg-white border-b border-gray-200">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
          {/* Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg border transition-colors',
                searchFilters.size > 0
                  ? 'bg-purple-50 border-purple-200 text-purple-600'
                  : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              )}
              aria-label="Filter search results"
              aria-expanded={showFilterDropdown}
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              {searchFilters.size > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {searchFilters.size}
                </span>
              )}
            </button>

            {/* Filter Dropdown */}
            {showFilterDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowFilterDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-30">
                  <div className="p-2">
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-2 py-1">Filter by type</div>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {filterTypes.map((filter) => {
                        const isActive = searchFilters.has(filter.key);
                        const Icon = filter.icon;
                        return (
                          <button
                            key={filter.key}
                            onClick={() => toggleSearchFilter(filter.key)}
                            className={cn(
                              'flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors',
                              isActive ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <Icon className="w-3 h-3" />
                              {filter.label}
                            </span>
                            {isActive && <span className="text-purple-600">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                    {searchFilters.size > 0 && (
                      <>
                        <div className="border-t border-gray-100 my-2" />
                        <button
                          onClick={() => {
                            setSearchFilters(new Set());
                            setShowFilterDropdown(false);
                          }}
                          className="w-full px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded text-left"
                        >
                          Reset filters
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search Results */}
      {showSearchResults && (
        <div className="flex-1 overflow-y-auto bg-white border-b border-gray-200">
          <div className="px-3 py-2">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">
              {results.length > 0 ? `${results.length} result${results.length > 1 ? 's' : ''}` : 'No results'}
            </div>
            {results.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {results.map(({ nodeKey, node, matchType }) => (
                  <button
                    key={nodeKey}
                    onClick={() => handleSelectResult(nodeKey, node)}
                    className="group flex items-center justify-between w-full px-3 py-2 rounded-lg cursor-pointer text-left transition-colors hover:bg-gray-100"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm text-gray-900 truncate">{node.title}</span>
                      {matchType === 'id' && <span className="text-xs text-gray-400 truncate">ID: {nodeKey.split(':')[2]}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {node.badge && (
                        <span
                          className={cn(
                            'px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide rounded',
                            getBadgeClasses(node.badge)
                          )}
                        >
                          {node.badge}
                        </span>
                      )}
                      {node.pages && node.pages.length > 0 && (
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {results.length === 0 && searchQuery.trim() && (
              <div className="text-sm text-gray-500 py-4 text-center">No resources found for "{searchQuery}"</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
