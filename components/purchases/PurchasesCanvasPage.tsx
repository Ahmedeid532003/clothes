import React, { useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  isPurchasesCanvasRoute,
  purchasesTabToSubTab,
  purchasesSubTabToErpTab,
} from './purchasesCanvasNav';
import { useAccentIframeSync } from '@/lib/theme/useAccentIframeSync';
import { getStoredAccent } from '@/lib/theme/accent';

type Props = {
  activeTab: string;
  onNavigate: (tab: string) => void;
};

/**
 * Isolated host for the original Purchases canvas (iframe).
 * Fills the ERP content area beside the ERP sidebar — does not cover it.
 * Original purchases design is untouched inside the iframe.
 */
export function PurchasesCanvasPage({ activeTab, onNavigate }: Props) {
  const { locale } = useLanguage();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastPostedTab = useRef<string | null>(null);
  useAccentIframeSync(iframeRef);

  const srcRef = useRef(
    `/canvas/purchases/?${new URLSearchParams({
      tab: purchasesTabToSubTab(activeTab),
      lang: locale === 'en' ? 'en' : 'ar',
      accent: getStoredAccent(),
      v: 'accent-restore-orange-20260808a',
    }).toString()}`,
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'purchases-v13-exit') {
        onNavigate('home');
        return;
      }
      if (data.type === 'purchases-v13-tab' && typeof data.tab === 'string') {
        lastPostedTab.current = data.tab;
        onNavigate(purchasesSubTabToErpTab(data.tab));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onNavigate]);

  // ERP sidebar switched to another purchases branch → tell iframe (no remount).
  useEffect(() => {
    if (!isPurchasesCanvasRoute(activeTab)) return;
    const subTab = purchasesTabToSubTab(activeTab);
    if (lastPostedTab.current === subTab) return;
    lastPostedTab.current = subTab;
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'purchases-v13-set-tab', tab: subTab },
      '*',
    );
  }, [activeTab]);

  if (!isPurchasesCanvasRoute(activeTab)) return null;

  return (
    <div
      data-purchases-canvas="true"
      className="purchases-v13-canvas flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white"
      style={{ isolation: 'isolate', height: '100%', minHeight: 0 }}
    >
      <iframe
        ref={iframeRef}
        title="Ma7aly Purchases Canvas"
        src={srcRef.current}
        className="h-full w-full min-h-0 flex-1 border-0"
        style={{ height: '100%', width: '100%', border: 0 }}
        allow="fullscreen"
      />
    </div>
  );
}
