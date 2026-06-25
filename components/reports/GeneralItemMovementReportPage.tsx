import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  MessageCircle,
  Printer,
  RefreshCw,
  Send,
  SlidersHorizontal,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ApiRequestError } from '@/lib/api/errors';
import { fetchBranches, type BranchDto } from '@/lib/api/branches';
import {
  brandsApi,
  classificationsApi,
  fetchSeasons,
  fetchSuppliers,
  productSectionsApi,
  type CatalogItem,
  type SeasonDto,
} from '@/lib/api/inventory';
import {
  fetchGeneralItemMovementReport,
  type GeneralItemMovementReport,
  type MovementQuery,
} from '@/lib/api/generalItemMovement';
import { Button } from '@/components/ui/button';
import {
  exportMovementCsv,
  printMovementReport,
  type MovementPrintLabels,
} from '@/components/reports/GeneralItemMovementPrint';

import { ERP_NATIVE_SELECT } from '@/lib/ui/erpNativeSelect';

const selectClass = ERP_NATIVE_SELECT;

function cellMoney(qty: string, value: string, show: boolean) {
  if (!show) return <span className="font-black text-slate-800 tabular-nums">{qty}</span>;
  return (
    <div className="leading-tight tabular-nums">
      <div className="font-black text-slate-900">{qty}</div>
      <div className="text-[9px] font-semibold text-slate-500">{value}</div>
    </div>
  );
}

