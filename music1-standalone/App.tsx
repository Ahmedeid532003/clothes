/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import ProductManagementModule from './components/ProductManagementModule';

const VALID_TABS = new Set([
  'product-categories',
  'products-list',
  'composite-items',
  'bundled-items',
  'item-transfer',
  'item-issue',
  'item-addition',
  'item-destruction',
  'price-modification',
  'inventory-check',
  'barcode-printing',
  'product-reports-shortcut',
]);

function readQuery() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('tab') || 'products-list';
  const tab = VALID_TABS.has(raw) ? raw : 'products-list';
  const lang = (params.get('lang') === 'en' ? 'en' : 'ar') as 'en' | 'ar';
  const embed = params.get('embed') === '1';
  return { tab, lang, embed };
}

export default function App() {
  const initial = readQuery();
  const [tab, setTab] = useState(initial.tab);
  const [lang] = useState(initial.lang);
  const hideChrome = initial.embed;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'product-v13-set-tab' && typeof data.tab === 'string' && VALID_TABS.has(data.tab)) {
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
    <ProductManagementModule
      fullscreen={!hideChrome}
      hideChrome={hideChrome}
      lang={lang}
      initialSubTab={tab}
      onSubTabChange={(next) => {
        setTab(next);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', next);
        window.history.replaceState({}, '', url.toString());
        window.parent?.postMessage({ type: 'product-v13-tab', tab: next }, '*');
      }}
    />
  );
}
