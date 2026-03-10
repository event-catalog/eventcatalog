import { useStore } from '@nanostores/react';
import { themeStore } from '@stores/theme-store';

export function useDarkMode(): boolean {
  const theme = useStore(themeStore);
  return theme === 'dark';
}
