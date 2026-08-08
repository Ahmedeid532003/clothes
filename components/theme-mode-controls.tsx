import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

function storedMode(key: string, fallback: ThemeMode): ThemeMode {
  const value = localStorage.getItem(key);
  return value === 'dark' || value === 'light' ? value : fallback;
}

export function ThemeModeControls() {
  const [appTheme, setAppTheme] = useState<ThemeMode>(() => storedMode('mahaly_app_theme', 'light'));
  const [bump, setBump] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', appTheme === 'dark');
    document.documentElement.dataset.appTheme = appTheme;
    localStorage.setItem('mahaly_app_theme', appTheme);
  }, [appTheme]);

  const nextAppTheme = appTheme === 'dark' ? 'light' : 'dark';

  const toggle = () => {
    setBump(true);
    setAppTheme(nextAppTheme);
    window.setTimeout(() => setBump(false), 420);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`lux-theme-switch${bump ? ' is-bump' : ''}`}
      data-mode={appTheme}
      title={nextAppTheme === 'dark' ? 'Dark mode' : 'Light mode'}
      aria-label={nextAppTheme === 'dark' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <span className="lux-theme-switch__aura" aria-hidden />
      <span className="lux-theme-switch__halo" aria-hidden />

      <span className="lux-theme-switch__track" aria-hidden>
        <span className="lux-theme-switch__liquid" />
        <span className="lux-theme-switch__stars">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="lux-theme-switch__rays">
          <i />
          <i />
          <i />
          <i />
        </span>

        {/* ghost icons in track */}
        <svg className="lux-theme-switch__ghost lux-theme-switch__ghost--sun" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M5.2 18.8l1.4-1.4M17.4 6.6l1.4-1.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <svg className="lux-theme-switch__ghost lux-theme-switch__ghost--moon" viewBox="0 0 24 24" fill="none">
          <path
            d="M17 14.2A6.2 6.2 0 0 1 9.4 7.2a6.4 6.4 0 1 0 8.8 8.2c-.4-.4-.8-.7-1.2-1.2Z"
            stroke="currentColor"
            strokeWidth="1.55"
            strokeLinejoin="round"
          />
        </svg>

        <span className="lux-theme-switch__orb">
          <span className="lux-theme-switch__orb-metal" />
          <span className="lux-theme-switch__orb-shine" />
          <span className="lux-theme-switch__orb-ring" />
          <svg className="lux-theme-switch__orb-icon lux-theme-switch__orb-icon--sun" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="1.7" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const r = (deg * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  x1={16 + Math.cos(r) * 8}
                  y1={16 + Math.sin(r) * 8}
                  x2={16 + Math.cos(r) * 11.6}
                  y2={16 + Math.sin(r) * 11.6}
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <svg className="lux-theme-switch__orb-icon lux-theme-switch__orb-icon--moon" viewBox="0 0 32 32" fill="none">
            <path
              d="M21.4 18.8c-3.6 1.7-7.9.1-9.2-3.6A7.2 7.2 0 0 0 21.5 25c.5-.1 1-.25 1.5-.45a7 7 0 0 1-1.6-5.75Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="19.2" cy="14.2" r="0.7" fill="currentColor" opacity="0.55" />
            <circle cx="22.1" cy="17.4" r="0.45" fill="currentColor" opacity="0.45" />
          </svg>
        </span>
      </span>

      <span className="lux-theme-switch__label">
        <span className="lux-theme-switch__label-light">Light</span>
        <span className="lux-theme-switch__label-dark">Dark</span>
      </span>
    </button>
  );
}
