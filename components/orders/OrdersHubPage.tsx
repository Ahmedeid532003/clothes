import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  ClipboardList,
  Download,
  Package,
  Plus,
  RefreshCw,
  ScanBarcode,
  Undo2,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { scanOrdersApi, type ScanOrderDto } from '@/lib/api/scanOrders';
import { ScanOrderEditorPage } from '@/components/orders/ScanOrderEditorPage';
import { Button } from '@/components/ui/button';
import { ERP_NATIVE_SELECT } from '@/lib/ui/erpNativeSelect';
import { printScanOrderReceipt } from '@/lib/print/scanOrderReceiptPrint';
import { formatMoneyLocale } from '@/lib/money';

type Mode = 'list' | 'editor';
type OrderType = ScanOrderDto['order_type'];

const TYPE_ICONS: Record<OrderType, React.ReactNode> = {
  sale: <ScanBarcode className="h-5 w-5" />,
  transfer: <ArrowLeftRight className="h-5 w-5" />,
  stock_count: <ClipboardList className="h-5 w-5" />,
  purchase_return: <Undo2 className="h-5 w-5" />,
};

export function OrdersHubPage() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>('list');
  const [editorType, setEditorType] = useState<OrderType>('sale');
  const [rows, setRows] = useState<ScanOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [showNewMenu, setShowNewMenu] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await scanOrdersApi.list({ order_type: filterType || undefined }));
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    if (mode === 'list') load();
  }, [mode, load]);

  const exportCsv = () => {
    const headers = [
      t('inventory.code'),
      t('scanOrders.typeLabel'),
      t('scanOrders.employeeCode'),
      t('scanOrders.employeeName'),
      t('inventory.status'),
      t('scanOrders.items'),
      t('accounting.amount'),
      t('purchases.date'),
    ];
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.code,
          r.order_type_label,
          r.employee_code,
          r.employee_name,
          r.status_label,
          r.line_count,
          r.total_sale_amount,
          r.created_at.slice(0, 10),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      );
    }
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'scan-orders.csv';
    a.click();
  };

  const openNew = (type: OrderType) => {
    setEditorType(type);
    setMode('editor');
    setShowNewMenu(false);
  };

  if (mode === 'editor') {
    return (
      <ScanOrderEditorPage
        orderType={editorType}
        onBack={() => {
          setMode('list');
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-violet-700" />
            {t('nav.scanOrders')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t('scanOrders.hubDesc')}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className={ERP_NATIVE_SELECT}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">{t('scanOrders.allTypes')}</option>
            {(['sale', 'transfer', 'stock_count', 'purchase_return'] as OrderType[]).map((tp) => (
              <option key={tp} value={tp}>
                {t(`scanOrders.type.${tp}`)}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4 me-1" />
            Excel
          </Button>
          <div className="relative">
            <Button
              size="sm"
              className="bg-violet-700 hover:bg-violet-800 font-bold"
              onClick={() => setShowNewMenu((v) => !v)}
            >
              <Plus className="h-4 w-4 me-1" />
              {t('common.add')}
            </Button>
            {showNewMenu && (
              <div className="absolute top-full mt-1 end-0 z-20 min-w-[200px] rounded-lg border bg-white shadow-lg py-1">
                {(['sale', 'transfer', 'stock_count', 'purchase_return'] as OrderType[]).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-violet-50 text-start"
                    onClick={() => openNew(tp)}
                  >
                    {TYPE_ICONS[tp]}
                    {t(`scanOrders.type.${tp}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gradient-to-b from-violet-900 to-violet-800 text-white">
            <tr>
              <th className="py-2.5 px-3 text-start">{t('inventory.code')}</th>
              <th className="py-2.5 px-3 text-start">{t('scanOrders.typeLabel')}</th>
              <th className="py-2.5 px-3 text-start">{t('scanOrders.employeeName')}</th>
              <th className="py-2.5 px-3 text-start">{t('inventory.status')}</th>
              <th className="py-2.5 px-3 text-center">{t('scanOrders.items')}</th>
              <th className="py-2.5 px-3 text-end">{t('accounting.amount')}</th>
              <th className="py-2.5 px-3 text-start">{t('purchases.date')}</th>
              <th className="py-2.5 px-3 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  {t('inventory.empty')}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-slate-50/80">
                  <td className="py-2 px-3 font-mono text-xs font-bold text-violet-800">{row.code}</td>
                  <td className="py-2 px-3">{row.order_type_label}</td>
                  <td className="py-2 px-3">
                    <span className="font-medium">{row.employee_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono ms-1">{row.employee_code}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{row.status_label}</span>
                  </td>
                  <td className="py-2 px-3 text-center font-semibold">{row.line_count}</td>
                  <td className="py-2 px-3 text-end tabular-nums font-bold">
                    {formatMoneyLocale(row.total_sale_amount)}
                  </td>
                  <td className="py-2 px-3 text-xs whitespace-nowrap">
                    {row.created_at.slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="py-2 px-3 text-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const full = await scanOrdersApi.get(row.id);
                        printScanOrderReceipt(full);
                      }}
                    >
                      {t('scanOrders.reprint')}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
