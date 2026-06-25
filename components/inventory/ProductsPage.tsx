import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Wand2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  brandsApi,
  classificationsApi,
  colorsApi,
  createProduct,
  deleteProduct,
  fetchInventorySettings,
  fetchBarcodePreviews,
  fetchNextBarcode,
  type BarcodePreviewRow,
  fetchProducts,
  fetchSeasons,
  fetchSuppliers,
  productSectionsApi,
  sizesApi,
  syncProductVariants,
  updateProduct,
  type CatalogItem,
  type ProductDto,
  type SeasonDto,
} from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ErpRowActions } from '@/components/erp/ErpRowActions';
import { ErpPaginatedTableSection } from '@/components/erp/ErpPaginatedTableSection';

type SheetMode = 'add' | 'edit' | 'view' | null;

const emptyForm = () => ({
  code: '',
  name_ar: '',
  name_en: '',
  description: '',
  barcode: '',
  purchase_price: '0',
  markup_percent: '0',
  sale_price: '',
  offer_price: '',
  reorder_percent: '',
  brand: '',
  section: '',
  classification: '',
  supplier: '',
  season: '',
});

export function ProductsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<ProductDto[]>([]);
  const [brands, setBrands] = useState<CatalogItem[]>([]);
  const [sections, setSections] = useState<CatalogItem[]>([]);
  const [classifications, setClassifications] = useState<CatalogItem[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [sizes, setSizes] = useState<CatalogItem[]>([]);
  const [colors, setColors] = useState<CatalogItem[]>([]);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [defaultReorder, setDefaultReorder] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [editing, setEditing] = useState<ProductDto | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [barcodePreviews, setBarcodePreviews] = useState<BarcodePreviewRow[]>([]);

  const computedSale = useMemo(() => {
    const p = parseFloat(form.purchase_price) || 0;
    const m = parseFloat(form.markup_percent) || 0;
    if (p <= 0) return '0';
    return (p * (1 + m / 100)).toFixed(2);
  }, [form.purchase_price, form.markup_percent]);

  const readOnly = sheetMode === 'view';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [products, br, sec, cls, sup, sz, cl, sn, settings] = await Promise.all([
        fetchProducts(),
        brandsApi.list(),
        productSectionsApi.list(),
        classificationsApi.list(),
        fetchSuppliers(),
        sizesApi.list(),
        colorsApi.list(),
        fetchSeasons(),
        fetchInventorySettings(),
      ]);
      setRows(products);
      setBrands(br);
      setSections(sec);
      setClassifications(cls);
      setSuppliers(sup);
      setSizes(sz);
      setColors(cl);
      setSeasons(sn);
      setDefaultReorder(settings.default_reorder_percent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (sheetMode !== 'add' || !form.season) {
      setBarcodePreviews([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetchBarcodePreviews({
          season: form.season,
          sizes: selectedSizes,
          colors: selectedColors,
        });
        setBarcodePreviews(res.rows);
        if (
          selectedSizes.length === 1 &&
          selectedColors.length === 1 &&
          res.rows[0]?.barcode_preview
        ) {
          setForm((f) => ({ ...f, barcode: res.rows[0].barcode_preview }));
        }
      } catch {
        setBarcodePreviews([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [sheetMode, form.season, selectedSizes, selectedColors]);

  const openAdd = () => {
    const current = seasons.find((s) => s.is_current) ?? seasons[0];
    setEditing(null);
    setForm({
      ...emptyForm(),
      season: current?.id ?? '',
      reorder_percent: defaultReorder,
    });
    setSelectedSizes([]);
    setSelectedColors([]);
    setBarcodePreviews([]);
    setSheetMode('add');
  };

  const hydrateForm = (r: ProductDto) => ({
    code: r.code,
    name_ar: r.name_ar,
    name_en: r.name_en || '',
    description: r.description || '',
    barcode: r.barcode || '',
    purchase_price: r.purchase_price,
    markup_percent: r.markup_percent,
    sale_price: r.sale_price,
    offer_price: r.offer_price ?? '',
    reorder_percent: r.reorder_percent,
    brand: r.brand ?? '',
    section: r.section ?? '',
    classification: r.classification ?? '',
    supplier: r.supplier ?? '',
    season: r.season,
  });

  const openEdit = (r: ProductDto) => {
    setEditing(r);
    setForm(hydrateForm(r));
    if (r.variants?.length) {
      setSelectedSizes([...new Set(r.variants.map((v) => v.size))]);
      setSelectedColors([...new Set(r.variants.map((v) => v.color))]);
    } else {
      setSelectedSizes([]);
      setSelectedColors([]);
    }
    setSheetMode('edit');
  };

  const openView = (r: ProductDto) => {
    setEditing(r);
    setForm(hydrateForm(r));
    setSheetMode('view');
  };

  const toggle = (list: string[], id: string, setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const suggestBarcode = async () => {
    if (!form.season) return;
    try {
      const res = await fetchNextBarcode({
        season: form.season,
        size: selectedSizes.length === 1 ? selectedSizes[0] : undefined,
        color: selectedColors.length === 1 ? selectedColors[0] : undefined,
      });
      setForm((f) => ({ ...f, barcode: res.barcode }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const onSave = async () => {
    setError(null);
    const payload: Record<string, unknown> = {
      name_ar: form.name_ar,
      name_en: form.name_ar.trim() || form.name_en,
      description: form.description,
      barcode: form.barcode,
      purchase_price: form.purchase_price,
      markup_percent: form.markup_percent,
      sale_price: form.sale_price || computedSale,
      offer_price: form.offer_price || null,
      reorder_percent: form.reorder_percent || defaultReorder,
      brand: form.brand || null,
      section: form.section || null,
      classification: form.classification || null,
      supplier: form.supplier || null,
      season: form.season || null,
    };
    if (form.code.trim()) payload.code = form.code.trim();
    if (sheetMode === 'add' && selectedSizes.length && selectedColors.length) {
      payload.size_ids = selectedSizes;
      payload.color_ids = selectedColors;
    }
    try {
      if (sheetMode === 'edit' && editing) {
        await updateProduct(editing.id, payload);
        if (selectedSizes.length && selectedColors.length) {
          await syncProductVariants(editing.id, selectedSizes, selectedColors);
        }
      } else {
        await createProduct(payload);
      }
      setSheetMode(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const onDelete = async (r: ProductDto) => {
    if (!confirm(t('inventory.confirmDelete'))) return;
    await deleteProduct(r.id);
    load();
  };

  const field = (label: string, node: React.ReactNode) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {node}
    </div>
  );

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('nav.products')}</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load} aria-label="Refresh products">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 me-1" />
            {t('inventory.add')}
          </Button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <ErpPaginatedTableSection rows={rows} className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        {(pagedRows) => (
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.nameAr')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.barcode')}</th>
              <th className="px-3 py-2 text-start">{t('purchases.supplier')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.purchasePrice')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.salePrice')}</th>
              <th className="px-3 py-2 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  {t('inventory.empty')}
                </td>
              </tr>
            ) : (
              pagedRows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-3 py-2">{r.name_ar}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.barcode || '—'}</td>
                  <td className="px-3 py-2">{r.supplier_name || '—'}</td>
                  <td className="px-3 py-2">{r.purchase_price}</td>
                  <td className="px-3 py-2">{r.sale_price}</td>
                  <td className="px-3 py-2 text-end whitespace-nowrap">
                    <ErpRowActions
                      onView={() => openView(r)}
                      onEdit={() => openEdit(r)}
                      onDelete={() => onDelete(r)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
      </ErpPaginatedTableSection>

      <Sheet open={sheetMode !== null} onOpenChange={(o) => !o && setSheetMode(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-xl w-full">
          <SheetHeader>
            <SheetTitle>
              {sheetMode === 'view'
                ? t('inventory.viewProduct')
                : sheetMode === 'edit'
                  ? t('inventory.edit')
                  : t('inventory.add')}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            {field(
              t('inventory.code'),
              <Input
                disabled={readOnly}
                placeholder={t('inventory.autoCode')}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />,
            )}
            {field(
              t('inventory.nameAr'),
              <Input
                disabled={readOnly}
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              />,
            )}
            {field(
              t('inventory.description'),
              <textarea
                disabled={readOnly}
                className="w-full min-h-[72px] rounded-md border px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />,
            )}
            {field(
              t('inventory.season'),
              <select
                disabled={readOnly}
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.season}
                onChange={(e) => setForm({ ...form, season: e.target.value })}
              >
                <option value="">{t('inventory.selectSeason')}</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar}
                  </option>
                ))}
              </select>,
            )}
            {field(
              t('nav.brands'),
              <select
                disabled={readOnly}
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              >
                <option value="">{t('inventory.brandOptional')}</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_ar}
                  </option>
                ))}
              </select>,
            )}
            {field(
              t('nav.productSections'),
              <select
                disabled={readOnly}
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
              >
                <option value="">—</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar}
                  </option>
                ))}
              </select>,
            )}
            {field(
              t('nav.classifications'),
              <select
                disabled={readOnly}
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.classification}
                onChange={(e) => setForm({ ...form, classification: e.target.value })}
              >
                <option value="">—</option>
                {classifications.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar}
                  </option>
                ))}
              </select>,
            )}
            {field(
              t('purchases.supplier'),
              <select
                disabled={readOnly}
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              >
                <option value="">—</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar}
                  </option>
                ))}
              </select>,
            )}
            <div className="grid grid-cols-2 gap-3">
              {field(
                t('inventory.purchasePrice'),
                <Input
                  disabled={readOnly}
                  type="number"
                  value={form.purchase_price}
                  onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                />,
              )}
              {field(
                t('inventory.markupPercent'),
                <Input
                  disabled={readOnly}
                  type="number"
                  value={form.markup_percent}
                  onChange={(e) => setForm({ ...form, markup_percent: e.target.value })}
                />,
              )}
            </div>
            {field(
              t('inventory.salePrice'),
              <Input
                disabled={readOnly}
                type="number"
                placeholder={computedSale}
                value={form.sale_price}
                onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
              />,
            )}
            {!readOnly && (
              <p className="text-xs text-slate-500">
                {t('inventory.saleComputed')}: {computedSale}
              </p>
            )}
            {field(
              t('inventory.offerPrice'),
              <Input
                disabled={readOnly}
                type="number"
                placeholder={t('inventory.offerOptional')}
                value={form.offer_price}
                onChange={(e) => setForm({ ...form, offer_price: e.target.value })}
              />,
            )}
            {field(
              t('inventory.reorderPercentLabel'),
              <Input
                disabled={readOnly}
                type="number"
                value={form.reorder_percent}
                onChange={(e) => setForm({ ...form, reorder_percent: e.target.value })}
              />,
            )}
            <p className="text-xs text-slate-500">
              {t('inventory.defaultReorderHint')}: {defaultReorder}%
            </p>

            {!readOnly && sheetMode === 'add' && (
              <>
                <p className="text-sm font-medium pt-2">{t('inventory.sizes')}</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-1 text-xs border rounded px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSizes.includes(s.id)}
                        onChange={() => toggle(selectedSizes, s.id, setSelectedSizes)}
                      />
                      {s.name_ar}
                    </label>
                  ))}
                </div>
                <p className="text-sm font-medium pt-2">{t('inventory.colors')}</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-1 text-xs border rounded px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedColors.includes(c.id)}
                        onChange={() => toggle(selectedColors, c.id, setSelectedColors)}
                      />
                      {c.name_ar}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500">{t('inventory.barcodePatternHint')}</p>
                {field(
                  t('inventory.barcode'),
                  <div className="flex gap-2">
                    <Input
                      className="font-mono"
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      placeholder={t('inventory.barcodeAutoHint')}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={suggestBarcode}>
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  </div>,
                )}
                {barcodePreviews.length > 0 && selectedSizes.length > 0 && selectedColors.length > 0 && (
                  <div className="rounded-lg border bg-slate-50 p-3 text-xs">
                    <p className="font-medium text-slate-700 mb-2">
                      {t('inventory.barcodePreviewTitle')}
                    </p>
                    <ul className="space-y-1 max-h-40 overflow-auto font-mono">
                      {barcodePreviews.map((row) => (
                        <li key={`${row.size_id}-${row.color_id}`} className="text-slate-600">
                          {row.size_name}/{row.color_name}{' '}
                          <span className="text-slate-900">{row.barcode_preview}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {(sheetMode === 'edit' || sheetMode === 'view') &&
              field(
                t('inventory.barcode'),
                <Input
                  disabled={readOnly}
                  className="font-mono"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder={t('inventory.barcodeAutoHint')}
                />,
              )}

            {sheetMode === 'view' && editing?.variants && editing.variants.length > 0 && (
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium mb-2">{t('inventory.variants')}</p>
                <ul className="space-y-1 text-slate-600">
                  {editing.variants.map((v) => (
                    <li key={v.id} className="font-mono text-xs">
                      {v.size_name} / {v.color_name}
                      {v.barcode ? ` — ${v.barcode}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <SheetFooter>
            {sheetMode === 'view' ? (
              <Button type="button" onClick={() => editing && openEdit(editing)}>
                {t('inventory.edit')}
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setSheetMode(null)}>
                  {t('inventory.cancel')}
                </Button>
                <Button type="button" onClick={onSave} disabled={!form.name_ar.trim()}>
                  {t('inventory.save')}
                </Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
