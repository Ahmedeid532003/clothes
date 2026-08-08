import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import PurchasesCanvasApp from './PurchasesCanvasApp';
import './index.css';
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

function readQuery() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab') || 'purchase-invoices';
  const lang = (params.get('lang') === 'en' ? 'en' : 'ar') as 'en' | 'ar';
  return { tab, lang };
}

function Root() {
  const initial = readQuery();
  const [tab, setTab] = useState(initial.tab);
  const [lang] = useState(initial.lang);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'purchases-v13-set-tab' && typeof data.tab === 'string') {
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
    <PurchasesCanvasApp
      initialSubTab={tab}
      lang={lang}
      onSubTabChange={(next) => {
        setTab(next);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', next);
        window.history.replaceState({}, '', url.toString());
        window.parent?.postMessage({ type: 'purchases-v13-tab', tab: next }, '*');
      }}
      onExit={() => {
        window.parent?.postMessage({ type: 'purchases-v13-exit' }, '*');
      }}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
