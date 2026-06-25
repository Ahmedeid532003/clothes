import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText,
  MessageCircle,
  Play,
  Printer,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchSuppliers } from '@/lib/api/inventory';
import {
  fetchSupplierWeeklyReports,
  markSupplierWeeklyReportSent,
  runDailySupplierInventory,
  type SupplierWeeklyReportDto,
} from '@/lib/api/suppliers';
import { weeklyInventoryDayLabel } from '@/lib/suppliers/weekly-inventory-days';
import { printWeeklyReport } from '@/components/suppliers/SupplierWeeklyReportPrint';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { ERP_NATIVE_SELECT_MD } from '@/lib/ui/erpNativeSelect';

const selectClass = ERP_NATIVE_SELECT_MD;

function statusTone(status: string) {
  if (status === 'sent') return 'bg-emerald-100 text-emerald-800';
  if (status === 'failed') return 'bg-red-100 text-red-800';
  return 'bg-blue-100 text-blue-800';
}

export function SupplierWeeklyReportsPage() {
  const { t, locale } = useLanguage();
  const [rows, setRows] = useState<SupplierWeeklyReportDto[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name_ar: string; weekly_inventory_day?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [detail, setDetail] = useState<SupplierWeeklyReportDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reports, sups] = await Promise.all([
        fetchSupplierWeeklyReports({
          supplier: supplierFilter || undefined,
          report_date: dateFilter || undefined,
        }),
        fetchSuppliers(),
      ]);
      setRows(reports);
      setSuppliers(sups as Array<{ id: string; name_ar: string; weekly_inventory_day?: string }>);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('suppliers.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [supplierFilter, dateFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const suppliersWithDay = useMemo(
    () => suppliers.filter((s) => s.weekly_inventory_day),
    [suppliers],
  );

  const printLabels = useMemo(
    () => ({
      title: t('suppliers.weeklyReportTitle'),
      supplier: t('purchases.supplier'),
      code: t('inventory.code'),
      date: t('suppliers.reportDate'),
      period: t('suppliers.reportPeriod'),
      item: t('suppliers.reportItem'),
      sold: t('suppliers.reportSold'),
      remaining: t('suppliers.reportRemaining'),
      minThreshold: t('suppliers.reportMinThreshold'),
      topSellers: t('suppliers.reportTopSellers'),
      nearDepletion: t('suppliers.reportNearDepletion'),
      stagnant: t('suppliers.reportStagnant'),
      totals: t('suppliers.reportTotals'),
      footer: t('inventory.empty'),
    }),
    [t],
  );

  const onRunDaily = async () => {
    setRunning(true);
    setError(null);
    try {
      const result = await runDailySupplierInventory();
      await load();
      alert(
        t('suppliers.dailyRunDone')
          .replace('{created}', String(result.created))
          .replace('{skipped}', String(result.skipped)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t('suppliers.saveFailed'));
    } finally {
      setRunning(false);
    }
  };

  const onWhatsApp = async (report: SupplierWeeklyReportDto) => {
    if (!report.whatsapp_url) {
      alert(t('suppliers.noWhatsapp'));
      return;
    }
    window.open(report.whatsapp_url, '_blank', 'noopener,noreferrer');
    if (report.status !== 'sent') {
      try {
        await markSupplierWeeklyReportSent(report.id);
        await load();
      } catch {
        /* optional */
      }
    }
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.supplierWeeklyReports')}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">{t('suppliers.weeklyReportsHint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" onClick={onRunDaily} disabled={running}>
            <Play className="h-4 w-4 me-1" />
            {running ? t('inventory.loading') : t('suppliers.runDailyCheck')}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-slate-50/80 p-3 grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-600">{t('purchases.supplier')}</span>
          <select className={selectClass + ' w-full'} value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
            <option value="">{t('suppliers.filterAll')}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_ar}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-600">{t('suppliers.reportDate')}</span>
          <input
            type="date"
            className={selectClass + ' w-full'}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </label>
        <div className="flex items-end">
          <p className="text-xs text-slate-500">
            {t('suppliers.scheduledSuppliersCount').replace('{n}', String(suppliersWithDay.length))}
          </p>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-start">{t('inventory.code')}</th>
              <th className="px-4 py-3 text-start">{t('purchases.supplier')}</th>
              <th className="px-4 py-3 text-start">{t('suppliers.reportDate')}</th>
              <th className="px-4 py-3 text-start">{t('suppliers.reportItemsCount')}</th>
              <th className="px-4 py-3 text-start">{t('suppliers.reportStatusLabel')}</th>
              <th className="px-4 py-3 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  {t('suppliers.noWeeklyReports')}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-3 font-medium">{row.supplier_name}</td>
                  <td className="px-4 py-3">{row.report_date}</td>
                  <td className="px-4 py-3 tabular-nums">{row.payload?.totals?.item_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(row.status)}`}>
                      {row.status === 'sent'
                        ? t('suppliers.reportStatusSent')
                        : row.status === 'failed'
                          ? t('suppliers.reportStatusFailed')
                          : t('suppliers.reportStatusGenerated')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setDetail(row)} title={t('suppliers.viewReport')}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => printWeeklyReport(row, printLabels, locale === 'en' ? 'en' : 'ar')}
                      title={t('suppliers.printReport')}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onWhatsApp(row)}
                      title={t('suppliers.sendWhatsapp')}
                    >
                      <MessageCircle className="h-4 w-4 text-emerald-600" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t('suppliers.scheduledSuppliersTitle')}
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {suppliersWithDay.length === 0 ? (
            <p className="text-sm text-slate-500">{t('suppliers.noScheduledSuppliers')}</p>
          ) : (
            suppliersWithDay.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium"
              >
                {s.name_ar}
                <span className="text-violet-700">{weeklyInventoryDayLabel(s.weekly_inventory_day, locale)}</span>
              </span>
            ))
          )}
        </div>
      </div>

      <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{t('suppliers.weeklyReportTitle')}</SheetTitle>
          </SheetHeader>
          {detail ? (
            <div className="space-y-4 py-4 text-sm">
              <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                <p>
                  <strong>{t('purchases.supplier')}:</strong> {detail.supplier_name} ({detail.supplier_code})
                </p>
                <p>
                  <strong>{t('suppliers.reportDate')}:</strong> {detail.report_date}
                </p>
                <p>
                  <strong>{t('suppliers.reportPeriod')}:</strong> {detail.week_start} → {detail.week_end}
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-start">{t('suppliers.reportItem')}</th>
                      <th className="px-3 py-2">{t('suppliers.reportSold')}</th>
                      <th className="px-3 py-2">{t('suppliers.reportRemaining')}</th>
                      <th className="px-3 py-2">{t('suppliers.reportMinThreshold')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.payload?.items ?? []).map((item) => (
                      <tr key={item.product_id} className="border-t">
                        <td className="px-3 py-2">{item.product_name}</td>
                        <td className="px-3 py-2 text-center tabular-nums">{item.sold_qty}</td>
                        <td className="px-3 py-2 text-center tabular-nums">{item.remaining_qty}</td>
                        <td className="px-3 py-2 text-center tabular-nums">{item.min_threshold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(['top_sellers', 'near_depletion', 'stagnant'] as const).map((key) => {
                const titleKey =
                  key === 'top_sellers'
                    ? 'suppliers.reportTopSellers'
                    : key === 'near_depletion'
                      ? 'suppliers.reportNearDepletion'
                      : 'suppliers.reportStagnant';
                const list = detail.payload?.indicators?.[key] ?? [];
                return (
                  <div key={key}>
                    <h4 className="font-semibold text-slate-800 mb-1">{t(titleKey)}</h4>
                    {list.length ? (
                      <ul className="list-disc ps-5 text-slate-600 space-y-0.5">
                        {list.map((item) => (
                          <li key={item.product_id}>
                            {item.product_name} — {item.sold_qty} / {item.remaining_qty}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400">—</p>
                    )}
                  </div>
                );
              })}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => printWeeklyReport(detail, printLabels, locale === 'en' ? 'en' : 'ar')}>
                  <Printer className="h-4 w-4 me-1" />
                  {t('suppliers.printReport')}
                </Button>
                {detail.whatsapp_url ? (
                  <Button type="button" onClick={() => onWhatsApp(detail)}>
                    <MessageCircle className="h-4 w-4 me-1" />
                    {t('suppliers.sendWhatsapp')}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
