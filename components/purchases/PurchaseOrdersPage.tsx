import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  MessageCircle,
  PackageCheck,
  Printer,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ApiRequestError } from '@/lib/api/errors';
import {
  fetchPurchaseOrders,
  receivePurchaseOrderLines,
  type PurchaseOrderDto,
  type PurchaseOrderLineDto,
} from '@/lib/api/purchaseOrders';
import { fetchSuppliers } from '@/lib/api/inventory';
import {
  printPurchaseOrder,
  type PurchaseOrderPrintLabels,
} from '@/components/purchases/PurchaseOrderPrint';
import { emitPurchasesRefresh } from '@/components/purchases/PurchasesHub';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type StatusTab = '' | 'sent' | 'partial' | 'received';

function statusTone(status: string) {
  if (status === 'received') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'partial') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (status === 'sent') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (status === 'cancelled') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function lineStatusBadge(ln: PurchaseOrderLineDto, t: (k: string) => string) {
  if (ln.is_fully_received) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
        <CheckCircle2 className="h-3 w-3" />
        {t('purchases.orders.received')}
      </span>
    );
  }
  if (Number(ln.quantity_received) > 0) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        {t('purchases.orders.partial')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      <Clock className="h-3 w-3" />
      {t('purchases.orders.pending')}
    </span>
  );
}

type Props = { embedded?: boolean };

