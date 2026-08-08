import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import EmployeesCanvasApp, {
  EMPLOYEES_SUBTABS,
} from '../employees-v13/EmployeesCanvasApp';
import '../employees-v13/index.css';
import '../employees-v13/host-spacing.css';
import {
  applyAccentColor,
  getStoredAccent,
  initAccentFromStorage,
  listenForAccentMessages,
  normalizeHex,
} from '@/lib/theme/accent';
import {
  applyFontScale,
  getStoredFontScale,
  initFontScaleFromStorage,
  listenForFontScaleMessages,
} from '@/lib/theme/fontScale';

initAccentFromStorage();
initFontScaleFromStorage();
const accentFromQuery = normalizeHex(new URLSearchParams(window.location.search).get('accent') || '');
if (accentFromQuery) applyAccentColor(accentFromQuery);
else applyAccentColor(getStoredAccent());
const fontFromQuery = Number(new URLSearchParams(window.location.search).get('fontScale') || '');
if (Number.isFinite(fontFromQuery) && fontFromQuery > 0) applyFontScale(fontFromQuery);
else applyFontScale(getStoredFontScale());
listenForAccentMessages();
listenForFontScaleMessages();

const VALID = new Set<string>(EMPLOYEES_SUBTABS);

function readQuery() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('tab') || 'directory';
  const tab = VALID.has(raw) ? raw : 'directory';
  const lang = (params.get('lang') === 'en' ? 'en' : 'ar') as 'en' | 'ar';
  return { tab, lang };
}

function Root() {
  const initial = readQuery();
  const [tab, setTab] = useState(initial.tab);
  const [lang] = useState(initial.lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (
        data.type === 'employees-v13-set-tab' &&
        typeof data.tab === 'string' &&
        VALID.has(data.tab)
      ) {
        setTab(data.tab);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', data.tab);
        window.history.replaceState({}, '', url.toString());
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <EmployeesCanvasApp
      lang={lang}
      initialSubTab={tab}
      onSubTabChange={(next) => {
        setTab(next);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', next);
        window.history.replaceState({}, '', url.toString());
        window.parent?.postMessage({ type: 'employees-v13-tab', tab: next }, '*');
      }}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
