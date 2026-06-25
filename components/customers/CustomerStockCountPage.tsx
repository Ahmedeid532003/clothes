import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  MessageCircle,
  Printer,
  RefreshCw,
  Save,
  ScanBarcode,
  SlidersHorizontal,
  Store,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { customersApi } from '@/lib/api/customers';
import {
  consignmentApi,
  type ConsignmentCountLine,
  type ConsignmentCountSheet,
} from '@/lib/api/consignment';
import { fetchWarehouses } from '@/lib/api/inventory';
import { fmtMoney } from '@/components/accounting/AccountingUi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ERP_NATIVE_SELECT } from '@/lib/ui/erpNativeSelect';

type CountedMap = Record<string, string>;
type ViewMode = 'all' | 'with_sold' | 'with_variance' | 'unchanged';

type RowCalc = {
  line: ConsignmentCountLine;
  book: number;
  counted: number;
  sent: number;
  returned: number;
  sold: number;
  variance: number;
  collect: number;
};

const selectClass = ERP_NATIVE_SELECT;

function fmt(n: number) {
  return n.toLocaleString('ar-EG', { maximumFractionDigits: 0 });
}

function calcRow(line: ConsignmentCountLine, countedVal: string): RowCalc {
  const book = parseFloat(line.qty_on_hand) || 0;
  const counted = parseFloat(countedVal) || 0;
  const sent = parseFloat(line.qty_sent) || 0;
  const returned = parseFloat(line.qty_returned) || 0;
  const sold = Math.max(0, sent - counted - returned);
  const variance = counted - book;
  const price = parseFloat(line.unit_price) || 0;
  return { line, book, counted, sent, returned, sold, variance, collect: sold * price };
}

