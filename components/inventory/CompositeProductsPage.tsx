import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  createCompositeProduct,
  deleteCompositeProduct,
  fetchCompositeProducts,
  fetchProducts,
  updateCompositeProduct,
  type CompositeProductDto,
  type ProductDto,
} from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type LineForm = { variant: string; quantity: string; label: string };

export function CompositeProductsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<CompositeProductDto[]>([]);
  const [variantOptions, setVariantOptions] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompositeProductDto | null>(null);
  const [form, setForm] = useState({
    name_ar: '',
    barcode: '',
    sale_price: '0',
    offer_price: '',
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
      const [list, products] = await Promise.all([
        fetchCompositeProducts(),
        fetchProducts(),
      ]);
      setRows(list);
      buildVariantOptions(products);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addLine = () => {
    const opt = variantOptions.find((o) => o.id === form.lineVariant);
    if (!opt) return;
    setLines([
      ...lines,
      {
        variant: opt.id,
        quantity: form.lineQty,
        label: opt.label,
      },
    ]);
    setForm({ ...form, lineVariant: '', lineQty: '1' });
  };

  const onSave = async () => {
    const payload = {
      name_ar: form.name_ar,
      barcode: form.barcode,
      sale_price: form.sale_price,
      offer_price: form.offer_price || null,
      lines: lines.map((l) => ({ variant: l.variant, quantity: l.quantity })),
    };
    if (editing) {
      await updateCompositeProduct(editing.id, payload);
    } else {
      await createCompositeProduct(payload);
    }
    setOpen(false);
    setEditing(null);
    setLines([]);
    setForm({ name_ar: '', barcode: '', sale_price: '0', offer_price: '', lineVariant: '', lineQty: '1' });
    load();
  };

  const openEdit = (row: CompositeProductDto) => {
    setEditing(row);
    setForm({
      name_ar: row.name_ar,
      barcode: row.barcode,
      sale_price: row.sale_price,
      offer_price: row.offer_price || '',
      lineVariant: '',
      lineQty: '1',
    });
    setLines(
      row.lines.map((l) => ({
        variant: l.variant,
        quantity: l.quantity,
        label: `${l.product_name} — ${l.size_name}/${l.color_name}`,
      })),
    );
    setOpen(true);
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex justify-between gap-3">
        <h1 className="text-xl font-bold">{t('nav.compositeProducts')}</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setLines([]);
              setForm({
                name_ar: '',
                barcode: '',
                sale_price: '0',
                offer_price: '',
                lineVariant: '',
                lineQty: '1',
              });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 me-1" />
            {t('inventory.add')}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-start">{t('inventory.code')}</th>
              <th className="px-4 py-3 text-start">{t('inventory.nameAr')}</th>
              <th className="px-4 py-3 text-end">{t('inventory.salePrice')}</th>
              <th className="px-4 py-3 text-end">{t('inventory.components')}</th>
              <th className="px-4 py-3 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-4 py-2">{r.name_ar}</td>
                  <td className="px-4 py-2 text-end">{r.sale_price}</td>
                  <td className="px-4 py-2 text-end">{r.lines.length}</td>
                  <td className="px-4 py-2 text-end gap-1 flex justify-end">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(t('inventory.confirmDelete'))) {
                          deleteCompositeProduct(r.id).then(load);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editing ? t('inventory.edit') : t('inventory.newComposite')}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder={t('inventory.nameAr')}
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            />
            <Input
              placeholder={t('inventory.barcode')}
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder={t('inventory.salePrice')}
                value={form.sale_price}
                onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
              />
              <Input
                placeholder={t('inventory.offerPrice')}
                value={form.offer_price}
                onChange={(e) => setForm({ ...form, offer_price: e.target.value })}
              />
            </div>
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
                className="w-16"
                value={form.lineQty}
                onChange={(e) => setForm({ ...form, lineQty: e.target.value })}
              />
              <Button type="button" variant="outline" onClick={addLine}>
                +
              </Button>
            </div>
            <ul className="text-sm space-y-1">
              {lines.map((l) => (
                <li key={l.variant} className="flex justify-between rounded bg-slate-50 px-2 py-1">
                  <span>{l.label} × {l.quantity}</span>
                  <button type="button" onClick={() => setLines(lines.filter((x) => x.variant !== l.variant))}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <SheetFooter>
            <Button onClick={onSave} disabled={!form.name_ar || lines.length === 0}>
              {t('inventory.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
