import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgePercent,
  CheckSquare,
  ChevronRight,
  FileSpreadsheet,
  MessageCircle,
  Printer,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  applyOkazionNotice,
  brandsApi,
  classificationsApi,
  fetchBarcodeLabels,
  fetchSeasons,
  fetchSuppliers,
  previewOkazionNotice,
  productSectionsApi,
  type OkazionNoticeRow,
  type SeasonDto,
} from '@/lib/api/inventory';
import { printOkazionBarcodeLabels } from '@/lib/print/okazionBarcodePrint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ERP_NATIVE_SELECT } from '@/lib/ui/erpNativeSelect';

type ViewMode = 'all' | 'without_discount' | 'with_discount';

type RowEdit = {
  mode: 'percent' | 'amount';
  value: string;
  markup_percent: string;
  new_offer_price?: string;
  qty?: string;
  enabled: boolean;
  excluded?: boolean;
};

type Props = {
  onBack?: () => void;
};

const selectClass = ERP_NATIVE_SELECT;

function fmt(n: string | number) {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (Number.isNaN(v)) return '0';
  return v.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function OkazionDiscountNoticePage({ onBack }: Props = {}) {
  const { t, locale, isRtl } = useLanguage();
  const { branches } = useAuth();
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [classifications, setClassifications] = useState<Array<{ id: string; name_ar: string }>>([]);

  const [supplierId, setSupplierId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [classificationId, setClassificationId] = useState('');
  const [productQ, setProductQ] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  const [bulkMode, setBulkMode] = useState<'percent' | 'amount'>('percent');
  const [bulkValue, setBulkValue] = useState('10');
  const [bulkMarkup, setBulkMarkup] = useState('35');
  const [bulkDiscountOn, setBulkDiscountOn] = useState(true);
  const [bulkMarkupOn, setBulkMarkupOn] = useState(true);
  const [offerFrom, setOfferFrom] = useState(new Date().toISOString().slice(0, 10));
  const [offerTo, setOfferTo] = useState('');

  const [rows, setRows] = useState<OkazionNoticeRow[]>([]);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [totalDiscount, setTotalDiscount] = useState('0');
  const [accountDelta, setAccountDelta] = useState('0');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [branchId, setBranchId] = useState('');
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcodeBranch, setBarcodeBranch] = useState('');
  const [lastAdjustmentId, setLastAdjustmentId] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      fetchSeasons(),
      fetchSuppliers(),
      brandsApi.list(),
      productSectionsApi.list(),
      classificationsApi.list(),
    ]).then(([s, sup, b, sec, cls]) => {
      setSeasons(s);
      setSuppliers(sup.map((x) => ({ id: x.id, name_ar: x.name_ar })));
      setBrands(b);
      setSections(sec);
      setClassifications(cls);
    });
  }, []);

  const buildPayload = useCallback(() => {
    const lines = Object.entries(edits)
      .filter(([product_id]) => !excludedIds.has(product_id))
      .map(([product_id, e]) => ({
        product_id,
        mode: e.mode,
        value: e.value,
        markup_percent: e.markup_percent,
        new_offer_price: e.new_offer_price || undefined,
        qty: e.qty || undefined,
        enabled: e.enabled,
        excluded: false,
      }));
    return {
      supplier: supplierId,
      season: seasonId,
      branch_id: branchId || null,
      brand: brandId || null,
      section: sectionId || null,
      classification: classificationId || null,
      q: productQ.trim() || undefined,
      view_mode: viewMode,
      default_mode: bulkMode,
      default_value: bulkValue,
      default_markup_percent: bulkMarkup,
      default_enabled: bulkDiscountOn,
      offer_starts_at: offerFrom || null,
      offer_ends_at: offerTo || null,
      lines,
    };
  }, [
    supplierId,
    seasonId,
    branchId,
    brandId,
    sectionId,
    classificationId,
    productQ,
    viewMode,
    bulkMode,
    bulkValue,
    bulkMarkup,
    bulkDiscountOn,
    offerFrom,
    offerTo,
    edits,
    excludedIds,
  ]);

  const runPreview = useCallback(async () => {
    if (!supplierId || !seasonId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await previewOkazionNotice(buildPayload());
      setRows(res.rows);
      setTotalDiscount(res.total_discount_value);
      setAccountDelta(res.supplier_account_delta);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [supplierId, seasonId, buildPayload]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runPreview, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [runPreview]);

  const onBulkValueChange = (v: string) => {
    setBulkValue(v);
    if (bulkDiscountOn && rows.length) {
      const next: Record<string, RowEdit> = { ...edits };
      rows.forEach((r) => {
        next[r.product_id] = {
          mode: bulkMode,
          value: v,
          markup_percent: next[r.product_id]?.markup_percent ?? r.markup_percent,
          enabled: true,
        };
      });
      setEdits(next);
    }
  };

  const onBulkMarkupChange = (v: string) => {
    setBulkMarkup(v);
    if (bulkMarkupOn && rows.length) {
      const next: Record<string, RowEdit> = { ...edits };
      rows.forEach((r) => {
        const cur = next[r.product_id] ?? {
          mode: r.mode as 'percent' | 'amount',
          value: r.value,
          markup_percent: r.markup_percent,
          enabled: r.enabled,
        };
        next[r.product_id] = { ...cur, markup_percent: v };
      });
      setEdits(next);
    }
  };

  const updateEdit = (productId: string, patch: Partial<RowEdit>) => {
    setEdits((m) => {
      const base = rows.find((r) => r.product_id === productId);
      const cur = m[productId] ?? {
        mode: (base?.mode ?? 'percent') as 'percent' | 'amount',
        value: base?.value ?? '0',
        markup_percent: base?.markup_percent ?? '0',
        enabled: base?.enabled ?? false,
      };
      return { ...m, [productId]: { ...cur, ...patch } };
    });
  };

  const onSave = async () => {
    if (!supplierId || !seasonId) {
      setError(t('okazion.requiredFilters'));
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await applyOkazionNotice(buildPayload());
      setSuccess(
        `${t('okazion.saved')} ${res.code} — ${res.products_affected} ${t('inventory.products')}`,
      );
      setLastAdjustmentId(res.id);
      setBarcodeBranch(res.default_branch_id || branches[0]?.id || '');
      setBarcodeOpen(true);
      await runPreview();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const printPdf = () => {
    const dir = isRtl ? 'rtl' : 'ltr';
    const html = `<!DOCTYPE html><html dir="${dir}" lang="${locale}"><head><meta charset="utf-8"/>
    <title>${t('okazion.title')}</title>
    <style>body{font-family:Cairo,sans-serif;padding:20px;font-size:11px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px}th{background:#e2e8f0}.old{background:#f8fafc}.new{background:#fff7ed}</style></head><body>
    <h2>${t('okazion.title')}</h2>
    <p>${t('purchases.supplier')}: ${suppliers.find((s) => s.id === supplierId)?.name_ar ?? ''} | ${t('purchases.season')}: ${seasons.find((s) => s.id === seasonId)?.name_ar ?? ''}</p>
    <table><thead><tr>
    <th>${t('inventory.barcode')}</th><th>${t('inventory.products')}</th><th>${t('okazion.stock')}</th>
    <th class="old">${t('okazion.oldPurchase')}</th>
    <th>${t('okazion.discountValue')}</th><th class="new">${t('okazion.newPurchase')}</th>
    <th>${t('okazion.markupPct')}</th><th class="new">${t('okazion.newOffer')}</th><th>${t('okazion.totalDiscount')}</th>
    </tr></thead><tbody>
    ${rows
      .filter((r) => r.has_discount)
      .map(
        (r) => `<tr>
      <td>${r.barcode}</td><td>${r.name_ar}</td><td>${r.stock_qty}</td>
      <td>${r.old_purchase_price}</td>
      <td>${r.value}${r.mode === 'percent' ? '%' : ''}</td>
      <td>${r.new_purchase_price}</td><td>${r.markup_percent}%</td>
      <td>${r.new_offer_price || r.new_sale_price}</td><td>${r.total_discount_value}</td></tr>`,
      )
      .join('')}
    </tbody></table>
    <p><b>${t('okazion.totalItems')}:</b> ${rows.length} | <b>${t('okazion.totalNoticeValue')}:</b> ${totalDiscount}</p>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  };

  const onWhatsApp = () => {
    const sup = suppliers.find((s) => s.id === supplierId)?.name_ar ?? '';
    const msg = `${t('okazion.title')}\n${t('purchases.supplier')}: ${sup}\n${t('okazion.totalItems')}: ${rows.length}\n${t('okazion.totalNoticeValue')}: ${totalDiscount}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const printBarcodes = async () => {
    if (!barcodeBranch || !lastAdjustmentId) return;
    const labels = await fetchBarcodeLabels({
      okazion_notice: lastAdjustmentId,
      branch: barcodeBranch,
    });
    if (!labels.length) return;
    printOkazionBarcodeLabels(labels);
    setBarcodeOpen(false);
  };

  const itemCount = rows.length;
  const discountedCount = useMemo(() => rows.filter((r) => r.has_discount).length, [rows]);

  return (
    <div
      className="flex flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-lg overflow-hidden"
      style={{ height: 'calc(100dvh - 7.5rem)', minHeight: '560px' }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <header className="shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-sm z-20">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {onBack ? (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ChevronRight className={`h-4 w-4 ${isRtl ? '' : 'rotate-180'}`} />
                {t('back')}
              </Button>
            ) : null}
            <div>
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BadgePercent className="h-5 w-5 text-orange-600" />
              {t('okazion.title')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{t('okazion.desc')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={runPreview} disabled={loading}>
              <RefreshCw className={`h-4 w-4 me-1 ${loading ? 'animate-spin' : ''}`} />
              {t('reports.movement.runReport')}
            </Button>
            <Button variant="outline" size="sm" onClick={printPdf} disabled={!rows.length}>
              <Printer className="h-4 w-4 me-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={onWhatsApp} disabled={!rows.length}>
              <MessageCircle className="h-4 w-4 me-1" />
              {t('reports.movement.sendWhatsapp')}
            </Button>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 font-bold" onClick={onSave} disabled={saving || !rows.length}>
              <Save className="h-4 w-4 me-1" />
              {saving ? t('common.saving') : t('okazion.execute')}
            </Button>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'without_discount', 'with_discount'] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition ${
                  viewMode === m
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
                }`}
              >
                {t(`okazion.view_${m}`)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-700">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t('reports.movement.filters')}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('purchases.supplier')} *</span>
              <select className={selectClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">{t('suppliers.selectSupplier')}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name_ar}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('purchases.season')} *</span>
              <select className={selectClass} value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
                <option value="">{t('purchases.selectSeason')}</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.name_ar}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('purchases.form.brand')}</span>
              <select className={selectClass} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">{t('reports.movement.all')}</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name_ar}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('purchases.form.productGroup')}</span>
              <select className={selectClass} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">{t('reports.movement.all')}</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name_ar}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('nav.classifications')}</span>
              <select className={selectClass} value={classificationId} onChange={(e) => setClassificationId(e.target.value)}>
                <option value="">{t('reports.movement.all')}</option>
                {classifications.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_ar}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('okazion.branchOffer')}</span>
              <select className={selectClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">{t('okazion.allBranches')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name_ar}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('inventory.searchProducts')}</span>
              <Input className="h-9" value={productQ} onChange={(e) => setProductQ(e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 rounded-xl border border-orange-200/80 bg-orange-50/40 p-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="space-y-1 flex-1 min-w-[120px]">
                <span className="text-[10px] font-bold text-slate-600">{t('okazion.discountValue')}</span>
                <div className="flex gap-2">
                  <select className={selectClass + ' w-28'} value={bulkMode} onChange={(e) => setBulkMode(e.target.value as 'percent' | 'amount')}>
                    <option value="percent">%</option>
                    <option value="amount">{t('inventory.modeAmount')}</option>
                  </select>
                  <Input value={bulkValue} onChange={(e) => onBulkValueChange(e.target.value)} className="h-9 font-bold" />
                </div>
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 pb-2">
                <input type="checkbox" checked={bulkDiscountOn} onChange={(e) => setBulkDiscountOn(e.target.checked)} />
                <CheckSquare className="h-4 w-4 text-orange-600" />
                {t('okazion.activateAll')}
              </label>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="space-y-1 flex-1 min-w-[120px]">
                <span className="text-[10px] font-bold text-slate-600">{t('okazion.markupPct')}</span>
                <Input value={bulkMarkup} onChange={(e) => onBulkMarkupChange(e.target.value)} className="h-9 font-bold" />
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 pb-2">
                <input type="checkbox" checked={bulkMarkupOn} onChange={(e) => setBulkMarkupOn(e.target.checked)} />
                <CheckSquare className="h-4 w-4 text-orange-600" />
                {t('okazion.activateAll')}
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="font-bold text-slate-600">{t('okazion.executeFrom')}</label>
            <Input type="date" className="h-9 w-40" value={offerFrom} onChange={(e) => setOfferFrom(e.target.value)} />
            <label className="font-bold text-slate-600">{t('okazion.executeTo')}</label>
            <Input type="date" className="h-9 w-40" value={offerTo} onChange={(e) => setOfferTo(e.target.value)} />
          </div>
        </div>
      </header>

      {error && <p className="mx-4 mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{error}</p>}
      {success && <p className="mx-4 mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">{success}</p>}

      <div className="flex-1 min-h-0 overflow-auto px-4 py-3">
        {!supplierId || !seasonId ? (
          <p className="text-center text-slate-500 py-16 text-sm">{t('okazion.requiredFilters')}</p>
        ) : rows.length === 0 && !loading ? (
          <p className="text-center text-slate-500 py-16 text-sm">{t('okazion.emptyView')}</p>
        ) : (
          <table className="w-full text-[11px] border-collapse min-w-[1200px]">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
              <tr className="text-[10px] font-black uppercase text-slate-700">
                <th className="border px-2 py-2">{t('inventory.barcode')}</th>
                <th className="border px-2 py-2">{t('inventory.products')}</th>
                <th className="border px-2 py-2">{t('purchases.form.brand')}</th>
                <th className="border px-2 py-2">{t('okazion.qty')}</th>
                <th className="border px-2 py-2 bg-slate-200">{t('okazion.oldPurchase')}</th>
                <th className="border px-2 py-2 bg-slate-200">{t('okazion.oldSale')}</th>
                <th className="border px-2 py-2 bg-orange-100 w-16">{t('okazion.discountType')}</th>
                <th className="border px-2 py-2 bg-orange-100">{t('okazion.discountValue')}</th>
                <th className="border px-2 py-2 bg-orange-50">{t('okazion.newPurchase')}</th>
                <th className="border px-2 py-2 bg-orange-50">{t('okazion.markupPct')}</th>
                <th className="border px-2 py-2 bg-orange-50">{t('okazion.newOffer')}</th>
                <th className="border px-2 py-2">{t('okazion.totalDiscount')}</th>
                <th className="border px-2 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => !excludedIds.has(r.product_id))
                .map((r) => {
                const e = edits[r.product_id];
                const mode = e?.mode ?? (r.mode as 'percent' | 'amount');
                const value = e?.value ?? r.value;
                const markup = e?.markup_percent ?? r.markup_percent;
                const qty = e?.qty ?? r.qty ?? r.stock_qty;
                const offerPrice = e?.new_offer_price ?? r.new_offer_price ?? r.new_sale_price;
                return (
                  <tr key={r.product_id} className="border-t hover:bg-slate-50/70">
                    <td className="border px-2 py-1 font-mono">{r.barcode}</td>
                    <td className="border px-2 py-1 font-bold">{r.name_ar}</td>
                    <td className="border px-2 py-1">{r.brand_name}</td>
                    <td className="border px-1 py-1">
                      <Input
                        className="h-7 text-center font-bold tabular-nums w-16"
                        value={qty}
                        onChange={(ev) => updateEdit(r.product_id, { qty: ev.target.value })}
                      />
                    </td>
                    <td className="border px-2 py-1 text-center tabular-nums bg-slate-50">{fmt(r.old_purchase_price)}</td>
                    <td className="border px-2 py-1 text-center tabular-nums bg-slate-50">{fmt(r.old_sale_price)}</td>
                    <td className="border px-1 py-1 bg-orange-50/50">
                      <select
                        className="w-full rounded border px-1 py-1 text-[10px]"
                        value={mode}
                        onChange={(ev) => updateEdit(r.product_id, { mode: ev.target.value as 'percent' | 'amount' })}
                      >
                        <option value="percent">%</option>
                        <option value="amount">{t('inventory.modeAmount')}</option>
                      </select>
                    </td>
                    <td className="border px-1 py-1 bg-orange-50/50">
                      <Input
                        className="h-7 text-center font-bold tabular-nums"
                        value={value}
                        onChange={(ev) => updateEdit(r.product_id, { value: ev.target.value, enabled: true })}
                      />
                    </td>
                    <td className="border px-2 py-1 text-center tabular-nums font-bold text-orange-800">{fmt(r.new_purchase_price)}</td>
                    <td className="border px-1 py-1">
                      <Input
                        className="h-7 text-center font-bold tabular-nums"
                        value={markup}
                        onChange={(ev) => updateEdit(r.product_id, { markup_percent: ev.target.value })}
                      />
                    </td>
                    <td className="border px-1 py-1">
                      <Input
                        className="h-7 text-center font-black tabular-nums text-emerald-800"
                        value={offerPrice}
                        onChange={(ev) => updateEdit(r.product_id, { new_offer_price: ev.target.value })}
                      />
                    </td>
                    <td className="border px-2 py-1 text-center tabular-nums font-bold">{fmt(r.total_discount_value)}</td>
                    <td className="border px-1 py-1 text-center">
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                        title={t('common.delete')}
                        onClick={() => setExcludedIds((s) => new Set(s).add(r.product_id))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-slate-500">{t('okazion.totalItems')}: </span>
            <span className="font-black">{itemCount}</span>
            <span className="text-slate-400 ms-2">({discountedCount} {t('okazion.withDiscount')})</span>
          </div>
          <div>
            <span className="text-slate-500">{t('okazion.totalNoticeValue')}: </span>
            <span className="font-black text-orange-700">{fmt(totalDiscount)}</span>
          </div>
          <div>
            <span className="text-slate-500">{t('inventory.supplierAccountPosted')}: </span>
            <span className="font-black">{fmt(accountDelta)}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" disabled={!rows.length}>
          <FileSpreadsheet className="h-4 w-4 me-1" />
          Excel
        </Button>
      </footer>

      <Sheet open={barcodeOpen} onOpenChange={setBarcodeOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('okazion.printBarcodeTitle')}</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-slate-600 py-2">{t('okazion.printBarcodeDesc')}</p>
          <select
            className={selectClass}
            value={barcodeBranch}
            onChange={(e) => setBarcodeBranch(e.target.value)}
          >
            <option value="">{t('okazion.selectBranch')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name_ar}</option>
            ))}
          </select>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setBarcodeOpen(false)}>{t('common.no')}</Button>
            <Button onClick={printBarcodes} disabled={!barcodeBranch}>{t('common.yes')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
