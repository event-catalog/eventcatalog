// Who you are in Studio: the name you give on your first visit, kept in this browser and used on every canvas
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
const NAME_KEY = 'eventcatalog-studio-name';
/** Names people give are at most this long */
export const MAX_NAME_LENGTH = 60;

export const getStoredName = () => {
  try {
    return localStorage.getItem(NAME_KEY);
  } catch {
    return null;
  }
};

/** Whether it was kept (storage can be blocked, e.g. in some private windows) */
export const storeName = (name: string) => {
  try {
    localStorage.setItem(NAME_KEY, name);
    return true;
  } catch {
    return false;
  }
};

/** Your name changing in another tab (the event only fires in the other tabs) */
export const onStoredNameChange = (listener: (name: string | null) => void) => {
  const handle = (event: StorageEvent) => event.key === NAME_KEY && listener(event.newValue);
  window.addEventListener('storage', handle);
  return () => window.removeEventListener('storage', handle);
};

// Same name, same colour across reloads
export const colorForName = (name: string) => {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
};
