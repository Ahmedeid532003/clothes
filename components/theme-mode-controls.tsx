import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

function storedMode(key: string, fallback: ThemeMode): ThemeMode {
  const value = localStorage.getItem(key);
  return value === 'dark' || value === 'light' ? value : fallback;
}

export function ThemeModeControls() {
  const [appTheme, setAppTheme] = useState<ThemeMode>(() => storedMode('mahaly_app_theme', 'light'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', appTheme === 'dark');
    document.documentElement.dataset.appTheme = appTheme;
    localStorage.setItem('mahaly_app_theme', appTheme);
  }, [appTheme]);

  const nextAppTheme = appTheme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setAppTheme(nextAppTheme)}
      className="theme-mode-controls"
      data-mode={appTheme}
      title={nextAppTheme === 'dark' ? 'Dark mode' : 'Light mode'}
      aria-label={nextAppTheme === 'dark' ? 'Dark mode' : 'Light mode'}
    >
      <Sun className="theme-slider-icon theme-slider-icon-sun" aria-hidden />
      <span className="theme-slider-knob" aria-hidden />
      <Moon className="theme-slider-icon theme-slider-icon-moon" aria-hidden />
    </button>
  );
}
