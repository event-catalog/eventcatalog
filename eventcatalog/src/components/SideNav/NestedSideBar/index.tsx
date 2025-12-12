'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { ChevronRight, ChevronLeft, ChevronDown, Home, Star, FileQuestion } from 'lucide-react';
import type { NavigationData, NavNode, ChildRef } from './sidebar-builder';
import SearchBar from './SearchBar';
import { saveState, loadState, saveCollapsedSections, loadCollapsedSections } from './storage';
import { useStore } from '@nanostores/react';
import { sidebarStore } from '@stores/sidebar-store';
import { favoritesStore, toggleFavorite as toggleFavoriteAction, type FavoriteItem } from '@stores/favorites-store';

const cn = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

// ============================================
// Badge color mapping
// ============================================

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

// ============================================
// Component
// ============================================

type NavigationLevel = {
  key: string | null; // The key of the node that was drilled into (null for root)
  entries: ChildRef[];
  title: string;
  badge?: string; // Category badge (e.g., "Domain", "Service")
};

export default function NestedSideBar() {
  const data = useStore(sidebarStore);
  const favorites = useStore(favoritesStore);

  // Guard against undefined data (e.g., during hydration)
  // Use useMemo to ensure stable references for roots and nodes
  const roots = useMemo(() => data?.roots ?? [], [data?.roots]);
  const nodes = useMemo(() => data?.nodes ?? {}, [data?.nodes]);

  const [navigationStack, setNavigationStack] = useState<NavigationLevel[]>(() => [
    { key: null, entries: [], title: 'Documentation' },
  ]);
  const [animationKey, setAnimationKey] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward' | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showPathPreview, setShowPathPreview] = useState(false);
  const [showFullPath, setShowFullPath] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Build a lookup map for faster URL navigation
  // Map format: "type:id" -> "nodeKey"
  const nodeLookup = useMemo(() => {
    const lookup = new Map<string, string>();

    Object.keys(nodes).forEach((key) => {
      // Key formats:
      // - "type:id:version" (e.g., "service:OrdersService:0.0.3")
      // - "type:id" (e.g., "service:OrdersService", "user:john", "team:backend")
      // - "list:name" (e.g., "list:domains") - skip these
      const parts = key.split(':');

      // Skip list items
      if (parts[0] === 'list') return;

      if (parts.length >= 2) {
        // Store as "type:id"
        const type = parts[0];
        const id = parts[1];
        lookup.set(`${type}:${id}`, key);
      }
    });

    return lookup;
  }, [nodes]);

  /**
   * Toggle section collapse state
   */
  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      // Save to localStorage
      saveCollapsedSections(next);
      return next;
    });
  };

  /**
   * Load collapsed sections from localStorage on mount
   */
  useEffect(() => {
    const saved = loadCollapsedSections();
    if (saved.size > 0) {
      setCollapsedSections(saved);
    }
  }, []);

  /**
   * Update navigation stack when roots become available
   */
  useEffect(() => {
    if (roots.length > 0) {
      setNavigationStack((prevStack) => {
        // Only update if the current stack has no entries (initial state)
        if (prevStack.length === 1 && prevStack[0].entries.length === 0) {
          return [{ key: null, entries: roots, title: 'Documentation' }];
        }
        return prevStack;
      });
    }
  }, [roots]);

  /**
   * Populate the store with the data when the component mounts or data changes
   */
  // useEffect(() => {
  //   if (data) {
  //     setSidebarData(data);
  //   }
  // }, [data]);

  /**
   * Resolve a child reference to a NavNode
   */
  const resolveRef = useCallback(
    (ref: ChildRef): NavNode | null => {
      if (typeof ref === 'string') {
        return nodes[ref] ?? null;
      }
      return ref;
    },
    [nodes]
  );

  /**
   * Check if a node is visible (default: true)
   */
  const isVisible = useCallback((node: NavNode | null): boolean => {
    if (!node) return false;
    return node.visible !== false;
  }, []);

  /**
   * Build navigation stack from a path of keys
   */
  const buildStackFromPath = useCallback(
    (path: string[]): NavigationLevel[] => {
      const stack: NavigationLevel[] = [{ key: null, entries: roots, title: 'Documentation' }];

      for (const key of path) {
        const node = nodes[key];
        if (node && node.pages) {
          stack.push({
            key,
            entries: node.pages,
            title: node.title,
            badge: node.badge,
          });
        } else {
          // Path is invalid (node doesn't exist or has no children), stop here
          break;
        }
      }

      return stack;
    },
    [roots, nodes]
  );

  /**
   * Get current path from navigation stack
   */
  const getCurrentPath = useCallback((): string[] => {
    return navigationStack.filter((level) => level.key !== null).map((level) => level.key as string);
  }, [navigationStack]);

  /**
   * Find a node key by matching URL patterns
   */
  const findNodeKeyByUrl = useCallback(
    (url: string): string | null => {
      // URL patterns to match resources with version
      const urlPatternsWithVersion = [
        // Domains
        { pattern: /^\/docs\/domains\/([^/]+)\/([^/]+)/, type: 'domain' },
        { pattern: /^\/visualiser\/domains\/([^/]+)\/([^/]+)/, type: 'domain' },
        { pattern: /^\/architecture\/domains\/([^/]+)\/([^/]+)/, type: 'domain' },
        // Services
        { pattern: /^\/docs\/services\/([^/]+)\/([^/]+)/, type: 'service' },
        { pattern: /^\/architecture\/services\/([^/]+)\/([^/]+)/, type: 'service' },
        { pattern: /^\/visualiser\/services\/([^/]+)\/([^/]+)/, type: 'service' },
        // Messages (events, commands, queries) - note: keys use singular form
        { pattern: /^\/docs\/events\/([^/]+)\/([^/]+)/, type: 'event' },
        { pattern: /^\/docs\/commands\/([^/]+)\/([^/]+)/, type: 'command' },
        { pattern: /^\/docs\/queries\/([^/]+)\/([^/]+)/, type: 'query' },
        { pattern: /^\/visualiser\/messages\/([^/]+)\/([^/]+)/, type: 'message' },
        { pattern: /^\/visualiser\/events\/([^/]+)\/([^/]+)/, type: 'event' },
        { pattern: /^\/visualiser\/commands\/([^/]+)\/([^/]+)/, type: 'command' },
        { pattern: /^\/visualiser\/queries\/([^/]+)\/([^/]+)/, type: 'query' },
        // Containers
        { pattern: /^\/docs\/containers\/([^/]+)\/([^/]+)/, type: 'container' },
        { pattern: /^\/visualiser\/containers\/([^/]+)\/([^/]+)/, type: 'container' },
        // Flows
        { pattern: /^\/docs\/flows\/([^/]+)\/([^/]+)/, type: 'flow' },
        { pattern: /^\/visualiser\/flows\/([^/]+)\/([^/]+)/, type: 'flow' },
      ];

      // URL patterns without version (language pages, etc)
      const urlPatternsWithoutVersion = [{ pattern: /^\/docs\/domains\/([^/]+)\/language/, type: 'domain' }];

      // First try to match patterns with version
      for (const { pattern, type } of urlPatternsWithVersion) {
        const match = url.match(pattern);
        if (match) {
          const id = match[1];
          const version = match[2];

          // First try with version
          const keyWithVersion = `${type}:${id}:${version}`;
          if (nodes[keyWithVersion]) {
            return keyWithVersion;
          }

          // Fallback to lookup without version (for latest)
          const foundNodeKey = nodeLookup.get(`${type}:${id}`);
          if (foundNodeKey) return foundNodeKey;
        }
      }

      // Then try patterns without version
      for (const { pattern, type } of urlPatternsWithoutVersion) {
        const match = url.match(pattern);
        if (match) {
          const id = match[1];
          const foundNodeKey = nodeLookup.get(`${type}:${id}`);
          if (foundNodeKey) return foundNodeKey;
        }
      }

      return null;
    },
    [nodeLookup, nodes]
  );

  /**
   * Try to connect a target node to the current stack (drill down, move up, or validate leaf)
   */
  const tryConnectStack = useCallback(
    (targetKey: string, currentStack: NavigationLevel[]): NavigationLevel[] | null => {
      const targetNode = nodes[targetKey];
      if (!targetNode) return null;

      // 1. Check if we are already at this level (or above)
      const existingLevelIndex = currentStack.findIndex((level) => level.key === targetKey);
      if (existingLevelIndex !== -1) {
        // Truncate stack to this level
        return currentStack.slice(0, existingLevelIndex + 1);
      }

      // 2. Check if it's a child of the current last level
      const lastLevel = currentStack[currentStack.length - 1];
      const lastNode = lastLevel.key ? nodes[lastLevel.key] : null;

      // If root level (key=null), we check against roots
      const parentChildren = lastLevel.key === null ? roots : lastNode?.pages;

      if (parentChildren) {
        const isChild = parentChildren.some((ref) => {
          if (typeof ref === 'string') return ref === targetKey;
          // Inline nodes don't have global keys usually
          return false;
        });

        if (isChild) {
          // If it has children, we drill down
          if (targetNode.pages && targetNode.pages.length > 0) {
            return [
              ...currentStack,
              { key: targetKey, entries: targetNode.pages, title: targetNode.title, badge: targetNode.badge },
            ];
          }
          // If it's a leaf, the stack is valid as is
          return currentStack;
        }
      }

      return null;
    },
    [nodes, roots]
  );

  /**
   * Find a node by matching URL patterns and navigate to it
   */
  const findAndNavigateToUrl = useCallback(
    (url: string) => {
      const foundNodeKey = findNodeKeyByUrl(url);

      if (foundNodeKey) {
        setNavigationStack((currentStack) => {
          // Try to connect to current stack first
          const connectedStack = tryConnectStack(foundNodeKey, currentStack);

          if (connectedStack) {
            return connectedStack;
          }

          const foundNode = nodes[foundNodeKey];
          if (foundNode && foundNode.pages && foundNode.pages.length > 0) {
            // Fallback: Flattened navigation
            return [
              { key: null, entries: roots, title: 'Documentation' },
              { key: foundNodeKey, entries: foundNode.pages, title: foundNode.title, badge: foundNode.badge },
            ];
          }

          return currentStack;
        });
        return true;
      } else if (url === '/' || url === '') {
        // Reset to root if we are on homepage
        setNavigationStack((currentStack) => {
          if (currentStack.length > 1) {
            setSlideDirection('backward');
            setAnimationKey((prev) => prev + 1);
          }
          return [{ key: null, entries: roots, title: 'Documentation' }];
        });
        return true;
      }
      return false;
    },
    [findNodeKeyByUrl, tryConnectStack, nodes, roots]
  );

  /**
   * Restore state from localStorage on mount, or navigate to URL
   */
  useEffect(() => {
    if (!data || roots.length === 0 || isInitialized) return;

    const currentUrl = window.location.pathname;

    // Force root navigation on homepage
    if (currentUrl === '/' || currentUrl === '') {
      setNavigationStack([{ key: null, entries: roots, title: 'Documentation' }]);
      setIsInitialized(true);
      return;
    }

    const savedState = loadState();
    const targetKey = findNodeKeyByUrl(currentUrl);

    let finalStack: NavigationLevel[] | null = null;

    // 1. Try to restore saved state + connect to target
    if (savedState && savedState.path.length > 0) {
      const restoredStack = buildStackFromPath(savedState.path);

      if (targetKey) {
        // Try to connect restored stack to target
        const connectedStack = tryConnectStack(targetKey, restoredStack);
        if (connectedStack) {
          finalStack = connectedStack;
        }
      } else {
        // No target from URL, just restore saved state
        finalStack = restoredStack;
      }
    }

    // 2. If no valid stack from step 1, try just the target (flattened)
    if (!finalStack && targetKey) {
      const targetNode = nodes[targetKey];
      if (targetNode && targetNode.pages && targetNode.pages.length > 0) {
        finalStack = [
          { key: null, entries: roots, title: 'Documentation' },
          { key: targetKey, entries: targetNode.pages, title: targetNode.title, badge: targetNode.badge },
        ];
      }
    }

    // 3. Fallback to root
    if (!finalStack) {
      setNavigationStack([{ key: null, entries: roots, title: 'Documentation' }]);
    } else {
      setNavigationStack(finalStack);
    }

    setIsInitialized(true);
  }, [data, roots, nodes, isInitialized, buildStackFromPath, findNodeKeyByUrl, tryConnectStack]);

  /**
   * Save state whenever navigation changes
   */
  useEffect(() => {
    if (!isInitialized) return;

    const path = getCurrentPath();
    saveState({
      path,
      currentUrl: window.location.pathname,
    });
  }, [navigationStack, isInitialized, getCurrentPath]);

  /**
   * Track current URL for highlighting active item and auto-navigation
   */
  useEffect(() => {
    // Set initial path
    setCurrentPath(window.location.pathname);

    // Listen for URL changes (for client-side navigation)
    const handleUrlChange = () => {
      const newPath = window.location.pathname;
      setCurrentPath(newPath);

      // Try to auto-navigate to the new URL's resource
      if (isInitialized) {
        findAndNavigateToUrl(newPath);
      }
    };

    window.addEventListener('popstate', handleUrlChange);

    // Also listen for click events on links to catch client-side navigation
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href && anchor.href.startsWith(window.location.origin)) {
        // Delay to let the navigation happen first
        setTimeout(() => {
          const newPath = window.location.pathname;
          if (newPath !== currentPath) {
            setCurrentPath(newPath);
            if (isInitialized) {
              findAndNavigateToUrl(newPath);
            }
          }
        }, 100);
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      document.removeEventListener('click', handleClick);
    };
  }, [isInitialized, findAndNavigateToUrl, currentPath]);

  // Show loading state if no data yet
  if (!data || roots.length === 0) {
    return (
      <aside className="w-[315px] h-screen flex flex-col bg-gray-50 border-r border-gray-200">
        <div className="px-3 py-2 bg-white border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-900">Loading...</span>
        </div>
      </aside>
    );
  }

  const currentLevel = navigationStack[navigationStack.length - 1];

  /**
   * Check if a node is a group
   */
  const isGroup = (node: NavNode): boolean => node.type === 'group';

  /**
   * Check if a node has children
   */
  const hasChildren = (node: NavNode): boolean => {
    return (node.pages?.length ?? 0) > 0;
  };

  /**
   * Check if a section has any visible children
   */
  const hasVisibleChildren = (node: NavNode): boolean => {
    if (!node.pages) return false;
    return node.pages.some((childRef) => {
      const child = resolveRef(childRef);
      return isVisible(child);
    });
  };

  /**
   * Handle drilling down into an item with children
   */
  const handleDrillDown = (node: NavNode, nodeKey: string | null) => {
    if (node.pages && node.pages.length > 0) {
      setSlideDirection('forward');
      setAnimationKey((prev) => prev + 1);
      const newStack = [...navigationStack, { key: nodeKey, entries: node.pages, title: node.title, badge: node.badge }];
      setNavigationStack(newStack);
      // Reset hover states to prevent showing path preview immediately after navigation
      setShowPathPreview(false);
      setShowFullPath(false);
    }
  };

  /**
   * Navigate back one level
   */
  const navigateBack = () => {
    if (navigationStack.length > 1) {
      setSlideDirection('backward');
      setAnimationKey((prev) => prev + 1);
      setNavigationStack(navigationStack.slice(0, -1));
      // Reset hover states
      setShowPathPreview(false);
      setShowFullPath(false);
    }
  };

  /**
   * Navigate to a specific level in the stack
   */
  const navigateToLevel = (levelIndex: number) => {
    if (levelIndex < navigationStack.length - 1) {
      setSlideDirection('backward');
      setAnimationKey((prev) => prev + 1);
      setNavigationStack(navigationStack.slice(0, levelIndex + 1));
      setShowPathPreview(false);
      setShowFullPath(false);
    }
  };

  /**
   * Check if a node is favorited
   */
  const isFavorited = useCallback(
    (nodeKey: string | null): boolean => {
      if (!nodeKey) return false;
      return favorites.some((fav) => fav.nodeKey === nodeKey);
    },
    [favorites]
  );

  /**
   * Toggle favorite status for a node
   */
  const toggleFavorite = (nodeKey: string | null, node: NavNode) => {
    if (!nodeKey) return;

    const favoriteItem: FavoriteItem = {
      nodeKey,
      path: getCurrentPath(),
      title: node.title,
      badge: node.badge,
      href: node.href,
    };

    toggleFavoriteAction(favoriteItem);
  };

  /**
   * Navigate to a favorited item
   */
  const navigateToFavorite = (favorite: FavoriteItem) => {
    // If it has an href and no children, just navigate to the URL
    const node = nodes[favorite.nodeKey];
    if (favorite.href && (!node?.pages || node.pages.length === 0)) {
      window.location.href = favorite.href;
      return;
    }

    // Build the stack to this favorite
    const stack = buildStackFromPath(favorite.path);

    // If the node has children, add it to the stack
    if (node && node.pages && node.pages.length > 0) {
      stack.push({
        key: favorite.nodeKey,
        entries: node.pages,
        title: node.title,
        badge: node.badge,
      });
    }

    setSlideDirection('forward');
    setAnimationKey((prev) => prev + 1);
    setNavigationStack(stack);
    // Reset hover states
    setShowPathPreview(false);
    setShowFullPath(false);
  };

  const isTopLevel = navigationStack.length === 1;

  /**
   * Navigate to a search result
   */
  const navigateToSearchResult = (nodeKey: string, node: NavNode) => {
    // If it's a leaf node with href, navigate directly
    if (node.href && (!node.pages || node.pages.length === 0)) {
      window.location.href = node.href;
      return;
    }

    // If it has children, drill down to it
    if (node.pages && node.pages.length > 0) {
      setSlideDirection('forward');
      setAnimationKey((prev) => prev + 1);
      setNavigationStack([
        { key: null, entries: roots, title: 'Documentation' },
        { key: nodeKey, entries: node.pages, title: node.title, badge: node.badge },
      ]);
    }

    setIsSearching(false);
    // Reset hover states
    setShowPathPreview(false);
    setShowFullPath(false);
  };

  /**
   * Render a list of child refs (resolving keys as needed)
   */
  const renderEntries = (refs: ChildRef[]) => {
    const result: React.ReactNode[] = [];
    let currentItemGroup: { node: NavNode; key: string | null }[] = [];

    const flushItemGroup = () => {
      if (currentItemGroup.length > 0) {
        result.push(
          <div key={`items-${result.length}`} className="flex flex-col gap-0.5 mb-1.5">
            {currentItemGroup.map((item, idx) => renderItem(item.node, item.key, idx))}
          </div>
        );
        currentItemGroup = [];
      }
    };

    refs.forEach((ref, index) => {
      const node = resolveRef(ref);
      if (!node) return;

      // Skip invisible nodes
      if (!isVisible(node)) return;

      // Track the key if this is a reference
      const nodeKey = typeof ref === 'string' ? ref : null;

      if (isGroup(node)) {
        // Skip groups with no visible children
        if (!hasVisibleChildren(node)) return;

        flushItemGroup();
        result.push(renderGroup(node, nodeKey, index));
      } else {
        currentItemGroup.push({ node, key: nodeKey });
      }
    });

    flushItemGroup();
    return result;
  };

  /**
   * Render a group with its children
   */
  const renderGroup = (group: NavNode, groupKey: string | null, index: number) => {
    // Get optional icon for group
    const GroupIcon = group.icon ? (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[group.icon] : null;

    // Get visible children
    const visibleChildren =
      group.pages?.filter((childRef) => {
        const child = resolveRef(childRef);
        return child && isVisible(child);
      }) ?? [];

    const groupId = groupKey || `group-${index}`;
    const isCollapsed = collapsedSections.has(groupId);
    const canCollapse = visibleChildren.length > 3;

    const headerContent = (
      <>
        <div className="flex items-center">
          {GroupIcon && (
            <span className="mr-2 text-gray-900">
              <GroupIcon className="w-3.5 h-3.5" />
            </span>
          )}
          <span className="text-sm text-black font-semibold">{group.title}</span>
        </div>
        {canCollapse && <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', isCollapsed && '-rotate-90')} />}
      </>
    );

    return (
      <div key={`group-${groupKey || index}`} className="mb-4 last:mb-2">
        {canCollapse ? (
          <button
            onClick={() => toggleSectionCollapse(groupId)}
            className="flex items-center justify-between w-full px-2 py-1.5 pb-1.5 hover:bg-gray-100 rounded transition-colors cursor-pointer"
          >
            {headerContent}
          </button>
        ) : (
          <div className="flex items-center justify-between px-2 py-1.5 pb-1.5">{headerContent}</div>
        )}
        {!isCollapsed && (
          <div className="flex flex-col gap-0.5 border-l ml-3.5 border-gray-100">
            {visibleChildren.map((childRef, childIndex) => {
              const child = resolveRef(childRef);
              if (!child) return null;

              const childKey = typeof childRef === 'string' ? childRef : null;

              if (isGroup(child)) {
                // Skip nested groups with no visible children
                if (!hasVisibleChildren(child)) return null;

                return (
                  <div key={`nested-group-${childKey || childIndex}`} className="ml-3 mt-1.5 pl-3 border-l border-gray-200">
                    {renderGroup(child, childKey, childIndex)}
                  </div>
                );
              }
              return renderItem(child, childKey, childIndex);
            })}
          </div>
        )}
      </div>
    );
  };

  /**
   * Render a single item
   */
  const renderItem = (item: NavNode, itemKey: string | null, index: number) => {
    const itemHasChildren = hasChildren(item);
    const isActive = item.href && currentPath === item.href;
    const isFav = isFavorited(itemKey);
    const canFavorite = itemKey !== null; // Only items with keys can be favorited

    // Get icon component from lucide-react
    const IconComponent = item.icon ? (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[item.icon] : null;

    const handleStarClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(itemKey, item);
    };

    const content = (
      <>
        <div className="flex items-center gap-2.5 min-w-0 flex-1 ">
          {IconComponent && (
            <span
              className={cn('flex items-center justify-center w-5 h-5 flex-shrink-0', isActive ? 'text-black' : 'text-gray-500')}
            >
              <IconComponent className="w-4 h-4" />
            </span>
          )}
          {item.leftIcon && <img src={item.leftIcon} alt="" className="w-4 h-4 flex-shrink-0" />}
          <span
            className={cn(
              'text-[13px] truncate',
              isActive ? 'text-black font-medium' : 'text-gray-600 group-hover:text-gray-900'
            )}
          >
            {item.title}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {canFavorite && (
            <div
              onClick={handleStarClick}
              className={cn(
                'flex items-center justify-center w-5 h-5 rounded transition-colors cursor-pointer',
                isFav
                  ? 'text-amber-400 hover:text-amber-500'
                  : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-400'
              )}
            >
              <Star className={cn('w-3.5 h-3.5', isFav && 'fill-current')} />
            </div>
          )}
          {itemHasChildren && (
            <span className="flex items-center justify-center w-5 h-5 text-gray-400 group-hover:text-black group-hover:translate-x-0.5 transition-transform">
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </div>
      </>
    );

    const baseClasses =
      'group flex items-center justify-between w-full px-3 py-1 rounded-lg cursor-pointer text-left transition-colors hover:bg-gray-100 active:bg-gray-200';
    const parentClasses = itemHasChildren ? 'font-medium' : '';
    const activeClasses = isActive ? 'bg-gray-200 hover:bg-gray-200 border-l-4 border-black rounded-l-none' : '';

    // Leaf item with href → render as link
    if (item.href && !itemHasChildren) {
      return (
        <a
          key={`item-${itemKey || index}`}
          href={item.href}
          target={item.external ? '_blank' : undefined}
          className={cn(baseClasses, parentClasses, activeClasses)}
        >
          {content}
        </a>
      );
    }

    // Item with children → render as button for drill-down
    return (
      <button
        key={`item-${itemKey || index}`}
        onClick={() => handleDrillDown(item, itemKey)}
        className={cn(baseClasses, parentClasses)}
      >
        {content}
      </button>
    );
  };

  // Animation classes
  const getAnimationClass = () => {
    if (slideDirection === 'forward') return 'animate-slide-in-right';
    if (slideDirection === 'backward') return 'animate-slide-in-left';
    return '';
  };

  return (
    <aside className="w-[315px] h-full flex flex-col font-sans">
      {/* Search */}
      <SearchBar nodes={nodes} onSelectResult={navigateToSearchResult} onSearchChange={setIsSearching} />

      {/* Back Navigation and Nav Content - hidden when showing search results */}
      {!isSearching && (
        <>
          {!isTopLevel && (
            <div
              className="px-3 py-2 bg-white border-b border-gray-200 sticky top-0 z-10"
              onMouseEnter={() => !isTopLevel && setShowPathPreview(true)}
              onMouseLeave={() => {
                setShowPathPreview(false);
                setShowFullPath(false);
              }}
            >
              <button
                onClick={navigateBack}
                disabled={isTopLevel}
                className={cn(
                  'flex items-center gap-2 w-full px-2 py-1.5 -mx-2 rounded-md transition-colors',
                  !isTopLevel && 'hover:bg-gray-100 cursor-pointer',
                  isTopLevel && 'cursor-default'
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center w-5 h-5 text-gray-500 transition-all',
                    isTopLevel && 'opacity-0',
                    !isTopLevel && 'group-hover:-translate-x-0.5'
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                </span>
                <span className="text-sm font-semibold text-gray-900 truncate">{currentLevel.title}</span>
                {currentLevel.badge && (
                  <span
                    className={cn(
                      'ml-auto px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded',
                      getBadgeClasses(currentLevel.badge)
                    )}
                  >
                    {currentLevel.badge}
                  </span>
                )}
              </button>

              {/* Path Preview Dropdown */}
              {showPathPreview && navigationStack.length > 1 && (
                <div className="absolute left-0 right-0 top-full bg-white border-b border-gray-200 shadow-lg z-20">
                  <div className="px-3 py-2">
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">Navigation Path</div>
                    <div className="flex flex-col gap-0.5">
                      {(() => {
                        const SHOW_FIRST = 2; // Show first N items
                        const SHOW_LAST = 2; // Show last N items (including current)
                        const totalItems = navigationStack.length;
                        const hiddenCount = totalItems - SHOW_FIRST - SHOW_LAST;
                        const shouldTruncate = hiddenCount > 0 && !showFullPath;

                        const renderPathItem = (level: NavigationLevel, index: number, displayIndex: number) => {
                          const isCurrentLevel = index === navigationStack.length - 1;
                          return (
                            <button
                              key={`path-${index}`}
                              onClick={() => navigateToLevel(index)}
                              disabled={isCurrentLevel}
                              className={cn(
                                'flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors',
                                !isCurrentLevel && 'hover:bg-gray-100 cursor-pointer',
                                isCurrentLevel && 'bg-gray-200 cursor-default'
                              )}
                              style={{ paddingLeft: `${displayIndex * 12 + 8}px` }}
                            >
                              {index === 0 ? (
                                <Home className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                              )}
                              <span
                                className={cn('text-sm truncate', isCurrentLevel ? 'font-medium text-black' : 'text-gray-600')}
                              >
                                {level.title}
                              </span>
                              {level.badge && (
                                <span
                                  className={cn(
                                    'ml-auto px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide rounded flex-shrink-0',
                                    getBadgeClasses(level.badge)
                                  )}
                                >
                                  {level.badge}
                                </span>
                              )}
                            </button>
                          );
                        };

                        if (shouldTruncate) {
                          return (
                            <>
                              {/* First N items */}
                              {navigationStack.slice(0, SHOW_FIRST).map((level, index) => renderPathItem(level, index, index))}

                              {/* Collapsed middle section */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowFullPath(true);
                                }}
                                className="flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors hover:bg-gray-100 cursor-pointer"
                                style={{ paddingLeft: `${SHOW_FIRST * 12 + 8}px` }}
                              >
                                <span className="flex items-center justify-center w-3.5 h-3.5 text-gray-400">
                                  <span className="text-xs">•••</span>
                                </span>
                                <span className="text-sm text-gray-500">
                                  {hiddenCount} more level{hiddenCount > 1 ? 's' : ''}
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                              </button>

                              {/* Last N items */}
                              {navigationStack.slice(-SHOW_LAST).map((level, sliceIndex) => {
                                const actualIndex = totalItems - SHOW_LAST + sliceIndex;
                                return renderPathItem(level, actualIndex, SHOW_FIRST + 1 + sliceIndex);
                              })}
                            </>
                          );
                        }

                        // Show full path
                        return navigationStack.map((level, index) => renderPathItem(level, index, index));
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Content */}
          <nav
            key={animationKey}
            className={cn('flex-1 overflow-y-auto overflow-x-hidden p-3', getAnimationClass())}
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#e5e7eb transparent',
            }}
          >
            {/* Favorites Section */}
            {favorites.length > 0 && isTopLevel && (
              <div className="mb-6">
                <div className="flex items-center px-2 py-2 pb-2">
                  <Star className="w-3.5 h-3.5 mr-2 text-amber-400 fill-current" />
                  <span className="text-sm text-black font-semibold">Favorites</span>
                </div>
                <div className="flex flex-col gap-0.5 border-l ml-3.5 border-amber-200">
                  {favorites.map((fav, index) => {
                    const node = nodes[fav.nodeKey];
                    const isActive = fav.href && currentPath === fav.href;

                    return (
                      <button
                        key={`fav-${index}`}
                        onClick={() => navigateToFavorite(fav)}
                        className={cn(
                          'group flex items-center justify-between w-full px-3 py-1.5 rounded-lg cursor-pointer text-left transition-colors hover:bg-amber-50 active:bg-amber-100',
                          isActive && 'bg-gray-200 hover:bg-gray-200 border-l-4 border-black rounded-l-none'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={cn(
                              'text-[14px] truncate',
                              isActive ? 'text-black font-medium' : 'text-gray-600 group-hover:text-gray-900'
                            )}
                          >
                            {fav.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {fav.badge && (
                            <span
                              className={cn(
                                'px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide rounded',
                                getBadgeClasses(fav.badge)
                              )}
                            >
                              {fav.badge}
                            </span>
                          )}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (node) toggleFavorite(fav.nodeKey, node);
                            }}
                            className="flex items-center justify-center w-5 h-5 text-amber-400 hover:text-amber-500 rounded transition-colors cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </div>
                          {node?.pages && node.pages.length > 0 && (
                            <span className="flex items-center justify-center w-5 h-5 text-gray-400 group-hover:text-black">
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {currentLevel.entries.length === 0 && favorites.length === 0 && (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-4 p-3 rounded-full bg-gray-100">
                  <FileQuestion className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Your catalog is empty</h3>
                <p className="text-xs text-gray-500 leading-relaxed max-w-[240px]">
                  Navigation will appear here when you add resources to your EventCatalog.
                </p>
              </div>
            )}

            {currentLevel.entries.length > 0 && renderEntries(currentLevel.entries)}
          </nav>
        </>
      )}

      {/* Animation keyframes */}
      <style>{`
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(40px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-40px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slideInRight 200ms ease-out forwards;
                }
                .animate-slide-in-left {
                    animation: slideInLeft 200ms ease-out forwards;
                }
            `}</style>
    </aside>
  );
}
