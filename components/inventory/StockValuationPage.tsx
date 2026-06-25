import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  fetchSeasons,
  fetchStockValuation,
  fetchWarehouses,
  type SeasonDto,
  type StockValuationReport,
  type WarehouseDto,
} from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';

export function StockValuationPage() {
  const { t } = useLanguage();
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [merge, setMerge] = useState(false);
  const [report, setReport] = useState<StockValuationReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchWarehouses(), fetchSeasons()]).then(([wh, ss]) => {
      setWarehouses(wh);
      setSeasons(ss);
      const current = ss.find((s) => s.is_current);
      if (current) setSeasonId(current.id);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(
        await fetchStockValuation({
          warehouse: warehouseId || undefined,
          season: seasonId || undefined,
          merge,
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [warehouseId, seasonId, merge]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = report?.rows ?? [];
  const totals = report?.totals;

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">{t('nav.stockValuation')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="">{t('inventory.allWarehouses')}</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name_ar}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
          >
            <option value="">{t('inventory.allSeasons')}</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_ar}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={merge} onChange={(e) => setMerge(e.target.checked)} />
            {t('inventory.mergeByProduct')}
          </label>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {totals && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['inventory.qty', totals.quantity],
            ['inventory.totalPurchase', totals.purchase_value],
            ['inventory.totalSale', totals.sale_value],
            ['inventory.totalOffer', totals.offer_value],
          ].map(([key, val]) => (
            <div key={key} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{t(key)}</p>
              <p className="text-lg font-bold text-slate-900">{val}</p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {!merge && <th className="px-4 py-3 text-start">{t('inventory.warehouse')}</th>}
              <th className="px-4 py-3 text-start">{t('inventory.code')}</th>
              <th className="px-4 py-3 text-start">{t('inventory.product')}</th>
              {!merge && <th className="px-4 py-3 text-start">{t('inventory.size')}</th>}
              {!merge && <th className="px-4 py-3 text-start">{t('inventory.color')}</th>}
              <th className="px-4 py-3 text-end">{t('inventory.qty')}</th>
              <th className="px-4 py-3 text-end">{t('inventory.purchasePrice')}</th>
              <th className="px-4 py-3 text-end">{t('inventory.salePrice')}</th>
              <th className="px-4 py-3 text-end">{t('inventory.totalPurchase')}</th>
              <th className="px-4 py-3 text-end">{t('inventory.totalSale')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                  {t('inventory.emptyStock')}
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.balance_id ?? r.product_id ?? i} className="border-t hover:bg-slate-50/50">
                  {!merge && <td className="px-4 py-2">{r.warehouse_name}</td>}
                  <td className="px-4 py-2 font-mono text-xs">{r.product_code}</td>
                  <td className="px-4 py-2">{r.product_name}</td>
                  {!merge && <td className="px-4 py-2">{r.size_name}</td>}
                  {!merge && <td className="px-4 py-2">{r.color_name}</td>}
                  <td className="px-4 py-2 text-end">{r.quantity}</td>
                  <td className="px-4 py-2 text-end">{r.purchase_price}</td>
                  <td className="px-4 py-2 text-end">{r.sale_price}</td>
                  <td className="px-4 py-2 text-end font-medium">{r.purchase_value}</td>
                  <td className="px-4 py-2 text-end font-medium">{r.sale_value}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
