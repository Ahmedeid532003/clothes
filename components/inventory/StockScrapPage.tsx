import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Check } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  approveStockScrap,
  createStockScrap,
  fetchStockBalances,
  fetchStockScrap,
  fetchWarehouses,
  type StockBalanceDto,
  type StockScrapDto,
  type WarehouseDto,
} from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type LineForm = { variant: string; quantity: string; label: string };

export function StockScrapPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<StockScrapDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [balances, setBalances] = useState<StockBalanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    warehouse: '',
    reason: '',
    lineVariant: '',
    lineQty: '1',
  });
  const [lines, setLines] = useState<LineForm[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sc, wh] = await Promise.all([fetchStockScrap(), fetchWarehouses()]);
      setRows(sc);
      setWarehouses(wh);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!form.warehouse) {
      setBalances([]);
      return;
    }
    fetchStockBalances(form.warehouse).then(setBalances);
  }, [form.warehouse]);

  const addLine = () => {
    const bal = balances.find((b) => b.variant === form.lineVariant);
    if (!bal) return;
    setLines([
      ...lines,
      {
        variant: bal.variant,
        quantity: form.lineQty,
        label: `${bal.product_name} — ${bal.size_name} / ${bal.color_name}`,
      },
    ]);
    setForm({ ...form, lineVariant: '', lineQty: '1' });
  };

  const onSave = async (approve: boolean) => {
    await createStockScrap({
      warehouse: form.warehouse,
      reason: form.reason,
      lines: lines.map((l) => ({ variant: l.variant, quantity: l.quantity })),
      approve,
    });
    setOpen(false);
    setLines([]);
    load();
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('nav.stockScrap')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setForm({ warehouse: warehouses[0]?.id ?? '', reason: '', lineVariant: '', lineQty: '1' });
              setLines([]);
              setOpen(true);
            }}
          >
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
              <th className="px-3 py-2 text-start">{t('inventory.reason')}</th>
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
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-3 py-2">{r.warehouse_name}</td>
                  <td className="px-3 py-2">{r.reason}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2 text-end">
                    {r.status === 'draft' && (
                      <Button size="sm" onClick={() => approveStockScrap(r.id).then(load)}>
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
            <SheetTitle>{t('inventory.add')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.warehouse}
              onChange={(e) => setForm({ ...form, warehouse: e.target.value })}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name_ar}
                </option>
              ))}
            </select>
            <Input
              placeholder={t('inventory.reason')}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border px-2 py-2 text-sm"
                value={form.lineVariant}
                onChange={(e) => setForm({ ...form, lineVariant: e.target.value })}
              >
                <option value="">{t('inventory.selectVariant')}</option>
                {balances
                  .filter((b) => parseFloat(b.quantity) > 0)
                  .map((b) => (
                    <option key={b.variant} value={b.variant}>
                      {b.product_name} — {b.size_name}/{b.color_name} ({b.quantity})
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
            <ul className="text-sm text-slate-600 space-y-1">
              {lines.map((l, i) => (
                <li key={i}>
                  {l.label} × {l.quantity}
                </li>
              ))}
            </ul>
          </div>
          <SheetFooter className="flex-col gap-2 sm:flex-col">
            <Button disabled={lines.length === 0 || !form.reason.trim()} onClick={() => onSave(false)}>
              {t('inventory.saveDraft')}
            </Button>
            <Button disabled={lines.length === 0 || !form.reason.trim()} onClick={() => onSave(true)}>
              {t('inventory.saveAndApprove')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
