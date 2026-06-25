import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  MessageCircle,
  Package,
  RefreshCw,
  Send,
  Truck,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ApiRequestError } from '@/lib/api/errors';
import {
  fetchReorderAlerts,
  type ReorderAlertItem,
  type ReorderAlertsResponse,
} from '@/lib/api/reorderAlerts';
import { createOrdersFromReorder } from '@/lib/api/purchaseOrders';
import {
  printPurchaseOrdersBySupplier,
  type PurchaseOrderPrintLabels,
} from '@/components/purchases/PurchaseOrderPrint';
import { emitPurchasesRefresh } from '@/components/purchases/PurchasesHub';
import { groupBySupplier, soldPercent, thresholdPercent } from '@/components/purchases/reorderUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type RowState = { selected: boolean; quantity: string };

function StatCard({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string | number;
  tone?: 'slate' | 'amber' | 'blue' | 'emerald';
}) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };
  return (
    <div className={cn('rounded-xl border px-4 py-3 shadow-sm', tones[tone])}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function SoldProgressBar({ item }: { item: ReorderAlertItem }) {
  const sold = soldPercent(item);
  const threshold = thresholdPercent(item);
  return (
    <div className="min-w-[120px] space-y-1">
      <div className="flex justify-between text-[11px] text-slate-500 tabular-nums">
        <span>{sold}%</span>
        <span>حد {threshold}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', sold >= threshold ? 'bg-red-500' : 'bg-amber-400')}
          style={{ width: `${sold}%` }}
        />
      </div>
    </div>
  );
}

type Props = { embedded?: boolean };

export function ReorderAlertsPage({ embedded = false }: Props) {
  const { t, locale, isRtl } = useLanguage();
  const [data, setData] = useState<ReorderAlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchReorderAlerts();
      setData(res);
      const next: Record<string, RowState> = {};
      const openGroups: Record<string, boolean> = {};
      for (const item of res.items) {
        next[item.product_id] = { selected: true, quantity: item.suggested_order_qty || '' };
        const gk = item.supplier_id || item.supplier_name;
        openGroups[gk] = false;
      }
      setRowState(next);
      setCollapsed(openGroups);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('purchases.reorder.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const items = q
      ? data.items.filter(
          (i) =>
            i.supplier_name.toLowerCase().includes(q) ||
            i.product_code.toLowerCase().includes(q) ||
            i.product_name.toLowerCase().includes(q) ||
            (i.product_description || '').toLowerCase().includes(q) ||
            i.brand_name.toLowerCase().includes(q),
        )
      : data.items;
    return groupBySupplier(items);
  }, [data, search]);

  const selectedLines = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => rowState[item.product_id]?.selected);
  }, [data, rowState]);

  const selectedCount = selectedLines.length;
  const supplierCount = useMemo(() => new Set(selectedLines.map((i) => i.supplier_id || i.supplier_name)).size, [selectedLines]);

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

  const toggleSupplier = (supplierId: string, selected: boolean) => {
    const group = groups.find((g) => g.supplierId === supplierId);
    if (!group) return;
    setRowState((prev) => {
      const next = { ...prev };
      for (const item of group.items) {
        next[item.product_id] = { ...next[item.product_id], selected };
      }
      return next;
    });
  };

  const toggleRow = (productId: string, selected: boolean) => {
    setRowState((prev) => ({ ...prev, [productId]: { ...prev[productId], selected } }));
  };

  const setQty = (productId: string, quantity: string) => {
    setRowState((prev) => ({ ...prev, [productId]: { ...prev[productId], quantity } }));
  };

  const onConfirmSend = async () => {
    if (!data) return;
    const lines = selectedLines.map((item) => ({
      product_id: item.product_id,
      quantity_ordered: rowState[item.product_id]?.quantity?.trim() || null,
    }));
    setSubmitting(true);
    setError(null);
    try {
      const result = await createOrdersFromReorder(lines);
      setConfirmOpen(false);
      printPurchaseOrdersBySupplier(result.orders, printLabels, locale);
      for (const order of result.orders) {
        if (order.whatsapp_url) {
          window.open(order.whatsapp_url, '_blank', 'noopener,noreferrer');
        }
      }
      await load();
      emitPurchasesRefresh();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('purchases.reorder.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const branches = data?.branches ?? [];

  const body = (
    <>
      {data?.warning ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{data.warning}</span>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-slate-50/80 px-4 py-3">
        <Input
          className="max-w-md bg-white"
          placeholder={t('purchases.reorder.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <p className="text-xs text-slate-500 ms-auto">{t('purchases.reorder.workflowHint')}</p>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-white p-12 text-center text-slate-500">{t('inventory.loading')}</div>
      ) : !groups.length ? (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-slate-600">{t('purchases.reorder.empty')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isOpen = !collapsed[group.supplierId];
            const groupSelected = group.items.filter((i) => rowState[i.product_id]?.selected).length;
            const allSelected = groupSelected === group.items.length;
            return (
              <section key={group.supplierId} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 border-b bg-slate-50/90 px-4 py-3 text-start hover:bg-slate-100/80"
                  onClick={() =>
                    setCollapsed((prev) => ({ ...prev, [group.supplierId]: !prev[group.supplierId] }))
                  }
                >
                  <Truck className="h-5 w-5 text-violet-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900">{group.supplierName}</h3>
                    <p className="text-xs text-slate-500">
                      {group.items.length} {t('purchases.reorder.itemsCount')} — {groupSelected}{' '}
                      {t('purchases.reorder.statsSelected')}
                    </p>
                  </div>
                  <label
                    className="flex items-center gap-2 text-xs font-medium text-slate-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSupplier(group.supplierId, e.target.checked)}
                    />
                    {t('purchases.reorder.selectSupplier')}
                  </label>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {isOpen ? (
                  <div className="overflow-x-auto">
                    <table
                      className="w-full min-w-[960px] text-sm"
                      style={{ fontFamily: isRtl ? 'Times New Roman' : undefined }}
                    >
                      <thead className="bg-slate-50 text-slate-600 text-xs">
                        <tr>
                          <th className="w-10 px-2 py-2" />
                          <th className="px-3 py-2">{t('purchases.reorder.model')}</th>
                          <th className="px-3 py-2">{t('purchases.reorder.description')}</th>
                          <th className="px-3 py-2">{t('purchases.reorder.brand')}</th>
                          <th className="px-2 py-2 text-center">{t('purchases.reorder.inboundQty')}</th>
                          <th className="px-2 py-2 text-center">{t('purchases.reorder.soldQty')}</th>
                          <th className="px-3 py-2">{t('purchases.reorder.soldProgress')}</th>
                          <th className="px-2 py-2 text-center">{t('purchases.reorder.purchaseCount')}</th>
                          {branches.map((b) => (
                            <th key={b.branch_id} className="px-2 py-2 text-center whitespace-nowrap">
                              {b.branch_name}
                            </th>
                          ))}
                          <th className="px-2 py-2 text-center">{t('purchases.reorder.totalBalance')}</th>
                          <th className="px-2 py-2 w-24">{t('purchases.reorder.orderQty')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => {
                          const state = rowState[item.product_id];
                          const stockMap = Object.fromEntries(
                            item.branch_stocks.map((s) => [s.branch_id, s.quantity]),
                          );
                          return (
                            <tr
                              key={item.product_id}
                              className={cn(
                                'border-t border-slate-100',
                                state?.selected ? 'bg-white' : 'bg-slate-50/60 opacity-75',
                              )}
                            >
                              <td className="px-2 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={state?.selected ?? false}
                                  onChange={(e) => toggleRow(item.product_id, e.target.checked)}
                                />
                              </td>
                              <td className="px-3 py-2 font-mono text-xs">{item.product_code}</td>
                              <td className="px-3 py-2 max-w-[200px] truncate" title={item.product_description || item.product_name}>
                                {item.product_description || item.product_name}
                              </td>
                              <td className="px-3 py-2">{item.brand_name}</td>
                              <td className="px-2 py-2 text-center tabular-nums">{item.purchased_qty}</td>
                              <td className="px-2 py-2 text-center tabular-nums text-red-700 font-semibold">
                                {item.sold_qty}
                              </td>
                              <td className="px-3 py-2">
                                <SoldProgressBar item={item} />
                              </td>
                              <td className="px-2 py-2 text-center tabular-nums">{item.purchase_count}</td>
                              {branches.map((b) => (
                                <td key={b.branch_id} className="px-2 py-2 text-center tabular-nums">
                                  {stockMap[b.branch_id] ?? '0'}
                                </td>
                              ))}
                              <td className="px-2 py-2 text-center tabular-nums font-bold">{item.remaining_qty}</td>
                              <td className="px-2 py-1">
                                <Input
                                  className="h-8 text-center tabular-nums"
                                  placeholder="—"
                                  value={state?.quantity ?? ''}
                                  disabled={!state?.selected}
                                  onChange={(e) => setQty(item.product_id, e.target.value)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {selectedCount > 0 ? (
        <div className="sticky bottom-2 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 shadow-md">
          <p className="text-sm font-medium text-violet-900">
            {t('purchases.reorder.footerSelected')
              .replace('{items}', String(selectedCount))
              .replace('{suppliers}', String(supplierCount))}
          </p>
          <Button type="button" size="sm" onClick={() => setConfirmOpen(true)} disabled={submitting}>
            <Send className="h-4 w-4 me-1" />
            {t('purchases.reorder.reviewAndSend')}
          </Button>
        </div>
      ) : null}

      <Sheet open={confirmOpen} onOpenChange={setConfirmOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('purchases.reorder.confirmTitle')}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 text-sm">
            <p className="text-slate-600">{t('purchases.reorder.confirmDesc')}</p>
            <ul className="space-y-2 rounded-lg border divide-y max-h-64 overflow-y-auto">
              {groupBySupplier(selectedLines).map((g) => (
                <li key={g.supplierId} className="px-3 py-2">
                  <p className="font-semibold text-slate-800">{g.supplierName}</p>
                  <p className="text-xs text-slate-500">{g.items.length} {t('purchases.reorder.itemsCount')}</p>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {t('purchases.reorder.pdfPerSupplier')}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {t('purchases.reorder.whatsappAuto')}
              </span>
            </div>
            <Button type="button" className="w-full" onClick={onConfirmSend} disabled={submitting}>
              {submitting ? t('inventory.loading') : t('purchases.reorder.confirmSend')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">{t('purchases.reorder.hint')}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button
              type="button"
              size="sm"
              className="erp-add-action"
              disabled={submitting || loading || selectedCount === 0}
              onClick={() => setConfirmOpen(true)}
            >
              <Send className="h-4 w-4 me-1" />
              {t('purchases.reorder.generateAndSend')}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          <StatCard label={t('purchases.reorder.statsSelected')} value={selectedCount} tone="emerald" />
          <StatCard label={t('purchases.reorder.statsSuppliers')} value={supplierCount} tone="slate" />
        </div>
        {body}
      </div>
    );
  }

  return <div className="space-y-4 p-1">{body}</div>;
}
