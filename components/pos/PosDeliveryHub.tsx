import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, Search, Truck, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  fetchDeliveryOrders,
  fetchPosSellers,
  updateDeliveryOrder,
  type DeliveryOrderDto,
  type PosSellerDto,
} from '@/lib/api/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { fmtPosAmount } from './pos-utils';

type Props = {
  open: boolean;
  onClose: () => void;
  onNewDelivery?: () => void;
};

const SHEET_SHELL =
  'w-full sm:max-w-[980px] p-0 flex flex-col gap-0 border-s-0 h-full max-h-[100dvh] overflow-hidden [&>button]:hidden';

const STATUS_OPTIONS = [
  { id: '', labelKey: 'pos.deliveryFilterAllStatus' },
  { id: 'pending', labelKey: 'pos.deliveryStatusPending' },
  { id: 'delivered', labelKey: 'pos.deliveryStatusDelivered' },
  { id: 'cancelled', labelKey: 'pos.deliveryStatusCancelled' },
] as const;

function formatDateTime(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function PosDeliveryHub({ open, onClose, onNewDelivery }: Props) {
  const { t, language } = useLanguage();
  const [searchQ, setSearchQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [agentId, setAgentId] = useState('');
  const [status, setStatus] = useState('');
  const [orders, setOrders] = useState<DeliveryOrderDto[]>([]);
  const [summary, setSummary] = useState({ count: 0, total_delivery_fees: '0' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DeliveryOrderDto | null>(null);
  const [sellers, setSellers] = useState<PosSellerDto[]>([]);
  const [detailAgentId, setDetailAgentId] = useState('');
  const [detailStatus, setDetailStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchPosSellers()
      .then(setSellers)
      .catch(() => setSellers([]));
  }, [open]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDeliveryOrders({
        q: searchQ.trim() || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        agent: agentId || undefined,
        status: status || undefined,
      });
      setOrders(res.orders);
      setSummary({ count: res.count, total_delivery_fees: res.total_delivery_fees });
      if (selected) {
        const fresh = res.orders.find((o) => o.id === selected.id);
        setSelected(fresh || null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setOrders([]);
      setSummary({ count: 0, total_delivery_fees: '0' });
    } finally {
      setLoading(false);
    }
  }, [searchQ, dateFrom, dateTo, agentId, status, selected]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) {
      setDetailAgentId('');
      setDetailStatus('');
      return;
    }
    setDetailAgentId(selected.delivery_agent || '');
    setDetailStatus(selected.delivery_status || 'pending');
  }, [selected]);

  const statusLabel = useCallback(
    (value: string) => {
      if (value === 'delivered') return t('pos.deliveryStatusDelivered');
      if (value === 'cancelled') return t('pos.deliveryStatusCancelled');
      if (value === 'pending') return t('pos.deliveryStatusPending');
      return '—';
    },
    [t],
  );

  const totalFeesNum = useMemo(
    () => parseFloat(summary.total_delivery_fees) || 0,
    [summary.total_delivery_fees],
  );

  const saveDetail = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateDeliveryOrder(selected.id, {
        delivery_agent: detailAgentId || null,
        delivery_status: detailStatus || 'pending',
      });
      setSelected(updated);
      setOrders((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelected(null);
    setSearchQ('');
    setDateFrom('');
    setDateTo('');
    setAgentId('');
    setStatus('');
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="right" className={SHEET_SHELL}>
        <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-orange-50 to-white">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-orange-200 bg-orange-500 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Truck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-black">{t('pos.deliveryHubTitle')}</p>
                <p className="text-xs font-bold opacity-90">{t('pos.deliveryHubSubtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onNewDelivery ? (
                <Button
                  type="button"
                  size="sm"
                  className="bg-white text-orange-700 font-black hover:bg-orange-50"
                  onClick={() => {
                    handleClose();
                    onNewDelivery();
                  }}
                >
                  {t('pos.deliveryHubNewSale')}
                </Button>
              ) : null}
              <button
                type="button"
                className="rounded-lg bg-white/20 p-2 hover:bg-white/30"
                onClick={handleClose}
                title={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {!selected ? (
            <>
              <div className="shrink-0 grid gap-3 border-b border-orange-100 bg-white/80 p-4 sm:grid-cols-2">
                <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                  <p className="text-xs font-bold text-orange-800">{t('pos.deliveryHubOrderCount')}</p>
                  <p className="text-2xl font-black text-orange-950 tabular-nums">{summary.count}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-bold text-emerald-800">{t('pos.deliveryHubTotalFees')}</p>
                  <p className="text-2xl font-black text-emerald-950 tabular-nums">
                    {fmtPosAmount(totalFeesNum)} {t('dashboard.currency')}
                  </p>
                </div>
              </div>

              <div className="shrink-0 space-y-2 border-b border-slate-200 bg-white p-4">
                <div className="flex flex-wrap gap-2">
                  <div className="relative min-w-[200px] flex-1">
                    <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="h-10 ps-9"
                      placeholder={t('pos.deliveryHubSearch')}
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void load()}
                    />
                  </div>
                  <Input
                    type="date"
                    className="h-10 w-[150px]"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    title={t('pos.deliveryHubDateFrom')}
                  />
                  <Input
                    type="date"
                    className="h-10 w-[150px]"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    title={t('pos.deliveryHubDateTo')}
                  />
                  <select
                    className="h-10 min-w-[150px] rounded-md border border-slate-200 bg-white px-2 text-sm font-bold"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                  >
                    <option value="">{t('pos.deliveryHubAllAgents')}</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 min-w-[140px] rounded-md border border-slate-200 bg-white px-2 text-sm font-bold"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.id || 'all'} value={opt.id}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </select>
                  <Button type="button" className="h-10 font-black" onClick={() => void load()} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 me-1 ${loading ? 'animate-spin' : ''}`} />
                    {t('pos.deliveryHubApplyFilter')}
                  </Button>
                </div>
                {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-2">
                {loading && orders.length === 0 ? (
                  <p className="py-16 text-center text-slate-500">{t('inventory.loading')}</p>
                ) : orders.length === 0 ? (
                  <p className="py-16 text-center text-slate-500">{t('pos.deliveryHubEmpty')}</p>
                ) : (
                  <table
                    className="w-full text-sm min-w-[760px]"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    <thead className="sticky top-0 bg-slate-800 text-[11px] font-black text-white">
                      <tr>
                        <th className="px-3 py-2 text-start">{t('pos.colCode')}</th>
                        <th className="px-3 py-2 text-start">{t('pos.deliveryHubDate')}</th>
                        <th className="px-3 py-2 text-start">{t('pos.customerNotesLabel')}</th>
                        <th className="px-3 py-2 text-start">{t('pos.deliveryHubAgent')}</th>
                        <th className="px-3 py-2 text-end">{t('pos.deliveryFees')}</th>
                        <th className="px-3 py-2 text-end">{t('pos.invoiceTotal')}</th>
                        <th className="px-3 py-2 text-center">{t('pos.deliveryHubStatus')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((row) => (
                        <tr
                          key={row.id}
                          className="cursor-pointer border-b border-slate-100 hover:bg-orange-50/80"
                          onClick={() => setSelected(row)}
                        >
                          <td className="px-3 py-2.5 font-black text-orange-800">{row.code}</td>
                          <td className="px-3 py-2.5 text-xs">{formatDateTime(row.created_at, language)}</td>
                          <td className="px-3 py-2.5">
                            <p className="font-bold">{row.customer_name || t('pos.walkInCustomer')}</p>
                            {row.customer_phone ? (
                              <p className="text-xs text-slate-500">{row.customer_phone}</p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 font-bold">
                            {row.delivery_agent_name || '—'}
                          </td>
                          <td className="px-3 py-2.5 text-end font-black tabular-nums text-emerald-700">
                            {fmtPosAmount(parseFloat(row.delivery_fee_effective || '0'))}
                          </td>
                          <td className="px-3 py-2.5 text-end font-black tabular-nums">
                            {fmtPosAmount(parseFloat(row.total || '0'))}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black">
                              {statusLabel(row.delivery_status || 'pending')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <button
                type="button"
                className="mb-4 flex items-center gap-1 text-sm font-black text-orange-700 hover:underline"
                onClick={() => setSelected(null)}
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                {t('pos.deliveryHubBack')}
              </button>

              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-[10px] font-bold text-slate-500">{t('pos.colCode')}</p>
                  <p className="text-lg font-black text-orange-800">{selected.code}</p>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-[10px] font-bold text-slate-500">{t('pos.deliveryHubDate')}</p>
                  <p className="text-sm font-black">{formatDateTime(selected.created_at, language)}</p>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-[10px] font-bold text-slate-500">{t('pos.deliveryFees')}</p>
                  <p className="text-lg font-black text-emerald-700 tabular-nums">
                    {fmtPosAmount(parseFloat(selected.delivery_fee_effective || '0'))}
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-[10px] font-bold text-slate-500">{t('pos.invoiceTotal')}</p>
                  <p className="text-lg font-black tabular-nums">
                    {fmtPosAmount(parseFloat(selected.total || '0'))}
                  </p>
                </div>
              </div>

              <div className="mb-4 rounded-xl border bg-white p-4 space-y-3">
                <p className="font-black text-slate-800">{t('pos.deliveryHubCustomerBlock')}</p>
                <p className="text-sm">
                  <span className="font-bold">{selected.customer_name || t('pos.walkInCustomer')}</span>
                  {selected.customer_phone ? ` — ${selected.customer_phone}` : ''}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-black text-slate-600">
                      {t('pos.deliveryHubAgent')}
                    </label>
                    <select
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-bold"
                      value={detailAgentId}
                      onChange={(e) => setDetailAgentId(e.target.value)}
                    >
                      <option value="">{t('pos.deliveryHubPickAgent')}</option>
                      {sellers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-black text-slate-600">
                      {t('pos.deliveryHubStatus')}
                    </label>
                    <select
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-bold"
                      value={detailStatus}
                      onChange={(e) => setDetailStatus(e.target.value)}
                    >
                      <option value="pending">{t('pos.deliveryStatusPending')}</option>
                      <option value="delivered">{t('pos.deliveryStatusDelivered')}</option>
                      <option value="cancelled">{t('pos.deliveryStatusCancelled')}</option>
                    </select>
                  </div>
                </div>
                <Button
                  type="button"
                  className="font-black bg-orange-600 hover:bg-orange-700"
                  disabled={saving}
                  onClick={() => void saveDetail()}
                >
                  {saving ? t('inventory.loading') : t('pos.deliveryHubSave')}
                </Button>
              </div>

              <div className="rounded-xl border bg-white overflow-hidden">
                <p className="border-b bg-slate-50 px-4 py-2 text-sm font-black">{t('pos.deliveryHubLines')}</p>
                <table
                  className="w-full text-sm"
                  style={{ fontFamily: "'Times New Roman', Times, serif" }}
                >
                  <thead className="bg-slate-100 text-[11px] font-black">
                    <tr>
                      <th className="px-3 py-2 text-start">{t('pos.colName')}</th>
                      <th className="px-3 py-2 text-center">{t('pos.colQty')}</th>
                      <th className="px-3 py-2 text-end">{t('pos.colLineTotal')}</th>
                      <th className="px-3 py-2 text-start">{t('pos.colSeller')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.lines || []).map((ln, idx) => (
                      <tr key={ln.id || idx} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <p className="font-bold">{ln.product_name}</p>
                          <p className="text-xs text-slate-500">
                            {[ln.size_name, ln.color_name].filter(Boolean).join(' / ')}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-center font-black">{ln.quantity}</td>
                        <td className="px-3 py-2 text-end font-black tabular-nums">{ln.line_total}</td>
                        <td className="px-3 py-2 text-sm">{ln.seller_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
