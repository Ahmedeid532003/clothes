import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/music1-standalone/App';
import '@/music1-standalone/index.css';
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

const erpHome = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/') || '/';
const isEmbed = new URLSearchParams(window.location.search).get('embed') === '1';

function ErpReturnLink() {
  if (isEmbed) return null;
  return (
    <a
      href={erpHome}
      className="fixed top-3 z-[10000] rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-md backdrop-blur-sm start-3 hover:bg-slate-50"
    >
      ← العودة لـ ERP
    </a>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErpReturnLink />
    <App />
  </StrictMode>,
);
