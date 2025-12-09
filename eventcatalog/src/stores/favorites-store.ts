import { atom } from 'nanostores';

const FAVORITES_KEY = 'eventcatalog-sidebar-favorites';

export type FavoriteItem = {
  nodeKey: string; // The key of the favorited node
  path: string[]; // Path of keys to reach this node
  title: string; // Display title
  badge?: string; // Type badge (Domain, Service, etc.)
  href?: string; // Direct link if it's a leaf item
};

export const favoritesStore = atom<FavoriteItem[]>([]);

// Initialize store from localStorage on client side
const initStore = () => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (JSON.stringify(favoritesStore.get()) !== stored) {
          favoritesStore.set(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load favorites:', e);
    }
  }
};

if (typeof window !== 'undefined') {
  initStore();

  // Listen for storage events (cross-tab sync)
  window.addEventListener('storage', (e) => {
    if (e.key === FAVORITES_KEY) {
      initStore();
    }
  });

  // Listen for custom events (same-tab sync between instances)
  window.addEventListener('favorites-updated', () => {
    initStore();
  });
}

export const saveFavorites = (favorites: FavoriteItem[]) => {
  favoritesStore.set(favorites);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      // Dispatch event to notify other store instances/components
      window.dispatchEvent(new CustomEvent('favorites-updated'));
    } catch (e) {
      console.warn('Failed to save favorites:', e);
    }
  }
};

export const addFavorite = (item: FavoriteItem) => {
  const current = favoritesStore.get();
  const exists = current.some((fav) => fav.nodeKey === item.nodeKey);
  if (!exists) {
    saveFavorites([...current, item]);
  }
};

export const removeFavorite = (nodeKey: string) => {
  const current = favoritesStore.get();
  saveFavorites(current.filter((fav) => fav.nodeKey !== nodeKey));
};

export const toggleFavorite = (item: FavoriteItem) => {
  const current = favoritesStore.get();
  const exists = current.some((fav) => fav.nodeKey === item.nodeKey);

  if (exists) {
    removeFavorite(item.nodeKey);
  } else {
    addFavorite(item);
  }
};
