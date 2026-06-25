import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Scale,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchBranches } from '@/lib/api/branches';
import {
  approveStockCount,
  brandsApi,
  classificationsApi,
  createStockCount,
  fetchProducts,
  fetchStockCount,
  fetchSuppliers,
  fetchWarehouses,
  loadOrderIntoStockCount,
  productSectionsApi,
  supplierGroupsApi,
  undoStockCount,
  updateStockCount,
  type StockCountDto,
  type StockCountLineDto,
  type WarehouseDto,
} from '@/lib/api/inventory';
import { LoadFromOrderButton } from '@/components/orders/LoadFromOrderButton';
import { scanOrdersApi } from '@/lib/api/scanOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ERP_NATIVE_SELECT } from '@/lib/ui/erpNativeSelect';
import { fmtMoney } from '@/components/accounting/AccountingUi';
import { printStockCountReport } from '@/lib/print/stockCountReportPrint';

type CountMode = 'filter' | 'order';
type LineStatus = 'all' | 'variance' | 'shortage' | 'surplus';

type Props = {
  countId: string | null;
  onBack: () => void;
  onSaved: () => void;
};

type CreateForm = {
  branch: string;
  warehouse: string;
  count_mode: CountMode;
  supplier_group: string;
  supplier: string;
  section: string;
  brand: string;
  classification: string;
  product: string;
  notes: string;
  order_code: string;
};

const selectCls = ERP_NATIVE_SELECT;

function lineVariance(ln: StockCountLineDto) {
  return parseFloat(ln.variance) || 0;
}

