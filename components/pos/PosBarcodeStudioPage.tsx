import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ClipboardCheck,
  ScanBarcode,
  Store,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { PosBarcodeSaleScreen } from './integrated/PosBarcodeSaleScreen';
import { PosCustomerReviewTab } from './PosCustomerReviewTab';
import { PosExchangeTab } from './PosExchangeTab';
import { usePosSession } from './usePosSession';

type Tab = 'sale' | 'exchange' | 'review';

type Props = {
  onClose: () => void;
};

function formatClock(d: Date, locale: string) {
  return d.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatDate(d: Date, locale: string) {
  return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'long',
  });
}

export function PosBarcodeStudioPage({ onClose }: Props) {
  const { t, isRtl, locale } = useLanguage();
  const { user, tenant, activeBranchId, branches, setActiveBranchId } = useAuth();
  const session = usePosSession(activeBranchId);
  const [tab, setTab] = useState<Tab>('sale');
  const [now, setNow] = useState(() => new Date());

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const brandName = tenant?.name || t('pos.integrated.brandName');
  const userInitial = (user?.full_name || user?.username || '?').trim()[0]?.toUpperCase() || '?';

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (tab === 'sale') {
      setTimeout(() => document.querySelector<HTMLInputElement>('.pos-int-standalone-scan input')?.focus(), 120);
    }
  }, [tab, activeBranchId]);

  const navTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'sale', label: t('pos.tabSale'), icon: <ScanBarcode className="h-4 w-4" /> },
    { id: 'exchange', label: t('pos.tabExchange'), icon: <span className="text-xs font-black">⇄</span> },
    { id: 'review', label: t('pos.tabReview'), icon: <ClipboardCheck className="h-4 w-4" /> },
  ];

  if (!activeBranchId || !activeBranch) {
    return createPortal(
      <div dir={isRtl ? 'rtl' : 'ltr'} className="pos-integrated">
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <Store className="mx-auto mb-3 h-10 w-10 text-amber-600" />
            <p className="font-bold text-amber-900">{t('pos.selectBranch')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {branches.map((b) => (
                <Button key={b.id} onClick={() => setActiveBranchId(b.id)}>
                  {b.name_ar}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div dir={isRtl ? 'rtl' : 'ltr'} className="pos-integrated pos-integrated--barcode">
      <header className="pos-integrated-header">
        <button type="button" className="pos-integrated-close" onClick={onClose} aria-label={t('pos.integrated.back')}>
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="pos-integrated-brand">
          <div className="pos-integrated-brand-icon pos-integrated-brand-icon--barcode">
            <ScanBarcode className="h-5 w-5" />
          </div>
          <div className="pos-integrated-brand-text">
            <h1>{t('pos.barcodeTitle')}</h1>
            <p>
              {brandName} · {activeBranch.name_ar}
              {session.ctx?.warehouse.name_ar ? ` · ${session.ctx.warehouse.name_ar}` : ''}
            </p>
          </div>
        </div>

        <nav className="pos-integrated-nav" aria-label={t('pos.barcodeTitle')}>
          {navTabs.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`pos-integrated-nav-btn pos-integrated-nav-btn--green${tab === row.id ? ' is-active' : ''}`}
              onClick={() => setTab(row.id)}
            >
              {row.icon}
              <span>{row.label}</span>
            </button>
          ))}
        </nav>

        <div className="pos-integrated-meta">
          <div className="pos-integrated-clock">
            <div className="time">{formatClock(now, locale)}</div>
            <div className="date">{formatDate(now, locale)}</div>
          </div>
          <div className="pos-integrated-user">
            <div className="pos-integrated-user-info">
              <div className="name">{user?.full_name || user?.username || '—'}</div>
              <div className="status">
                <span className="status-dot" />
                {t('pos.integrated.online')}
              </div>
            </div>
            <div className="pos-integrated-avatar">{userInitial}</div>
          </div>
        </div>
      </header>

      <div className="pos-integrated-body pos-integrated-body--full pos-integrated-body--barcode">
        {session.success ? (
          <div className="pos-integrated-toast pos-integrated-toast--success pos-barcode-toast">
            {t('pos.saleDone')} {session.success}
          </div>
        ) : null}

        {tab === 'sale' ? <PosBarcodeSaleScreen session={session} /> : null}

        {tab === 'exchange' && activeBranchId ? (
          <div className="pos-barcode-tab-panel">
            <PosExchangeTab
              activeBranchId={activeBranchId}
              onMessage={(msg) => session.setSuccess(msg)}
              onError={(msg) => session.setError(msg)}
            />
          </div>
        ) : null}

        {tab === 'review' ? (
          <div className="pos-barcode-tab-panel">
            <PosCustomerReviewTab
              onMessage={(msg) => session.setSuccess(msg)}
              onError={(msg) => session.setError(msg)}
            />
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
