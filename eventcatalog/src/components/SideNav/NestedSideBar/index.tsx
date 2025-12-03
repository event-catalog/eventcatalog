"use client"

import { useState, useEffect, useCallback } from "react"
import * as LucideIcons from "lucide-react"
import { ChevronRight, ChevronLeft, ChevronDown, Home, Star } from "lucide-react"
import type { NavigationData, NavNode, ChildRef } from "./utils"

const cn = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ")

// ============================================
// Persistence
// ============================================

const STORAGE_KEY = 'eventcatalog-sidebar-nav'
const COLLAPSED_SECTIONS_KEY = 'eventcatalog-sidebar-collapsed'
const FAVORITES_KEY = 'eventcatalog-sidebar-favorites'

type PersistedState = {
    path: string[]      // Array of node keys representing drill-down path
    currentUrl: string  // The URL when this state was saved
}

type FavoriteItem = {
    nodeKey: string         // The key of the favorited node
    path: string[]          // Path of keys to reach this node
    title: string           // Display title
    badge?: string          // Type badge (Domain, Service, etc.)
    href?: string           // Direct link if it's a leaf item
}

const saveState = (state: PersistedState) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
        console.warn('Failed to save sidebar state:', e)
    }
}

const loadState = (): PersistedState | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : null
    } catch (e) {
        console.warn('Failed to load sidebar state:', e)
        return null
    }
}

const saveCollapsedSections = (sections: Set<string>) => {
    try {
        localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify([...sections]))
    } catch (e) {
        console.warn('Failed to save collapsed sections:', e)
    }
}

const loadCollapsedSections = (): Set<string> => {
    try {
        const stored = localStorage.getItem(COLLAPSED_SECTIONS_KEY)
        return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch (e) {
        console.warn('Failed to load collapsed sections:', e)
        return new Set()
    }
}

const saveFavorites = (favorites: FavoriteItem[]) => {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
    } catch (e) {
        console.warn('Failed to save favorites:', e)
    }
}

const loadFavorites = (): FavoriteItem[] => {
    try {
        const stored = localStorage.getItem(FAVORITES_KEY)
        return stored ? JSON.parse(stored) : []
    } catch (e) {
        console.warn('Failed to load favorites:', e)
        return []
    }
}

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
    }
    return badgeColors[badge.toLowerCase()] || 'bg-gray-100 text-gray-600'
}

// ============================================
// Component
// ============================================

type NavigationLevel = {
    key: string | null  // The key of the node that was drilled into (null for root)
    entries: ChildRef[]
    title: string
    badge?: string      // Category badge (e.g., "Domain", "Service")
}

type Props = {
    data: NavigationData
}

