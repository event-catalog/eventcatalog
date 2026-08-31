'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { ChevronRight, ChevronLeft, ChevronDown, Home, Star } from 'lucide-react';
import type { NavNode, ChildRef } from '@stores/sidebar-store/state';
import {
  saveState,
  loadState,
  saveCollapsedSections,
  loadCollapsedSections,
  saveScrollPosition,
  loadScrollPosition,
} from './storage';
import { useStore } from '@nanostores/react';
import { sidebarStore } from '@stores/sidebar-store';
import {
  favoritesStore,
  toggleFavorite as toggleFavoriteAction,
  removeFavorite as removeFavoriteAction,
  type FavoriteItem,
} from '@stores/favorites-store';
import {
  canCollapseGroup,
  findNodeKeyByUrl,
  getBadgeClasses,
  getDefaultCollapsedState,
  isGroupCollapsed,
  toggleGroupCollapsed,
} from './utils';
import { resolveIconUrl } from '@utils/icon';

const cn = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

/**
 * Strip the configured base path from a pathname so URL pattern matching works
 * regardless of the base path setting (e.g. `/eventcatalog/docs/...` → `/docs/...`).
 */
const stripBasePath = (pathname: string): string => {
  const base = __EC_BASE__.replace(/\/$/, ''); // e.g. '/eventcatalog'
  if (base && pathname.startsWith(base)) {
    return pathname.slice(base.length) || '/';
  }
  return pathname;
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
  const [sectionCollapsePreferences, setSectionCollapsePreferences] = useState(loadCollapsedSections);
  const [showPathPreview, setShowPathPreview] = useState(false);
  const [showFullPath, setShowFullPath] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  // Build a lookup map for faster URL navigation
  // Map format: "type:id" -> "nodeKey"
  const nodeLookup = useMemo(() => {
    const lookup = new Map<string, string>();

    Object.entries(nodes).forEach(([key, value]) => {
      // Skip keys that are references (string values pointing to other keys)
      // These are unversioned aliases like "domain:E-Commerce" -> "domain:E-Commerce:1.0.0"
      if (typeof value === 'string') return;

      // Key formats:
      // - "type:id:version" (e.g., "service:OrdersService:0.0.3")
      // - "type:id" (e.g., "user:john", "team:backend") - non-versioned resources
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
  const toggleSectionCollapse = (sectionId: string, defaultCollapsed = true) => {
    setSectionCollapsePreferences((previousPreferences) => {
      const nextPreferences = toggleGroupCollapsed(sectionId, previousPreferences, defaultCollapsed);
      saveCollapsedSections(nextPreferences);
      return nextPreferences;
    });
  };

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
   * Handles both direct keys and string references (unversioned aliases pointing to versioned keys)
   */
  const resolveRef = useCallback(
    (ref: ChildRef): NavNode | null => {
      if (typeof ref === 'string') {
        const node = nodes[ref];
        if (!node) return null;
        // If node is a string, it's a reference to another key (e.g., unversioned alias)
        if (typeof node === 'string') {
          return (nodes[node] as NavNode) ?? null;
        }
        return node;
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
        const node = resolveRef(key);
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
    [roots, resolveRef]
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
  const findNodeKeyForUrl = useCallback(
    (url: string): string | null => {
      return findNodeKeyByUrl(stripBasePath(url), nodes, nodeLookup);
    },
    [nodeLookup, nodes]
  );

  /**
   * Try to connect a target node to the current stack (drill down, move up, or validate leaf)
   */
  const tryConnectStack = useCallback(
    (targetKey: string, currentStack: NavigationLevel[]): NavigationLevel[] | null => {
      const targetNode = resolveRef(targetKey);
      if (!targetNode) return null;

      // 1. Check if we are already at this level (or above)
      const existingLevelIndex = currentStack.findIndex((level) => level.key === targetKey);
      if (existingLevelIndex !== -1) {
        // Truncate stack to this level
        return currentStack.slice(0, existingLevelIndex + 1);
      }

      // 2. Check if it's a child of the current last level
      const lastLevel = currentStack[currentStack.length - 1];
      const lastNode = lastLevel.key ? resolveRef(lastLevel.key) : null;

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
    [resolveRef, roots]
  );

  /**
   * Find a node by matching URL patterns and navigate to it
   */
  const findAndNavigateToUrl = useCallback(
    (url: string) => {
      const foundNodeKey = findNodeKeyForUrl(url);

      if (foundNodeKey) {
        setNavigationStack((currentStack) => {
          // Try to connect to current stack first
          const connectedStack = tryConnectStack(foundNodeKey, currentStack);

          if (connectedStack) {
            return connectedStack;
          }

          const foundNode = resolveRef(foundNodeKey);
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
    [findNodeKeyForUrl, tryConnectStack, resolveRef, roots]
  );

  /**
   * Restore state from localStorage on mount, or navigate to URL
   */
  useEffect(() => {
    if (!data || roots.length === 0 || isInitialized) return;

    const currentUrl = window.location.pathname;
    const normalizedCurrentUrl = stripBasePath(currentUrl);

    // Force root navigation on homepage
    if (normalizedCurrentUrl === '/' || normalizedCurrentUrl === '') {
      setNavigationStack([{ key: null, entries: roots, title: 'Documentation' }]);
      setIsInitialized(true);
      return;
    }

    const savedState = loadState();
    const targetKey = findNodeKeyForUrl(currentUrl);

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
      const targetNode = resolveRef(targetKey);
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
  }, [data, roots, isInitialized, buildStackFromPath, findNodeKeyForUrl, tryConnectStack, resolveRef]);

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

  /**
   * Keep the selected item visible. On a full page load the nav remounts scrolled to the
   * top, so first restore the offset saved for this drill-down path, then nudge the
   * active item into view if it still isn't. `block: 'nearest'` never scrolls when the
   * item is already visible, so clicking around near the top doesn't jump.
   */
  useEffect(() => {
    if (!isInitialized) return;
    const nav = navRef.current;
    if (!nav) return;

    const pathKey = getCurrentPath().join('/') || 'root';
    const savedScrollTop = loadScrollPosition(pathKey);
    if (savedScrollTop !== null) nav.scrollTop = savedScrollTop;

    const active = nav.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;

    const navRect = nav.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const isVisible = activeRect.top >= navRect.top && activeRect.bottom <= navRect.bottom;
    if (!isVisible) active.scrollIntoView({ block: 'nearest' });
  }, [isInitialized, currentPath, navigationStack, getCurrentPath]);

  /**
   * Persist the nav scroll offset as it changes.
   */
  useEffect(() => {
    if (!isInitialized) return;
    const nav = navRef.current;
    if (!nav) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => saveScrollPosition(getCurrentPath().join('/') || 'root', nav.scrollTop), 150);
    };
    nav.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      nav.removeEventListener('scroll', onScroll);
    };
  }, [isInitialized, navigationStack, getCurrentPath]);

  /**
   * Check if a node is favorited
   * Note: This hook must be defined before any early returns to comply with Rules of Hooks
   */
  const isFavorited = useCallback(
    (nodeKey: string | null): boolean => {
      if (!nodeKey) return false;
      return favorites.some((fav) => fav.nodeKey === nodeKey);
    },
    [favorites]
  );

  const urlsMatch = useCallback((left: string | undefined, right: string | undefined) => {
    if (!left || !right) return false;
    return stripBasePath(left).replace(/\/$/, '') === stripBasePath(right).replace(/\/$/, '');
  }, []);

  const activeNodeKey = useMemo(() => findNodeKeyForUrl(currentPath), [currentPath, findNodeKeyForUrl]);

  // Show loading state if no data yet
  if (!data || roots.length === 0) {
    return (
      <aside className="flex h-full min-h-0 w-full flex-1 flex-col bg-[rgb(var(--ec-rail-bg))] font-sans">
        <div className="flex h-[60px] items-center px-6 bg-[rgb(var(--ec-rail-bg)/0.98)] backdrop-blur-sm border-b border-[rgb(var(--ec-content-border))] sticky top-0 z-10">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--ec-sidebar-text)/0.5)] truncate">
            All resources
          </span>
        </div>
        {/* Content skeleton */}
        <div className="p-4 space-y-3">
          {/* Group header skeleton */}
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-3.5 h-3.5 bg-[rgb(var(--ec-content-hover))] rounded animate-pulse" />
            <div className="h-4 w-24 bg-[rgb(var(--ec-content-hover))] rounded animate-pulse" />
          </div>
          {/* Item skeletons */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-1.5 ml-3.5 border-l border-[rgb(var(--ec-content-border))]">
              <div className="w-4 h-4 bg-[rgb(var(--ec-content-hover))] rounded animate-pulse" />
              <div
                className="h-4 bg-[rgb(var(--ec-content-hover))] rounded animate-pulse"
                style={{ width: `${60 + ((i * 15) % 40)}%` }}
              />
            </div>
          ))}
          {/* Second group skeleton */}
          <div className="flex items-center gap-2 px-2 py-1.5 mt-4">
            <div className="w-3.5 h-3.5 bg-[rgb(var(--ec-content-hover))] rounded animate-pulse" />
            <div className="h-4 w-20 bg-[rgb(var(--ec-content-hover))] rounded animate-pulse" />
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={`g2-${i}`}
              className="flex items-center gap-2.5 px-3 py-1.5 ml-3.5 border-l border-[rgb(var(--ec-content-border))]"
            >
              <div className="w-4 h-4 bg-[rgb(var(--ec-content-hover))] rounded animate-pulse" />
              <div
                className="h-4 bg-[rgb(var(--ec-content-hover))] rounded animate-pulse"
                style={{ width: `${50 + ((i * 20) % 35)}%` }}
              />
            </div>
          ))}
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
   * Count entries that actually resolve to a visible node. Some refs (e.g. unresolved
   * `list:` aliases on an empty catalog) sit in `entries` but render nothing — those
   * must not count, otherwise the empty state is suppressed and the rail looks blank.
   * Mirrors the filtering in `renderEntries`.
   */
  const hasVisibleEntries = currentLevel.entries.some((ref) => {
    const node = resolveRef(ref);
    if (!isVisible(node)) return false;
    if (isGroup(node!)) return hasVisibleChildren(node!);
    return true;
  });

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
    const node = resolveRef(favorite.nodeKey);
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
   * Render a group with its children.
   *
   * Groups render as a docs-style tree: every group has its caret on the right; top-level
   * sections also carry an icon tile. Each level's children hang off a vertical guide.
   */
  const renderGroup = (group: NavNode, groupKey: string | null, index: number, depth = 0) => {
    const GroupIcon = group.icon ? (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[group.icon] : null;
    const isNested = depth > 0;

    const visibleChildren =
      group.pages?.filter((childRef) => {
        const child = resolveRef(childRef);
        return child && isVisible(child);
      }) ?? [];

    const groupId = groupKey || group.collapseKey || `${currentLevel.key ?? 'root'}:group:${group.title}`;
    const canCollapse = canCollapseGroup(isTopLevel, group.collapsible, group.collapsed);
    const defaultCollapsed = getDefaultCollapsedState(visibleChildren.length, group.collapsed);
    const isCollapsed = isGroupCollapsed(canCollapse, groupId, sectionCollapsePreferences, defaultCollapsed);
    const header = isNested ? (
      <>
        {GroupIcon && <GroupIcon className="w-3.5 h-3.5 flex-shrink-0 text-[rgb(var(--ec-content-text-muted))]" />}
        <span className="text-[12px] font-medium text-[rgb(var(--ec-content-text))] truncate">{group.title}</span>
        {canCollapse && (
          <ChevronDown
            className={cn(
              'ml-auto w-3.5 h-3.5 flex-shrink-0 text-[rgb(var(--ec-icon-color))] transition-transform',
              isCollapsed && '-rotate-90'
            )}
          />
        )}
      </>
    ) : (
      <>
        {GroupIcon && (
          <span className="flex items-center justify-center w-5 h-5 flex-shrink-0 rounded bg-[rgb(var(--ec-group-icon-bg))] text-[rgb(var(--ec-group-icon-text))]">
            <GroupIcon className="w-3 h-3" />
          </span>
        )}
        <span className="text-[12px] font-semibold tracking-tight text-[rgb(var(--ec-content-text))] truncate">
          {group.title}
        </span>
        {canCollapse && (
          <ChevronDown
            className={cn(
              'ml-auto w-4 h-4 flex-shrink-0 text-[rgb(var(--ec-icon-color))] transition-transform',
              isCollapsed && '-rotate-90'
            )}
          />
        )}
      </>
    );

    const headerClasses = cn(
      'group flex items-center w-full rounded-md text-left transition-colors',
      isNested ? 'gap-1.5 px-2 py-1.5' : 'gap-2 px-2 py-1.5',
      canCollapse && 'cursor-pointer hover:bg-[rgb(var(--ec-content-hover))]'
    );

    // Top level: the guide line sits under the centre of the icon tile (8px padding + half of
    // 20px). Nested: carets sit on the right, so the guide is simply inset from the label.
    const childrenClasses = cn(
      'flex flex-col gap-px mt-0.5 border-l border-[rgb(var(--ec-content-border))]',
      isNested ? 'ml-3 pl-1.5' : 'ml-[18px] pl-2'
    );

    return (
      <div key={`group-${groupKey || index}`} className={cn(isNested ? 'mt-0.5' : 'mb-4 last:mb-1')}>
        {canCollapse ? (
          <button type="button" onClick={() => toggleSectionCollapse(groupId, defaultCollapsed)} className={headerClasses}>
            {header}
          </button>
        ) : (
          <div className={headerClasses}>{header}</div>
        )}
        {!isCollapsed && (
          <div className={childrenClasses}>
            {visibleChildren.map((childRef, childIndex) => {
              const child = resolveRef(childRef);
              if (!child) return null;

              const childKey = typeof childRef === 'string' ? childRef : null;

              if (isGroup(child)) {
                if (!hasVisibleChildren(child)) return null;
                return renderGroup(child, childKey, childIndex, depth + 1);
              }

              // Under a nested group the header already conveys the resource type, so the
              // default per-collection glyph is dropped; custom icons still show.
              return renderItem(child, childKey, childIndex, isNested);
            })}
          </div>
        )}
      </div>
    );
  };

  /**
   * Render a single item
   */
  const renderItem = (item: NavNode, itemKey: string | null, index: number, suppressDefaultIcon = false) => {
    const itemHasChildren = hasChildren(item);
    const isActive = urlsMatch(item.href, currentPath) || (itemKey !== null && itemKey === activeNodeKey);
    const isFav = isFavorited(itemKey);
    const canFavorite = itemKey !== null; // Only items with keys can be favorited

    // Get icon component from lucide-react. When suppressDefaultIcon is set (e.g. items
    // listed under a typed subtle subgroup) the default per-collection glyph is hidden;
    // a custom icon (item.leftIcon) is always still shown.
    const IconComponent =
      item.icon && !suppressDefaultIcon ? (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[item.icon] : null;
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
              className={cn(
                'flex items-center justify-center w-5 h-5 flex-shrink-0',
                isActive ? 'text-[rgb(var(--ec-accent-text))]' : 'text-[rgb(var(--ec-content-text-muted))]'
              )}
            >
              <IconComponent className="w-4 h-4" />
            </span>
          )}
          {item.leftIcon && <img src={resolveIconUrl(item.leftIcon)} alt="" loading="lazy" className="w-4 h-4 flex-shrink-0" />}
          <span
            className={cn(
              'text-[12px] truncate',
              isActive
                ? 'text-[rgb(var(--ec-accent-text))] font-medium'
                : 'text-[rgb(var(--ec-content-text-secondary))] group-hover:text-[rgb(var(--ec-content-text))]'
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
                  : 'text-[rgb(var(--ec-content-text-muted))] opacity-0 group-hover:opacity-100 hover:text-amber-400'
              )}
            >
              <Star className={cn('w-3.5 h-3.5', isFav && 'fill-current')} />
            </div>
          )}
          {itemHasChildren && (
            <span className="flex items-center justify-center w-5 h-5 text-[rgb(var(--ec-icon-color))] group-hover:text-[rgb(var(--ec-content-text))] group-hover:translate-x-0.5 transition-transform">
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </div>
      </>
    );

    const baseClasses =
      'group flex items-center justify-between w-full px-2 py-1.5 rounded-md cursor-pointer text-left transition-colors hover:bg-[rgb(var(--ec-content-hover))] active:bg-[rgb(var(--ec-content-hover))]';
    const parentClasses = itemHasChildren ? 'font-medium' : '';
    const activeClasses = isActive ? 'bg-[rgb(var(--ec-rail-active-bg))] hover:bg-[rgb(var(--ec-rail-active-bg))]' : '';

    // Leaf item with href → render as link
    if (item.href && !itemHasChildren) {
      return (
        <a
          key={`item-${itemKey || index}`}
          href={item.href}
          title={item.title}
          target={item.external ? '_blank' : undefined}
          aria-current={isActive ? 'page' : undefined}
          data-active={isActive ? 'true' : undefined}
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
        title={item.title}
        onClick={() => handleDrillDown(item, itemKey)}
        data-active={isActive ? 'true' : undefined}
        className={cn(baseClasses, parentClasses, activeClasses)}
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
    <aside className="flex h-full min-h-0 w-full flex-1 flex-col bg-[rgb(var(--ec-rail-bg))] font-sans">
      {isTopLevel && (
        <div className="flex h-[60px] items-center px-6 bg-[rgb(var(--ec-rail-bg)/0.98)] backdrop-blur-sm border-b border-[rgb(var(--ec-content-border))] sticky top-0 z-10">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--ec-sidebar-text)/0.5)] truncate">
            All resources
          </span>
        </div>
      )}

      {!isTopLevel && (
        <div
          className="flex h-[60px] items-center px-4 bg-[rgb(var(--ec-rail-bg)/0.98)] backdrop-blur-sm border-b border-[rgb(var(--ec-content-border))] sticky top-0 z-10"
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
              !isTopLevel && 'hover:bg-[rgb(var(--ec-content-hover))] cursor-pointer',
              isTopLevel && 'cursor-default'
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center w-5 h-5 text-[rgb(var(--ec-icon-color))] transition-all',
                isTopLevel && 'opacity-0',
                !isTopLevel && 'group-hover:-translate-x-0.5'
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </span>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--ec-sidebar-text))] truncate">
              {currentLevel.title}
            </span>
            {currentLevel.badge && (
              <span
                className={cn(
                  'ml-auto px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide rounded',
                  getBadgeClasses(currentLevel.badge)
                )}
              >
                {currentLevel.badge}
              </span>
            )}
          </button>

          {/* Path Preview Dropdown */}
          {showPathPreview && navigationStack.length > 1 && (
            <div className="absolute left-0 right-0 top-full bg-[rgb(var(--ec-page-bg))] border-b border-[rgb(var(--ec-content-border))] shadow-lg z-20">
              <div className="px-4 py-3">
                <div className="text-[9px] font-medium text-[rgb(var(--ec-content-text-muted))] uppercase tracking-wide mb-2">
                  Navigation Path
                </div>
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
                            !isCurrentLevel && 'hover:bg-[rgb(var(--ec-content-hover))] cursor-pointer',
                            isCurrentLevel && 'bg-[rgb(var(--ec-content-hover))] cursor-default'
                          )}
                          style={{ paddingLeft: `${displayIndex * 12 + 8}px` }}
                        >
                          {index === 0 ? (
                            <Home className="w-3.5 h-3.5 text-[rgb(var(--ec-icon-color))] flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-[rgb(var(--ec-content-text-muted))] flex-shrink-0" />
                          )}
                          <span
                            className={cn(
                              'text-[12px] truncate',
                              isCurrentLevel
                                ? 'font-medium text-[rgb(var(--ec-content-text))]'
                                : 'text-[rgb(var(--ec-content-text-secondary))]'
                            )}
                          >
                            {level.title}
                          </span>
                          {level.badge && (
                            <span
                              className={cn(
                                'ml-auto px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wide rounded flex-shrink-0',
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
                            className="flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors hover:bg-[rgb(var(--ec-content-hover))] cursor-pointer"
                            style={{ paddingLeft: `${SHOW_FIRST * 12 + 8}px` }}
                          >
                            <span className="flex items-center justify-center w-3.5 h-3.5 text-[rgb(var(--ec-icon-color))]">
                              <span className="text-xs">•••</span>
                            </span>
                            <span className="text-[12px] text-[rgb(var(--ec-content-text-muted))]">
                              {hiddenCount} more level{hiddenCount > 1 ? 's' : ''}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-[rgb(var(--ec-icon-color))] ml-auto" />
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
        ref={navRef}
        className={cn('min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 px-2', getAnimationClass())}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(var(--ec-content-border)) transparent',
        }}
      >
        {/* Favorites Section */}
        {favorites.length > 0 && isTopLevel && (
          <div className="mb-6">
            <div className="flex items-center px-2 py-1.5">
              <Star className="w-3.5 h-3.5 mr-2 text-amber-400 fill-current" />
              <span className="text-[12px] text-[rgb(var(--ec-content-text))] font-semibold">Favorites</span>
            </div>
            <div className="flex flex-col gap-0.5 border-l ml-3.5 border-amber-200">
              {favorites.map((fav, index) => {
                const node = resolveRef(fav.nodeKey);
                const isActive = fav.href && currentPath === fav.href;

                return (
                  <button
                    key={`fav-${index}`}
                    onClick={() => navigateToFavorite(fav)}
                    className={cn(
                      'group flex items-center justify-between w-full px-3 py-2 border border-transparent cursor-pointer text-left transition-colors hover:bg-amber-500/10 active:bg-amber-500/20',
                      isActive &&
                        'border-[rgb(var(--ec-accent)/0.16)] bg-[rgb(var(--ec-accent-subtle))] hover:bg-[rgb(var(--ec-accent-subtle))] shadow-sm'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={cn(
                          'text-[12px] truncate',
                          isActive
                            ? 'text-[rgb(var(--ec-accent-text))] font-medium'
                            : 'text-[rgb(var(--ec-content-text-secondary))] group-hover:text-[rgb(var(--ec-content-text))]'
                        )}
                      >
                        {fav.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {fav.badge && (
                        <span
                          className={cn(
                            'px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wide rounded',
                            getBadgeClasses(fav.badge)
                          )}
                        >
                          {fav.badge}
                        </span>
                      )}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (node) {
                            toggleFavorite(fav.nodeKey, node);
                          } else {
                            // Node no longer exists, remove directly using nodeKey
                            removeFavoriteAction(fav.nodeKey);
                          }
                        }}
                        className="flex items-center justify-center w-5 h-5 text-amber-400 hover:text-amber-500 rounded transition-colors cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                      {node?.pages && node.pages.length > 0 && (
                        <span className="flex items-center justify-center w-5 h-5 text-[rgb(var(--ec-icon-color))] group-hover:text-[rgb(var(--ec-content-text))]">
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
        {!hasVisibleEntries && favorites.length === 0 && (
          <div className="flex min-h-full flex-col items-center justify-center p-8 text-center">
            <h3 className="mb-1 text-sm font-semibold text-[rgb(var(--ec-page-text))]">Your catalog is empty</h3>
            <p className="max-w-[220px] text-sm font-light leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
              Navigation will appear here when you add resources.{' '}
              <a
                href="https://www.eventcatalog.dev/docs/tutorial/install-eventcatalog"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[rgb(var(--ec-accent))] hover:underline"
              >
                Add your first resource
              </a>
              .
            </p>
          </div>
        )}

        {hasVisibleEntries && renderEntries(currentLevel.entries)}
      </nav>

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