export function GeneralItemMovementReportPage() {
  const { t, locale, isRtl } = useLanguage();
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [suppliers, setSuppliers] = useState<CatalogItem[]>([]);
  const [brands, setBrands] = useState<CatalogItem[]>([]);
  const [sections, setSections] = useState<CatalogItem[]>([]);
  const [classifications, setClassifications] = useState<CatalogItem[]>([]);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);

  const [branchId, setBranchId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [classificationId, setClassificationId] = useState('');
  const [productQ, setProductQ] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [valuation, setValuation] = useState<'purchase' | 'sale' | 'wholesale'>('purchase');
  const [showMoney, setShowMoney] = useState(true);

  const [report, setReport] = useState<GeneralItemMovementReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchBranches(),
      fetchSuppliers(),
      brandsApi.list(),
      productSectionsApi.list(),
      classificationsApi.list(),
      fetchSeasons(),
    ])
      .then(([br, sup, brandList, sec, cls, sn]) => {
        setBranches(br.filter((b) => b.is_active));
        setSuppliers(sup);
        setBrands(brandList);
        setSections(sec);
        setClassifications(cls);
        setSeasons(sn);
        const current = sn.find((s) => s.is_current);
        if (current) setSeasonId(current.id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, []);

  const query = useMemo<MovementQuery>(
    () => ({
      branch: branchId || undefined,
      supplier: supplierId || undefined,
      brand: brandId || undefined,
      section: sectionId || undefined,
      classification: classificationId || undefined,
      product_q: productQ.trim() || undefined,
      season: seasonId || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      valuation,
    }),
    [
      branchId,
      supplierId,
      brandId,
      sectionId,
      classificationId,
      productQ,
      seasonId,
      dateFrom,
      dateTo,
      valuation,
    ],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await fetchGeneralItemMovementReport(query));
    } catch (e) {
      setReport(null);
      setError(e instanceof ApiRequestError ? e.message : t('reports.movement.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [query, t]);

  useEffect(() => {
    load();
  }, [load]);

  const printLabels = useMemo<MovementPrintLabels>(
    () => ({
      title: t('reports.movement.title'),
      supplier: t('purchases.supplier'),
      season: t('purchases.season'),
      period: t('reports.movement.period'),
      model: t('purchases.form.columns.model'),
      description: t('purchases.form.columns.description'),
      brand: t('purchases.form.brand'),
      purchasePrice: t('inventory.purchasePrice'),
      purchasedQty: t('reports.movement.purchasedQty'),
      purchasedValue: t('reports.movement.purchasedValue'),
      returnQty: t('reports.movement.returnQty'),
      returnValue: t('reports.movement.returnValue'),
      soldQty: t('reports.movement.soldQty'),
      soldValue: t('reports.movement.soldValue'),
      purchaseCount: t('reports.movement.purchaseCount'),
      balance: t('reports.movement.branchBalance'),
      balanceValue: t('reports.movement.totalBalanceValue'),
      totals: t('reports.movement.totals'),
      footer: t('reports.movement.printFooter'),
    }),
    [t],
  );

  const onWhatsApp = () => {
    if (!report?.whatsapp_url) {
      alert(t('suppliers.noWhatsapp'));
      return;
    }
    printMovementReport(report, printLabels, locale, showMoney);
    window.open(report.whatsapp_url, '_blank', 'noopener,noreferrer');
  };

  const rows = report?.rows ?? [];
  const totals = report?.totals;
  const branchCols = report?.branches ?? [];

  return (
    <div
      className="flex flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-lg overflow-hidden"
      style={{ height: 'calc(100dvh - 7.5rem)', minHeight: '520px' }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* ═══ هيدر ثابت — فلاتر + تصدير ═══ */}
      <header className="shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm z-20">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <div className="min-w-0">
            <h1 className="text-lg font-black text-slate-900">{t('reports.movement.title')}</h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">{t('reports.movement.desc')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 me-1 ${loading ? 'animate-spin' : ''}`} />
              {t('reports.movement.runReport')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!report}
              onClick={() => report && exportMovementCsv(report, showMoney)}
            >
              <FileSpreadsheet className="h-4 w-4 me-1" />
              Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!report}
              onClick={() => report && printMovementReport(report, printLabels, locale, showMoney)}
            >
              <Printer className="h-4 w-4 me-1" />
              PDF
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 font-bold"
              disabled={!report?.whatsapp_url}
              onClick={onWhatsApp}
            >
              <MessageCircle className="h-4 w-4 me-1" />
              {t('reports.movement.sendWhatsapp')}
            </Button>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#4169E1]">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t('reports.movement.filters')}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('reports.movement.branch')}</span>
              <select className={selectClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">{t('reports.movement.allBranches')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_ar || b.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('purchases.supplier')}</span>
              <select className={selectClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">{t('reports.movement.all')}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('purchases.form.brand')}</span>
              <select className={selectClass} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">{t('reports.movement.all')}</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_ar}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('purchases.form.productGroup')}</span>
              <select className={selectClass} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">{t('reports.movement.all')}</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('purchases.form.productDepartment')}</span>
              <select
                className={selectClass}
                value={classificationId}
                onChange={(e) => setClassificationId(e.target.value)}
              >
                <option value="">{t('reports.movement.all')}</option>
                {classifications.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('reports.movement.productItem')}</span>
              <input
                type="text"
                className={selectClass}
                value={productQ}
                onChange={(e) => setProductQ(e.target.value)}
                placeholder={t('reports.movement.productItemPlaceholder')}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('purchases.season')}</span>
              <select className={selectClass} value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
                <option value="">{t('reports.movement.all')}</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('reports.movement.dateFrom')}</span>
              <input type="date" className={selectClass} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('reports.movement.dateTo')}</span>
              <input type="date" className={selectClass} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('reports.movement.valuation')}</span>
              <select
                className={selectClass}
                value={valuation}
                onChange={(e) => setValuation(e.target.value as typeof valuation)}
              >
                <option value="purchase">{t('reports.movement.valPurchase')}</option>
                <option value="sale">{t('reports.movement.valSale')}</option>
                <option value="wholesale">{t('reports.movement.valWholesale')}</option>
              </select>
            </label>
            <label className="flex items-end gap-2 pb-1">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={showMoney}
                onChange={(e) => setShowMoney(e.target.checked)}
              />
              <span className="text-xs font-bold text-slate-700">{t('reports.movement.showMoney')}</span>
            </label>
          </div>

          {report?.period_label ? (
            <p className="text-[11px] font-semibold text-slate-600">
              {t('reports.movement.period')}: <span className="text-[#4169E1]">{report.period_label}</span>
              {report.supplier_name ? (
                <>
                  {' '}
                  · {t('purchases.supplier')}: <span className="font-black">{report.supplier_name}</span>
                </>
              ) : null}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-slate-200/90 via-slate-100 to-slate-200/90 px-4 py-2.5 border border-slate-300/80">
            <p className="text-xs font-bold text-slate-700 max-w-3xl">{t('reports.movement.whatsappBanner')}</p>
            <Button
              type="button"
              size="sm"
              className="shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700 h-10 w-10 p-0"
              disabled={!report?.whatsapp_url}
              onClick={onWhatsApp}
              title={t('reports.movement.sendWhatsapp')}
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ═══ جسم التقرير — اسكرول فقط هنا ═══ */}
      <div className="flex-1 min-h-0 overflow-auto border-y-[3px] border-slate-800 bg-white">
        <table
          className="w-full border-collapse min-w-[1280px] text-[10px]"
          style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: 700 }}
        >
          <thead className="sticky top-0 z-10 bg-[#E2E8F0] shadow-sm">
            <tr>
              <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-center">
                {t('purchases.season')}
              </th>
              <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-center">
                {t('purchases.supplier')}
              </th>
              <th colSpan={3} className="border border-slate-300 px-2 py-2 text-center">
                {t('purchases.form.columns.itemName')}
              </th>
              <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-center">
                {t('inventory.purchasePrice')}
              </th>
              <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-center">
                {t('reports.movement.purchasedQty')}
              </th>
              <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-center">
                {t('reports.movement.returnQty')}
              </th>
              <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-center">
                {t('reports.movement.soldQty')}
              </th>
              <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-center">
                {t('reports.movement.purchaseCount')}
              </th>
              <th colSpan={branchCols.length || 1} className="border border-slate-300 px-2 py-2 text-center">
                {t('reports.movement.branchBalance')}
              </th>
              <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-center text-emerald-800">
                {t('reports.movement.totalBalance')}
              </th>
            </tr>
            <tr>
              <th className="border border-slate-300 px-2 py-1.5 text-center">{t('purchases.form.columns.model')}</th>
              <th className="border border-slate-300 px-2 py-1.5 text-center min-w-[120px]">
                {t('purchases.form.columns.description')}
              </th>
              <th className="border border-slate-300 px-2 py-1.5 text-center">{t('purchases.form.brand')}</th>
              {(branchCols.length ? branchCols : [{ branch_id: '-', branch_name: '—' }]).map((b) => (
                <th key={b.branch_id} className="border border-slate-300 px-2 py-1.5 text-center text-[9px]">
                  {b.branch_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12 + branchCols.length} className="py-16 text-center text-slate-500">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={12 + branchCols.length} className="py-16 text-center text-slate-400 font-bold">
                  {t('inventory.empty')}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.product_id}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60 hover:bg-blue-50/40'}
                >
                  <td className="border border-slate-200 px-2 py-2 text-center text-orange-700">{row.season_name}</td>
                  <td className="border border-slate-200 px-2 py-2">{row.supplier_name}</td>
                  <td className="border border-slate-200 px-2 py-2 text-center font-mono">{row.product_code}</td>
                  <td className="border border-slate-200 px-2 py-2 max-w-[140px] truncate" title={row.product_name}>
                    {row.product_name}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-center text-slate-500">{row.brand_name}</td>
                  <td className="border border-slate-200 px-2 py-2 text-center tabular-nums">{row.purchase_price}</td>
                  <td className="border border-slate-200 px-2 py-2 text-center">
                    {cellMoney(row.purchased_qty, row.purchased_value, showMoney)}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-center">
                    {cellMoney(row.return_qty, row.return_value, showMoney)}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-center">
                    {cellMoney(row.sold_qty, row.sold_value, showMoney)}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-center font-black">{row.purchase_count}</td>
                  {branchCols.map((b) => {
                    const st = row.branch_stocks.find((x) => x.branch_id === b.branch_id);
                    return (
                      <td key={b.branch_id} className="border border-slate-200 px-2 py-2 text-center font-black text-[#4169E1]">
                        {st?.quantity ?? '0'}
                      </td>
                    );
                  })}
                  <td className="border border-slate-200 px-2 py-2 text-center bg-emerald-50/50">
                    {cellMoney(row.balance_qty, row.balance_value, showMoney)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ═══ فوتر ثابت — إجماليات ═══ */}
      <footer className="shrink-0 z-20 border-t-[3px] border-slate-800 bg-gradient-to-r from-slate-100 via-white to-slate-100 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse min-w-[1280px] text-[11px]"
            style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: 800 }}
          >
            <tbody>
              <tr className="bg-slate-800 text-white">
                <td colSpan={6} className="px-4 py-3 text-start">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-emerald-300" />
                    {t('reports.movement.totals')}
                  </div>
                </td>
                <td className="px-2 py-3 text-center">
                  {totals ? cellMoney(totals.purchased_qty, totals.purchased_value, showMoney) : '—'}
                </td>
                <td className="px-2 py-3 text-center">
                  {totals ? cellMoney(totals.return_qty, totals.return_value, showMoney) : '—'}
                </td>
                <td className="px-2 py-3 text-center">
                  {totals ? cellMoney(totals.sold_qty, totals.sold_value, showMoney) : '—'}
                </td>
                <td className="px-2 py-3 text-center">—</td>
                {branchCols.map((b) => (
                  <td key={b.branch_id} className="px-2 py-3 text-center text-blue-200 tabular-nums">
                    {totals?.branch_qty[b.branch_id] ?? '0'}
                  </td>
                ))}
                <td className="px-2 py-3 text-center text-emerald-300">
                  {totals ? cellMoney(totals.balance_qty, totals.balance_value, showMoney) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="px-4 py-1.5 text-[10px] text-slate-500 flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          {t('reports.movement.whatsappHint')}
        </p>
      </footer>
    </div>
  );
}
