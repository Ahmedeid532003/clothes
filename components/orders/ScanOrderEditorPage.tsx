import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ClipboardList,
  Plus,
  Printer,
  RefreshCw,
  Save,
  ScanBarcode,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchSuppliers } from '@/lib/api/inventory';
import {
  scanOrdersApi,
  type ScanOrderDto,
  type ScanOrderLineDto,
} from '@/lib/api/scanOrders';
import { printScanOrderReceipt } from '@/lib/print/scanOrderReceiptPrint';
import { formatMoneyLocale } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ERP_NATIVE_SELECT } from '@/lib/ui/erpNativeSelect';

type OrderType = ScanOrderDto['order_type'];

const ORDER_TYPES: OrderType[] = ['sale', 'transfer', 'stock_count', 'purchase_return'];

export function ScanOrderEditorPage({
  orderType,
  onBack,
}: {
  orderType: OrderType;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const scanRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'setup' | 'scan'>('setup');
  const [employeeCode, setEmployeeCode] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [order, setOrder] = useState<ScanOrderDto | null>(null);
  const [scanQ, setScanQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderType === 'purchase_return') {
      fetchSuppliers().then((rows) => setSuppliers(rows as Array<{ id: string; name_ar: string }>));
    }
  }, [orderType]);

  const verifyEmployee = async () => {
    if (!employeeCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const emp = await scanOrdersApi.lookupEmployee(employeeCode.trim());
      setEmployeeName(emp.full_name);
    } catch (e) {
      setEmployeeName('');
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const startOrder = async () => {
    if (!employeeCode.trim()) {
      setError(t('scanOrders.employeeRequired'));
      return;
    }
    if (orderType === 'purchase_return' && !supplierId) {
      setError(t('scanOrders.supplierRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await scanOrdersApi.create({
        order_type: orderType,
        employee_code: employeeCode.trim(),
        supplier: supplierId || undefined,
      });
      setOrder(created);
      setStep('scan');
      setTimeout(() => scanRef.current?.focus(), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const onScan = async () => {
    if (!order || !scanQ.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await scanOrdersApi.scan(order.id, scanQ.trim());
      setOrder(updated);
      setScanQ('');
      scanRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const saveAndPrint = async () => {
    if (!order) return;
    setLoading(true);
    try {
      const saved = await scanOrdersApi.save(order.id);
      const printed = await scanOrdersApi.markPrinted(saved.id);
      setOrder(printed);
      printScanOrderReceipt(printed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const removeLine = async (line: ScanOrderLineDto) => {
    if (!order) return;
    try {
      setOrder(await scanOrdersApi.updateLine(order.id, line.id, '0'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  if (step === 'setup') {
    return (
      <div className="space-y-4 p-1 max-w-lg">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowRight className="h-4 w-4 me-1" />
          {t('scanOrders.backToList')}
        </Button>
        <h2 className="text-lg font-black text-slate-900">
          {t(`scanOrders.type.${orderType}`)}
        </h2>
        <p className="text-sm text-slate-500">{t('scanOrders.setupHint')}</p>
        <div>
          <label className="text-xs text-slate-500 block mb-1">{t('scanOrders.employeeCode')}</label>
          <div className="flex gap-2">
            <Input
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              onBlur={verifyEmployee}
              onKeyDown={(e) => e.key === 'Enter' && verifyEmployee()}
              placeholder="EMP-001"
            />
            <Button variant="outline" onClick={verifyEmployee} disabled={loading}>
              {t('scanOrders.verify')}
            </Button>
          </div>
          {employeeName && (
            <p className="text-sm text-emerald-700 mt-1 font-semibold">{employeeName}</p>
          )}
        </div>
        {orderType === 'purchase_return' && (
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('inventory.selectSupplier')}</label>
            <select
              className={ERP_NATIVE_SELECT}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">{t('inventory.selectSupplier')}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_ar}
                </option>
              ))}
            </select>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="w-full bg-violet-700 hover:bg-violet-800 font-bold" onClick={startOrder} disabled={loading}>
          <ScanBarcode className="h-4 w-4 me-1" />
          {t('scanOrders.startScan')}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden"
      style={{ height: 'calc(100dvh - 7.5rem)', minHeight: '520px' }}
    >
      <header className="shrink-0 border-b px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-violet-950 to-violet-800 text-white">
        <div>
          <p className="font-black text-base">{order?.code}</p>
          <p className="text-xs opacity-90">
            {order?.employee_name} · {t(`scanOrders.type.${orderType}`)}
            {order?.supplier_name ? ` · ${order.supplier_name}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onBack}>
            {t('scanOrders.backToList')}
          </Button>
          <Button size="sm" variant="secondary" onClick={saveAndPrint} disabled={loading || !order?.lines?.length}>
            <Printer className="h-4 w-4 me-1" />
            {t('scanOrders.savePrint')}
          </Button>
        </div>
      </header>

      <div className="px-4 py-3 border-b bg-slate-50 flex gap-2 items-center">
        <ScanBarcode className="h-5 w-5 text-violet-700 shrink-0" />
        <Input
          ref={scanRef}
          className="font-mono text-lg h-11"
          placeholder={t('scanOrders.scanPlaceholder')}
          value={scanQ}
          onChange={(e) => setScanQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onScan()}
          disabled={loading}
        />
        <Button onClick={onScan} disabled={loading || !scanQ.trim()}>
          +
        </Button>
      </div>

      {error && <p className="mx-4 mt-2 text-sm text-red-600">{error}</p>}

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 sticky top-0 text-xs">
            <tr>
              <th className="py-2 px-3 text-start">{t('inventory.product')}</th>
              <th className="py-2 px-2">{t('inventory.qty')}</th>
              <th className="py-2 px-2">{t('inventory.salePrice')}</th>
              <th className="py-2 px-2">{t('accounting.amount')}</th>
              <th className="py-2 px-2" />
            </tr>
          </thead>
          <tbody>
            {(order?.lines ?? []).map((ln) => (
              <tr key={ln.id} className="border-t hover:bg-violet-50/40">
                <td className="py-2 px-3">
                  <p className="font-medium">{ln.product_name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {ln.product_code} · {ln.size_name}/{ln.color_name}
                  </p>
                </td>
                <td className="py-2 px-2 text-center font-bold">{ln.quantity}</td>
                <td className="py-2 px-2 text-center tabular-nums">{formatMoneyLocale(ln.unit_sale_price)}</td>
                <td className="py-2 px-2 text-center tabular-nums font-semibold">{formatMoneyLocale(ln.line_total)}</td>
                <td className="py-2 px-2">
                  <button type="button" className="text-red-600 p-1" onClick={() => removeLine(ln)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!order?.lines?.length && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  {t('scanOrders.scanToStart')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="shrink-0 border-t px-4 py-3 flex justify-between items-center bg-slate-50 font-bold">
        <span className="text-slate-600">
          {order?.line_count ?? 0} {t('scanOrders.items')}
        </span>
        <span className="text-lg text-violet-900 tabular-nums">
          {formatMoneyLocale(order?.total_sale_amount ?? '0')}
        </span>
      </footer>
    </div>
  );
}
