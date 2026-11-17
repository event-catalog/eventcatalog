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
  buildNodeLookup,
  canCollapseGroup,
  findNodeKeyByUrl,
  getBadgeClasses,
  isResourceRef,
  getResourcePageHref,
  getDefaultCollapsedState,
  isGroupCollapsed,
  resolveNavRef,
  rootLevel,
  stripBasePath,
  toggleGroupCollapsed,
  type NavigationLevel,
  type SidebarSnapshot,
} from './utils';
import { resolveIconUrl } from '@utils/icon';

const cn = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

/** The pages every resource has, each with an icon of its own (not their section's, which would make them all alike) */
const PAGE_ICONS: Record<string, string> = {
  Overview: 'FileText',
  Resources: 'Layers',
  'Owned Resources': 'Layers',
  'Ubiquitous Language': 'BookA',
};

/** Each resource type's icon (as the sidebar data gives its other rows), for rows whose data has none, e.g. domains */
const TYPE_ICONS: Record<string, string> = {
  domain: 'Boxes',
  system: 'Group',
  service: 'Server',
  agent: 'Bot',
  event: 'Zap',
  command: 'MessageSquare',
  query: 'Search',
  channel: 'ArrowRightLeft',
  container: 'Database',
  entity: 'Box',
  flow: 'Waypoints',
  'data-product': 'Package',
  adr: 'ClipboardList',
  team: 'Users',
  user: 'User',
};

// ============================================
// Component
// ============================================

type NestedSideBarProps = {
  /**
   * This page's level, built on the server. It renders the sidebar into the HTML and keeps
   * the island showing it until the full navigation data (sidebar-data.json) is loaded.
   */
  snapshot?: SidebarSnapshot;
};

