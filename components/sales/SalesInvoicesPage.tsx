import React, { useCallback, useEffect, useState } from 'react';
import { Barcode, FileText, Plus, Printer, QrCode, RefreshCw, Search, Store, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { salesInvoicesApi, type SalesInvoiceDto } from '@/lib/api/sales';
import { searchPosProducts, type PosCartLine, type PosProductHit } from '@/lib/api/pos';
import { customersApi } from '@/lib/api/customers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSectionHeader, PageToolbar, fmtMoney } from '@/components/accounting/AccountingUi';
import { consumeOpenDocument } from '@/lib/navigation/openDocument';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LoadFromOrderButton } from '@/components/orders/LoadFromOrderButton';
import { scanOrdersApi, type ScanOrderDto } from '@/lib/api/scanOrders';

const DEFAULT_VAT_PERCENT = '14';

function paymentLabel(method: string) {
  const labels: Record<string, string> = {
    cash: 'نقدي',
    card: 'بطاقة',
    wallet: 'محفظة',
    credit: 'آجل',
    installment: 'تقسيط',
    reserved: 'حجز',
    mixed: 'مختلط',
  };
  return labels[method] ?? method;
}

export function SalesInvoicesPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<SalesInvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SalesInvoiceDto | null>(null);
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [customer, setCustomer] = useState('');
  const [query, setQuery] = useState('');
  const [barcode, setBarcode] = useState('');
  const [hits, setHits] = useState<PosProductHit[]>([]);
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [discount, setDiscount] = useState('0');
  const [taxPercent, setTaxPercent] = useState('0');
  const [isTaxInvoice, setIsTaxInvoice] = useState(false);
  const [taxNumber, setTaxNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [payments, setPayments] = useState<Array<{ payment_method: string; amount: string; reference: string }>>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadedOrderId, setLoadedOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sales, cust] = await Promise.all([salesInvoicesApi.list(), customersApi.list()]);
      setRows(sales);
      setCustomers(cust.map((c) => ({ id: c.id, name: c.name_ar })));
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
    if (!pending?.sourceId || pending.tab !== 'sales-invoices') return;
    const match = rows.find((r) => r.id === pending.sourceId || r.code === pending.sourceCode);
    if (match) {
      setActive(match);
      setOpen(true);
    }
  }, [loading, rows]);

  const printInvoice = (row: SalesInvoiceDto) => {
    const html = `
      <html dir="rtl"><head><title>${row.code}</title>
      <style>body{font-family:Arial;padding:16px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:right}.total{font-size:18px;font-weight:700}</style>
      </head><body>
      <h2>فاتورة مبيعات ${row.code}</h2>
      <p>العميل: ${row.customer_name || '-'}</p>
      <p>الفرع: ${row.branch_name || '-'}</p>
      <table><thead><tr><th>الصنف</th><th>كمية</th><th>سعر</th><th>الإجمالي</th></tr></thead>
      <tbody>${row.lines
        .map((l) => `<tr><td>${l.product_name}</td><td>${l.quantity}</td><td>${l.unit_price}</td><td>${l.line_total}</td></tr>`)
        .join('')}</tbody></table>
      <p>الضريبة: ${row.tax_amount}</p>
      <p class="total">الإجمالي: ${row.total}</p>
      <p>QR: ${row.qr_payload || row.code}</p>
      </body></html>`;
    const w = window.open('', '_blank', 'width=420,height=700');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const subtotal = cart.reduce((sum, line) => {
    const qty = Number(line.quantity) || 0;
    const price = Number(line.unit_price) || 0;
    const disc = Number(line.discount_percent) || 0;
    return sum + qty * price * (1 - disc / 100);
  }, 0);
  const taxable = Math.max(subtotal - Number(discount || 0), 0);
  const taxAmount = taxable * (Number(taxPercent || 0) / 100);
  const grandTotal = taxable + taxAmount;
  const paymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paymentRemaining = Math.max(grandTotal - paymentsTotal, 0);

  const resetForm = () => {
    setCustomer('');
    setQuery('');
    setBarcode('');
    setHits([]);
    setCart([]);
    setDiscount('0');
    setTaxPercent('0');
    setIsTaxInvoice(false);
    setTaxNumber('');
    setPaymentMethod('cash');
    setPayments([]);
    setNotes('');
    setError(null);
    setLoadedOrderId(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const toggleTaxInvoice = (checked: boolean) => {
    setIsTaxInvoice(checked);
    if (checked && Number(taxPercent || 0) <= 0) {
      setTaxPercent(DEFAULT_VAT_PERCENT);
    }
    if (!checked) {
      setTaxNumber('');
    }
  };

  const runSearch = async (mode: 'text' | 'barcode') => {
    const value = mode === 'barcode' ? barcode.trim() : query.trim();
    if (!value) return;
    try {
      const result = await searchPosProducts(mode === 'barcode' ? { barcode: value } : { q: value });
      setHits(result.products);
      if (!result.products.length && !result.composites.length) {
        setError(t('pos.notFound'));
      } else {
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const loadFromScanOrder = (order: ScanOrderDto) => {
    for (const ln of order.lines ?? []) {
      const key = `v:${ln.variant_id}`;
      const label = `${ln.product_name} — ${ln.size_name}/${ln.color_name}`;
      setCart((prev) => {
        if (prev.some((x) => x.key === key)) {
          return prev.map((x) =>
            x.key === key
              ? { ...x, quantity: String((Number(x.quantity) || 0) + Number(ln.quantity)) }
              : x,
          );
        }
        return [
          ...prev,
          {
            key,
            kind: 'variant' as const,
            variant: ln.variant_id,
            label,
            quantity: ln.quantity,
            unit_price: ln.unit_sale_price,
            discount_percent: '0',
            available: '999',
          },
        ];
      });
    }
    setLoadedOrderId(order.id);
    setNotes((prev) => {
      const tag = `${t('scanOrders.loaded')} ${order.code} — ${order.employee_name}`;
      return prev ? `${prev}\n${tag}` : tag;
    });
    setError(null);
  };

  const addVariant = (product: PosProductHit, variant: PosProductHit['variants'][number]) => {
    const key = `v:${variant.variant_id}`;
    const label = `${product.name_ar} — ${variant.size_name}/${variant.color_name}`;
    setCart((prev) =>
      prev.some((line) => line.key === key)
        ? prev.map((line) =>
            line.key === key
              ? { ...line, quantity: String((Number(line.quantity) || 0) + 1) }
              : line,
          )
        : [
            ...prev,
            {
              key,
              kind: 'variant',
              variant: variant.variant_id,
              label,
              quantity: '1',
              unit_price: variant.unit_price,
              discount_percent: '0',
              available: variant.quantity_available,
            },
          ],
    );
    setHits([]);
    setQuery('');
    setBarcode('');
  };

  const addPayment = () => {
    setPayments([
      ...payments,
      { payment_method: paymentMethod, amount: paymentRemaining.toFixed(2), reference: '' },
    ]);
  };

  const saveInvoice = async () => {
    setError(null);
    if (isTaxInvoice && !taxNumber.trim()) {
      setError('الفاتورة الضريبية تحتاج الرقم الضريبي للشركة.');
      return;
    }
    try {
      const normalizedPayments = payments.map((p) => ({
        ...p,
        amount: (Number(p.amount) || 0).toFixed(2),
      }));
      await salesInvoicesApi.create({
        customer: customer || undefined,
        payment_method: normalizedPayments.length > 1 ? 'mixed' : (normalizedPayments[0]?.payment_method || paymentMethod),
        payments: normalizedPayments.length ? normalizedPayments : undefined,
        discount_amount: discount || '0',
        tax_percent: taxPercent || '0',
        is_tax_invoice: isTaxInvoice,
        tax_registration_number: taxNumber,
        notes,
        lines: cart.map((line) => ({
          variant: line.variant,
          composite: line.composite,
          quantity: line.quantity,
          unit_price: line.unit_price,
          discount_percent: line.discount_percent,
        })),
      });
      if (loadedOrderId) {
        try {
          await scanOrdersApi.markLoaded(loadedOrderId, 'sales-invoice');
        } catch {
          /* non-blocking */
        }
      }
      setOpen(false);
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<FileText className="h-6 w-6" />}
        title={t('nav.salesInvoices')}
        description={t('sales.invoicesDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 me-1" />
              {t('sales.newInvoice')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'pos' }))}>
              <Store className="h-4 w-4 me-1" />
              {t('sales.openPos')}
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading} aria-label="Refresh sales invoices">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </PageToolbar>
        }
      />

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[980px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
              <th className="px-3 py-2 text-start">{t('sales.customer')}</th>
              <th className="px-3 py-2 text-start">{t('purchases.date')}</th>
              <th className="px-3 py-2 text-start">{t('sales.paymentMethod')}</th>
              <th className="px-3 py-2 text-end">{t('sales.tax')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.amount')}</th>
              <th className="px-3 py-2 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center">{t('inventory.loading')}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500">{t('sales.noInvoices')}</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono">{row.code}</td>
                  <td className="px-3 py-2">{row.customer_name || '—'}</td>
                  <td className="px-3 py-2">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{paymentLabel(row.payment_method)}</td>
                  <td className="px-3 py-2 text-end">{fmtMoney(row.tax_amount)}</td>
                  <td className="px-3 py-2 text-end font-semibold">{fmtMoney(row.total)}</td>
                  <td className="px-3 py-2 text-end">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" aria-label={`Show QR code: ${row.code}`} onClick={() => setActive(row)}>
                        <QrCode className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" aria-label={`${t('inventory.print')}: ${row.code}`} onClick={() => printInvoice(row)}>
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {active && (
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">{active.code}</h3>
            <Button variant="ghost" size="sm" onClick={() => setActive(null)}>×</Button>
          </div>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-xs text-white">
            {active.qr_payload || active.code}
          </pre>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-4xl">
          <SheetHeader>
            <SheetTitle>{t('sales.newInvoice')}</SheetTitle>
            <LoadFromOrderButton onLoaded={loadFromScanOrder} expectedType="sale" className="mt-2" />
          </SheetHeader>
          <div className="grid gap-4 py-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  className="rounded-md border px-3 py-2 text-sm"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                >
                  <option value="">{t('sales.walkIn')}</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Input placeholder={t('accounting.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex gap-2">
                  <Input
                    placeholder={t('pos.barcodePlaceholder')}
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runSearch('barcode')}
                  />
                  <Button type="button" variant="outline" onClick={() => runSearch('barcode')}>
                    <Barcode className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('pos.searchPlaceholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runSearch('text')}
                  />
                  <Button type="button" variant="outline" onClick={() => runSearch('text')}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {hits.length > 0 && (
                <div className="max-h-64 overflow-auto rounded-xl border bg-white">
                  {hits.map((product) => product.variants.map((variant) => (
                    <button
                      key={variant.variant_id}
                      type="button"
                      className="flex w-full items-center justify-between border-b px-3 py-2 text-sm hover:bg-blue-50"
                      onClick={() => addVariant(product, variant)}
                    >
                      <span>
                        {product.name_ar} — {variant.size_name}/{variant.color_name}
                        {product.season_name ? <span className="ms-2 text-xs text-slate-400">{product.season_name}</span> : null}
                      </span>
                      <span className="text-slate-500">
                        {fmtMoney(variant.unit_price)} · {t('pos.stock')}: {variant.quantity_available}
                      </span>
                    </button>
                  )))}
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-start">{t('inventory.product')}</th>
                      <th className="px-3 py-2 text-end">{t('sales.returnQty')}</th>
                      <th className="px-3 py-2 text-end">{t('purchases.unitPrice')}</th>
                      <th className="px-3 py-2 text-end">{t('sales.discount')}</th>
                      <th className="px-3 py-2 text-end">{t('accounting.amount')}</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {cart.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-500">{t('pos.cartEmpty')}</td></tr>
                    ) : cart.map((line) => {
                      const lineTotal = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0) * (1 - (Number(line.discount_percent) || 0) / 100);
                      return (
                        <tr key={line.key} className="border-t">
                          <td className="px-3 py-2">{line.label}</td>
                          <td className="px-3 py-2"><Input className="h-8 text-end" value={line.quantity} onChange={(e) => setCart(cart.map((x) => x.key === line.key ? { ...x, quantity: e.target.value } : x))} /></td>
                          <td className="px-3 py-2"><Input className="h-8 text-end" value={line.unit_price} onChange={(e) => setCart(cart.map((x) => x.key === line.key ? { ...x, unit_price: e.target.value } : x))} /></td>
                          <td className="px-3 py-2"><Input className="h-8 text-end" value={line.discount_percent} onChange={(e) => setCart(cart.map((x) => x.key === line.key ? { ...x, discount_percent: e.target.value } : x))} /></td>
                          <td className="px-3 py-2 text-end font-semibold">{fmtMoney(lineTotal)}</td>
                          <td className="px-3 py-2 text-end">
                            <Button size="icon" variant="ghost" aria-label={`${t('inventory.delete')}: ${line.label}`} onClick={() => setCart(cart.filter((x) => x.key !== line.key))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
              <Input placeholder={t('sales.discount')} value={discount} onChange={(e) => setDiscount(e.target.value)} />
              <Input
                placeholder={t('sales.taxPercent')}
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                disabled={isTaxInvoice}
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isTaxInvoice} onChange={(e) => toggleTaxInvoice(e.target.checked)} />
                {t('nav.taxInvoices')}
              </label>
              <Input placeholder={t('sales.taxNumber')} value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
              <div className="rounded-lg bg-white p-3 text-sm">
                <p>{t('purchases.subtotal')}: <b>{fmtMoney(subtotal)}</b></p>
                <p>{t('sales.discount')}: <b>{fmtMoney(discount || 0)}</b></p>
                <p>{t('sales.tax')}: <b>{fmtMoney(taxAmount)}</b></p>
                <p className="mt-2 text-xl font-bold">{fmtMoney(grandTotal)}</p>
              </div>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">{t('pos.payCash')}</option>
                <option value="card">{t('pos.payCard')}</option>
                <option value="wallet">{t('pos.payWallet')}</option>
                <option value="credit">{t('pos.payCredit')}</option>
                <option value="installment">{t('pos.payInstallment')}</option>
                <option value="reserved">{t('pos.payReserved')}</option>
              </select>
              <Button type="button" variant="outline" onClick={addPayment} disabled={paymentRemaining <= 0 || cart.length === 0}>
                {t('pos.addPayment')} ({fmtMoney(paymentRemaining)})
              </Button>
              {payments.map((p, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_100px_32px] gap-1">
                  <select className="rounded-md border px-2 py-1 text-xs" value={p.payment_method} onChange={(e) => setPayments(payments.map((x, i) => i === idx ? { ...x, payment_method: e.target.value } : x))}>
                    <option value="cash">{t('pos.payCash')}</option>
                    <option value="card">{t('pos.payCard')}</option>
                    <option value="wallet">{t('pos.payWallet')}</option>
                    <option value="credit">{t('pos.payCredit')}</option>
                    <option value="installment">{t('pos.payInstallment')}</option>
                  </select>
                  <Input className="h-8" value={p.amount} onChange={(e) => setPayments(payments.map((x, i) => i === idx ? { ...x, amount: e.target.value } : x))} />
                  <Button size="icon" variant="ghost" aria-label={t('inventory.delete')} onClick={() => setPayments(payments.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('inventory.cancel')}</Button>
            <Button onClick={saveInvoice} disabled={!cart.length || (payments.length > 0 && Math.abs(paymentsTotal - grandTotal) > 0.01)}>
              {t('inventory.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

