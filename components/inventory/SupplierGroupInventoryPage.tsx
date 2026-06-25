import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ApiRequestError } from '@/lib/api/errors';
import {
  createStockCount,
  fetchSeasons,
  fetchSupplierGroupInventoryReport,
  fetchWarehouses,
  supplierGroupsApi,
  type CatalogItem,
  type SeasonDto,
  type SupplierGroupInventoryReport,
  type WarehouseDto,
} from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';

export function SupplierGroupInventoryPage() {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<CatalogItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [supplierGroupId, setSupplierGroupId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [hideMoney, setHideMoney] = useState(false);
  const [report, setReport] = useState<SupplierGroupInventoryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countCreated, setCountCreated] = useState(false);

  useEffect(() => {
    Promise.all([supplierGroupsApi.list(), fetchWarehouses(), fetchSeasons()])
      .then(([gr, wh, sn]) => {
        setGroups(gr);
        setWarehouses(wh);
        setSeasons(sn);
        if (gr[0]) setSupplierGroupId(gr[0].id);
        if (wh[0]) setWarehouseId(wh[0].id);
        const current = sn.find((s) => s.is_current);
        if (current) setSeasonId(current.id);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Error');
      });
  }, []);

  const load = useCallback(async () => {
    if (!supplierGroupId || !warehouseId) {
      setReport(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setReport(
        await fetchSupplierGroupInventoryReport({
          supplier_group: supplierGroupId,
          warehouse: warehouseId,
          season: seasonId || undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('suppliers.loadFailed'));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [supplierGroupId, warehouseId, seasonId]);

  useEffect(() => {
    load();
  }, [load]);

  const onStartCount = async () => {
    if (!warehouseId || !supplierGroupId) return;
    await createStockCount({
      warehouse: warehouseId,
      supplier_group: supplierGroupId,
      notes: report?.supplier_group_name
        ? `${t('nav.supplierInventories')}: ${report.supplier_group_name}`
        : '',
    });
    setCountCreated(true);
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'stock-count' }));
  };

  const rows = report?.rows ?? [];
  const totals = report?.totals;
  const colSpan = hideMoney ? 10 : 12;

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('nav.supplierInventories')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('inventory.supplierReportHint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border px-3 py-2 text-sm min-w-[160px]"
            value={supplierGroupId}
            onChange={(e) => setSupplierGroupId(e.target.value)}
          >
            <option value="">{t('inventory.selectSupplierGroup')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name_ar}
                {(g as { settlement_mode_label?: string }).settlement_mode_label
                  ? ` — ${(g as { settlement_mode_label?: string }).settlement_mode_label}`
                  : ''}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border px-3 py-2 text-sm min-w-[140px]"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="">{t('inventory.selectWarehouse')}</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name_ar}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border px-3 py-2 text-sm min-w-[120px]"
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
          <label className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={hideMoney}
              onChange={(e) => setHideMoney(e.target.checked)}
            />
            {t('inventory.hideFinancialDetails')}
          </label>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            disabled={!supplierGroupId || !warehouseId}
            onClick={onStartCount}
          >
            <ClipboardCheck className="h-4 w-4 me-1" />
            {t('inventory.startStockCount')}
          </Button>
        </div>
      </div>

      {countCreated && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {t('inventory.createCount')} — {t('nav.stockCount')}
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {report && totals && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['inventory.purchasedQty', totals.purchased_qty],
            ...(hideMoney ? [] : [['inventory.purchasedCost', totals.purchased_cost] as const]),
            ['inventory.soldQty', totals.sold_qty],
            ...(hideMoney ? [] : [['inventory.soldAmount', totals.sold_amount] as const]),
            ['inventory.stockQty', totals.stock_qty],
            ['inventory.returnQty', totals.return_qty],
            ...(hideMoney ? [] : [['inventory.stockValue', totals.stock_value] as const]),
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
              <th className="px-3 py-3 text-start">{t('inventory.code')}</th>
              <th className="px-3 py-3 text-start">{t('inventory.product')}</th>
              <th className="px-3 py-3 text-start">{t('purchases.supplier')}</th>
              <th className="px-3 py-3 text-start">{t('inventory.size')}</th>
              <th className="px-3 py-3 text-start">{t('inventory.color')}</th>
              <th className="px-3 py-3 text-end">{t('inventory.purchasedQty')}</th>
              {!hideMoney && (
                <th className="px-3 py-3 text-end">{t('inventory.purchasedCost')}</th>
              )}
              <th className="px-3 py-3 text-end">{t('inventory.soldQty')}</th>
              {!hideMoney && <th className="px-3 py-3 text-end">{t('inventory.soldAmount')}</th>}
              <th className="px-3 py-3 text-end">{t('inventory.stockQty')}</th>
              <th className="px-3 py-3 text-end">{t('inventory.expectedStock')}</th>
              <th className="px-3 py-3 text-end">{t('inventory.diffQty')}</th>
              <th className="px-3 py-3 text-end font-semibold text-amber-800">
                {t('inventory.returnQty')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-slate-500">
                  {!supplierGroupId || !warehouseId
                    ? t('inventory.selectSupplierGroup')
                    : t('inventory.supplierReportEmpty')}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const diff = parseFloat(r.diff_qty);
                const ret = parseFloat(r.return_qty);
                return (
                  <tr key={r.variant_id} className="border-t hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-mono text-xs">{r.product_code}</td>
                    <td className="px-3 py-2 font-medium">{r.product_name}</td>
                    <td className="px-3 py-2 text-slate-600">{r.supplier_name}</td>
                    <td className="px-3 py-2">{r.size_name}</td>
                    <td className="px-3 py-2">{r.color_name}</td>
                    <td className="px-3 py-2 text-end">{r.purchased_qty}</td>
                    {!hideMoney && <td className="px-3 py-2 text-end">{r.purchased_cost}</td>}
                    <td className="px-3 py-2 text-end">{r.sold_qty}</td>
                    {!hideMoney && <td className="px-3 py-2 text-end">{r.sold_amount}</td>}
                    <td className="px-3 py-2 text-end">{r.stock_qty}</td>
                    <td className="px-3 py-2 text-end">{r.expected_stock}</td>
                    <td
                      className={`px-3 py-2 text-end ${diff !== 0 ? 'font-semibold text-blue-700' : ''}`}
                    >
                      {r.diff_qty}
                    </td>
                    <td
                      className={`px-3 py-2 text-end ${ret > 0 ? 'font-semibold text-amber-800' : ''}`}
                    >
                      {r.return_qty}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {totals && rows.length > 0 && (
            <tfoot className="bg-slate-100 font-semibold">
              <tr>
                <td colSpan={5} className="px-3 py-2">
                  {t('purchases.form.totalItems')}
                </td>
                <td className="px-3 py-2 text-end">{totals.purchased_qty}</td>
                {!hideMoney && <td className="px-3 py-2 text-end">{totals.purchased_cost}</td>}
                <td className="px-3 py-2 text-end">{totals.sold_qty}</td>
                {!hideMoney && <td className="px-3 py-2 text-end">{totals.sold_amount}</td>}
                <td className="px-3 py-2 text-end">{totals.stock_qty}</td>
                <td className="px-3 py-2 text-end">{totals.expected_stock}</td>
                <td className="px-3 py-2 text-end">{totals.diff_qty}</td>
                <td className="px-3 py-2 text-end text-amber-900">{totals.return_qty}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
