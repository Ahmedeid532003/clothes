import React, { useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  isSuppliersCanvasRoute,
  suppliersTabToSubTab,
  suppliersSubTabToErpTab,
} from './suppliersCanvasNav';
import { useAccentIframeSync } from '@/lib/theme/useAccentIframeSync';
import { getStoredAccent } from '@/lib/theme/accent';

type Props = {
  activeTab: string;
  onNavigate: (tab: string) => void;
};

const SUPPLIERS_CANVAS_CACHE_BUST = 'v13-accent-restore-orange-20260808a';

/**
 * Suppliers canvas host — same pattern as Music1ProductCanvas / PurchasesCanvasPage.
 * ERP icon rail stays outside; iframe shows original tab content only (hideChrome).
 */
export function SuppliersCanvasPage({ activeTab, onNavigate }: Props) {
  const { locale } = useLanguage();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastPostedTab = useRef<string | null>(null);
  useAccentIframeSync(iframeRef);

  const src = useMemo(
    () =>
      `/canvas/suppliers/?${new URLSearchParams({
        embed: '1',
        tab: suppliersTabToSubTab(activeTab),
        lang: locale === 'en' ? 'en' : 'ar',
        accent: getStoredAccent(),
        v: SUPPLIERS_CANVAS_CACHE_BUST,
      }).toString()}`,
    [activeTab, locale],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'suppliers-v13-exit') {
        onNavigate('home');
        return;
      }
      if (data.type === 'suppliers-v13-tab' && typeof data.tab === 'string') {
        lastPostedTab.current = data.tab;
        onNavigate(suppliersSubTabToErpTab(data.tab));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onNavigate]);

  useEffect(() => {
    if (!isSuppliersCanvasRoute(activeTab)) return;
    const subTab = suppliersTabToSubTab(activeTab);
    if (lastPostedTab.current === subTab) return;
    lastPostedTab.current = subTab;
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'suppliers-v13-set-tab', tab: subTab },
      '*',
    );
  }, [activeTab]);

  if (!isSuppliersCanvasRoute(activeTab)) return null;

  return (
    <div
      data-suppliers-canvas="true"
      className="suppliers-v13-canvas flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50"
      style={{ isolation: 'isolate', height: '100%', minHeight: 0 }}
    >
      <iframe
        key={src}
        ref={iframeRef}
        title="Ma7aly Suppliers Canvas"
        src={src}
        className="h-full w-full min-h-0 flex-1 border-0"
        style={{ height: '100%', width: '100%', border: 0 }}
        allow="fullscreen"
      />
    </div>
  );
}
