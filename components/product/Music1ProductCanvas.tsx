import React, { useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  isProductModuleRoute,
  tabToProductModuleSubTab,
} from './productModuleNav';

type Props = {
  activeTab: string;
  onNavigate?: (tab: string) => void;
};

/** Bump this on every UI deploy so iframe bypasses stale cached HTML/JS. */
const PRODUCT_CANVAS_CACHE_BUST = 'ui-fix-20260807d';

/**
 * Isolated product canvas host (iframe → product.html).
 * Keeps original Music1 design CSS isolated; ERP sidebar stays outside.
 */
export function Music1ProductCanvas({ activeTab, onNavigate }: Props) {
  const { locale } = useLanguage();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastPostedTab = useRef<string | null>(null);

  const src = useMemo(
    () =>
      `/canvas/product/?${new URLSearchParams({
        embed: '1',
        tab: tabToProductModuleSubTab(activeTab),
        lang: locale === 'en' ? 'en' : 'ar',
        v: PRODUCT_CANVAS_CACHE_BUST,
      }).toString()}`,
    [activeTab, locale],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'product-v13-tab' && typeof data.tab === 'string') {
        lastPostedTab.current = data.tab;
        onNavigate?.(data.tab);
      }
      if (data.type === 'product-v13-exit') {
        onNavigate?.('home');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onNavigate]);

  useEffect(() => {
    if (!isProductModuleRoute(activeTab)) return;
    const subTab = tabToProductModuleSubTab(activeTab);
    if (lastPostedTab.current === subTab) return;
    lastPostedTab.current = subTab;
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'product-v13-set-tab', tab: subTab },
      '*',
    );
  }, [activeTab]);

  return (
    <div
      data-product-canvas="true"
      className="music1-product-canvas flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white"
      style={{ isolation: 'isolate' }}
    >
      <iframe
        key={src}
        ref={iframeRef}
        title="Ma7aly Product Canvas"
        src={src}
        className="h-full w-full flex-1 border-0"
        allow="fullscreen"
      />
    </div>
  );
}