export function StockCountWorkspace({ countId, onBack, onSaved }: Props) {
  const { t, isRtl } = useLanguage();
  const { activeBranchId } = useAuth();
  const [count, setCount] = useState<StockCountDto | null>(null);
  const [lines, setLines] = useState<StockCountLineDto[]>([]);
  const [loading, setLoading] = useState(!!countId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineStatus, setLineStatus] = useState<LineStatus>('all');
  const [productQ, setProductQ] = useState('');

  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [supplierGroups, setSupplierGroups] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [classifications, setClassifications] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name_ar: string }>>([]);

  const [form, setForm] = useState<CreateForm>({
    branch: activeBranchId || '',
    warehouse: '',
    count_mode: 'filter',
    supplier_group: '',
    supplier: '',
    section: '',
    brand: '',
    classification: '',
    product: '',
    notes: '',
    order_code: '',
  });

  const isDraft = !count || count.status === 'draft';
  const isApproved = count?.status === 'approved';

  useEffect(() => {
    Promise.all([
      fetchBranches(),
      fetchWarehouses(),
      fetchSuppliers(),
      supplierGroupsApi.list(),
      productSectionsApi.list(),
      brandsApi.list(),
      classificationsApi.list(),
      fetchProducts(),
    ]).then(([br, wh, sup, gr, sec, brd, cls, prods]) => {
      setBranches(br.map((b) => ({ id: b.id, name: b.name_ar })));
      setWarehouses(wh);
      setSuppliers(sup);
      setSupplierGroups(gr);
      setSections(sec);
      setBrands(brd);
      setClassifications(cls);
      setProducts(prods.map((p) => ({ id: p.id, name_ar: p.name_ar })));
    });
  }, []);

  const loadCount = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStockCount(id);
      setCount(data);
      setLines(data.lines);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (countId) loadCount(countId);
  }, [countId, loadCount]);

  const branchWarehouses = useMemo(() => {
    if (!form.branch) return warehouses;
    return warehouses.filter((w) => w.primary_branch === form.branch || !w.primary_branch);
  }, [warehouses, form.branch]);

  const visibleLines = useMemo(() => {
    let rows = lines;
    if (productQ.trim()) {
      const q = productQ.trim().toLowerCase();
      rows = rows.filter(
        (ln) =>
          ln.product_name.toLowerCase().includes(q) ||
          ln.product_code.toLowerCase().includes(q),
      );
    }
    if (lineStatus === 'variance') rows = rows.filter((ln) => lineVariance(ln) !== 0);
    if (lineStatus === 'shortage') rows = rows.filter((ln) => lineVariance(ln) < 0);
    if (lineStatus === 'surplus') rows = rows.filter((ln) => lineVariance(ln) > 0);
    return rows;
  }, [lines, lineStatus, productQ]);

  const totals = useMemo(() => {
    let shortage = 0;
    let surplus = 0;
    let varValue = 0;
    for (const ln of lines) {
      const v = lineVariance(ln);
      if (v < 0) shortage += 1;
      if (v > 0) surplus += 1;
      varValue += parseFloat(ln.variance_value) || 0;
    }
    return { shortage, surplus, varValue };
  }, [lines]);

  const onCreate = async () => {
    if (!form.warehouse) {
      setError(t('stockCountRecon.warehouseRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        branch: form.branch || null,
        warehouse: form.warehouse,
        count_mode: form.count_mode,
        notes: form.notes,
      };
      if (form.count_mode === 'order') {
        if (!form.order_code.trim()) {
          setError(t('stockCountRecon.orderCodeRequired'));
          setSaving(false);
          return;
        }
        const order = await scanOrdersApi.lookup(form.order_code.trim());
        payload.scan_order = order.id;
      }
      if (form.supplier_group) payload.supplier_group = form.supplier_group;
      else if (form.supplier) payload.supplier = form.supplier;
      if (form.section) payload.section = form.section;
      if (form.brand) payload.brand = form.brand;
      if (form.classification) payload.classification = form.classification;
      if (form.product) payload.product = form.product;
      const created = await createStockCount(payload);
      setCount(created);
      setLines(created.lines);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const onSaveLines = async () => {
    if (!count) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateStockCount(count.id, {
        lines: lines.map((ln) => ({ id: ln.id, counted_qty: ln.counted_qty })),
      });
      setCount(updated);
      setLines(updated.lines);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const onReconcile = async () => {
    if (!count) return;
    if (!window.confirm(t('stockCountRecon.reconcileConfirm'))) return;
    setSaving(true);
    setError(null);
    try {
      await updateStockCount(count.id, {
        lines: lines.map((ln) => ({ id: ln.id, counted_qty: ln.counted_qty })),
      });
      const approved = await approveStockCount(count.id);
      setCount(approved);
      setLines(approved.lines);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const onUndo = async () => {
    if (!count) return;
    if (!window.confirm(t('stockCountRecon.undoConfirm'))) return;
    setSaving(true);
    try {
      const undone = await undoStockCount(count.id);
      setCount(undone);
      setLines(undone.lines);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const onPrint = () => {
    if (!count) return;
    printStockCountReport(count, {
      title: t('stockCountRecon.reportTitle'),
      isRtl,
      labels: {
        docNo: t('inventory.code'),
        warehouse: t('inventory.warehouse'),
        mode: t('stockCountRecon.countMode'),
        order: t('scanOrders.orderCode'),
        date: t('purchases.date'),
        section: t('nav.productSections'),
        product: t('inventory.product'),
        salePrice: t('stockCountRecon.salePrice'),
        bookQty: t('inventory.systemQty'),
        actualQty: t('inventory.countedQty'),
        variance: t('inventory.variance'),
        varianceValue: t('stockCountRecon.varianceValue'),
        countValue: t('stockCountRecon.countValue'),
        shortageItems: t('stockCountRecon.shortageItems'),
        surplusItems: t('stockCountRecon.surplusItems'),
        totalVariance: t('stockCountRecon.totalVariance'),
        additionVoucher: t('stockCountRecon.additionVoucher'),
        disbursementVoucher: t('stockCountRecon.disbursementVoucher'),
      },
    });
  };

  const loadFromScanOrder = async (order: { id: string; code: string; lines?: Array<{ variant_id: string; quantity: string }> }) => {
    if (!count) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await loadOrderIntoStockCount(count.id, order.code);
      setCount(updated);
      setLines(updated.lines);
      try {
        await scanOrdersApi.markLoaded(order.id, 'stock-count');
      } catch {
        /* non-blocking */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const updateLineQty = (lineId: string, qty: string) => {
    setLines((prev) =>
      prev.map((ln) => {
        if (ln.id !== lineId) return ln;
        const counted = qty;
        const system = parseFloat(ln.system_qty) || 0;
        const countedN = parseFloat(counted) || 0;
        const variance = countedN - system;
        const price = parseFloat(ln.sale_price) || 0;
        return {
          ...ln,
          counted_qty: counted,
          variance: String(variance),
          variance_value: String((variance * price).toFixed(2)),
          count_value: String((countedN * price).toFixed(2)),
        };
      }),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin me-2" />
        {t('inventory.loading')}
      </div>
    );
  }

  if (!count) {
    return (
      <div className="space-y-4 p-1">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-black">{t('stockCountRecon.newCount')}</h1>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('stockCountRecon.branch')}</label>
            <select
              className={selectCls}
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value, warehouse: '' })}
            >
              <option value="">{t('stockCountRecon.allBranches')}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('inventory.warehouse')}</label>
            <select
              className={selectCls}
              value={form.warehouse}
              onChange={(e) => setForm({ ...form, warehouse: e.target.value })}
            >
              <option value="">{t('inventory.selectWarehouse')}</option>
              {branchWarehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name_ar}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('stockCountRecon.countMode')}</label>
            <select
              className={selectCls}
              value={form.count_mode}
              onChange={(e) => setForm({ ...form, count_mode: e.target.value as CountMode })}
            >
              <option value="filter">{t('stockCountRecon.modeFilter')}</option>
              <option value="order">{t('stockCountRecon.modeOrder')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('inventory.supplierGroup')}</label>
            <select
              className={selectCls}
              value={form.supplier_group}
              onChange={(e) => setForm({ ...form, supplier_group: e.target.value, supplier: '' })}
            >
              <option value="">{t('inventory.allSupplierGroups')}</option>
              {supplierGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name_ar}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('purchases.supplier')}</label>
            <select
              className={selectCls}
              value={form.supplier}
              disabled={!!form.supplier_group}
              onChange={(e) => setForm({ ...form, supplier: e.target.value, supplier_group: '' })}
            >
              <option value="">{t('inventory.allSuppliers')}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name_ar}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('nav.productSections')}</label>
            <select
              className={selectCls}
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
            >
              <option value="">{t('stockCountRecon.notSpecified')}</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name_ar}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('nav.brands')}</label>
            <select
              className={selectCls}
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            >
              <option value="">{t('stockCountRecon.notSpecified')}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name_ar}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('nav.classifications')}</label>
            <select
              className={selectCls}
              value={form.classification}
              onChange={(e) => setForm({ ...form, classification: e.target.value })}
            >
              <option value="">{t('stockCountRecon.notSpecified')}</option>
              {classifications.map((c) => (
                <option key={c.id} value={c.id}>{c.name_ar}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('inventory.product')}</label>
            <select
              className={selectCls}
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
            >
              <option value="">{t('stockCountRecon.notSpecified')}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name_ar}</option>
              ))}
            </select>
          </div>
        </div>

        {form.count_mode === 'order' && (
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500 block mb-1">{t('scanOrders.orderCode')}</label>
            <Input
              value={form.order_code}
              onChange={(e) => setForm({ ...form, order_code: e.target.value })}
              placeholder={t('scanOrders.orderCode')}
            />
          </div>
        )}

        {form.count_mode === 'order' && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t('stockCountRecon.orderModeHint')}
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={onCreate} disabled={saving || !form.warehouse}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <ClipboardCheck className="h-4 w-4 me-1" />}
            {t('stockCountRecon.startCount')}
          </Button>
          <Button variant="outline" onClick={onBack}>{t('inventory.cancel')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-black text-slate-900">
              {t('stockCountRecon.title')} — <span className="font-mono text-violet-700">{count.code}</span>
            </h1>
            <p className="text-xs text-slate-500">
              {count.warehouse_name} · {count.count_mode_label || count.count_mode}
              {count.scan_order_code ? ` · ${t('scanOrders.orderCode')}: ${count.scan_order_code}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <>
              <LoadFromOrderButton onLoaded={loadFromScanOrder} expectedType="stock_count" />
              <Button size="sm" variant="outline" onClick={onSaveLines} disabled={saving}>
                <Save className="h-4 w-4 me-1" />
                {t('stockCountRecon.saveStatement')}
              </Button>
              <Button size="sm" className="bg-blue-700 hover:bg-blue-800" onClick={onReconcile} disabled={saving}>
                <Scale className="h-4 w-4 me-1" />
                {t('stockCountRecon.reconcile')}
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={onPrint}>
            <Printer className="h-4 w-4 me-1" />
            {t('stockCountRecon.print')}
          </Button>
          {isApproved && (
            <Button size="sm" variant="outline" onClick={onUndo} disabled={saving}>
              <RotateCcw className="h-4 w-4 me-1" />
              {t('stockCountRecon.undoReconcile')}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => loadCount(count.id)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-slate-50 p-3 grid gap-3 md:grid-cols-4 lg:grid-cols-6 text-sm">
        <div><span className="text-slate-500">{t('inventory.code')}:</span> <b>{count.code}</b></div>
        <div><span className="text-slate-500">{t('inventory.warehouse')}:</span> <b>{count.warehouse_name}</b></div>
        <div><span className="text-slate-500">{t('stockCountRecon.countMode')}:</span> <b>{count.count_mode_label}</b></div>
        <div><span className="text-slate-500">{t('inventory.status')}:</span> <b>{count.status}</b></div>
        <div><span className="text-slate-500">{t('stockCountRecon.shortageItems')}:</span> <b className="text-red-700">{totals.shortage}</b></div>
        <div><span className="text-slate-500">{t('stockCountRecon.surplusItems')}:</span> <b className="text-emerald-700">{totals.surplus}</b></div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select className={selectCls} value={lineStatus} onChange={(e) => setLineStatus(e.target.value as LineStatus)}>
          <option value="all">{t('stockCountRecon.statusAll')}</option>
          <option value="variance">{t('stockCountRecon.statusVariance')}</option>
          <option value="shortage">{t('stockCountRecon.statusShortage')}</option>
          <option value="surplus">{t('stockCountRecon.statusSurplus')}</option>
        </select>
        <Input
          className="max-w-xs h-9"
          placeholder={t('stockCountRecon.searchProduct')}
          value={productQ}
          onChange={(e) => setProductQ(e.target.value)}
        />
        <span className="text-sm font-bold text-slate-600 ms-auto">
          {t('stockCountRecon.totalVariance')}: {fmtMoney(String(totals.varValue))}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="bg-gradient-to-b from-blue-800 to-blue-700 text-white">
              <th className="py-2 px-2 text-center w-10">#</th>
              <th className="py-2 px-2 text-start">{t('nav.productSections')}</th>
              <th className="py-2 px-2 text-start">{t('inventory.product')}</th>
              <th className="py-2 px-2 text-end">{t('stockCountRecon.salePrice')}</th>
              <th className="py-2 px-2 text-end">{t('inventory.systemQty')}</th>
              <th className="py-2 px-2 text-end bg-orange-400/90">{t('inventory.countedQty')}</th>
              <th className="py-2 px-2 text-end">{t('inventory.variance')}</th>
              <th className="py-2 px-2 text-end">{t('stockCountRecon.varianceValue')}</th>
              <th className="py-2 px-2 text-end">{t('stockCountRecon.countValue')}</th>
            </tr>
          </thead>
          <tbody>
            {visibleLines.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-500">{t('inventory.empty')}</td>
              </tr>
            ) : (
              visibleLines.map((ln, idx) => {
                const v = lineVariance(ln);
                return (
                  <tr key={ln.id} className={`border-t ${v !== 0 ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                    <td className="py-1.5 px-2 text-center text-slate-500">{idx + 1}</td>
                    <td className="py-1.5 px-2">{ln.section_name || '—'}</td>
                    <td className="py-1.5 px-2">
                      <span className="font-medium">{ln.product_name}</span>
                      <span className="text-[10px] text-slate-400 ms-1">{ln.size_name}/{ln.color_name}</span>
                    </td>
                    <td className="py-1.5 px-2 text-end tabular-nums">{fmtMoney(ln.sale_price)}</td>
                    <td className="py-1.5 px-2 text-end tabular-nums font-semibold">{ln.system_qty}</td>
                    <td className="py-1.5 px-2 text-end bg-orange-50">
                      {isDraft ? (
                        <Input
                          className="h-8 w-20 ms-auto text-end tabular-nums font-bold border-orange-300 bg-orange-50"
                          value={ln.counted_qty}
                          onChange={(e) => updateLineQty(ln.id, e.target.value)}
                        />
                      ) : (
                        <span className="font-bold tabular-nums">{ln.counted_qty}</span>
                      )}
                    </td>
                    <td className={`py-1.5 px-2 text-end tabular-nums font-bold ${v < 0 ? 'text-red-700' : v > 0 ? 'text-emerald-700' : ''}`}>
                      {ln.variance}
                    </td>
                    <td className="py-1.5 px-2 text-end tabular-nums">{fmtMoney(ln.variance_value)}</td>
                    <td className="py-1.5 px-2 text-end tabular-nums">{fmtMoney(ln.count_value)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {(count.addition_code || count.disbursement_code) && (
        <div className="text-sm text-slate-600 rounded-lg border bg-slate-50 px-3 py-2">
          {count.addition_code && <span className="me-4">{t('stockCountRecon.additionVoucher')}: <b>{count.addition_code}</b></span>}
          {count.disbursement_code && <span>{t('stockCountRecon.disbursementVoucher')}: <b>{count.disbursement_code}</b></span>}
        </div>
      )}
    </div>
  );
}
