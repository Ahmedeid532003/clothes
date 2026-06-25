import React, { useCallback, useEffect, useState } from 'react';
import { Check, FilePlus2, RefreshCw, Search } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  customerReservationsApi,
  salesQuotationsApi,
  type CustomerReservationDto,
  type DraftSalesLineDto,
  type SalesQuotationDto,
} from '@/lib/api/sales';
import { searchPosProducts, type PosCartLine, type PosProductHit } from '@/lib/api/pos';
import { customersApi } from '@/lib/api/customers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSectionHeader, PageToolbar, fmtMoney } from '@/components/accounting/AccountingUi';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type Mode = 'quotation' | 'reservation';

type Row = (SalesQuotationDto | CustomerReservationDto) & { lines: DraftSalesLineDto[] };

function lineLabel(line: PosCartLine) {
  return line.label;
}

export function DraftSalesDocumentsPage({ mode }: { mode: Mode }) {
  const { t } = useLanguage();
  const isReservation = mode === 'reservation';
  const [rows, setRows] = useState<Row[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState('');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<PosProductHit[]>([]);
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [discount, setDiscount] = useState('0');
  const [taxPercent, setTaxPercent] = useState('0');
  const [deposit, setDeposit] = useState('0');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docs, cust] = await Promise.all([
        isReservation ? customerReservationsApi.list() : salesQuotationsApi.list(),
        customersApi.list(),
      ]);
      setRows(docs as Row[]);
      setCustomers(cust.map((c) => ({ id: c.id, name: c.name_ar })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [isReservation]);

  useEffect(() => {
    load();
  }, [load]);

  const search = async () => {
    if (!query.trim()) return;
    const result = await searchPosProducts({ q: query.trim() });
    setHits(result.products);
  };

  const addVariant = (product: PosProductHit, v: PosProductHit['variants'][number]) => {
    const key = `v:${v.variant_id}`;
    setCart((prev) =>
      prev.some((x) => x.key === key)
        ? prev.map((x) => x.key === key ? { ...x, quantity: String(Number(x.quantity) + 1) } : x)
        : [
            ...prev,
            {
              key,
              kind: 'variant',
              variant: v.variant_id,
              label: `${product.name_ar} — ${v.size_name}/${v.color_name}`,
              quantity: '1',
              unit_price: v.unit_price,
              discount_percent: '0',
              available: v.quantity_available,
            },
          ],
    );
    setHits([]);
    setQuery('');
  };

  const total = cart.reduce((sum, line) => {
    const qty = Number(line.quantity) || 0;
    const price = Number(line.unit_price) || 0;
    const disc = Number(line.discount_percent) || 0;
    return sum + qty * price * (1 - disc / 100);
  }, 0);

  const openCreate = () => {
    setCustomer(customers[0]?.id ?? '');
    setCart([]);
    setDiscount('0');
    setTaxPercent('0');
    setDeposit('0');
    setNotes('');
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      customer: customer || undefined,
      discount_amount: discount || '0',
      tax_percent: isReservation ? '0' : taxPercent || '0',
      deposit_amount: deposit || '0',
      deposit_method: 'cash',
      notes,
      lines: cart.map((line) => ({
        variant: line.variant,
        composite: line.composite,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percent: line.discount_percent,
      })),
    };
    try {
      if (isReservation) await customerReservationsApi.create(payload);
      else await salesQuotationsApi.create(payload);
      setOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const convert = async (id: string) => {
    if (isReservation) await customerReservationsApi.convert(id);
    else await salesQuotationsApi.convert(id);
    load();
  };

  const title = isReservation ? t('nav.customerReservations') : t('nav.salesQuotations');
  const desc = isReservation ? t('sales.reservationsDesc') : t('sales.quotationsDesc');

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<FilePlus2 className="h-6 w-6" />}
        title={title}
        description={desc}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" onClick={openCreate}>
              {isReservation ? t('sales.addReservation') : t('sales.addQuotation')}
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </PageToolbar>
        }
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[850px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
              <th className="px-3 py-2 text-start">{t('sales.customer')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.status')}</th>
              {isReservation && <th className="px-3 py-2 text-end">{t('sales.deposit')}</th>}
              <th className="px-3 py-2 text-end">{t('accounting.amount')}</th>
              <th className="px-3 py-2 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2 font-mono">{row.code}</td>
                <td className="px-3 py-2">{row.customer_name || '—'}</td>
                <td className="px-3 py-2">{row.status}</td>
                {isReservation && (
                  <td className="px-3 py-2 text-end">{fmtMoney((row as CustomerReservationDto).deposit_amount)}</td>
                )}
                <td className="px-3 py-2 text-end font-semibold">{fmtMoney(row.total)}</td>
                <td className="px-3 py-2 text-end">
                  {row.status !== 'converted' && (
                    <Button size="sm" variant="outline" onClick={() => convert(row.id)}>
                      <Check className="h-3.5 w-3.5 me-1" />
                      {t('sales.convertToInvoice')}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-2xl">
          <SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <select
              className="w-full rounded-md border px-2 py-2 text-sm"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            >
              <option value="">{t('sales.walkIn')}</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-2">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('pos.searchPlaceholder')} />
              <Button type="button" onClick={search}><Search className="h-4 w-4" /></Button>
            </div>
            {hits.length > 0 && (
              <div className="rounded-lg border bg-white divide-y">
                {hits.map((p) => p.variants.map((v) => (
                  <button
                    key={v.variant_id}
                    type="button"
                    className="block w-full px-3 py-2 text-start hover:bg-slate-50"
                    onClick={() => addVariant(p, v)}
                  >
                    {p.name_ar} — {v.size_name}/{v.color_name}
                    <span className="float-end">{fmtMoney(v.unit_price)}</span>
                  </button>
                )))}
              </div>
            )}
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {cart.map((line) => (
                    <tr key={line.key} className="border-b">
                      <td className="px-3 py-2">{lineLabel(line)}</td>
                      <td className="px-3 py-2 w-24">
                        <Input value={line.quantity} onChange={(e) => setCart((prev) => prev.map((x) => x.key === line.key ? { ...x, quantity: e.target.value } : x))} />
                      </td>
                      <td className="px-3 py-2 w-28">
                        <Input value={line.discount_percent} onChange={(e) => setCart((prev) => prev.map((x) => x.key === line.key ? { ...x, discount_percent: e.target.value } : x))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder={t('sales.discount')} value={discount} onChange={(e) => setDiscount(e.target.value)} />
              {!isReservation && <Input placeholder={t('sales.taxPercent')} value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />}
              {isReservation && <Input placeholder={t('sales.deposit')} value={deposit} onChange={(e) => setDeposit(e.target.value)} />}
            </div>
            <Input placeholder={t('accounting.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <p className="text-end text-lg font-bold">{fmtMoney(Math.max(total - Number(discount || 0), 0))}</p>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('inventory.cancel')}</Button>
            <Button onClick={save} disabled={!cart.length || (isReservation && !customer)}>{t('inventory.save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function SalesQuotationsPage() {
  return <DraftSalesDocumentsPage mode="quotation" />;
}

export function CustomerReservationsPage() {
  return <DraftSalesDocumentsPage mode="reservation" />;
}

