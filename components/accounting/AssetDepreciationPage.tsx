import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Calculator, Plus, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  chartOfAccountsApi,
  fixedAssetsApi,
  glAccountsApi,
  type ChartAccountDto,
  type FixedAssetDto,
} from '@/lib/api/accounting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export function AssetDepreciationPage() {
  const { t } = useLanguage();
  const [assets, setAssets] = useState<FixedAssetDto[]>([]);
  const [entries, setEntries] = useState<
    { code: string; asset_name: string; period: string; amount: string; journal_code: string | null }[]
  >([]);
  const [glList, setGlList] = useState<ChartAccountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({
    name_ar: '',
    category: 'device',
    acquisition_date: new Date().toISOString().slice(0, 10),
    cost: '12000',
    useful_life_months: '36',
    depreciation_method: 'straight_line',
    depreciation_rate: '25',
    gl_asset: '',
    gl_accumulated: '',
    gl_expense: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, gl] = await Promise.all([
        fixedAssetsApi.list(),
        chartOfAccountsApi.list('asset').then((a) => {
          glAccountsApi.list().catch(() => a);
          return a;
        }),
      ]);
      setAssets(data.assets);
      setEntries(
        data.entries as {
          code: string;
          asset_name: string;
          period: string;
          amount: string;
          journal_code: string | null;
        }[],
      );
      setGlList(gl);
      const dep = gl.find((x) => x.code === '5200');
      const acc = gl.find((x) => x.code === '1590');
      const fa = gl.find((x) => x.code === '1500');
      setForm((f) => ({
        ...f,
        gl_asset: fa?.id ?? f.gl_asset,
        gl_accumulated: acc?.id ?? f.gl_accumulated,
        gl_expense: dep?.id ?? f.gl_expense,
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async () => {
    await fixedAssetsApi.create({
      ...form,
      useful_life_months: Number(form.useful_life_months),
    });
    setOpen(false);
    load();
  };

  const categoryLabel = (c: string) => t(`accounting.assetCat_${c}` as 'accounting.assetCat_device');

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7 text-slate-700" />
            {t('nav.assetDepreciation')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t('accounting.assetDesc')}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-40 h-9"
          />
          <Button variant="outline" size="sm" onClick={() => fixedAssetsApi.bulkDepreciate(period).then(load)}>
            {t('accounting.depBulk')}
          </Button>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 me-1" />
            {t('accounting.assetAdd')}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm">
        <Calculator className="inline h-4 w-4 me-1" />
        {t('accounting.depExample')}
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
              <th className="px-3 py-2 text-start">{t('accounting.colName')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.assetCost')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.depMonthly')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.bookValue')}</th>
              <th className="px-3 py-2 text-start">{t('accounting.depMethod')}</th>
              <th className="px-3 py-2 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : (
              assets.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{a.code}</td>
                  <td className="px-3 py-2">
                    {a.name_ar}
                    <span className="text-xs text-slate-500 ms-2">{categoryLabel(a.category)}</span>
                  </td>
                  <td className="px-3 py-2 text-end">{a.cost}</td>
                  <td className="px-3 py-2 text-end font-semibold text-indigo-600">
                    {a.monthly_depreciation}
                  </td>
                  <td className="px-3 py-2 text-end">{a.book_value}</td>
                  <td className="px-3 py-2 text-xs">
                    {a.depreciation_method === 'straight_line'
                      ? t('accounting.depStraight')
                      : t('accounting.depDeclining')}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <Button size="sm" onClick={() => fixedAssetsApi.depreciate(a.id, period).then(load)}>
                      {t('accounting.depRun')}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {entries.length > 0 && (
        <div className="rounded-xl border p-3">
          <h3 className="font-semibold text-sm mb-2">{t('accounting.depHistory')}</h3>
          <ul className="text-xs space-y-1">
            {entries.map((e, i) => (
              <li key={i} className="flex justify-between border-b py-1">
                <span>
                  {e.code} — {e.asset_name} ({e.period})
                </span>
                <span>
                  {e.amount} {e.journal_code && `→ ${e.journal_code}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('accounting.assetAdd')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder={t('accounting.nameAr')}
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            />
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="device">{t('accounting.assetCat_device')}</option>
              <option value="vehicle">{t('accounting.assetCat_vehicle')}</option>
              <option value="furniture">{t('accounting.assetCat_furniture')}</option>
              <option value="equipment">{t('accounting.assetCat_equipment')}</option>
            </select>
            <Input
              type="date"
              value={form.acquisition_date}
              onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })}
            />
            <Input
              type="number"
              placeholder={t('accounting.assetCost')}
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
            <Input
              type="number"
              placeholder={t('accounting.assetLifeMonths')}
              value={form.useful_life_months}
              onChange={(e) => setForm({ ...form, useful_life_months: e.target.value })}
            />
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.depreciation_method}
              onChange={(e) => setForm({ ...form, depreciation_method: e.target.value })}
            >
              <option value="straight_line">{t('accounting.depStraight')}</option>
              <option value="declining">{t('accounting.depDeclining')}</option>
            </select>
          </div>
          <SheetFooter>
            <Button onClick={onSave}>{t('inventory.saveDraft')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
