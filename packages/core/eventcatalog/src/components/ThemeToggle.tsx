import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { themeStore, toggleTheme } from '@stores/theme-store';

export default function ThemeToggle() {
  const theme = useStore(themeStore);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const label = mounted ? `Switch to ${theme === 'light' ? 'dark' : 'light'} mode` : 'Toggle theme';

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-icon-hover))] hover:bg-[rgb(var(--ec-dropdown-hover))] transition-colors"
      aria-label={label}
      title={label}
    >
      {!mounted ? <Moon className="w-5 h-5" /> : theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </button>
  );
}
