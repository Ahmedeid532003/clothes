import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, BadgePercent, Eye } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  applyPriceAdjustment,
  brandsApi,
  classificationsApi,
  fetchPriceAdjustments,
  fetchSeasons,
  fetchSuppliers,
  previewPriceAdjustment,
  productSectionsApi,
  supplierGroupsApi,
  type PriceAdjustmentDto,
  type PriceAdjustmentPreviewRow,
  type SeasonDto,
  type SupplierDto,
} from '@/lib/api/inventory';
import { fetchSupplierMeta } from '@/lib/api/suppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type TabScope = 'card' | 'supplier';

type AdjustmentForm = {
  scope: TabScope;
  mode: 'percent' | 'amount';
  direction: 'increase' | 'decrease';
  value: string;
  supplier: string;
  supplier_group: string;
  season: string;
  brand: string;
  section: string;
  classification: string;
  q: string;
  offer_starts_at: string;
  offer_ends_at: string;
};

const defaultForm = (scope: TabScope): AdjustmentForm => ({
  scope,
  mode: 'percent',
  direction: 'decrease',
  value: '10',
  supplier: '',
  supplier_group: '',
  season: '',
  brand: '',
  section: '',
  classification: '',
  q: '',
  offer_starts_at: '',
  offer_ends_at: '',
});

type Props = { initialScope?: TabScope };

