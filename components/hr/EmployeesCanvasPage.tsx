import React, { useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  isEmployeesCanvasRoute,
  employeesTabToSubTab,
  employeesSubTabToErpTab,
} from './employeesCanvasNav';

type Props = {
  activeTab: string;
  onNavigate: (tab: string) => void;
};

/** Bump this on every UI deploy so iframe bypasses stale cached HTML/JS. */
const EMPLOYEES_CANVAS_CACHE_BUST = 'ui-fix-20260807e';

/** Isolated host for original EmployeesTab (iframe). ERP sidebar stays outside. */
export function EmployeesCanvasPage({ activeTab, onNavigate }: Props) {
  const { locale } = useLanguage();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastPostedTab = useRef<string | null>(null);

  const src = useMemo(
    () =>
      `/canvas/employees/?${new URLSearchParams({
        embed: '1',
        tab: employeesTabToSubTab(activeTab),
        lang: locale === 'en' ? 'en' : 'ar',
        v: EMPLOYEES_CANVAS_CACHE_BUST,
      }).toString()}`,
    [activeTab, locale],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'employees-v13-exit') {
        onNavigate('home');
        return;
      }
      if (data.type === 'employees-v13-tab' && typeof data.tab === 'string') {
        lastPostedTab.current = data.tab;
        onNavigate(employeesSubTabToErpTab(data.tab));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onNavigate]);

  useEffect(() => {
    if (!isEmployeesCanvasRoute(activeTab)) return;
    const subTab = employeesTabToSubTab(activeTab);
    if (lastPostedTab.current === subTab) return;
    lastPostedTab.current = subTab;
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'employees-v13-set-tab', tab: subTab },
      '*',
    );
  }, [activeTab]);

  if (!isEmployeesCanvasRoute(activeTab)) return null;

  return (
    <div
      data-employees-canvas="true"
      className="employees-v13-canvas flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white"
      style={{ isolation: 'isolate' }}
    >
      <iframe
        key={src}
        ref={iframeRef}
        title="Ma7aly Employees Canvas"
        src={src}
        className="h-full w-full flex-1 border-0"
        allow="fullscreen"
      />
    </div>
  );
}
