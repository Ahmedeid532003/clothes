import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, Users } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchSellerPerformance, type SellerPerformanceRow } from '@/lib/api/sellerReports';
import { PageSectionHeader, PageToolbar, fmtMoney } from '@/components/accounting/AccountingUi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SellerPerformancePage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<SellerPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSellerPerformance({
        from: dateFrom || undefined,
        to: dateTo || undefined,
        branchOnly: true,
      });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = rows.reduce(
    (acc, r) => ({
      sales: acc.sales + (parseFloat(r.sales_total) || 0),
      commission: acc.commission + (parseFloat(r.commission_total) || 0),
      qty: acc.qty + (parseFloat(r.qty_total) || 0),
    }),
    { sales: 0, commission: 0, qty: 0 },
  );

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<TrendingUp className="h-6 w-6" />}
        title={t('sellerPerformance.title')}
        description={t('sellerPerformance.desc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Input
              type="date"
              className="h-9 w-36"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              className="h-9 w-36"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </PageToolbar>
        }
      />

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-500">{t('sellerPerformance.totalSales')}</p>
          <p className="text-2xl font-black text-blue-700">{fmtMoney(totals.sales.toFixed(2))}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-500">{t('sellerPerformance.totalCommission')}</p>
          <p className="text-2xl font-black text-violet-700">{fmtMoney(totals.commission.toFixed(2))}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-500">{t('sellerPerformance.totalQty')}</p>
          <p className="text-2xl font-black text-emerald-700">{totals.qty.toFixed(0)}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-800 text-white text-[11px] font-black uppercase">
            <tr>
              <th className="px-3 py-2.5 text-start">#</th>
              <th className="px-3 py-2.5 text-start">{t('employeeData.colCode')}</th>
              <th className="px-3 py-2.5 text-start">{t('employeeData.colName')}</th>
              <th className="px-3 py-2.5 text-end">{t('sellerPerformance.invoices')}</th>
              <th className="px-3 py-2.5 text-end">{t('sellerPerformance.lines')}</th>
              <th className="px-3 py-2.5 text-end">{t('pos.colQty')}</th>
              <th className="px-3 py-2.5 text-end">{t('sellerPerformance.sales')}</th>
              <th className="px-3 py-2.5 text-end">{t('hrPayroll.commission')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-500">{t('inventory.loading')}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-400">
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  {t('sellerPerformance.empty')}
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={r.seller_id} className="border-t hover:bg-blue-50/30">
                  <td className="px-3 py-3 text-slate-400 font-bold">{idx + 1}</td>
                  <td className="px-3 py-3 font-mono text-xs font-black text-blue-700">{r.employee_code}</td>
                  <td className="px-3 py-3 font-extrabold text-slate-900">{r.full_name}</td>
                  <td className="px-3 py-3 text-end tabular-nums">{r.invoice_count}</td>
                  <td className="px-3 py-3 text-end tabular-nums">{r.line_count}</td>
                  <td className="px-3 py-3 text-end tabular-nums font-bold">{r.qty_total}</td>
                  <td className="px-3 py-3 text-end tabular-nums font-black text-blue-700">
                    {fmtMoney(r.sales_total)}
                  </td>
                  <td className="px-3 py-3 text-end tabular-nums font-black text-violet-700">
                    {fmtMoney(r.commission_total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