export function PriceAdjustmentsPage({ initialScope }: Props) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<TabScope>(initialScope ?? 'card');
  const [history, setHistory] = useState<PriceAdjustmentDto[]>([]);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [supplierGroups, setSupplierGroups] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [classifications, setClassifications] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<PriceAdjustmentPreviewRow[]>([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [supplierAccountDelta, setSupplierAccountDelta] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm(initialScope ?? 'card'));

  useEffect(() => {
    if (!initialScope) return;
    setTab(initialScope);
    setForm(defaultForm(initialScope));
  }, [initialScope]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const results = await Promise.allSettled([
        fetchPriceAdjustments(),
        fetchSeasons(),
        fetchSuppliers(),
        supplierGroupsApi.list(),
        brandsApi.list(),
        productSectionsApi.list(),
        classificationsApi.list(),
        fetchSupplierMeta(),
      ]);
      const pick = <T,>(i: number, fallback: T): T =>
        results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<T>).value : fallback;

      setHistory(pick(0, []));
      setSeasons(pick(1, []));
      const supList = pick(2, [] as SupplierDto[]);
      setSuppliers(supList.map((s) => ({ id: s.id, name_ar: s.name_ar })));
      const grList = pick(3, [] as Array<{ id: string; name_ar: string }>);
      if (grList.length) {
        setSupplierGroups(grList);
      } else {
        const meta = pick(7, { types: [], groups: [] });
        setSupplierGroups(meta.groups.map((g) => ({ id: g.id, name_ar: g.name_ar })));
      }
      setBrands(pick(4, []));
      setSections(pick(5, []));
      setClassifications(pick(6, []));

      const failed = results.findIndex((r) => r.status === 'rejected');
      if (failed >= 0 && results[failed].status === 'rejected') {
        const err = results[failed] as PromiseRejectedResult;
        setLoadError(err.reason instanceof Error ? err.reason.message : t('suppliers.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setForm(defaultForm(tab));
    setPreview([]);
    setPreviewCount(0);
    setSupplierAccountDelta(null);
    setSuccess(null);
  }, [tab]);

  const buildPayload = useCallback(
    () => ({
      scope: tab,
      mode: form.mode,
      direction: form.direction,
      value: form.value,
      supplier: form.supplier || null,
      supplier_group: form.supplier_group || null,
      season: form.season || null,
      brand: form.brand || null,
      section: form.section || null,
      classification: form.classification || null,
      q: form.q.trim() || undefined,
      offer_starts_at: form.offer_starts_at || null,
      offer_ends_at: form.offer_ends_at || null,
    }),
    [tab, form],
  );

  const runPreview = useCallback(async () => {
    if (tab === 'supplier' && !form.supplier) {
      setPreview([]);
      setPreviewCount(0);
      setSupplierAccountDelta(null);
      return;
    }
    setPreviewLoading(true);
    setLoadError(null);
    try {
      const res = await previewPriceAdjustment(buildPayload());
      setPreview(res.rows);
      setPreviewCount(res.count);
      setSupplierAccountDelta(res.supplier_account_delta ?? null);
    } catch (e) {
      setPreview([]);
      setPreviewCount(0);
      setLoadError(e instanceof Error ? e.message : t('suppliers.saveFailed'));
    } finally {
      setPreviewLoading(false);
    }
  }, [tab, form.supplier, buildPayload, t]);

  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) return;
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(() => {
      runPreview();
    }, 450);
    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, [
    loading,
    runPreview,
    form.q,
    form.supplier,
    form.supplier_group,
    form.season,
    form.brand,
    form.section,
    form.classification,
    form.mode,
    form.direction,
    form.value,
    tab,
  ]);

  const onPreview = () => {
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    runPreview();
  };

  const onApply = async () => {
    if (tab === 'supplier' && !form.supplier) {
      setLoadError(t('suppliers.selectSupplierRequired'));
      return;
    }
    setSuccess(null);
    setLoadError(null);
    try {
    const res = await applyPriceAdjustment(buildPayload());
    let msg = `${t('inventory.adjustmentDone')} ${res.products_affected} ${t('inventory.products')}`;
    if (tab === 'supplier' && res.supplier_account_amount) {
      const amt = parseFloat(res.supplier_account_amount);
      const label =
        amt > 0
          ? `${t('inventory.directionIncrease')} ${Math.abs(amt)}`
          : `${t('inventory.directionDecrease')} ${Math.abs(amt)}`;
      msg += ` — ${t('inventory.supplierAccountPosted')}: ${label}`;
    }
    setSuccess(msg);
    setPreview([]);
    setSupplierAccountDelta(null);
    load();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t('suppliers.saveFailed'));
    }
  };

  return (
    <div className="space-y-4 p-1">
      <h1 className="text-xl font-bold">
        {initialScope === 'supplier'
          ? t('nav.supplierDiscounts')
          : initialScope === 'card'
            ? t('nav.storeDiscounts')
            : t('nav.priceAdjustments')}
      </h1>

      {loadError && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          {loadError}
        </p>
      )}

      {!initialScope && (
      <div className="flex gap-2 border-b">
        {(['card', 'supplier'] as TabScope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setTab(s);
              setForm(defaultForm(s));
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === s
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {s === 'card' ? t('inventory.tabCardAdjust') : t('inventory.tabSupplierAdjust')}
          </button>
        ))}
      </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <BadgePercent className="h-5 w-5 text-blue-600" />
            {tab === 'card' ? t('inventory.tabCardAdjust') : t('inventory.tabSupplierAdjust')}
          </h2>
          <p className="text-xs text-slate-500">
            {tab === 'card' ? t('inventory.scopeCardHint') : t('inventory.scopeSupplierHint')}
          </p>
          <p className="text-xs font-medium text-blue-800">
            {tab === 'card' ? t('inventory.targetSale') : t('inventory.targetPurchase')}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <select
              className="rounded-md border px-2 py-2 text-sm"
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value as 'percent' | 'amount' })}
            >
              <option value="percent">{t('inventory.modePercent')}</option>
              <option value="amount">{t('inventory.modeAmount')}</option>
            </select>
            <select
              className="rounded-md border px-2 py-2 text-sm"
              value={form.direction}
              onChange={(e) =>
                setForm({ ...form, direction: e.target.value as 'increase' | 'decrease' })
              }
            >
              <option value="decrease">{t('inventory.directionDecrease')}</option>
              <option value="increase">{t('inventory.directionIncrease')}</option>
            </select>
            <Input
              type="number"
              placeholder={t('inventory.adjustValue')}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </div>

          <select
            className="w-full rounded-md border px-2 py-2 text-sm"
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
          >
            <option value="">
              {tab === 'supplier' ? `${t('purchases.supplier')} *` : t('inventory.allSuppliers')}
            </option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_ar}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <select
              className="rounded-md border px-2 py-2 text-sm"
              value={form.supplier_group}
              onChange={(e) => setForm({ ...form, supplier_group: e.target.value })}
            >
              <option value="">{t('inventory.allSupplierGroups')}</option>
              {supplierGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name_ar}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border px-2 py-2 text-sm"
              value={form.season}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
            >
              <option value="">{t('inventory.allSeasons')}</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_ar}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border px-2 py-2 text-sm"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            >
              <option value="">{t('nav.brands')}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_ar}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border px-2 py-2 text-sm"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
            >
              <option value="">{t('nav.productSections')}</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_ar}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border px-2 py-2 text-sm col-span-2"
              value={form.classification}
              onChange={(e) => setForm({ ...form, classification: e.target.value })}
            >
              <option value="">{t('nav.classifications')}</option>
              {classifications.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar}
                </option>
              ))}
            </select>
          </div>

          <Input
            placeholder={t('inventory.searchProducts')}
            value={form.q}
            onChange={(e) => setForm({ ...form, q: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onPreview();
            }}
          />
          <p className="text-[11px] text-slate-500">{t('inventory.searchProductsHint')}</p>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onPreview} disabled={previewLoading}>
              <Eye className="h-4 w-4 me-1" />
              {t('inventory.previewAdjustment')}
            </Button>
            <Button className="flex-1" onClick={onApply}>
              {t('inventory.executeAdjustment')}
            </Button>
          </div>
          {success && <p className="text-sm text-emerald-700">{success}</p>}
          {previewCount > 0 && (
            <p className="text-xs text-slate-600">
              {t('inventory.previewCount')}: {previewCount}
            </p>
          )}
          {tab === 'supplier' && supplierAccountDelta && (
            <p className="text-xs font-semibold text-amber-800">
              {t('inventory.supplierAccountDelta')}: {supplierAccountDelta}
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-col min-h-[320px]">
          <div className="flex justify-between mb-3">
            <h2 className="font-semibold">{t('inventory.previewAdjustment')}</h2>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto text-sm max-h-[420px]">
            {previewLoading ? (
              <p>{t('inventory.loading')}</p>
            ) : tab === 'supplier' && !form.supplier ? (
              <p className="text-slate-500">{t('suppliers.selectSupplierRequired')}</p>
            ) : preview.length === 0 ? (
              <p className="text-slate-500">{t('inventory.noProductsMatch')}</p>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-slate-500 text-xs">
                    <th className="py-1 text-start">{t('inventory.code')}</th>
                    <th className="py-1 text-start">{t('inventory.product')}</th>
                    <th className="py-1 text-end">{t('inventory.currentPrice')}</th>
                    <th className="py-1 text-end">{t('inventory.newPrice')}</th>
                    {tab === 'supplier' && (
                      <>
                        <th className="py-1 text-end">{t('inventory.stockQty')}</th>
                        <th className="py-1 text-end">{t('inventory.accountImpact')}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.product_id} className="border-t">
                      <td className="py-1.5 font-mono text-xs">{row.code}</td>
                      <td className="py-1.5">{row.name_ar}</td>
                      <td className="py-1.5 text-end">{row.current_price}</td>
                      <td className="py-1.5 text-end font-semibold text-blue-700">{row.new_price}</td>
                      {tab === 'supplier' && (
                        <>
                          <td className="py-1.5 text-end">{row.stock_qty ?? '—'}</td>
                          <td className="py-1.5 text-end text-amber-800">{row.account_delta ?? '—'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="font-semibold mb-3">{t('inventory.adjustmentHistory')}</h2>
        <div className="overflow-x-auto max-h-64 text-sm">
          {loading ? (
            <p>{t('inventory.loading')}</p>
          ) : history.length === 0 ? (
            <p className="text-slate-500">{t('inventory.empty')}</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-1 text-start">{t('inventory.code')}</th>
                  <th className="py-1 text-start">{t('inventory.scope')}</th>
                  <th className="py-1 text-end">{t('inventory.accountImpact')}</th>
                  <th className="py-1 text-end">{t('inventory.products')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t">
                    <td className="py-2 font-mono text-xs">{h.code}</td>
                    <td className="py-2">
                      {h.scope === 'supplier' ? t('inventory.tabSupplierAdjust') : t('inventory.tabCardAdjust')}{' '}
                      /{' '}
                      {h.scope === 'supplier'
                        ? t('inventory.targetPurchase')
                        : t('inventory.targetSale')}{' '}
                      / {h.direction} {h.value}
                      {h.mode === 'percent' ? '%' : ''}
                    </td>
                    <td className="py-2 text-end text-xs">
                      {h.supplier_account_amount ?? '—'}
                    </td>
                    <td className="py-2 text-end">{h.products_affected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
