import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchStockBalances, fetchWarehouses, type StockBalanceDto, type WarehouseDto } from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';

export function StockBalancesPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<StockBalanceDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wh, bal] = await Promise.all([
        fetchWarehouses(),
        fetchStockBalances(warehouseId || undefined),
      ]);
      setWarehouses(wh);
      setRows(bal);
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{t('nav.stockBalances')}</h1>
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
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('inventory.warehouse')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.product')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.size')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.color')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.qty')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.salePrice')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-6 text-center">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  {t('inventory.emptyStock')}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.warehouse_name}</td>
                  <td className="px-3 py-2">
                    {r.product_code} — {r.product_name}
                  </td>
                  <td className="px-3 py-2">{r.size_name}</td>
                  <td className="px-3 py-2">{r.color_name}</td>
                  <td className="px-3 py-2 font-semibold">{r.quantity}</td>
                  <td className="px-3 py-2">{r.sale_price}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
