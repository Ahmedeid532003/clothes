import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  ClipboardList,
  Package,
  ShoppingCart,
  Warehouse,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { PosProductHit } from '@/lib/api/pos';

type Props = {
  quickPicks: PosProductHit[];
  warehouseName?: string;
  branchName?: string;
  onAction: (tab: string) => void;
};

export function PosIntegratedWarehouseScreen({ quickPicks, warehouseName, branchName, onAction }: Props) {
  const { t } = useLanguage();

  const stockRows = useMemo(() => {
    const rows: Array<{
      code: string;
      name: string;
      size: string;
      color: string;
      qty: number;
      low: boolean;
    }> = [];
    quickPicks.forEach((p) => {
      p.variants.forEach((v) => {
        const qty = parseFloat(v.quantity_available) || 0;
        rows.push({
          code: p.code,
          name: p.name_ar,
          size: v.size_name,
          color: v.color_name,
          qty,
          low: qty < 15,
        });
      });
    });
    return rows.sort((a, b) => a.qty - b.qty);
  }, [quickPicks]);

  const totalSkus = stockRows.length;
  const lowCount = stockRows.filter((r) => r.low).length;
  const totalQty = stockRows.reduce((s, r) => s + r.qty, 0);

  const actions = [
    { tab: 'stock-transfers', icon: ArrowLeftRight, label: t('pos.integrated.warehouse.transfers'), tone: 'blue' },
    { tab: 'stock-count', icon: ClipboardList, label: t('pos.integrated.warehouse.stockCount'), tone: 'purple' },
    { tab: 'purchase-invoices', icon: ShoppingCart, label: t('pos.integrated.warehouse.receive'), tone: 'green' },
    { tab: 'reorder-alerts', icon: AlertTriangle, label: t('pos.integrated.warehouse.reorder'), tone: 'red' },
  ];

  return (
    <div className="pos-int-screen pos-int-warehouse">
      <header className="pos-int-screen-head">
        <h2>{t('pos.integrated.warehouse.title')}</h2>
        <p>
          {branchName ? `${branchName} · ` : ''}
          {warehouseName || t('pos.integrated.warehouse.defaultWh')}
        </p>
      </header>

      <div className="pos-int-wh-kpis">
        <div className="pos-int-stat-card">
          <Package className="h-5 w-5 text-indigo-600" />
          <div>
            <span>{t('pos.integrated.warehouse.totalSkus')}</span>
            <strong>{totalSkus}</strong>
          </div>
        </div>
        <div className="pos-int-stat-card">
          <Warehouse className="h-5 w-5 text-emerald-600" />
          <div>
            <span>{t('pos.integrated.warehouse.totalQty')}</span>
            <strong>{totalQty.toLocaleString()}</strong>
          </div>
        </div>
        <div className="pos-int-stat-card pos-int-stat-card--warn">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <span>{t('pos.integrated.stockShortages')}</span>
            <strong>{lowCount}</strong>
          </div>
        </div>
      </div>

      <div className="pos-int-wh-actions">
        {actions.map((a) => (
          <button key={a.tab} type="button" className={`pos-int-wh-action pos-int-wh-action--${a.tone}`} onClick={() => onAction(a.tab)}>
            <a.icon className="h-5 w-5" />
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      <section className="pos-int-panel pos-int-panel--wide">
        <h3>{t('pos.integrated.warehouse.stockTable')}</h3>
        <div className="pos-int-table-wrap">
          <table className="pos-int-table">
            <thead>
              <tr>
                <th>{t('pos.colCode')}</th>
                <th>{t('pos.colName')}</th>
                <th>{t('pos.integrated.warehouse.sizeColor')}</th>
                <th>{t('pos.avlQty')}</th>
                <th>{t('pos.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {stockRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-cell">{t('pos.noStockHint')}</td>
                </tr>
              ) : (
                stockRows.slice(0, 50).map((row, i) => (
                  <tr key={`${row.code}-${i}`} className={row.low ? 'is-low' : ''}>
                    <td className="code">{row.code}</td>
                    <td>{row.name}</td>
                    <td>{row.size} / {row.color}</td>
                    <td className="amount">{row.qty}</td>
                    <td>
                      {row.low ? (
                        <span className="pos-int-badge-warn">{t('pos.integrated.warehouse.low')}</span>
                      ) : (
                        <span className="pos-int-badge-ok">{t('pos.integrated.warehouse.ok')}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
