import React, { useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  isEmployeesCanvasRoute,
  employeesTabToSubTab,
  employeesSubTabToErpTab,
} from './employeesCanvasNav';
import { useAccentIframeSync } from '@/lib/theme/useAccentIframeSync';
import { getStoredAccent } from '@/lib/theme/accent';

type Props = {
  activeTab: string;
  onNavigate: (tab: string) => void;
};

/** Bump on every employees-canvas UI deploy to bypass stale iframe cache. */
const EMPLOYEES_CANVAS_CACHE_BUST = 'v13-mobile-canvas-height-20260808c';

/**
 * Employees canvas host — same pattern as Music1ProductCanvas.
 * ERP sidebar stays outside; iframe is pixel-isolated V13 UI.
 */
export function EmployeesCanvasPage({ activeTab, onNavigate }: Props) {
  const { locale } = useLanguage();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastPostedTab = useRef<string | null>(null);
  useAccentIframeSync(iframeRef);

  const src = useMemo(
    () =>
      `/canvas/employees/?${new URLSearchParams({
        embed: '1',
        tab: employeesTabToSubTab(activeTab),
        lang: locale === 'en' ? 'en' : 'ar',
        accent: getStoredAccent(),
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
      className="employees-v13-canvas flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50"
      style={{ isolation: 'isolate', height: '100%', minHeight: 0 }}
    >
      <iframe
        key={src}
        ref={iframeRef}
        title="Ma7aly Employees Canvas"
        src={src}
        className="h-full w-full min-h-0 flex-1 border-0"
        style={{ height: '100%', width: '100%', border: 0 }}
        allow="fullscreen"
      />
    </div>
  );
}
