import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EmployeesTab } from '@/components/additions/mozafen/EmployeesTab';
import '@/music1-standalone/index.css';

const VALID = new Set([
  'org',
  'directory',
  'shifts',
  'attendance',
  'bonus',
  'deduct',
  'commissions',
  'payroll',
  'disbursals',
  'reports',
]);

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
      if (data.type === 'employees-v13-set-tab' && typeof data.tab === 'string' && VALID.has(data.tab)) {
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
    <div className="h-[100svh] w-full overflow-auto bg-slate-50 p-3 sm:p-5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <EmployeesTab
        lang={lang}
        activeSubTab={tab}
        setActiveSubTab={(next) => {
          setTab(next);
          const url = new URL(window.location.href);
          url.searchParams.set('tab', next);
          window.history.replaceState({}, '', url.toString());
          window.parent?.postMessage({ type: 'employees-v13-tab', tab: next }, '*');
        }}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
