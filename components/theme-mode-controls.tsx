import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type ThemeMode = 'light' | 'dark';

function storedMode(key: string, fallback: ThemeMode): ThemeMode {
  const value = localStorage.getItem(key);
  return value === 'dark' || value === 'light' ? value : fallback;
}

export function ThemeModeControls({ className = '' }: { className?: string }) {
  const [appTheme, setAppTheme] = useState<ThemeMode>(() => storedMode('mahaly_app_theme', 'light'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', appTheme === 'dark');
    document.documentElement.dataset.appTheme = appTheme;
    localStorage.setItem('mahaly_app_theme', appTheme);
  }, [appTheme]);

  const setMode = (mode: ThemeMode) => {
    if (mode === appTheme) return;
    setAppTheme(mode);
  };

  return (
    <div
      className={`pro-theme-switch ${className}`.trim()}
      role="group"
      aria-label="Theme"
      data-mode={appTheme}
    >
      <span className="pro-theme-switch__thumb" aria-hidden />

      <button
        type="button"
        className="pro-theme-switch__option"
        data-active={appTheme === 'light' ? 'true' : 'false'}
        onClick={() => setMode('light')}
        aria-pressed={appTheme === 'light'}
        title="Light mode"
      >
        <Sun className="pro-theme-switch__icon" strokeWidth={2.25} aria-hidden />
        <span>Light</span>
      </button>

      <button
        type="button"
        className="pro-theme-switch__option"
        data-active={appTheme === 'dark' ? 'true' : 'false'}
        onClick={() => setMode('dark')}
        aria-pressed={appTheme === 'dark'}
        title="Dark mode"
      >
        <Moon className="pro-theme-switch__icon" strokeWidth={2.25} aria-hidden />
        <span>Dark</span>
      </button>
    </div>
  );
}
