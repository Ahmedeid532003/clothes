import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, RefreshCw, WalletCards } from 'lucide-react';
import { paymentMethodsDashboardApi, type PaymentMethodsDashboardDto } from '@/lib/api/banking';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { PageSectionHeader, PageToolbar, fmtMoney } from '@/components/accounting/AccountingUi';

const methodKeys = ['cash', 'card', 'wallet', 'instapay', 'credit', 'installment', 'reserved'] as const;

export function PaymentMethodsDashboardPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<PaymentMethodsDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await paymentMethodsDashboardApi.get());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<WalletCards className="h-6 w-6" />}
        title={t('nav.paymentMethodsDashboard')}
        description={t('banking.paymentDashboardDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </PageToolbar>
        }
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 md:grid-cols-4">
        {methodKeys.map((key) => (
          <div key={key} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{t(`banking.pay_${key}`)}</p>
            <p className="mt-2 text-2xl font-bold">{fmtMoney(data?.totals[key] ?? 0)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <p className="flex items-center gap-2 font-semibold">
            <CreditCard className="h-4 w-4" />
            {t('banking.cardsSettlement')}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-amber-700">{t('banking.pending')}</p>
              <p className="text-xl font-bold">{fmtMoney(data?.cards.pending ?? 0)}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">{t('banking.settled')}</p>
              <p className="text-xl font-bold">{fmtMoney(data?.cards.settled ?? 0)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="font-semibold">{t('banking.cashFlowTracking')}</p>
          <div className="mt-3 max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-1 text-start">{t('accounting.date')}</th>
                  <th className="py-1 text-end">{t('accounting.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.cash_flow ?? []).map((row) => (
                  <tr key={row.date} className="border-t">
                    <td className="py-1">{row.date}</td>
                    <td className="py-1 text-end font-semibold">{fmtMoney(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

