import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PackagePlus, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { CatalogItem, SeasonDto } from '@/lib/api/inventory';
import { createProduct, fetchNextBarcode } from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PurchaseCatalogField } from '../PurchaseCatalogField';
import { prefillProductFromSearch } from './purchaseSearchUtils';
import type { PurchaseProductSearchRow } from '@/lib/api/purchases';

export type InvoiceHeaderSnapshot = {
  supplier: string;
  season: string;
  brand: string;
  section: string;
  classification: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (product: PurchaseProductSearchRow) => void;
  searchPrefill: string;
  header: InvoiceHeaderSnapshot;
  profitPercent: string;
  defaultReorderPercent: string;
  suppliers: CatalogItem[];
  seasons: SeasonDto[];
  brands: CatalogItem[];
  sections: CatalogItem[];
  classifications: CatalogItem[];
  sizes: CatalogItem[];
  colors: CatalogItem[];
  supplierName: string;
  seasonName: string;
  brandsApiCreate: (name_ar: string) => Promise<CatalogItem>;
  sectionsApiCreate: (name_ar: string) => Promise<CatalogItem>;
  classificationsApiCreate: (name_ar: string) => Promise<CatalogItem>;
  onError: (msg: string | null) => void;
  sheetError?: string | null;
};

function toggleId(list: string[], id: string, keepAtLeastOne = false): string[] {
  if (list.includes(id)) {
    if (keepAtLeastOne && list.length <= 1) return list;
    return list.filter((x) => x !== id);
  }
  return [...list, id];
}

function activeCatalogItems(items: CatalogItem[]) {
  return items.filter((item) => item.is_active !== false && Boolean(item.id));
}

