import React, { useCallback, useEffect, useState } from 'react';
import { Coins, Plus, RefreshCw, Repeat } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { currenciesApi, type CurrencyDto } from '@/lib/api/accounting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export function CurrenciesPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<CurrencyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name_ar: '',
    symbol: '',
    rate_to_base: '50',
  });
  const [convertAmount, setConvertAmount] = useState('100');
  const [convertCurrency, setConvertCurrency] = useState('USD');
  const [convertResult, setConvertResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await currenciesApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async () => {
    await currenciesApi.create(form);
    setOpen(false);
    load();
  };

  const onConvert = async () => {
    const r = await currenciesApi.convert(convertAmount, convertCurrency);
    setConvertResult(`${r.original_amount} ${r.original_currency} → ${r.base_amount} ${r.base_currency} (${t('accounting.fxRate')}: ${r.rate})`);
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="h-7 w-7 text-yellow-600" />
            {t('nav.currencies')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t('accounting.currencyDesc')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 me-1" />
            {t('accounting.currencyAdd')}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-gradient-to-r from-yellow-50 to-amber-50 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-600">{t('accounting.amount')}</label>
          <Input
            type="number"
            value={convertAmount}
            onChange={(e) => setConvertAmount(e.target.value)}
            className="w-32 mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">{t('accounting.currencyCode')}</label>
          <select
            className="rounded-md border px-3 py-2 text-sm mt-1"
            value={convertCurrency}
            onChange={(e) => setConvertCurrency(e.target.value)}
          >
            {rows.filter((c) => !c.is_base).map((c) => (
              <option key={c.id} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={onConvert}>
          <Repeat className="h-4 w-4 me-1" />
          {t('accounting.convertToEgp')}
        </Button>
        {convertResult && (
          <p className="text-sm font-semibold text-amber-900 w-full">{convertResult}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p>{t('inventory.loading')}</p>
        ) : (
          rows.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border p-4 ${c.is_base ? 'border-yellow-400 bg-yellow-50/50' : 'bg-white'}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-2xl font-bold font-mono">{c.code}</span>
                <span className="text-lg">{c.symbol}</span>
              </div>
              <div className="font-semibold mt-1">{c.name_ar}</div>
              <div className="text-sm text-slate-600 mt-2">{c.display_rate}</div>
              {!c.is_base && (
                <Input
                  className="mt-2 h-8 text-sm"
                  type="number"
                  defaultValue={c.rate_to_base}
                  onBlur={(e) =>
                    currenciesApi.update(c.id, { rate_to_base: e.target.value }).then(load)
                  }
                />
              )}
            </div>
          ))
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('accounting.currencyAdd')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder="USD"
              maxLength={3}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
            <Input
              placeholder={t('accounting.nameAr')}
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            />
            <Input
              placeholder={t('accounting.currencySymbol')}
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            />
            <Input
              type="number"
              placeholder={t('accounting.rateToEgp')}
              value={form.rate_to_base}
              onChange={(e) => setForm({ ...form, rate_to_base: e.target.value })}
            />
          </div>
          <SheetFooter>
            <Button onClick={onSave}>{t('inventory.saveDraft')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
