import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Undo2, Plus, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  salesInvoicesApi,
  salesReturnsApi,
  type SaleReturnDto,
  type SalesInvoiceDto,
} from '@/lib/api/sales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSectionHeader, PageToolbar, fmtMoney } from '@/components/accounting/AccountingUi';
import { consumeOpenDocument } from '@/lib/navigation/openDocument';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function SalesReturnsPage() {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<SalesInvoiceDto[]>([]);
  const [returnsRows, setReturnsRows] = useState<SaleReturnDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saleId, setSaleId] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [downPaymentRefund, setDownPaymentRefund] = useState('');
  const [returnInterest, setReturnInterest] = useState('');
  const [highlightId, setHighlightId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await Promise.all([salesInvoicesApi.list(), salesReturnsApi.list()]);
      setInvoices(s);
      setReturnsRows(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading) return;
    const pending = consumeOpenDocument();
    if (!pending?.sourceId || pending.tab !== 'sales-returns') return;
    const match = returnsRows.find(
      (r) => r.id === pending.sourceId || r.code === pending.sourceCode,
    );
    if (match) setHighlightId(match.id);
  }, [loading, returnsRows]);

  const activeSale = useMemo(
    () => invoices.find((s) => s.id === saleId) ?? invoices[0],
    [invoices, saleId],
  );

  const openCreate = () => {
    const first = invoices[0];
    setSaleId(first?.id ?? '');
    setQuantities({});
    setReason('');
    setRefundMethod('cash');
    setOpen(true);
  };

  const saveReturn = async () => {
    const sale = invoices.find((s) => s.id === saleId) ?? activeSale;
    if (!sale) return;
    const lines = sale.lines
      .map((line) => ({
        sale_line: line.id,
        quantity: quantities[line.id],
      }))
      .filter((line) => Number(line.quantity || 0) > 0);
    if (!lines.length) {
      setError(t('sales.returnQtyRequired'));
      return;
    }
    try {
      await salesReturnsApi.create({
        sale: sale.id,
        refund_method: refundMethod,
        reason,
        down_payment_refund: downPaymentRefund || undefined,
        return_interest: returnInterest || undefined,
        lines,
      });
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<Undo2 className="h-6 w-6" />}
        title={t('nav.salesReturns')}
        description={t('sales.returnsDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" onClick={openCreate} disabled={!invoices.length}>
              <Plus className="h-4 w-4 me-1" />
              {t('sales.addReturn')}
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </PageToolbar>
        }
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
              <th className="px-3 py-2 text-start">{t('sales.sourceInvoice')}</th>
              <th className="px-3 py-2 text-start">{t('sales.customer')}</th>
              <th className="px-3 py-2 text-start">{t('sales.refundMethod')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center">{t('inventory.loading')}</td></tr>
            ) : returnsRows.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-500">{t('sales.noReturns')}</td></tr>
            ) : (
              returnsRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t ${highlightId === row.id ? 'bg-amber-50' : ''}`}
                >
                  <td className="px-3 py-2 font-mono">{row.code}</td>
                  <td className="px-3 py-2">{row.sale_code}</td>
                  <td className="px-3 py-2">{row.customer_name || '—'}</td>
                  <td className="px-3 py-2">{row.refund_method}</td>
                  <td className="px-3 py-2 text-end font-semibold">{fmtMoney(row.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{t('sales.addReturn')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <select
              className="w-full rounded-md border px-2 py-2 text-sm"
              value={saleId || activeSale?.id || ''}
              onChange={(e) => setSaleId(e.target.value)}
            >
              {invoices.map((sale) => (
                <option key={sale.id} value={sale.id}>
                  {sale.code} — {sale.customer_name || t('sales.walkIn')} — {fmtMoney(sale.total)}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border px-2 py-2 text-sm"
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value)}
            >
              <option value="cash">{t('sales.refundCash')}</option>
              <option value="customer_account">{t('sales.refundCustomerAccount')}</option>
            </select>
            <Input
              placeholder={t('sales.returnReason')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={`${t('crm.downPayment')} (${t('crm.customerStatement.downRefundHint')})`}
                value={downPaymentRefund}
                onChange={(e) => setDownPaymentRefund(e.target.value)}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={t('crm.customerStatement.returnsInterest')}
                value={returnInterest}
                onChange={(e) => setReturnInterest(e.target.value)}
              />
            </div>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-start">{t('inventory.product')}</th>
                    <th className="px-3 py-2 text-end">{t('sales.soldQty')}</th>
                    <th className="px-3 py-2 text-end">{t('sales.returnQty')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeSale?.lines ?? []).map((line) => (
                    <tr key={line.id} className="border-t">
                      <td className="px-3 py-2">
                        {line.product_name}
                        <div className="text-xs text-slate-500">{line.size_name} {line.color_name}</div>
                      </td>
                      <td className="px-3 py-2 text-end">{line.quantity}</td>
                      <td className="px-3 py-2 text-end">
                        <Input
                          className="ms-auto w-24"
                          type="number"
                          min="0"
                          max={line.quantity}
                          value={quantities[line.id] ?? ''}
                          onChange={(e) =>
                            setQuantities((q) => ({ ...q, [line.id]: e.target.value }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('inventory.cancel')}</Button>
            <Button onClick={saveReturn}>{t('inventory.save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

