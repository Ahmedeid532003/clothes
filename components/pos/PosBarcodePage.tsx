import React, { useEffect, useState } from 'react';
import {
  ClipboardCheck,
  ScanBarcode,
  Store,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { PosSaleTab } from './PosSaleTab';
import { PosCustomerReviewTab } from './PosCustomerReviewTab';
import { PosExchangeTab } from './PosExchangeTab';
import { PosFullScreenShell } from './PosFullScreenShell';
import { usePosSession } from './usePosSession';

type Tab = 'sale' | 'exchange' | 'review';

type Props = {
  onClose: () => void;
};

export function PosBarcodePage({ onClose }: Props) {
  const { t } = useLanguage();
  const { activeBranchId, branches, setActiveBranchId } = useAuth();
  const session = usePosSession(activeBranchId);
  const [tab, setTab] = useState<Tab>('sale');
  const [fullscreen, setFullscreen] = useState(false);

  const activeBranch = branches.find((b) => b.id === activeBranchId);

  useEffect(() => {
    if (tab === 'sale') {
      setTimeout(() => document.getElementById('pos-sale-search')?.focus(), 80);
    }
  }, [tab, activeBranchId]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      setFullscreen((v) => !v);
    }
  };

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'sale', label: t('pos.tabSale'), icon: <ScanBarcode className="h-4 w-4" /> },
    { id: 'exchange', label: t('pos.tabExchange'), icon: <span className="text-xs font-black">⇄</span> },
    { id: 'review', label: t('pos.tabReview'), icon: <ClipboardCheck className="h-4 w-4" /> },
  ];

  if (!activeBranchId || !activeBranch) {
    return (
      <PosFullScreenShell title={t('pos.barcodeTitle')} onClose={onClose} onToggleFullscreen={toggleFullscreen} fullscreen={fullscreen}>
        <div className="flex h-full items-center justify-center p-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <Store className="mx-auto mb-3 h-10 w-10 text-amber-600" />
            <p className="font-bold">{t('pos.selectBranch')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {branches.map((b) => (
                <Button key={b.id} onClick={() => setActiveBranchId(b.id)}>{b.name_ar}</Button>
              ))}
            </div>
          </div>
        </div>
      </PosFullScreenShell>
    );
  }

  const headerTabs = (
    <nav className="flex gap-1 rounded-xl bg-slate-100 p-1">
      {tabs.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => setTab(row.id)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition ${
            tab === row.id ? 'bg-white text-[#4169E1] shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {row.icon}
          <span className="hidden sm:inline">{row.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <PosFullScreenShell
      title={t('pos.barcodeTitle')}
      branchName={activeBranch.name_ar}
      warehouseName={session.ctx?.warehouse.name_ar}
      onClose={onClose}
      onToggleFullscreen={toggleFullscreen}
      fullscreen={fullscreen}
      headerExtra={headerTabs}
    >
      <div className="flex h-full min-h-0 flex-col">
        {session.error && session.error !== 'MULTI_HIT' && session.error !== 'NOT_FOUND' ? (
          <div className="shrink-0 px-4 py-2">
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{session.error}</p>
          </div>
        ) : null}
        {session.success ? (
          <div className="shrink-0 px-4 py-2">
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
              {session.success}
            </p>
          </div>
        ) : null}

        {tab === 'sale' ? (
          <PosSaleTab
            session={session}
            onMessage={(msg) => {
              session.setSuccess(msg);
              session.setError(null);
            }}
          />
        ) : null}

        {tab === 'exchange' && activeBranchId ? (
          <PosExchangeTab
            activeBranchId={activeBranchId}
            onMessage={(msg) => session.setSuccess(msg)}
            onError={(msg) => session.setError(msg)}
          />
        ) : null}

        {tab === 'review' ? (
          <PosCustomerReviewTab
            onMessage={(msg) => session.setSuccess(msg)}
            onError={(msg) => session.setError(msg)}
          />
        ) : null}
      </div>
    </PosFullScreenShell>
  );
}
