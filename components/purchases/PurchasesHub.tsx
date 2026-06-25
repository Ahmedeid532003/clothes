import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ClipboardList,
  FileText,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { canViewPage } from '@/lib/permissions/access';
import { appNavigate } from '@/components/accounting/AccountingUi';
import { fetchReorderAlerts } from '@/lib/api/reorderAlerts';
import { fetchPurchaseOrders } from '@/lib/api/purchaseOrders';
import { fetchPurchaseInvoices } from '@/lib/api/purchases';

export const PURCHASE_FLOW_TABS = [
  { tab: 'reorder-alerts', navId: 'reorderAlerts', icon: ShoppingBag, step: 1 },
  { tab: 'purchase-orders', navId: 'purchaseOrders', icon: ClipboardList, step: 2 },
  { tab: 'purchase-invoices', navId: 'purchaseInvoices', icon: FileText, step: 3 },
] as const;

type Summary = {
  reorderCount: number;
  pendingOrders: number;
  draftInvoices: number;
  seasonName: string;
  warning: string;
};

export function PurchasesHub({
  activeTab,
  children,
}: {
  activeTab: string;
  children: React.ReactNode;
}) {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const [alerts, orders, invoices] = await Promise.all([
        fetchReorderAlerts().catch(() => ({
          total: 0,
          season_name: '',
          warning: '',
          items: [],
          branches: [],
          season_id: '',
        })),
        fetchPurchaseOrders().catch(() => []),
        fetchPurchaseInvoices('purchase').catch(() => []),
      ]);
      setSummary({
        reorderCount: alerts.total ?? 0,
        pendingOrders: orders.filter((o) => o.status === 'sent' || o.status === 'partial').length,
        draftInvoices: invoices.filter((i) => i.status === 'draft').length,
        seasonName: alerts.season_name || '—',
        warning: alerts.warning || '',
      });
    } catch {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    const onRefresh = () => loadSummary();
    window.addEventListener('purchases:refresh', onRefresh);
    return () => window.removeEventListener('purchases:refresh', onRefresh);
  }, [loadSummary]);

  const visibleSteps = PURCHASE_FLOW_TABS.filter((s) => canViewPage(user, s.tab));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-950 via-violet-900 to-slate-900 text-white p-4 sm:p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2.5 ring-1 ring-white/20">
              <Truck className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t('nav.purchases')}</h1>
              <p className="text-sm text-violet-200/90 mt-0.5 max-w-xl">{t('purchases.hubDesc')}</p>
            </div>
          </div>
          {summary?.seasonName ? (
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
              {t('purchases.reorder.currentSeason')}: {summary.seasonName}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 items-center overflow-x-auto pb-1">
          {visibleSteps.map((step, idx) => {
            const Icon = step.icon;
            const active = step.tab === activeTab;
            const badge =
              step.tab === 'reorder-alerts'
                ? summary?.reorderCount
                : step.tab === 'purchase-orders'
                  ? summary?.pendingOrders
                  : step.tab === 'purchase-invoices'
                    ? summary?.draftInvoices
                    : 0;
            return (
              <React.Fragment key={step.tab}>
                {idx > 0 ? (
                  <ChevronLeft
                    className={`h-4 w-4 shrink-0 text-violet-400 ${isRtl ? '' : 'rotate-180'}`}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => appNavigate(step.tab)}
                  className={`relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all shrink-0 ${
                    active
                      ? 'bg-white text-violet-950 shadow-md'
                      : 'bg-white/10 text-violet-100 hover:bg-white/20'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      active ? 'bg-violet-900 text-white' : 'bg-white/20'
                    }`}
                  >
                    {step.step}
                  </span>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{t(`nav.${step.navId}`)}</span>
                  {badge != null && badge > 0 ? (
                    <span
                      className={`ms-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                        active ? 'bg-amber-100 text-amber-900' : 'bg-amber-400/90 text-amber-950'
                      }`}
                    >
                      {badge}
                    </span>
                  ) : null}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <HubKpi
            label={t('purchases.reorder.statsAlerts')}
            value={summary.reorderCount}
            onClick={() => appNavigate('reorder-alerts')}
            highlight={summary.reorderCount > 0}
            active={activeTab === 'reorder-alerts'}
          />
          <HubKpi
            label={t('purchases.orders.pending')}
            value={summary.pendingOrders}
            onClick={() => appNavigate('purchase-orders')}
            highlight={summary.pendingOrders > 0}
            active={activeTab === 'purchase-orders'}
          />
          <HubKpi
            label={t('purchases.hubDraftInvoices')}
            value={summary.draftInvoices}
            onClick={() => appNavigate('purchase-invoices')}
            highlight={summary.draftInvoices > 0}
            active={activeTab === 'purchase-invoices'}
          />
        </div>
      ) : null}

      {summary?.warning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {summary.warning}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
          <p className="text-xs font-medium text-slate-500">{t('purchases.hubFlowHint')}</p>
        </div>
        <div className="p-3 sm:p-4">{children}</div>
      </div>
    </div>
  );
}

function HubKpi({
  label,
  value,
  onClick,
  highlight,
  active,
}: {
  label: string;
  value: number;
  onClick: () => void;
  highlight?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-start transition-all hover:shadow-md ${
        active
          ? 'border-violet-300 bg-violet-50 ring-2 ring-violet-200'
          : highlight
            ? 'border-amber-200 bg-amber-50'
            : 'border-slate-200 bg-white'
      }`}
    >
      <div
        className={`text-2xl font-bold tabular-nums ${
          highlight ? 'text-amber-800' : 'text-slate-800'
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
        {label}
        <ArrowLeft className="h-3 w-3 opacity-50" />
      </div>
    </button>
  );
}

export function emitPurchasesRefresh() {
  window.dispatchEvent(new Event('purchases:refresh'));
}
