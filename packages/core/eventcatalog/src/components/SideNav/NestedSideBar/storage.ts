import { createSectionCollapsePreferences, type SectionCollapsePreferences } from './utils';

// ============================================
// Local Storage Persistence
// ============================================

const STORAGE_KEY = 'eventcatalog-sidebar-nav';
const SECTION_PREFERENCES_KEY = 'eventcatalog-sidebar-sections:v2';
const FAVORITES_KEY = 'eventcatalog-sidebar-favorites';
const SCROLL_KEY = 'eventcatalog-sidebar-scroll';

// ============================================
// Types
// ============================================

export type PersistedState = {
  path: string[]; // Array of node keys representing drill-down path
  currentUrl: string; // The URL when this state was saved
};

export type FavoriteItem = {
  nodeKey: string; // The key of the favorited node
  path: string[]; // Path of keys to reach this node
  title: string; // Display title
  badge?: string; // Type badge (Domain, Service, etc.)
  href?: string; // Direct link if it's a leaf item
};

// ============================================
// Navigation State
// ============================================

export const saveState = (state: PersistedState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save sidebar state:', e);
  }
};

export const loadState = (): PersistedState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn('Failed to load sidebar state:', e);
    return null;
  }
};

// ============================================
// Scroll position
// ============================================

/**
 * The sidebar remounts on every full page load, which resets its scroll offset to the
 * top. Persist it (per tab) so the list looks stationary when you follow a link near
 * the bottom. Keyed by the drilled-down path so a different level starts fresh.
 */
export const saveScrollPosition = (pathKey: string, scrollTop: number): void => {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ pathKey, scrollTop }));
  } catch (e) {
    console.warn('Failed to save sidebar scroll position:', e);
  }
};

export const loadScrollPosition = (pathKey: string): number | null => {
  try {
    const stored = sessionStorage.getItem(SCROLL_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.pathKey === pathKey && typeof parsed.scrollTop === 'number' ? parsed.scrollTop : null;
  } catch (e) {
    console.warn('Failed to load sidebar scroll position:', e);
    return null;
  }
};

// ============================================
// Collapsed Sections
// ============================================

export const saveCollapsedSections = (preferences: SectionCollapsePreferences): void => {
  try {
    localStorage.setItem(
      SECTION_PREFERENCES_KEY,
      JSON.stringify({ expanded: [...preferences.expanded], collapsed: [...preferences.collapsed] })
    );
  } catch (e) {
    console.warn('Failed to save collapsed sections:', e);
  }
};

export const loadCollapsedSections = (): SectionCollapsePreferences => {
  try {
    const stored = localStorage.getItem(SECTION_PREFERENCES_KEY);
    if (stored) {
      const preferences = JSON.parse(stored);
      return createSectionCollapsePreferences(
        Array.isArray(preferences.expanded) ? preferences.expanded : [],
        Array.isArray(preferences.collapsed) ? preferences.collapsed : []
      );
    }

    return createSectionCollapsePreferences();
  } catch (e) {
    console.warn('Failed to load collapsed sections:', e);
    return createSectionCollapsePreferences();
  }
};

// ============================================
// Favorites
// ============================================

export const saveFavorites = (favorites: FavoriteItem[]): void => {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (e) {
    console.warn('Failed to save favorites:', e);
  }
};

export const loadFavorites = (): FavoriteItem[] => {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn('Failed to load favorites:', e);
    return [];
  }
};
