import { useStore } from '@nanostores/react';
import { Moon, Sun } from 'lucide-react';
import { themeStore, toggleTheme } from '@stores/theme-store';

export default function ThemeToggle() {
  const theme = useStore(themeStore);

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-icon-hover))] hover:bg-[rgb(var(--ec-dropdown-hover))] transition-colors"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </button>
  );
}