export function PurchaseOrdersPage({ embedded = false }: Props) {
  const { t, locale } = useLanguage();
  const [rows, setRows] = useState<PurchaseOrderDto[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<PurchaseOrderDto | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [receiving, setReceiving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orders, sups] = await Promise.all([
        fetchPurchaseOrders({
          status: statusTab || undefined,
          supplier: supplierFilter || undefined,
        }),
        fetchSuppliers(),
      ]);
      setRows(orders);
      setSuppliers(sups as Array<{ id: string; name_ar: string }>);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('purchases.orders.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [statusTab, supplierFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.supplier_name.toLowerCase().includes(q) ||
        r.season_name.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      sent: rows.filter((r) => r.status === 'sent').length,
      partial: rows.filter((r) => r.status === 'partial').length,
      received: rows.filter((r) => r.status === 'received').length,
    }),
    [rows],
  );

  const printLabels: PurchaseOrderPrintLabels = useMemo(
    () => ({
      title: t('purchases.reorder.poTitle'),
      orderCode: t('purchases.reorder.orderCode'),
      supplier: t('purchases.columns.supplier'),
      season: t('purchases.columns.season'),
      date: t('purchases.columns.date'),
      model: t('purchases.reorder.model'),
      description: t('purchases.reorder.description'),
      brand: t('purchases.reorder.brand'),
      qty: t('purchases.reorder.orderQty'),
      price: t('purchases.reorder.unitPrice'),
      notes: t('purchases.form.notes'),
      footer: t('inventory.empty'),
    }),
    [t],
  );

  const openReceive = (order: PurchaseOrderDto) => {
    setDetail(order);
    const next: Record<string, string> = {};
    for (const ln of order.lines) {
      if (!ln.is_fully_received) {
        next[ln.id] = '';
      }
    }
    setReceiveQty(next);
  };

  const onReceive = async () => {
    if (!detail) return;
    const lines = detail.lines
      .map((ln) => ({
        line_id: ln.id,
        quantity_received: receiveQty[ln.id]?.trim() || '0',
      }))
      .filter((ln) => Number(ln.quantity_received) > 0);
    if (!lines.length) {
      alert(t('purchases.orders.enterReceiveQty'));
      return;
    }
    setReceiving(true);
    try {
      const updated = await receivePurchaseOrderLines(detail.id, lines);
      setDetail(updated);
      await load();
      emitPurchasesRefresh();
    } catch (e) {
      alert(e instanceof ApiRequestError ? e.message : t('purchases.orders.receiveFailed'));
    } finally {
      setReceiving(false);
    }
  };

  const tabs: Array<{ key: StatusTab; label: string; count: number }> = [
    { key: '', label: t('suppliers.filterAll'), count: counts.all },
    { key: 'sent', label: t('purchases.orders.statusSent'), count: counts.sent },
    { key: 'partial', label: t('purchases.orders.statusPartial'), count: counts.partial },
    { key: 'received', label: t('purchases.orders.statusReceived'), count: counts.received },
  ];

  const statusPills = (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key || 'all'}
          type="button"
          onClick={() => setStatusTab(tab.key)}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            statusTab === tab.key
              ? 'border-violet-300 bg-violet-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
          )}
        >
          {tab.label}
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
              statusTab === tab.key ? 'bg-white/20' : 'bg-slate-100',
            )}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className={embedded ? 'space-y-3' : 'space-y-4 p-1'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {embedded ? (
          <p className="text-sm text-slate-600">{t('purchases.orders.hint')}</p>
        ) : (
          <div>
            <h1 className="text-2xl font-bold">{t('nav.purchaseOrders')}</h1>
            <p className="text-sm text-slate-500">{t('purchases.orders.hint')}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          {embedded ? statusPills : null}
          <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {!embedded ? statusPills : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="grid gap-3 rounded-xl border bg-slate-50/80 p-3 sm:grid-cols-2">
        <Input
          className="bg-white"
          placeholder={t('purchases.orders.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-8 rounded-lg border border-input bg-white px-3 text-sm"
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
        >
          <option value="">{t('suppliers.filterAll')}</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name_ar}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {loading ? (
          <p className="p-12 text-center text-slate-500">{t('inventory.loading')}</p>
        ) : !filtered.length ? (
          <div className="p-12 text-center">
            <Truck className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-slate-600">{t('purchases.orders.empty')}</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((row) => {
              const isExpanded = expanded[row.id];
              return (
                <div key={row.id}>
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50/60">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-start"
                      onClick={() => setExpanded((p) => ({ ...p, [row.id]: !p[row.id] }))}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-slate-500">{row.code}</span>
                          <span
                            className={cn(
                              'rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                              statusTone(row.status),
                            )}
                          >
                            {row.status_label}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-900">{row.supplier_name}</p>
                        <p className="text-xs text-slate-500">
                          {row.season_name} · {row.created_at.slice(0, 10)} · {row.totals.line_count}{' '}
                          {t('purchases.reorder.itemsCount')}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-4 text-sm tabular-nums text-slate-600">
                      <span>
                        {t('purchases.reorder.orderQty')}: <strong>{row.totals.quantity_ordered}</strong>
                      </span>
                      <span>
                        {t('purchases.orders.received')}: <strong>{row.totals.quantity_received}</strong>
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openReceive(row)} title={t('purchases.orders.receiveNow')}>
                        <PackageCheck className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => printPurchaseOrder(row, printLabels, locale)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      {row.whatsapp_url ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(row.whatsapp_url!, '_blank', 'noopener,noreferrer')}
                        >
                          <MessageCircle className="h-4 w-4 text-emerald-600" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="border-t bg-slate-50/50 px-4 py-3">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-slate-500">
                          <tr>
                            <th className="py-2 text-start">{t('purchases.reorder.model')}</th>
                            <th className="py-2 text-start">{t('purchases.reorder.description')}</th>
                            <th className="py-2 text-center">{t('purchases.reorder.orderQty')}</th>
                            <th className="py-2 text-center">{t('purchases.orders.received')}</th>
                            <th className="py-2 text-center">{t('purchases.orders.pending')}</th>
                            <th className="py-2 text-end">{t('purchases.columns.status')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.lines.map((ln) => (
                            <tr key={ln.id} className="border-t border-slate-100">
                              <td className="py-2 font-mono text-xs">{ln.product_code}</td>
                              <td className="py-2">{ln.product_description || ln.product_name}</td>
                              <td className="py-2 text-center tabular-nums">{ln.quantity_ordered}</td>
                              <td className="py-2 text-center tabular-nums text-emerald-700">{ln.quantity_received}</td>
                              <td className="py-2 text-center tabular-nums">{ln.quantity_pending}</td>
                              <td className="py-2 text-end">{lineStatusBadge(ln, t)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {detail.code} — {detail.supplier_name}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-xs', statusTone(detail.status))}>
                  {detail.status_label}
                </span>

                <div className="rounded-xl border divide-y bg-white">
                  {detail.lines.map((ln) => (
                    <div key={ln.id} className="p-4 space-y-3">
                      <div className="flex justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            {ln.product_code} — {ln.product_name}
                          </p>
                          <p className="text-xs text-slate-500">{ln.brand_name}</p>
                        </div>
                        {lineStatusBadge(ln, t)}
                      </div>
                      <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2 text-xs tabular-nums">
                        <div>
                          <span className="text-slate-500">{t('purchases.reorder.orderQty')}</span>
                          <p className="font-bold">{ln.quantity_ordered}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">{t('purchases.orders.received')}</span>
                          <p className="font-bold text-emerald-700">{ln.quantity_received}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">{t('purchases.orders.pending')}</span>
                          <p className="font-bold">{ln.quantity_pending}</p>
                        </div>
                      </div>
                      {!ln.is_fully_received && detail.status !== 'received' ? (
                        <label className="block space-y-1">
                          <span className="text-xs font-medium text-slate-600">{t('purchases.orders.receiveNow')}</span>
                          <Input
                            type="text"
                            className="tabular-nums"
                            placeholder="0"
                            value={receiveQty[ln.id] ?? ''}
                            onChange={(e) => setReceiveQty((prev) => ({ ...prev, [ln.id]: e.target.value }))}
                          />
                        </label>
                      ) : null}
                    </div>
                  ))}
                </div>

                {detail.status !== 'received' ? (
                  <Button type="button" className="w-full erp-add-action" onClick={onReceive} disabled={receiving}>
                    <PackageCheck className="h-4 w-4 me-1" />
                    {receiving ? t('inventory.loading') : t('purchases.orders.confirmReceive')}
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
