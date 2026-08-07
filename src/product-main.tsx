import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/music1-standalone/App';
import '@/music1-standalone/index.css';

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
