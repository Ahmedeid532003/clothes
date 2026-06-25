import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Check, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ApiRequestError } from '@/lib/api/errors';
import {
  cancelPurchaseInvoice,
  deletePurchaseInvoice,
  fetchPurchaseInvoices,
  receivePurchaseInvoice,
  type PurchaseInvoiceDto,
} from '@/lib/api/purchases';
import { PurchaseInvoiceForm } from './PurchaseInvoiceForm';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ErpRowActions } from '@/components/erp/ErpRowActions';
import { consumeOpenDocument } from '@/lib/navigation/openDocument';

type PurchaseInvoicesPageProps = {
  invoiceType: 'purchase' | 'return';
  embedded?: boolean;
};

export function PurchaseInvoicesPage({ invoiceType, embedded = false }: PurchaseInvoicesPageProps) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<PurchaseInvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<PurchaseInvoiceDto | null>(null);
  const [viewInvoice, setViewInvoice] = useState<PurchaseInvoiceDto | null>(null);

  const titleKey =
    invoiceType === 'return' ? 'nav.purchaseReturnInvoices' : 'nav.purchaseInvoices';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchPurchaseInvoices(invoiceType));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [invoiceType]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading) return;
    const pending = consumeOpenDocument();
    if (!pending?.sourceId) return;
    const expectedTab =
      invoiceType === 'return' ? 'purchase-return-invoices' : 'purchase-invoices';
    if (pending.tab !== expectedTab) return;
    const match = rows.find(
      (r) => r.id === pending.sourceId || r.code === pending.sourceCode,
    );
    if (match) setViewInvoice(match);
  }, [loading, rows, invoiceType]);

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      draft: t('purchases.statusDraft'),
      received: t('purchases.statusReceived'),
      cancelled: t('purchases.statusCancelled'),
    };
    return map[s] ?? s;
  };

  const paymentLabel = (m: string) =>
    m === 'cash' ? t('purchases.payCash') : t('purchases.payCredit');

  const returnReasonLabel = (code: string | undefined) =>
    code ? t(`purchases.returnReasons.${code}` as 'purchases.returnReasons.defect') : '—';

  const openNew = () => {
    setEditInvoice(null);
    setFormOpen(true);
  };

  const openEdit = (row: PurchaseInvoiceDto) => {
    setEditInvoice(row);
    setFormOpen(true);
  };

  const onDelete = async (row: PurchaseInvoiceDto) => {
    if (!window.confirm(t('purchases.deleteConfirm'))) return;
    try {
      await deletePurchaseInvoice(row.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Error');
    }
  };

  return (
    <div className={embedded ? 'space-y-3' : 'space-y-4 p-1'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {embedded && invoiceType === 'purchase' ? (
          <p className="text-sm text-slate-600">{t('purchases.invoiceHint')}</p>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t(titleKey)}</h1>
            <p className="text-sm text-slate-500">{t('purchases.breadcrumbPurchases')}</p>
            <p
              className={`text-xs mt-1 max-w-2xl rounded-lg px-3 py-2 ${
                invoiceType === 'return'
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'text-slate-400'
              }`}
            >
              {invoiceType === 'return' ? t('purchases.returnHint') : t('purchases.invoiceHint')}
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh purchase invoices</span>
          </Button>
          <Button type="button" size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 me-1" />
            {invoiceType === 'return' ? t('purchases.newReturn') : t('purchases.newInvoice')}
          </Button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-start">{t('purchases.code')}</th>
              <th className="px-4 py-3 text-start">{t('purchases.supplier')}</th>
              <th className="px-4 py-3 text-start">{t('purchases.season')}</th>
              <th className="px-4 py-3 text-start">{t('purchases.date')}</th>
              {invoiceType === 'return' && (
                <th className="px-4 py-3 text-start">{t('purchases.returnReason')}</th>
              )}
              <th className="px-4 py-3 text-start">{t('purchases.paymentMethod')}</th>
              <th className="px-4 py-3 text-end">{t('purchases.total')}</th>
              <th className="px-4 py-3 text-start">{t('purchases.statusLabel')}</th>
              <th className="px-4 py-3 text-end">{t('purchases.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={invoiceType === 'return' ? 9 : 8} className="px-4 py-8 text-center text-slate-500">
                  {t('purchases.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={invoiceType === 'return' ? 9 : 8} className="px-4 py-8 text-center text-slate-500">
                  {t('purchases.empty')}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-3">{row.supplier_name}</td>
                  <td className="px-4 py-3">{row.season_name}</td>
                  <td className="px-4 py-3">{row.invoice_date}</td>
                  {invoiceType === 'return' && (
                    <td className="px-4 py-3 text-sm">
                      {row.return_reason_label ||
                        returnReasonLabel(row.return_reason)}
                    </td>
                  )}
                  <td className="px-4 py-3">{paymentLabel(row.payment_method || 'credit')}</td>
                  <td className="px-4 py-3 text-end font-semibold tabular-nums">{row.total}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === 'received'
                          ? 'bg-emerald-100 text-emerald-700'
                          : row.status === 'draft'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <ErpRowActions
                      onView={() => setViewInvoice(row)}
                      onEdit={row.status === 'draft' ? () => openEdit(row) : undefined}
                      onDelete={row.status === 'draft' ? () => onDelete(row) : undefined}
                      extra={row.status === 'draft' ? (
                        <>
                          <button
                            type="button"
                            className="erp-row-actions-extra"
                            onClick={() => receivePurchaseInvoice(row.id).then(load).catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Error'))}
                          >
                            <Check className="h-4 w-4" />
                            {t('purchases.receive')}
                          </button>
                          <button
                            type="button"
                            className="erp-row-actions-extra danger"
                            onClick={() => cancelPurchaseInvoice(row.id).then(load)}
                          >
                            <X className="h-4 w-4" />
                            {t('purchases.cancelInvoice')}
                          </button>
                        </>
                      ) : null}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PurchaseInvoiceForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditInvoice(null);
        }}
        onSaved={load}
        invoiceType={invoiceType}
        editInvoice={editInvoice}
      />

      <Sheet open={!!viewInvoice} onOpenChange={(v) => !v && setViewInvoice(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {viewInvoice?.code} — {t('purchases.view')}
            </SheetTitle>
          </SheetHeader>
          {viewInvoice && (
            <div className="space-y-3 py-4 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3">
                <p>
                  <strong>{t('purchases.supplier')}:</strong> {viewInvoice.supplier_name}
                </p>
                <p>
                  <strong>{t('purchases.date')}:</strong> {viewInvoice.invoice_date}
                </p>
                <p>
                  <strong>{t('inventory.warehouse')}:</strong> {viewInvoice.warehouse_name}
                </p>
                {viewInvoice.invoice_type === 'return' && (
                  <>
                    <p>
                      <strong>{t('purchases.returnReason')}:</strong>{' '}
                      {viewInvoice.return_reason_label ||
                        returnReasonLabel(viewInvoice.return_reason)}
                    </p>
                    {viewInvoice.source_invoice_code && (
                      <p>
                        <strong>{t('purchases.sourceInvoice')}:</strong>{' '}
                        {viewInvoice.source_invoice_code}
                      </p>
                    )}
                  </>
                )}
                <p>
                  <strong>{t('purchases.paymentMethod')}:</strong>{' '}
                  {paymentLabel(viewInvoice.payment_method || 'credit')}
                </p>
                {viewInvoice.notes && (
                  <p className="col-span-2">
                    <strong>{t('purchases.notes')}:</strong> {viewInvoice.notes}
                  </p>
                )}
                <p>
                  <strong>{t('purchases.subtotal')}:</strong> {viewInvoice.subtotal}
                </p>
                <p>
                  <strong>{t('purchases.taxTotal')}:</strong> {viewInvoice.tax_amount || '0'}
                </p>
                <p className="col-span-2 text-lg font-bold text-blue-800">
                  {t('purchases.total')}: {viewInvoice.total}
                </p>
              </div>
              <table className="w-full border text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-2 text-start">{t('inventory.product')}</th>
                    <th className="p-2">{t('inventory.size')}</th>
                    <th className="p-2">{t('inventory.color')}</th>
                    <th className="p-2">{t('inventory.qty')}</th>
                    <th className="p-2">{t('purchases.form.columns.price')}</th>
                    <th className="p-2">{t('purchases.form.columns.discPercent')}</th>
                    <th className="p-2">{t('purchases.form.columns.taxPercent')}</th>
                    <th className="p-2">{t('purchases.form.columns.netTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {viewInvoice.lines.map((ln) => (
                    <tr key={ln.id} className="border-t">
                      <td className="p-2">{ln.product_name}</td>
                      <td className="p-2 text-center">{ln.size_name}</td>
                      <td className="p-2 text-center">{ln.color_name}</td>
                      <td className="p-2 text-center">{ln.quantity}</td>
                      <td className="p-2 text-center">{ln.unit_cost}</td>
                      <td className="p-2 text-center">{ln.discount_percent}</td>
                      <td className="p-2 text-center">{ln.tax_percent || '0'}</td>
                      <td className="p-2 text-end font-medium">{ln.line_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
