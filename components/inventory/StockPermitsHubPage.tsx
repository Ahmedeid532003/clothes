import React from 'react';
import MovementPermits from './montagat/components/MovementPermits';
import { MontagatDataProvider } from './montagat/MontagatDataProvider';
import { useMontagatData } from './montagat/MontagatDataProvider';
import type { MovementPermit } from './montagat/types';

export type StockPermitKind = 'transfer' | 'disbursement' | 'addition' | 'scrap';

type Props = {
  /** فلتر القائمة ونوع الإذن الافتراضي عند الإنشاء */
  permitKind: StockPermitKind;
};

function StockPermitsHubInner({ permitKind }: Props) {
  const data = useMontagatData();

  return (
    <div className="space-y-4" dir="rtl">
      {data.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {data.error}
          <button type="button" className="ms-3 underline" onClick={() => void data.reload()}>
            إعادة المحاولة
          </button>
        </div>
      ) : null}
      <MovementPermits
        products={data.products}
        permits={data.permits}
        balances={data.balances}
        warehouses={data.warehouses}
        sizes={data.sizes}
        colors={data.colors}
        initialFilterType={permitKind}
        defaultPermitType={permitKind}
        onAddPermit={(p: MovementPermit) => data.handleAddPermit(p)}
        onApprovePermit={(p: MovementPermit) => data.handleApprovePermit(p)}
      />
    </div>
  );
}

export function StockPermitsHubPage({ permitKind }: Props) {
  return (
    <MontagatDataProvider activeScreen="permits">
      <StockPermitsHubInner permitKind={permitKind} />
    </MontagatDataProvider>
  );
}