export default function NestedSideBar({ data }: Props) {
    // Guard against undefined data (e.g., during hydration)
    const roots = data?.roots ?? []
    const nodes = data?.nodes ?? {}

    const [navigationStack, setNavigationStack] = useState<NavigationLevel[]>([
        { key: null, entries: roots, title: "Documentation" },
    ])
    const [animationKey, setAnimationKey] = useState(0)
    const [slideDirection, setSlideDirection] = useState<"forward" | "backward" | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const [currentPath, setCurrentPath] = useState<string>('')
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
    const [showPathPreview, setShowPathPreview] = useState(false)
    const [showFullPath, setShowFullPath] = useState(false)
    const [favorites, setFavorites] = useState<FavoriteItem[]>([])

    /**
     * Toggle section collapse state
     */
    const toggleSectionCollapse = (sectionId: string) => {
        setCollapsedSections(prev => {
            const next = new Set(prev)
            if (next.has(sectionId)) {
                next.delete(sectionId)
            } else {
                next.add(sectionId)
            }
            // Save to localStorage
            saveCollapsedSections(next)
            return next
        })
    }

    /**
     * Load collapsed sections from localStorage on mount
     */
    useEffect(() => {
        const saved = loadCollapsedSections()
        if (saved.size > 0) {
            setCollapsedSections(saved)
        }
    }, [])

    /**
     * Load favorites from localStorage on mount
     */
    useEffect(() => {
        const saved = loadFavorites()
        if (saved.length > 0) {
            setFavorites(saved)
        }
    }, [])

    /**
     * Track current URL for highlighting active item
     */
    useEffect(() => {
        // Set initial path
        setCurrentPath(window.location.pathname)

        // Listen for URL changes (for client-side navigation)
        const handlePopState = () => {
            setCurrentPath(window.location.pathname)
        }

        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [])

    /**
     * Resolve a child reference to a NavNode
     */
    const resolveRef = useCallback((ref: ChildRef): NavNode | null => {
        if (typeof ref === 'string') {
            return nodes[ref] ?? null
        }
        return ref
    }, [nodes])

    /**
     * Check if a node is visible (default: true)
     */
    const isVisible = useCallback((node: NavNode | null): boolean => {
        if (!node) return false
        return node.visible !== false
    }, [])

    /**
     * Build navigation stack from a path of keys
     */
    const buildStackFromPath = useCallback((path: string[]): NavigationLevel[] => {
        const stack: NavigationLevel[] = [
            { key: null, entries: roots, title: "Documentation" }
        ]

        for (const key of path) {
            const node = nodes[key]
            if (node && node.children) {
                stack.push({
                    key,
                    entries: node.children,
                    title: node.title,
                    badge: node.badge
                })
            } else {
                // Path is invalid (node doesn't exist or has no children), stop here
                break
            }
        }

        return stack
    }, [roots, nodes])

    /**
     * Get current path from navigation stack
     */
    const getCurrentPath = useCallback((): string[] => {
        return navigationStack
            .filter(level => level.key !== null)
            .map(level => level.key as string)
    }, [navigationStack])

    /**
     * Restore state from localStorage on mount
     */
    useEffect(() => {
        if (!data || roots.length === 0) return
        if (isInitialized) return

        const savedState = loadState()

        if (savedState && savedState.path.length > 0) {
            // Rebuild the stack from saved path
            const restoredStack = buildStackFromPath(savedState.path)
            setNavigationStack(restoredStack)
        } else {
            // No saved state, start fresh
            setNavigationStack([{ key: null, entries: roots, title: "Documentation" }])
        }

        setIsInitialized(true)
    }, [data, roots, buildStackFromPath, isInitialized])

    /**
     * Save state whenever navigation changes
     */
    useEffect(() => {
        if (!isInitialized) return

        const path = getCurrentPath()
        saveState({
            path,
            currentUrl: window.location.pathname
        })
    }, [navigationStack, isInitialized, getCurrentPath])

    // Show loading state if no data yet
    if (!data || roots.length === 0) {
        return (
            <aside className="w-[320px] h-screen flex flex-col bg-gray-50 border-r border-gray-200">
                <div className="px-3 py-2 bg-white border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-900">Loading...</span>
                </div>
            </aside>
        )
    }

    const currentLevel = navigationStack[navigationStack.length - 1]

    /**
     * Check if a node is a section
     */
    const isSection = (node: NavNode): boolean => node.type === 'section'

    /**
     * Check if a node has children
     */
    const hasChildren = (node: NavNode): boolean => {
        return (node.children?.length ?? 0) > 0
    }

    /**
     * Check if a section has any visible children
     */
    const hasVisibleChildren = (node: NavNode): boolean => {
        if (!node.children) return false
        return node.children.some(childRef => {
            const child = resolveRef(childRef)
            return isVisible(child)
        })
    }

    /**
     * Handle drilling down into an item with children
     */
    const handleDrillDown = (node: NavNode, nodeKey: string | null) => {
        if (node.children && node.children.length > 0) {
            setSlideDirection("forward")
            setAnimationKey(prev => prev + 1)
            const newStack = [
                ...navigationStack,
                { key: nodeKey, entries: node.children, title: node.title, badge: node.badge }
            ]
            setNavigationStack(newStack)
        }
    }

    /**
     * Navigate back one level
     */
    const navigateBack = () => {
        if (navigationStack.length > 1) {
            setSlideDirection("backward")
            setAnimationKey(prev => prev + 1)
            setNavigationStack(navigationStack.slice(0, -1))
        }
    }

    /**
     * Navigate to a specific level in the stack
     */
    const navigateToLevel = (levelIndex: number) => {
        if (levelIndex < navigationStack.length - 1) {
            setSlideDirection("backward")
            setAnimationKey(prev => prev + 1)
            setNavigationStack(navigationStack.slice(0, levelIndex + 1))
            setShowPathPreview(false)
        }
    }

    /**
     * Check if a node is favorited
     */
    const isFavorited = useCallback((nodeKey: string | null): boolean => {
        if (!nodeKey) return false
        return favorites.some(fav => fav.nodeKey === nodeKey)
    }, [favorites])

    /**
     * Toggle favorite status for a node
     */
    const toggleFavorite = (nodeKey: string | null, node: NavNode) => {
        if (!nodeKey) return

        setFavorites(prev => {
            const existing = prev.find(fav => fav.nodeKey === nodeKey)
            let next: FavoriteItem[]

            if (existing) {
                // Remove from favorites
                next = prev.filter(fav => fav.nodeKey !== nodeKey)
            } else {
                // Add to favorites with current path
                const newFavorite: FavoriteItem = {
                    nodeKey,
                    path: getCurrentPath(),
                    title: node.title,
                    badge: node.badge,
                    href: node.href
                }
                next = [...prev, newFavorite]
            }

            saveFavorites(next)
            return next
        })
    }

    /**
     * Navigate to a favorited item
     */
    const navigateToFavorite = (favorite: FavoriteItem) => {
        // If it has an href and no children, just navigate to the URL
        const node = nodes[favorite.nodeKey]
        if (favorite.href && (!node?.children || node.children.length === 0)) {
            window.location.href = favorite.href
            return
        }

        // Build the stack to this favorite
        const stack = buildStackFromPath(favorite.path)

        // If the node has children, add it to the stack
        if (node && node.children && node.children.length > 0) {
            stack.push({
                key: favorite.nodeKey,
                entries: node.children,
                title: node.title,
                badge: node.badge
            })
        }

        setSlideDirection("forward")
        setAnimationKey(prev => prev + 1)
        setNavigationStack(stack)
    }

    const isTopLevel = navigationStack.length === 1

    /**
     * Render a list of child refs (resolving keys as needed)
     */
    const renderEntries = (refs: ChildRef[]) => {
        const result: React.ReactNode[] = []
        let currentItemGroup: { node: NavNode; key: string | null }[] = []

        const flushItemGroup = () => {
            if (currentItemGroup.length > 0) {
                result.push(
                    <div key={`items-${result.length}`} className="flex flex-col gap-0.5 mb-2">
                        {currentItemGroup.map((item, idx) => renderItem(item.node, item.key, idx))}
                    </div>
                )
                currentItemGroup = []
            }
        }

        refs.forEach((ref, index) => {
            const node = resolveRef(ref)
            if (!node) return

            // Skip invisible nodes
            if (!isVisible(node)) return

            // Track the key if this is a reference
            const nodeKey = typeof ref === 'string' ? ref : null

            if (isSection(node)) {
                // Skip sections with no visible children
                if (!hasVisibleChildren(node)) return

                flushItemGroup()
                result.push(renderSection(node, nodeKey, index))
            } else {
                currentItemGroup.push({ node, key: nodeKey })
            }
        })

        flushItemGroup()
        return result
    }

    /**
     * Render a section with its children
     */
    const renderSection = (section: NavNode, sectionKey: string | null, index: number) => {
        // Get optional icon for section
        const SectionIcon = section.icon
            ? (LucideIcons as Record<string, LucideIcons.LucideIcon>)[section.icon]
            : null

        // Get visible children
        const visibleChildren = section.children?.filter(childRef => {
            const child = resolveRef(childRef)
            return child && isVisible(child)
        }) ?? []

        const sectionId = sectionKey || `section-${index}`
        const isCollapsed = collapsedSections.has(sectionId)
        const canCollapse = visibleChildren.length > 3

        const headerContent = (
            <>
                <div className="flex items-center">
                    {SectionIcon && (
                        <span className="mr-2 text-gray-900">
                            <SectionIcon className="w-3.5 h-3.5" />
                        </span>
                    )}
                    <span className="text-sm text-black font-semibold">
                        {section.title}
                    </span>
                </div>
                {canCollapse && (
                    <ChevronDown className={cn(
                        "w-4 h-4 text-gray-400 transition-transform",
                        isCollapsed && "-rotate-90"
                    )} />
                )}
            </>
        )

        return (
            <div key={`section-${sectionKey || index}`} className="mb-6 last:mb-2">
                {canCollapse ? (
                    <button
                        onClick={() => toggleSectionCollapse(sectionId)}
                        className="flex items-center justify-between w-full px-2 py-2 pb-2 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                    >
                        {headerContent}
                    </button>
                ) : (
                    <div className="flex items-center justify-between px-2 py-2 pb-2">
                        {headerContent}
                    </div>
                )}
                {!isCollapsed && (
                    <div className="flex flex-col gap-0.5 border-l ml-3.5 border-gray-100">
                        {visibleChildren.map((childRef, childIndex) => {
                            const child = resolveRef(childRef)
                            if (!child) return null

                            const childKey = typeof childRef === 'string' ? childRef : null

                            if (isSection(child)) {
                                // Skip nested sections with no visible children
                                if (!hasVisibleChildren(child)) return null

                                return (
                                    <div key={`nested-section-${childKey || childIndex}`} className="ml-3 mt-2 pl-3 border-l border-gray-200">
                                        {renderSection(child, childKey, childIndex)}
                                    </div>
                                )
                            }
                            return renderItem(child, childKey, childIndex)
                        })}
                    </div>
                )}
            </div>
        )
    }

    /**
     * Render a single item
     */
    const renderItem = (item: NavNode, itemKey: string | null, index: number) => {
        const itemHasChildren = hasChildren(item)
        const isActive = item.href && currentPath === item.href
        const isFav = isFavorited(itemKey)
        const canFavorite = itemKey !== null // Only items with keys can be favorited

        // Get icon component from lucide-react
        const IconComponent = item.icon
            ? (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[item.icon]
            : null

        const handleStarClick = (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            toggleFavorite(itemKey, item)
        }

        const content = (
            <>
                <div className="flex items-center gap-2.5 min-w-0 flex-1 ">
                    {IconComponent && (
                        <span className={cn(
                            "flex items-center justify-center w-5 h-5 flex-shrink-0",
                            isActive ? "text-purple-600" : "text-gray-500"
                        )}>
                            <IconComponent className="w-4 h-4" />
                        </span>
                    )}
                    <span className={cn(
                        "text-[14px] truncate",
                        isActive ? "text-purple-600 font-medium" : "text-gray-600 group-hover:text-gray-900"
                    )}>
                        {item.title}
                    </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {canFavorite && (
                        <button
                            onClick={handleStarClick}
                            className={cn(
                                "flex items-center justify-center w-5 h-5 rounded transition-colors",
                                isFav
                                    ? "text-amber-400 hover:text-amber-500"
                                    : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-400"
                            )}
                        >
                            <Star className={cn("w-3.5 h-3.5", isFav && "fill-current")} />
                        </button>
                    )}
                    {itemHasChildren && (
                        <span className="flex items-center justify-center w-5 h-5 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-transform">
                            <ChevronRight className="w-4 h-4" />
                        </span>
                    )}
                </div>
            </>
        )

        const baseClasses = "group flex items-center justify-between w-full px-3 py-1.5 rounded-lg cursor-pointer text-left transition-colors hover:bg-gray-100 active:bg-gray-200"
        const parentClasses = itemHasChildren ? "font-medium" : ""
        const activeClasses = isActive ? "bg-purple-100 hover:bg-purple-100 border-l-4 border-purple-600 rounded-l-none" : ""

        // Leaf item with href → render as link
        if (item.href && !itemHasChildren) {
            return (
                <a
                    key={`item-${itemKey || index}`}
                    href={item.href}
                    className={cn(baseClasses, parentClasses, activeClasses)}
                >
                    {content}
                </a>
            )
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
        )
    }

    // Animation classes
    const getAnimationClass = () => {
        if (slideDirection === "forward") return "animate-slide-in-right"
        if (slideDirection === "backward") return "animate-slide-in-left"
        return ""
    }

    return (
        <aside className="w-[350px] h-screen flex flex-col bg-gray-50  font-sans">
            {/* Back Navigation */}
            <div
                className="px-3 py-2 bg-white border-b border-gray-200 sticky top-0 z-10 relative"
                onMouseEnter={() => !isTopLevel && setShowPathPreview(true)}
                onMouseLeave={() => {
                    setShowPathPreview(false)
                    setShowFullPath(false)
                }}
            >
                <button
                    onClick={navigateBack}
                    disabled={isTopLevel}
                    className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 -mx-2 rounded-md transition-colors",
                        !isTopLevel && "hover:bg-gray-100 cursor-pointer",
                        isTopLevel && "cursor-default"
                    )}
                >
                    <span className={cn(
                        "flex items-center justify-center w-5 h-5 text-gray-500 transition-all",
                        isTopLevel && "opacity-0",
                        !isTopLevel && "group-hover:-translate-x-0.5"
                    )}>
                        <ChevronLeft className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-semibold text-gray-900 truncate">
                        {currentLevel.title}
                    </span>
                    {currentLevel.badge && (
                        <span className={cn(
                            "ml-auto px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded",
                            getBadgeClasses(currentLevel.badge)
                        )}>
                            {currentLevel.badge}
                        </span>
                    )}
                </button>

                {/* Path Preview Dropdown */}
                {showPathPreview && navigationStack.length > 1 && (
                    <div className="absolute left-0 right-0 top-full bg-white border-b border-gray-200 shadow-lg z-20">
                        <div className="px-3 py-2">
                            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                                Navigation Path
                            </div>
                            <div className="flex flex-col gap-0.5">
                                {(() => {
                                    const SHOW_FIRST = 2  // Show first N items
                                    const SHOW_LAST = 2   // Show last N items (including current)
                                    const totalItems = navigationStack.length
                                    const hiddenCount = totalItems - SHOW_FIRST - SHOW_LAST
                                    const shouldTruncate = hiddenCount > 0 && !showFullPath

                                    const renderPathItem = (level: NavigationLevel, index: number, displayIndex: number) => {
                                        const isCurrentLevel = index === navigationStack.length - 1
                                        return (
                                            <button
                                                key={`path-${index}`}
                                                onClick={() => navigateToLevel(index)}
                                                disabled={isCurrentLevel}
                                                className={cn(
                                                    "flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors",
                                                    !isCurrentLevel && "hover:bg-gray-100 cursor-pointer",
                                                    isCurrentLevel && "bg-purple-50 cursor-default"
                                                )}
                                                style={{ paddingLeft: `${(displayIndex * 12) + 8}px` }}
                                            >
                                                {index === 0 ? (
                                                    <Home className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                ) : (
                                                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                                )}
                                                <span className={cn(
                                                    "text-sm truncate",
                                                    isCurrentLevel ? "font-medium text-purple-700" : "text-gray-600"
                                                )}>
                                                    {level.title}
                                                </span>
                                                {level.badge && (
                                                    <span className={cn(
                                                        "ml-auto px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide rounded flex-shrink-0",
                                                        getBadgeClasses(level.badge)
                                                    )}>
                                                        {level.badge}
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    }

                                    if (shouldTruncate) {
                                        return (
                                            <>
                                                {/* First N items */}
                                                {navigationStack.slice(0, SHOW_FIRST).map((level, index) =>
                                                    renderPathItem(level, index, index)
                                                )}

                                                {/* Collapsed middle section */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setShowFullPath(true)
                                                    }}
                                                    className="flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors hover:bg-gray-100 cursor-pointer"
                                                    style={{ paddingLeft: `${(SHOW_FIRST * 12) + 8}px` }}
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
                                                    const actualIndex = totalItems - SHOW_LAST + sliceIndex
                                                    return renderPathItem(level, actualIndex, SHOW_FIRST + 1 + sliceIndex)
                                                })}
                                            </>
                                        )
                                    }

                                    // Show full path
                                    return navigationStack.map((level, index) =>
                                        renderPathItem(level, index, index)
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Content */}
            <nav
                key={animationKey}
                className={cn(
                    "flex-1 overflow-y-auto overflow-x-hidden p-3",
                    getAnimationClass()
                )}
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#e5e7eb transparent'
                }}
            >
                {/* Favorites Section */}
                {favorites.length > 0 && isTopLevel && (
                    <div className="mb-6">
                        <div className="flex items-center px-2 py-2 pb-2">
                            <Star className="w-3.5 h-3.5 mr-2 text-amber-400 fill-current" />
                            <span className="text-sm text-black font-semibold">
                                Favorites
                            </span>
                        </div>
                        <div className="flex flex-col gap-0.5 border-l ml-3.5 border-amber-200">
                            {favorites.map((fav, index) => {
                                const node = nodes[fav.nodeKey]
                                const isActive = fav.href && currentPath === fav.href

                                return (
                                    <button
                                        key={`fav-${index}`}
                                        onClick={() => navigateToFavorite(fav)}
                                        className={cn(
                                            "group flex items-center justify-between w-full px-3 py-1.5 rounded-lg cursor-pointer text-left transition-colors hover:bg-amber-50 active:bg-amber-100",
                                            isActive && "bg-purple-100 hover:bg-purple-100 border-l-4 border-purple-600 rounded-l-none"
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <span className={cn(
                                                "text-[14px] truncate",
                                                isActive ? "text-purple-600 font-medium" : "text-gray-600 group-hover:text-gray-900"
                                            )}>
                                                {fav.title}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {fav.badge && (
                                                <span className={cn(
                                                    "px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide rounded",
                                                    getBadgeClasses(fav.badge)
                                                )}>
                                                    {fav.badge}
                                                </span>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (node) toggleFavorite(fav.nodeKey, node)
                                                }}
                                                className="flex items-center justify-center w-5 h-5 text-amber-400 hover:text-amber-500 rounded transition-colors"
                                            >
                                                <Star className="w-3.5 h-3.5 fill-current" />
                                            </button>
                                            {node?.children && node.children.length > 0 && (
                                                <span className="flex items-center justify-center w-5 h-5 text-gray-400 group-hover:text-purple-500">
                                                    <ChevronRight className="w-4 h-4" />
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {renderEntries(currentLevel.entries)}
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
    )
}
