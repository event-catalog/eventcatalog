import { useSyncExternalStore } from 'react';
import { DEFAULT_THEME, themeStore } from '@stores/theme-store';

const subscribe = (onChange: () => void) => themeStore.listen(onChange);
const getSnapshot = () => themeStore.get() === 'dark';

// On the client the store is initialised from localStorage before React hydrates, so it can
// already differ from the value the server rendered with. React 18 keeps the server's inline
// `style` attributes when they mismatch during hydration, which left dark-theme syntax colours
// (and text-shadow) on light-mode pages until the component remounted. Hydrate with the server
// value instead; React re-renders with the real client value straight after.
const getServerSnapshot = () => DEFAULT_THEME === 'dark';

export function useDarkMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