export function PurchaseProductCreateSheet({
  open,
  onClose,
  onCreated,
  searchPrefill,
  header,
  profitPercent,
  defaultReorderPercent,
  suppliers,
  seasons,
  brands,
  sections,
  classifications,
  sizes,
  colors,
  supplierName,
  seasonName,
  brandsApiCreate,
  sectionsApiCreate,
  classificationsApiCreate,
  onError,
  sheetError,
}: Props) {
  const { t, isRtl } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name_ar: '',
    description: '',
    barcode: '',
    purchase_price: '0',
    markup_percent: profitPercent,
    offer_price: '',
    reorder_percent: defaultReorderPercent,
    brand: header.brand,
    section: header.section,
    classification: header.classification,
  });
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const wasOpenRef = useRef(false);

  const activeSizes = useMemo(() => activeCatalogItems(sizes), [sizes]);
  const activeColors = useMemo(() => activeCatalogItems(colors), [colors]);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;

    if (justOpened) {
      const pre = prefillProductFromSearch(searchPrefill);
      setForm({
        code: pre.code,
        name_ar: pre.name_ar,
        description: pre.description,
        barcode: '',
        purchase_price: '0',
        markup_percent: profitPercent,
        offer_price: '',
        reorder_percent: defaultReorderPercent,
        brand: header.brand,
        section: header.section,
        classification: header.classification,
      });
      setSelectedSizes(activeSizes.length ? [activeSizes[0].id] : []);
      setSelectedColors(activeColors.length ? [activeColors[0].id] : []);
      onError(null);
      return;
    }

    setSelectedSizes((prev) => {
      const valid = prev.filter((id) => activeSizes.some((s) => s.id === id));
      if (valid.length) return valid;
      return activeSizes.length ? [activeSizes[0].id] : [];
    });
    setSelectedColors((prev) => {
      const valid = prev.filter((id) => activeColors.some((c) => c.id === id));
      if (valid.length) return valid;
      return activeColors.length ? [activeColors[0].id] : [];
    });
  }, [
    open,
    searchPrefill,
    profitPercent,
    defaultReorderPercent,
    header.brand,
    header.section,
    header.classification,
    activeSizes,
    activeColors,
    onError,
  ]);

  useEffect(() => {
    if (!open || !header.season || selectedSizes.length !== 1 || selectedColors.length !== 1) return;
    fetchNextBarcode({
      season: header.season,
      size: selectedSizes[0],
      color: selectedColors[0],
    })
      .then((res) => setForm((f) => ({ ...f, barcode: res.barcode })))
      .catch(() => undefined);
  }, [open, header.season, selectedSizes, selectedColors]);

  const computedSale = useMemo(() => {
    const p = parseFloat(form.purchase_price) || 0;
    const m = parseFloat(form.markup_percent) || 0;
    if (p <= 0) return '0';
    return (p * (1 + m / 100)).toFixed(2);
  }, [form.purchase_price, form.markup_percent]);

  const brandName = brands.find((b) => b.id === header.brand)?.name_ar || '—';
  const sectionName = sections.find((s) => s.id === header.section)?.name_ar || '—';
  const classificationLabel =
    classifications.find((c) => c.id === header.classification)?.name_ar || '—';

  const onSave = async () => {
    if (!form.name_ar.trim() && !form.code.trim()) {
      onError(t('purchases.form.quickCreateNameRequired'));
      return;
    }
    if (!header.supplier || !header.season) {
      onError(t('purchases.form.quickCreateHeaderRequired'));
      return;
    }
    const sizeIds = selectedSizes.filter((id) => activeSizes.some((s) => s.id === id));
    const colorIds = selectedColors.filter((id) => activeColors.some((c) => c.id === id));
    if (!sizeIds.length && activeSizes.length) sizeIds.push(activeSizes[0].id);
    if (!colorIds.length && activeColors.length) colorIds.push(activeColors[0].id);

    if (!activeSizes.length && !activeColors.length) {
      onError(t('purchases.form.quickCreateSizesColorsRequired'));
      return;
    }
    if (!activeSizes.length) {
      onError(t('purchases.form.quickCreateSizesRequired'));
      return;
    }
    if (!activeColors.length) {
      onError(t('purchases.form.quickCreateColorsRequired'));
      return;
    }
    if (!sizeIds.length || !colorIds.length) {
      onError(t('purchases.form.quickCreatePickSizesColors'));
      return;
    }
    setSaving(true);
    onError(null);
    try {
      const payload: Record<string, unknown> = {
        name_ar: form.name_ar.trim() || form.code.trim(),
        description: form.description.trim(),
        barcode: form.barcode.trim(),
        purchase_price: String(form.purchase_price || '0').trim() || '0',
        markup_percent: String(form.markup_percent || profitPercent).trim() || profitPercent,
        sale_price: computedSale,
        offer_price: form.offer_price.trim() || null,
        reorder_percent: form.reorder_percent.trim() || defaultReorderPercent,
        brand: form.brand || header.brand || null,
        section: form.section || header.section || null,
        classification: form.classification || header.classification || null,
        supplier: header.supplier,
        season: header.season,
        size_ids: sizeIds,
        color_ids: colorIds,
      };
      if (form.code.trim()) payload.code = form.code.trim();
      const product = await createProduct(payload);
      onCreated(product as PurchaseProductSearchRow);
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : t('purchases.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, node: React.ReactNode) => (
    <div>
      <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {node}
    </div>
  );

  if (!open) return null;

  const sideClass = isRtl
    ? 'left-0 border-r animate-in slide-in-from-left'
    : 'right-0 border-l animate-in slide-in-from-right';

  const content = (
    <>
      <div
        className="fixed inset-0 z-[248] bg-slate-900/45 backdrop-blur-[2px]"
        onClick={onClose}
        role="presentation"
      />
      <aside
        className={`fixed top-0 ${sideClass} z-[250] flex h-[100dvh] w-full max-w-[min(100vw,28rem)] flex-col overflow-hidden border-slate-200 bg-white shadow-[-12px_0_48px_rgba(0,0,0,0.18)]`}
        role="dialog"
        aria-modal="true"
      >
        <div className="shrink-0 border-b bg-gradient-to-r from-[#4169E1] to-indigo-700 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <PackagePlus className="h-5 w-5 shrink-0" />
              <div>
                <h2 className="font-black text-base">{t('purchases.form.addNewProduct')}</h2>
                <p className="text-xs text-blue-100 font-medium mt-0.5">{t('purchases.form.createSheetHint')}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/15 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

        <div className="space-y-4 px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#4169E1]">
            {t('purchases.form.createSheetInputSection')}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {field(
              t('purchases.form.columns.model'),
              <Input
                placeholder={t('inventory.autoCode')}
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="font-bold"
              />,
            )}
            {field(
              t('purchases.form.columns.description'),
              <Input
                value={form.name_ar}
                onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
                className="font-bold"
              />,
            )}
          </div>

          {field(
            t('inventory.description'),
            <textarea
              className="w-full min-h-[64px] rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-[#4169E1]"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />,
          )}

          <PurchaseCatalogField
            label={t('purchases.form.brand')}
            value={form.brand}
            options={brands}
            allowEmpty
            emptyLabel="—"
            onChange={(id) => setForm((f) => ({ ...f, brand: id }))}
            onCreated={() => undefined}
            createLabel={t('purchases.form.addBrand')}
            onCreate={(name_ar) => brandsApiCreate(name_ar)}
          />

          <div className="grid grid-cols-2 gap-3">
            <PurchaseCatalogField
              label={t('purchases.form.productGroup')}
              value={form.section}
              options={sections}
              allowEmpty
              emptyLabel="—"
              onChange={(id) => setForm((f) => ({ ...f, section: id }))}
              onCreated={() => undefined}
              createLabel={t('purchases.form.addGroup')}
              onCreate={(name_ar) => sectionsApiCreate(name_ar)}
            />
            <PurchaseCatalogField
              label={t('purchases.form.productDepartment')}
              value={form.classification}
              options={classifications}
              allowEmpty
              emptyLabel="—"
              onChange={(id) => setForm((f) => ({ ...f, classification: id }))}
              onCreated={() => undefined}
              createLabel={t('purchases.form.addDepartment')}
              onCreate={(name_ar) => classificationsApiCreate(name_ar)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field(
              t('purchases.form.margin'),
              <Input
                type="number"
                value={form.markup_percent}
                onChange={(e) => setForm((f) => ({ ...f, markup_percent: e.target.value }))}
              />,
            )}
            {field(
              t('inventory.purchasePrice'),
              <Input
                type="number"
                value={form.purchase_price}
                onChange={(e) => setForm((f) => ({ ...f, purchase_price: e.target.value }))}
              />,
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field(
              t('inventory.salePrice'),
              <Input type="number" value={computedSale} readOnly className="bg-slate-50 font-black text-emerald-700" />,
            )}
            {field(
              t('purchases.form.columns.offerPrice'),
              <Input
                type="number"
                placeholder="—"
                value={form.offer_price}
                onChange={(e) => setForm((f) => ({ ...f, offer_price: e.target.value }))}
              />,
            )}
          </div>

          {field(
            t('inventory.barcode'),
            <Input
              value={form.barcode}
              onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
              className="font-mono text-xs"
            />,
          )}

          {field(
            t('inventory.reorderPercentLabel'),
            <Input
              type="number"
              value={form.reorder_percent}
              onChange={(e) => setForm((f) => ({ ...f, reorder_percent: e.target.value }))}
            />,
          )}
          <p className="text-[10px] text-slate-500 -mt-2">
            {t('inventory.defaultReorderHint')}: {defaultReorderPercent}%
          </p>

          <p className="text-xs font-bold text-slate-700 pt-1">{t('inventory.sizes')}</p>
          {activeSizes.length === 0 ? (
            <p className="text-[11px] text-amber-700 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
              {t('purchases.form.quickCreateSizesRequired')}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {activeSizes.map((s) => (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors ${
                  selectedSizes.includes(s.id)
                    ? 'border-[#4169E1] bg-blue-50 text-[#4169E1]'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedSizes.includes(s.id)}
                  onChange={() => setSelectedSizes((prev) => toggleId(prev, s.id, true))}
                />
                {s.name_ar}
              </label>
            ))}
          </div>

          <p className="text-xs font-bold text-slate-700">{t('inventory.colors')}</p>
          {activeColors.length === 0 ? (
            <p className="text-[11px] text-amber-700 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
              {t('purchases.form.quickCreateColorsRequired')}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {activeColors.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors ${
                  selectedColors.includes(c.id)
                    ? 'border-[#4169E1] bg-blue-50 text-[#4169E1]'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedColors.includes(c.id)}
                  onChange={() => setSelectedColors((prev) => toggleId(prev, c.id, true))}
                />
                {c.name_ar}
              </label>
            ))}
          </div>

          <div className="rounded-xl border-2 border-slate-200 bg-slate-50/80 p-3 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t('purchases.form.createSheetFromInvoice')}
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <span className="block text-[9px] font-black text-slate-400 uppercase">{t('purchases.supplier')}</span>
                <span className="font-bold text-slate-800">{supplierName}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <span className="block text-[9px] font-black text-slate-400 uppercase">{t('purchases.season')}</span>
                <span className="font-bold text-slate-800">{seasonName}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <span className="block text-[9px] font-black text-slate-400 uppercase">{t('purchases.form.brand')}</span>
                <span className="font-bold text-slate-800">{brandName}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <span className="block text-[9px] font-black text-slate-400 uppercase">{t('purchases.form.margin')}</span>
                <span className="font-bold text-[#4169E1]">{profitPercent}%</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <span className="block text-[9px] font-black text-slate-400 uppercase">{t('purchases.form.productGroup')}</span>
                <span className="font-bold text-slate-800">{sectionName}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <span className="block text-[9px] font-black text-slate-400 uppercase">{t('purchases.form.productDepartment')}</span>
                <span className="font-bold text-slate-800">{classificationLabel}</span>
              </div>
            </div>
          </div>
        </div>
        </div>

        {sheetError ? (
          <p className="shrink-0 mx-5 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium">
            {sheetError}
          </p>
        ) : null}

        <div className="shrink-0 border-t bg-slate-50 px-5 py-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving} className="font-bold">
            {t('purchases.form.cancel')}
          </Button>
          <Button
            onClick={onSave}
            disabled={saving}
            className="font-black bg-[#4169E1] hover:bg-[#3451b2]"
          >
            {t('purchases.form.createNewProduct')}
          </Button>
        </div>
      </aside>
    </>
  );

  return createPortal(content, document.body);
}