export default function NestedSideBar({ snapshot }: NestedSideBarProps) {
  const storeData = useStore(sidebarStore);
  const favorites = useStore(favoritesStore);
  // Drill-down, restoring state and favorites need the whole catalog; until it loads the
  // snapshot only shows this page's level
  const hasFullData = storeData !== null;
  const data = storeData ?? snapshot?.data ?? null;

  // Guard against undefined data (e.g., during hydration)
  // Use useMemo to ensure stable references for roots and nodes
  const roots = useMemo(() => data?.roots ?? [], [data?.roots]);
  const nodes = useMemo(() => data?.nodes ?? {}, [data?.nodes]);

  const [navigationStack, setNavigationStack] = useState<NavigationLevel[]>(
    () => snapshot?.stack ?? [{ key: null, entries: [], title: 'Documentation' }]
  );
  const [animationKey, setAnimationKey] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward' | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>(snapshot?.url ?? '');
  const [sectionCollapsePreferences, setSectionCollapsePreferences] = useState(loadCollapsedSections);
  const [showPathPreview, setShowPathPreview] = useState(false);
  const [showFullPath, setShowFullPath] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  // Build a lookup map for faster URL navigation
  // Map format: "type:id" -> "nodeKey"
  const nodeLookup = useMemo(() => buildNodeLookup(nodes), [nodes]);

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
          return [rootLevel(roots)];
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
  const resolveRef = useCallback((ref: ChildRef): NavNode | null => resolveNavRef(nodes, ref), [nodes]);

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
      const stack: NavigationLevel[] = [rootLevel(roots)];

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
              rootLevel(roots),
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
          return [rootLevel(roots)];
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
    if (!hasFullData || roots.length === 0 || isInitialized) return;

    const currentUrl = window.location.pathname;
    const normalizedCurrentUrl = stripBasePath(currentUrl);

    // Force root navigation on homepage
    if (normalizedCurrentUrl === '/' || normalizedCurrentUrl === '') {
      setNavigationStack([rootLevel(roots)]);
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
          rootLevel(roots),
          { key: targetKey, entries: targetNode.pages, title: targetNode.title, badge: targetNode.badge },
        ];
      }
    }

    // 3. Fallback to root
    if (!finalStack) {
      setNavigationStack([rootLevel(roots)]);
    } else {
      setNavigationStack(finalStack);
    }

    setIsInitialized(true);
  }, [hasFullData, roots, isInitialized, buildStackFromPath, findNodeKeyForUrl, tryConnectStack, resolveRef]);

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
   * A new page's sidebar starts at the top, with the selected item nudged into view if it's further down. Going Back
   * up a level returns to where that level was scrolled. `block: 'nearest'` never scrolls when the item is already
   * visible, so clicking around near the top doesn't jump.
   */
  useEffect(() => {
    if (!isInitialized) return;
    const nav = navRef.current;
    if (!nav) return;

    if (slideDirection === 'backward') {
      const savedScrollTop = loadScrollPosition(getCurrentPath().join('/') || 'root');
      if (savedScrollTop !== null) nav.scrollTop = savedScrollTop;
    }

    const active = nav.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;

    const navRect = nav.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const isVisible = activeRect.top >= navRect.top && activeRect.bottom <= navRect.bottom;
    if (!isVisible) active.scrollIntoView({ block: 'nearest' });
  }, [isInitialized, currentPath, navigationStack, getCurrentPath, slideDirection]);

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
        <div className="flex h-[var(--ec-header-height)] items-center px-4 bg-[rgb(var(--ec-rail-bg)/0.98)] backdrop-blur-sm border-b border-[rgb(var(--ec-content-border))] sticky top-0 z-10">
          <span className="text-[13px] font-semibold text-[rgb(var(--ec-page-text))] truncate">All resources</span>
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
    if (!hasFullData) return;
    if (node.pages && node.pages.length > 0) {
      setSlideDirection('forward');
      setAnimationKey((prev) => prev + 1);
      const newStack = [...navigationStack, { key: nodeKey, entries: node.pages, title: node.title, badge: node.badge }];
      setNavigationStack(newStack);
      // Reset hover states to prevent showing path preview immediately after navigation
      setShowPathPreview(false);
      setShowFullPath(false);

      // And open the resource's own page (its Overview), where it has one: a list (Browse > Domains) just drills in.
      // The path drilled through is saved (see below) and put back on that page, so Back still goes where you came from
      const href = getResourcePageHref(node);
      if (href && !urlsMatch(href, currentPath)) {
        import('astro:transitions/client')
          .then(({ navigate }) => navigate(href))
          .catch(() => {
            window.location.href = href;
          });
      }
    }
  };

  /**
   * Navigate back one level
   */
  const navigateBack = () => {
    if (hasFullData && navigationStack.length > 1) {
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
    if (hasFullData && levelIndex < navigationStack.length - 1) {
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
    if (!hasFullData) return;
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
          <div key={`items-${result.length}`} className="flex flex-col gap-px mb-1">
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
    // Groups are small muted labels with a count (nested ones keep their icon and hang off a guide line)
    // A count only on a list of resources (e.g. Systems, Integration Events, Entities, Owners), not on pages
    // (Overview, Guides) or the browse lists
    const selfId = currentLevel.key?.split(':')[1];
    const isResourceList = visibleChildren.length > 0 && visibleChildren.every((ref) => isResourceRef(ref, selfId));

    const chevron = canCollapse && (
      <ChevronDown
        className={cn(
          'w-3.5 h-3.5 flex-shrink-0 text-[rgb(var(--ec-page-text-muted))] opacity-0 transition group-hover:opacity-100',
          !isResourceList && 'ml-auto',
          isCollapsed && '-rotate-90 opacity-100'
        )}
      />
    );
    // A level's sections are small light labels over darker rows, a little space between sections; a section inside
    // one is a sub-heading with its icon, its rows hanging off a guide line
    const header = (
      <>
        {isNested && GroupIcon && <GroupIcon className="w-3.5 h-3.5 flex-shrink-0 text-[rgb(var(--ec-page-text-muted)/0.75)]" />}
        <span
          className={cn(
            'truncate',
            isNested
              ? 'text-[12.5px] font-medium text-[rgb(var(--ec-page-text-muted))]'
              : 'text-[12px] font-medium text-[rgb(var(--ec-page-text-muted)/0.75)]'
          )}
        >
          {group.title}
        </span>
        {isResourceList && (
          <span className="ml-auto font-mono text-[11px] tabular-nums text-[rgb(var(--ec-page-text-muted)/0.6)]">
            {visibleChildren.length}
          </span>
        )}
        {chevron}
      </>
    );

    const headerClasses = cn(
      'group flex items-center w-full gap-1.5 rounded-md px-2 text-left transition-colors',
      isNested ? 'h-7' : 'h-6 mb-0.5',
      canCollapse && 'cursor-pointer hover:text-[rgb(var(--ec-page-text))]'
    );

    // Rows hang off a tree line: down the section, with a branch into each row (see .ec-sidebar-tree below)
    const childrenClasses = cn('ec-sidebar-tree flex flex-col', isNested ? 'ml-[15px] mt-px mb-1' : 'ml-2.5');

    return (
      <div key={`group-${groupKey || index}`} className={cn(isNested ? 'mt-0.5' : 'mt-3.5 first:mt-0')}>
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

              return renderItem(child, childKey, childIndex, group.icon);
            })}
          </div>
        )}
      </div>
    );
  };

  /**
   * Render a single item
   */
  const renderItem = (item: NavNode, itemKey: string | null, index: number, groupIcon?: string) => {
    const itemHasChildren = hasChildren(item);
    const isActive = urlsMatch(item.href, currentPath) || (itemKey !== null && itemKey === activeNodeKey);
    const isFav = isFavorited(itemKey);
    const canFavorite = itemKey !== null; // Only items with keys can be favorited

    // A resource's own icon (item.leftIcon, e.g. a technology's logo) shows alone; its own docs (guides, runbooks) show
    // none. Otherwise the first of its icon, its type's, its page's (Overview, Resources), its group's or a page that
    // exists (the data can name one the icon set doesn't have)
    const icons = LucideIcons as unknown as Record<string, LucideIcons.LucideIcon | undefined>;
    const IconComponent =
      item.doc || item.leftIcon
        ? null
        : ([
            item.icon,
            itemKey ? TYPE_ICONS[itemKey.slice(0, itemKey.indexOf(':'))] : undefined,
            PAGE_ICONS[item.title],
            groupIcon,
            'FileText',
          ]
            .map((name) => (name ? icons[name] : undefined))
            .find(Boolean) ?? null);
    const handleStarClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(itemKey, item);
    };

    const content = (
      <>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {IconComponent && (
            <IconComponent
              className={cn(
                'w-4 h-4 flex-shrink-0 transition-colors',
                isActive
                  ? 'text-[rgb(var(--ec-page-text))]'
                  : 'text-[rgb(var(--ec-page-text-muted)/0.7)] group-hover:text-[rgb(var(--ec-page-text)/0.85)]'
              )}
            />
          )}
          {/* A row's own icon (a schema format, a technology's logo) in greys, as the other icons are (.ec-mono-icon) */}
          {item.leftIcon && (
            <img
              src={resolveIconUrl(item.leftIcon)}
              alt=""
              aria-hidden="true"
              className={cn('ec-mono-icon w-4 h-4 flex-shrink-0 object-contain', isActive && 'ec-mono-icon--active')}
            />
          )}
          <span
            className={cn(
              'text-[13px] truncate transition-colors',
              isActive
                ? 'text-[rgb(var(--ec-page-text))] font-medium'
                : 'text-[rgb(var(--ec-page-text-muted))] group-hover:text-[rgb(var(--ec-page-text))]'
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
                  : 'text-[rgb(var(--ec-page-text-muted))] opacity-0 group-hover:opacity-100 hover:text-amber-400'
              )}
            >
              <Star className={cn('w-3.5 h-3.5', isFav && 'fill-current')} />
            </div>
          )}
          {itemHasChildren && (
            <ChevronRight className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100" />
          )}
        </div>
      </>
    );

    // Rows: a faint wash on hover, a stronger one for the current page
    const baseClasses =
      'group flex items-center justify-between w-full h-[30px] px-2 rounded-md cursor-pointer text-left transition-colors hover:bg-[rgb(var(--ec-page-text)/0.045)]';
    const activeClasses = isActive ? 'bg-[rgb(var(--ec-page-text)/0.075)] hover:bg-[rgb(var(--ec-page-text)/0.075)]' : '';

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
          className={cn(baseClasses, activeClasses)}
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
        className={cn(baseClasses, activeClasses)}
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
        <div className="flex h-[var(--ec-header-height)] items-center px-4 bg-[rgb(var(--ec-rail-bg)/0.98)] backdrop-blur-sm border-b border-[rgb(var(--ec-content-border))] sticky top-0 z-10">
          <span className="text-[13px] font-semibold text-[rgb(var(--ec-page-text))] truncate">All resources</span>
        </div>
      )}

      {!isTopLevel && (
        <div
          className="flex h-[var(--ec-header-height)] items-center px-4 bg-[rgb(var(--ec-rail-bg)/0.98)] backdrop-blur-sm border-b border-[rgb(var(--ec-content-border))] sticky top-0 z-10"
          onMouseEnter={() => !isTopLevel && setShowPathPreview(true)}
          onMouseLeave={() => {
            setShowPathPreview(false);
            setShowFullPath(false);
          }}
        >
          {/* Back, and where you are (its type on the right) */}
          <button
            onClick={navigateBack}
            disabled={isTopLevel}
            aria-label={`Back to ${navigationStack[navigationStack.length - 2]?.title || 'All resources'}`}
            className="group flex items-center gap-2 w-full min-w-0 rounded-md px-1.5 py-1 -mx-1.5 text-left transition-colors hover:bg-[rgb(var(--ec-page-text)/0.045)]"
          >
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-[rgb(var(--ec-page-text-muted))] transition group-hover:-translate-x-0.5 group-hover:text-[rgb(var(--ec-page-text))]">
              <ChevronLeft className="w-4 h-4" />
            </span>
            {/* The resource's own icon (a technology's logo) before its name, in greys as the rows draw it */}
            {(() => {
              const leftIcon = currentLevel.key ? resolveRef(currentLevel.key)?.leftIcon : undefined;
              return leftIcon ? (
                <img
                  src={resolveIconUrl(leftIcon)}
                  alt=""
                  aria-hidden="true"
                  className="ec-mono-icon ec-mono-icon--active h-4 w-4 flex-shrink-0 object-contain"
                />
              ) : null;
            })()}
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[rgb(var(--ec-page-text))]">
              {currentLevel.title}
            </span>
            {/* The type as a tag, as the page shows it under its title (icon and name in a hairline chip) */}
            {currentLevel.badge &&
              (() => {
                const typeKey = currentLevel.key ? currentLevel.key.slice(0, currentLevel.key.indexOf(':')) : '';
                const TypeIcon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon | undefined>)[
                  TYPE_ICONS[typeKey] ?? ''
                ];
                return (
                  <span className="ml-auto inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] px-1.5 py-0.5 text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))]">
                    {TypeIcon && <TypeIcon className="h-3 w-3" aria-hidden="true" />}
                    {currentLevel.badge}
                  </span>
                );
              })()}
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
        className={cn('min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pt-2.5 pb-6', getAnimationClass())}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(var(--ec-content-border)) transparent',
        }}
      >
        {/* Favorites Section */}
        {favorites.length > 0 && isTopLevel && (
          <div className="mb-3.5">
            <div className="mb-0.5 flex h-6 items-center gap-1.5 px-2">
              <Star className="w-3 h-3 text-amber-400 fill-current" />
              <span className="text-[12px] font-medium text-[rgb(var(--ec-page-text-muted)/0.75)]">Favorites</span>
              <span className="ml-auto font-mono text-[11px] tabular-nums text-[rgb(var(--ec-page-text-muted)/0.6)]">
                {favorites.length}
              </span>
            </div>
            <div className="ec-sidebar-tree ml-2.5 flex flex-col">
              {favorites.map((fav, index) => {
                const node = resolveRef(fav.nodeKey);
                // The resource's icon, as its row elsewhere in the sidebar shows it (its own, else its type's)
                const favIcons = LucideIcons as unknown as Record<string, LucideIcons.LucideIcon | undefined>;
                const FavIcon = node?.leftIcon
                  ? null
                  : (node?.icon && favIcons[node.icon]) ||
                    favIcons[TYPE_ICONS[fav.nodeKey.slice(0, fav.nodeKey.indexOf(':'))] ?? ''] ||
                    null;
                const isActive = fav.href && currentPath === fav.href;

                return (
                  <button
                    key={`fav-${index}`}
                    onClick={() => navigateToFavorite(fav)}
                    className={cn(
                      'group flex items-center justify-between w-full h-[30px] px-2 rounded-md cursor-pointer text-left transition-colors hover:bg-[rgb(var(--ec-page-text)/0.045)]',
                      isActive && 'bg-[rgb(var(--ec-page-text)/0.075)] hover:bg-[rgb(var(--ec-page-text)/0.075)]'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {node?.leftIcon ? (
                        <img
                          src={resolveIconUrl(node.leftIcon)}
                          alt=""
                          aria-hidden="true"
                          className="ec-mono-icon w-4 h-4 flex-shrink-0 object-contain"
                        />
                      ) : (
                        FavIcon && (
                          <FavIcon
                            className={cn(
                              'w-4 h-4 flex-shrink-0 transition-colors',
                              isActive
                                ? 'text-[rgb(var(--ec-page-text))]'
                                : 'text-[rgb(var(--ec-page-text-muted)/0.7)] group-hover:text-[rgb(var(--ec-page-text)/0.85)]'
                            )}
                          />
                        )
                      )}
                      <span
                        className={cn(
                          'text-[13px] truncate',
                          isActive
                            ? 'text-[rgb(var(--ec-page-text))] font-medium'
                            : 'text-[rgb(var(--ec-page-text-muted))] group-hover:text-[rgb(var(--ec-page-text))]'
                        )}
                      >
                        {fav.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
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
                        <ChevronRight className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100" />
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
                /*
                 * Tree lines: each row draws its piece of the line down the section (to its middle for the last row)
                 * and a branch into itself, so the line runs |- row, |- row, then ends at the last
                 */
                .ec-sidebar-tree {
                    padding-left: 14px;
                }
                .ec-sidebar-tree > * {
                    position: relative;
                }
                .ec-sidebar-tree > *::before,
                .ec-sidebar-tree > *::after {
                    content: '';
                    position: absolute;
                    left: -12px;
                    background: rgb(var(--ec-page-border));
                    pointer-events: none;
                }
                .ec-sidebar-tree > *::before {
                    top: 0;
                    bottom: 0;
                    width: 1px;
                }
                .ec-sidebar-tree > *:last-child::before {
                    bottom: auto;
                    height: 15px;
                }
                .ec-sidebar-tree > *::after {
                    top: 15px;
                    width: 8px;
                    height: 1px;
                }
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