export function CustomerStockCountPage() {
  const { t, isRtl } = useLanguage();
  const scanRef = useRef<HTMLInputElement>(null);
  const [customers, setCustomers] = useState<{ id: string; name: string; code: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [productQ, setProductQ] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [countDate, setCountDate] = useState(new Date().toISOString().slice(0, 10));
  const [applyBookAll, setApplyBookAll] = useState(false);

  const [sheet, setSheet] = useState<ConsignmentCountSheet | null>(null);
  const [counted, setCounted] = useState<CountedMap>({});
  const [scanQ, setScanQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([customersApi.list(), fetchWarehouses()]).then(([cust, wh]) => {
      setCustomers(cust.map((c) => ({ id: c.id, name: c.name_ar, code: c.code })));
      setWarehouses(wh.map((w) => ({ id: w.id, name: w.name_ar })));
    });
  }, []);

  const loadSheet = useCallback(async () => {
    if (!customerId) {
      setSheet(null);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await consignmentApi.countSheet(customerId, warehouseId || undefined);
      setSheet(data);
      const init: CountedMap = {};
      data.lines.forEach((ln) => {
        init[ln.variant_id] = ln.counted_qty;
      });
      setCounted(init);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setSheet(null);
    } finally {
      setLoading(false);
    }
  }, [customerId, warehouseId]);

  useEffect(() => {
    if (customerId) loadSheet();
  }, [customerId, warehouseId, loadSheet]);

  const onApplyBookAll = (checked: boolean) => {
    setApplyBookAll(checked);
    if (checked && sheet) {
      const next: CountedMap = {};
      sheet.lines.forEach((ln) => {
        next[ln.variant_id] = ln.qty_on_hand;
      });
      setCounted(next);
    }
  };

  const rowCalcs = useMemo(() => {
    if (!sheet) return [];
    return sheet.lines.map((ln) => calcRow(ln, counted[ln.variant_id] ?? ln.qty_on_hand));
  }, [sheet, counted]);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    rowCalcs.forEach((r) => {
      if (r.line.brand_name) set.add(r.line.brand_name);
    });
    return [...set].sort();
  }, [rowCalcs]);

  const sectionOptions = useMemo(() => {
    const set = new Set<string>();
    rowCalcs.forEach((r) => {
      if (r.line.section_name) set.add(r.line.section_name);
    });
    return [...set].sort();
  }, [rowCalcs]);

  const visibleRows = useMemo(() => {
    const q = productQ.trim().toLowerCase();
    return rowCalcs.filter((r) => {
      if (brandFilter && r.line.brand_name !== brandFilter) return false;
      if (sectionFilter && r.line.section_name !== sectionFilter) return false;
      if (q) {
        const hit =
          r.line.barcode.toLowerCase().includes(q) ||
          r.line.product_code.toLowerCase().includes(q) ||
          r.line.product_name.toLowerCase().includes(q) ||
          (r.line.supplier_name ?? '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (viewMode === 'with_sold' && r.sold <= 0) return false;
      if (viewMode === 'with_variance' && r.variance === 0) return false;
      if (viewMode === 'unchanged' && r.variance !== 0) return false;
      return true;
    });
  }, [rowCalcs, brandFilter, sectionFilter, productQ, viewMode]);

  const totals = useMemo(() => {
    let items = 0;
    let soldQty = 0;
    let collect = 0;
    let onHand = 0;
    visibleRows.forEach((r) => {
      items += 1;
      soldQty += r.sold;
      collect += r.collect;
      onHand += r.counted;
    });
    return { items, soldQty, collect, onHand };
  }, [visibleRows]);

  const onScan = () => {
    const q = scanQ.trim().toLowerCase();
    if (!q) return;
    const hit = rowCalcs.find(
      (r) =>
        r.line.barcode.toLowerCase() === q ||
        r.line.product_code.toLowerCase() === q,
    );
    if (hit) {
      const el = document.getElementById(`csc-row-${hit.line.variant_id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50');
      setTimeout(() => el?.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50'), 1500);
      const input = el?.querySelector('input');
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
      }
    }
    setScanQ('');
    scanRef.current?.focus();
  };

  const saveCount = async () => {
    if (!customerId || !sheet?.lines.length) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const wh = warehouseId || sheet.lines[0]?.warehouse_id;
      if (!wh) throw new Error(t('customerStockCount.noWarehouse'));

      const lines = sheet.lines.map((ln) => ({
        variant: ln.variant_id,
        quantity: counted[ln.variant_id] ?? ln.qty_on_hand,
        unit_price: ln.unit_price,
        counted_qty: counted[ln.variant_id] ?? ln.qty_on_hand,
        system_qty: ln.qty_on_hand,
        barcode: ln.barcode,
      }));

      const movement = await consignmentApi.createMovement({
        movement_type: 'count',
        customer: customerId,
        warehouse: wh,
        movement_date: countDate,
        notes: t('customerStockCount.countNote'),
        lines,
      });
      await consignmentApi.approve(movement.id);
      await loadSheet();
      setSuccess(t('customerStockCount.saved', { code: movement.code }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const printReport = () => {
    if (!sheet) return;
    const dir = isRtl ? 'rtl' : 'ltr';
    const cust = sheet.customer_name;
    const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"/><title>${t('customerStockCount.reportTitle')}</title>
    <style>body{font-family:Cairo,sans-serif;padding:20px;font-size:11px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px}th{background:#e2e8f0}.old{background:#f8fafc}.new{background:#fff7ed}</style></head><body>
    <h2>${t('customerStockCount.reportTitle')}</h2>
    <p><b>${cust}</b> — ${countDate}</p>
    <p>${t('customerStockCount.formula')}</p>
    <table><thead><tr>
    <th>${t('inventory.barcode')}</th><th>${t('inventory.products')}</th><th>${t('customerStockCount.sentQty')}</th>
    <th class="old">${t('customerStockCount.bookQty')}</th><th class="old">${t('customerStockCount.salePrice')}</th>
    <th class="new">${t('customerStockCount.actualQty')}</th><th class="new">${t('customerStockCount.soldThisPeriod')}</th>
    <th class="new">${t('customerStockCount.collectValue')}</th>
    </tr></thead><tbody>
    ${visibleRows
      .map(
        (r) => `<tr>
      <td>${r.line.barcode}</td><td>${r.line.product_name}</td><td>${fmt(r.sent)}</td>
      <td>${fmt(r.book)}</td><td>${r.line.unit_price}</td>
      <td>${fmt(r.counted)}</td><td>${fmt(r.sold)}</td><td>${r.collect.toFixed(2)}</td></tr>`,
      )
      .join('')}
    </tbody></table>
    <p><b>${t('customerStockCount.totalItems')}:</b> ${totals.items} | <b>${t('customerStockCount.totalCollect')}:</b> ${totals.collect.toFixed(2)}</p>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  };

  const onWhatsApp = () => {
    if (!sheet) return;
    const msg = `${t('customerStockCount.reportTitle')}\n${sheet.customer_name}\n${t('customerStockCount.totalItems')}: ${totals.items}\n${t('consignment.soldQty')}: ${fmt(totals.soldQty)}\n${t('customerStockCount.totalCollect')}: ${totals.collect.toFixed(2)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div
      className="flex flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-lg overflow-hidden"
      style={{ height: 'calc(100dvh - 7.5rem)', minHeight: '560px' }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <header className="shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-sm z-20">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <div>
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              {t('customerStockCount.title')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">{t('customerStockCount.formula')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={loadSheet} disabled={loading || !customerId}>
              <RefreshCw className={`h-4 w-4 me-1 ${loading ? 'animate-spin' : ''}`} />
              {t('consignment.refresh')}
            </Button>
            <Button variant="outline" size="sm" onClick={printReport} disabled={!sheet}>
              <Printer className="h-4 w-4 me-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={onWhatsApp} disabled={!sheet}>
              <MessageCircle className="h-4 w-4 me-1" />
              {t('reports.movement.sendWhatsapp')}
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 font-bold" onClick={saveCount} disabled={!sheet || saving}>
              <Save className="h-4 w-4 me-1" />
              {saving ? t('common.saving') : t('customerStockCount.saveCount')}
            </Button>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'with_sold', 'with_variance', 'unchanged'] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition ${
                  viewMode === m
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                }`}
              >
                {t(`customerStockCount.view_${m}`)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-700">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t('reports.movement.filters')}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[10px] font-bold text-slate-500">{t('nav.customersList')} *</span>
              <select
                className={selectClass}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">{t('customerStockCount.selectCustomer')}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('nav.warehouses')}</span>
              <select className={selectClass} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                <option value="">{t('reports.movement.all')}</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('purchases.form.brand')}</span>
              <select className={selectClass} value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
                <option value="">{t('reports.movement.all')}</option>
                {brandOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('purchases.form.productGroup')}</span>
              <select className={selectClass} value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
                <option value="">{t('reports.movement.all')}</option>
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500">{t('inventory.searchProducts')}</span>
              <Input className="h-9" value={productQ} onChange={(e) => setProductQ(e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 rounded-xl border border-blue-200/80 bg-blue-50/40 p-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={applyBookAll}
                onChange={(e) => onApplyBookAll(e.target.checked)}
              />
              <CheckSquare className="h-4 w-4 text-blue-600" />
              {t('customerStockCount.applyBookAll')}
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                <ScanBarcode className="h-3.5 w-3.5" />
                {t('customerStockCount.smartScan')}
              </span>
              <Input
                ref={scanRef}
                className="h-9 font-mono"
                value={scanQ}
                onChange={(e) => setScanQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onScan()}
                placeholder={t('customerStockCount.scanBarcode')}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600">{t('customerStockCount.countDate')}</span>
              <Input type="date" className="h-9" value={countDate} onChange={(e) => setCountDate(e.target.value)} />
            </label>
          </div>
        </div>
      </header>

      {error && (
        <p className="mx-4 mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{error}</p>
      )}
      {success && (
        <p className="mx-4 mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </p>
      )}

      <div className="flex-1 min-h-0 overflow-auto px-4 py-3">
        {!customerId ? (
          <p className="text-center text-slate-500 py-16 text-sm">{t('customerStockCount.selectCustomer')}</p>
        ) : loading && !sheet ? (
          <p className="text-center text-slate-500 py-16 text-sm">{t('common.saving')}</p>
        ) : visibleRows.length === 0 ? (
          <p className="text-center text-slate-500 py-16 text-sm">{t('customerStockCount.emptyView')}</p>
        ) : (
          <table className="w-full text-[11px] border-collapse min-w-[1100px]">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
              <tr className="text-[10px] font-black uppercase text-slate-700">
                <th className="border px-2 py-2" rowSpan={2}>{t('inventory.barcode')}</th>
                <th className="border px-2 py-2 text-center" colSpan={3}>{t('inventory.products')}</th>
                <th className="border px-2 py-2 bg-slate-200" colSpan={3}>{t('customerStockCount.bookSection')}</th>
                <th className="border-l-4 border-l-orange-500 bg-orange-100 px-1" rowSpan={2} />
                <th className="border px-2 py-2 bg-orange-50" colSpan={4}>{t('customerStockCount.resultSection')}</th>
              </tr>
              <tr className="text-[9px] font-bold text-slate-600">
                <th className="border px-2 py-1">{t('inventory.products')}</th>
                <th className="border px-2 py-1">{t('customerStockCount.itemBand')}</th>
                <th className="border px-2 py-1">{t('customerStockCount.supplier')}</th>
                <th className="border px-2 py-1 bg-slate-200">{t('customerStockCount.sentQty')}</th>
                <th className="border px-2 py-1 bg-slate-200">{t('customerStockCount.bookQty')}</th>
                <th className="border px-2 py-1 bg-slate-200">{t('customerStockCount.salePrice')}</th>
                <th className="border px-2 py-1 bg-orange-50">{t('customerStockCount.actualQty')}</th>
                <th className="border px-2 py-1 bg-orange-50">{t('customerStockCount.variance')}</th>
                <th className="border px-2 py-1 bg-orange-50">{t('customerStockCount.soldThisPeriod')}</th>
                <th className="border px-2 py-1 bg-orange-50">{t('customerStockCount.collectValue')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr
                  key={r.line.variant_id}
                  id={`csc-row-${r.line.variant_id}`}
                  className={`border-t hover:bg-slate-50/70 ${
                    r.sold > 0 ? '' : r.variance !== 0 ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <td className="border px-2 py-1 font-mono text-[10px]">{r.line.barcode}</td>
                  <td className="border px-2 py-1">
                    <div className="font-bold leading-tight">{r.line.product_name}</div>
                    <div className="text-[9px] text-slate-500 font-mono">{r.line.product_code}</div>
                  </td>
                  <td className="border px-2 py-1">{r.line.section_name || '—'}</td>
                  <td className="border px-2 py-1 text-[10px]">{r.line.supplier_name || '—'}</td>
                  <td className="border px-2 py-1 text-center tabular-nums bg-slate-50/80">{fmt(r.sent)}</td>
                  <td className="border px-2 py-1 text-center tabular-nums font-semibold bg-slate-50/80">{fmt(r.book)}</td>
                  <td className="border px-2 py-1 text-center tabular-nums bg-slate-50/80">{fmtMoney(r.line.unit_price)}</td>
                  <td className="border-l-4 border-l-orange-400 bg-orange-50/30 w-1 p-0" />
                  <td className="border px-1 py-1 bg-orange-50/20">
                    <Input
                      type="number"
                      min={0}
                      className="h-7 w-20 mx-auto text-center font-black tabular-nums text-blue-800"
                      value={counted[r.line.variant_id] ?? String(r.book)}
                      onChange={(e) =>
                        setCounted((m) => ({ ...m, [r.line.variant_id]: e.target.value }))
                      }
                    />
                  </td>
                  <td className={`border px-2 py-1 text-center tabular-nums font-bold ${
                    r.variance < 0 ? 'text-red-700' : r.variance > 0 ? 'text-amber-700' : 'text-slate-500'
                  }`}>
                    {r.variance > 0 ? '+' : ''}{fmt(r.variance)}
                  </td>
                  <td className="border px-2 py-1 text-center tabular-nums font-black text-emerald-800">
                    {fmt(r.sold)}
                  </td>
                  <td className="border px-2 py-1 text-center tabular-nums font-bold text-blue-900">
                    {fmtMoney(String(r.collect))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-blue-600" />
            <span className="text-slate-500">{t('customerStockCount.totalItems')}:</span>
            <span className="font-black">{totals.items}</span>
          </div>
          <div>
            <span className="text-slate-500">{t('consignment.onHand')}:</span>
            <span className="font-black ms-1">{fmt(totals.onHand)}</span>
          </div>
          <div>
            <span className="text-slate-500">{t('consignment.soldQty')}:</span>
            <span className="font-black text-emerald-800 ms-1">{fmt(totals.soldQty)}</span>
          </div>
          <div>
            <span className="text-slate-500">{t('customerStockCount.totalCollect')}:</span>
            <span className="font-black text-blue-800 ms-1">{fmtMoney(String(totals.collect))}</span>
          </div>
        </div>
        {sheet && (
          <p className="text-xs text-slate-500">
            {sheet.customer_name} ({sheet.customer_code})
          </p>
        )}
      </footer>
    </div>
  );
}
