import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Check } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ApiRequestError } from '@/lib/api/errors';
import {
  approveStockAddition,
  createStockAddition,
  fetchProducts,
  fetchStockAdditionOptions,
  fetchStockAdditions,
  type ProductDto,
  type StockAdditionDto,
  type StockVoucherOptions,
} from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type LineForm = { variant: string; quantity: string; label: string };

export function StockAdditionPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<StockAdditionDto[]>([]);
  const [options, setOptions] = useState<StockVoucherOptions | null>(null);
  const [variantOptions, setVariantOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    warehouse: '',
    purpose: 'supplier_purchase',
    notes: '',
    lineVariant: '',
    lineQty: '1',
  });
  const [lines, setLines] = useState<LineForm[]>([]);

  const buildVariantOptions = (products: ProductDto[]) => {
    const opts: Array<{ id: string; label: string }> = [];
    for (const p of products.filter((x) => x.is_active)) {
      for (const v of p.variants || []) {
        opts.push({
          id: v.id,
          label: `${p.code} — ${p.name_ar} — ${v.size_name}/${v.color_name}`,
        });
      }
    }
    setVariantOptions(opts);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, opt, products] = await Promise.all([
        fetchStockAdditions(),
        fetchStockAdditionOptions(),
        fetchProducts(),
      ]);
      setRows(list);
      setOptions(opt);
      buildVariantOptions(products);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setForm({
      warehouse: options?.warehouses[0]?.id ?? '',
      purpose: options?.purposes[0]?.key ?? 'supplier_purchase',
      notes: '',
      lineVariant: '',
      lineQty: '1',
    });
    setLines([]);
    setFormError(null);
    setOpen(true);
  };

  const addLine = () => {
    const opt = variantOptions.find((o) => o.id === form.lineVariant);
    if (!opt) return;
    setLines([
      ...lines,
      { variant: opt.id, quantity: form.lineQty, label: opt.label },
    ]);
    setForm({ ...form, lineVariant: '', lineQty: '1' });
  };

  const onSave = async (approve: boolean) => {
    if (lines.length === 0) {
      setFormError(t('inventory.transferNeedLines'));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createStockAddition({
        warehouse: form.warehouse,
        purpose: form.purpose,
        notes: form.notes,
        lines: lines.map((l) => ({ variant: l.variant, quantity: l.quantity })),
        approve,
      });
      setOpen(false);
      setLines([]);
      load();
    } catch (e) {
      setFormError(
        e instanceof ApiRequestError ? e.message : e instanceof Error ? e.message : t('inventory.saveFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      draft: t('inventory.statusDraft'),
      approved: t('inventory.statusApproved'),
      cancelled: t('inventory.statusCancelled'),
    };
    return map[s] ?? s;
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.stockAdditions')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('inventory.additionDesc')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={openNew} disabled={!options}>
            <Plus className="h-4 w-4 me-1" />
            {t('inventory.add')}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.warehouse')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.purpose')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.status')}</th>
              <th className="px-3 py-2 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  {t('inventory.empty')}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-3 py-2">{r.warehouse_name}</td>
                  <td className="px-3 py-2">{r.purpose_label}</td>
                  <td className="px-3 py-2">{statusLabel(r.status)}</td>
                  <td className="px-3 py-2 text-end">
                    {r.status === 'draft' && (
                      <Button
                        size="sm"
                        title={t('inventory.saveAndApprove')}
                        onClick={() => approveStockAddition(r.id).then(load)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('inventory.newAddition')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            {formError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
            )}
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.warehouse}
              onChange={(e) => setForm({ ...form, warehouse: e.target.value })}
            >
              {options?.warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name_ar}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            >
              {options?.purposes.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label_ar}
                </option>
              ))}
            </select>
            <Input
              placeholder={t('inventory.notes')}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border px-2 py-2 text-sm"
                value={form.lineVariant}
                onChange={(e) => setForm({ ...form, lineVariant: e.target.value })}
              >
                <option value="">{t('inventory.selectVariant')}</option>
                {variantOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
              <Input
                className="w-20"
                value={form.lineQty}
                onChange={(e) => setForm({ ...form, lineQty: e.target.value })}
              />
              <Button type="button" variant="secondary" onClick={addLine}>
                +
              </Button>
            </div>
            {lines.length === 0 && (
              <p className="text-xs text-amber-700">{t('inventory.additionAddLineHint')}</p>
            )}
            <ul className="text-sm text-slate-600 space-y-1">
              {lines.map((l, i) => (
                <li key={i}>
                  {l.label} × {l.quantity}
                </li>
              ))}
            </ul>
          </div>
          <SheetFooter className="flex-col gap-2 sm:flex-col">
            <Button type="button" disabled={saving} onClick={() => onSave(false)}>
              {saving ? t('inventory.saving') : t('inventory.saveDraft')}
            </Button>
            <Button type="button" disabled={saving} onClick={() => onSave(true)}>
              {saving ? t('inventory.saving') : t('inventory.saveAndApprove')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
