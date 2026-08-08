import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShoppingBag, X, Zap } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { scanOrdersApi, type ScanOrderDto } from '@/lib/api/scanOrders';
import { fmtPosAmount } from '../pos-utils';
import { readHeldCarts, type HeldCartRow } from '../posCustomerDocs';

type PendingItem =
  | { kind: 'scan'; order: ScanOrderDto }
  | { kind: 'held'; held: HeldCartRow };

type Props = {
  open: boolean;
  onClose: () => void;
  onLoadScanOrder: (order: ScanOrderDto) => void;
  onLoadHeld: (held: HeldCartRow) => void;
};

function formatWhen(iso: string, locale: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
  return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US');
}

function heldTotal(held: HeldCartRow) {
  return held.lines.reduce((s, ln) => {
    const q = parseFloat(String(ln.quantity)) || 0;
    const p = parseFloat(String(ln.unit_price)) || 0;
    const d = parseFloat(String(ln.discount_percent)) || 0;
    return s + q * p * (1 - d / 100);
  }, 0);
}

export function PosPendingOrdersModal({ open, onClose, onLoadScanOrder, onLoadHeld }: Props) {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, held] = await Promise.all([
        scanOrdersApi.list({ order_type: 'sale' }),
        Promise.resolve(readHeldCarts()),
      ]);
      const pendingOrders = orders.filter(
        (o) => !o.loaded_into && o.status !== 'draft' && (o.line_count || 0) > 0,
      );
      const pendingHeld = held.filter((h) => (h.lines?.length || 0) > 0);
      const merged: PendingItem[] = [
        ...pendingOrders.map((order) => ({ kind: 'scan' as const, order })),
        ...pendingHeld.map((held) => ({ kind: 'held' as const, held })),
      ];
      setItems(merged);
    } catch {
      setItems(readHeldCarts().map((held) => ({ kind: 'held' as const, held })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const count = items.length;

  const handleLoad = async (item: PendingItem) => {
    setLoadingId(item.kind === 'scan' ? item.order.id : item.held.id);
    try {
      if (item.kind === 'scan') {
        const full = await scanOrdersApi.get(item.order.id);
        onLoadScanOrder(full);
      } else {
        onLoadHeld(item.held);
      }
      onClose();
    } finally {
      setLoadingId(null);
    }
  };

  const title = useMemo(
    () => t('pos.smart.pendingTitle', { count: String(count) }),
    [count, t],
  );

  if (!open) return null;

  return (
    <div className="psc-modal-overlay" onClick={onClose} role="presentation">
      <div className="psc-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="psc-modal-head psc-modal-head--orange">
          <h2>
            <ShoppingBag className="h-5 w-5" />
            {title}
          </h2>
          <button type="button" className="psc-modal-close" onClick={onClose} aria-label={t('inventory.cancel')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="psc-modal-hint">{t('pos.smart.pendingHint')}</p>
        <div className="psc-modal-body">
          {loading ? (
            <p className="psc-modal-empty">{t('inventory.loading')}</p>
          ) : count === 0 ? (
            <p className="psc-modal-empty">{t('pos.smart.noPending')}</p>
          ) : (
            items.map((item) => {
              if (item.kind === 'held') {
                const { held } = item;
                const total = heldTotal(held);
                return (
                  <article key={held.id} className="psc-modal-card">
                    <div className="psc-modal-card-head">
                      <span className="psc-modal-badge psc-modal-badge--orange">{held.label.slice(0, 16)}</span>
                      <span className="psc-modal-date">{t('pos.smart.heldLocal')}</span>
                    </div>
                    <p className="psc-modal-customer">
                      {t('pos.smart.customerLabel')}: {held.customerName || t('pos.walkInCustomer')}
                    </p>
                    <p className="text-xs font-bold text-slate-600 mb-1">{t('pos.smart.savedItems')}</p>
                    <ul className="psc-modal-items">
                      {held.lines.map((ln) => (
                        <li key={ln.key}>
                          <span>• {ln.product_name || ln.label}</span>
                          <span className="psc-qty">
                            {t('pos.smart.qtyLabel')}: {ln.quantity}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="psc-modal-foot">
                      <span className="psc-modal-total">
                        {t('pos.smart.totalValue')}: {fmtPosAmount(total)} {t('dashboard.currency')}
                      </span>
                      <button
                        type="button"
                        className="psc-modal-load-btn psc-modal-load-btn--orange"
                        disabled={loadingId === held.id}
                        onClick={() => void handleLoad(item)}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        {t('pos.smart.loadToCart')}
                      </button>
                    </div>
                  </article>
                );
              }

              const { order } = item;
              const when = formatWhen(order.created_at, locale);
              const total = parseFloat(order.total_sale_amount) || 0;
              return (
                <article key={order.id} className="psc-modal-card">
                  <div className="psc-modal-card-head">
                    <span className="psc-modal-badge psc-modal-badge--orange">{order.code}</span>
                    <span className="psc-modal-date">{when}</span>
                  </div>
                  <p className="psc-modal-customer">
                    {t('pos.smart.customerLabel')}: {order.employee_name || '—'}
                  </p>
                  <p className="text-xs font-bold text-slate-600 mb-1">{t('pos.smart.savedItems')}</p>
                  <ul className="psc-modal-items">
                    {(order.lines || []).map((ln) => (
                      <li key={ln.id}>
                        <span>• {ln.product_name}</span>
                        <span className="psc-qty">
                          {t('pos.smart.qtyLabel')}: {ln.quantity}
                        </span>
                      </li>
                    ))}
                    {!order.lines?.length ? (
                      <li>
                        <span>• {order.line_count} {t('pos.pcs')}</span>
                      </li>
                    ) : null}
                  </ul>
                  {order.notes ? (
                    <p className="psc-modal-note">📝 {order.notes}</p>
                  ) : null}
                  <div className="psc-modal-foot">
                    <span className="psc-modal-total">
                      {t('pos.smart.totalValue')}: {fmtPosAmount(total)} {t('dashboard.currency')}
                    </span>
                    <button
                      type="button"
                      className="psc-modal-load-btn psc-modal-load-btn--orange"
                      disabled={loadingId === order.id}
                      onClick={() => void handleLoad(item)}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {t('pos.smart.loadToCart')}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function usePendingOrdersCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [orders, held] = await Promise.all([
        scanOrdersApi.list({ order_type: 'sale' }),
        Promise.resolve(readHeldCarts()),
      ]);
      const n =
        orders.filter((o) => !o.loaded_into && o.status !== 'draft' && (o.line_count || 0) > 0).length +
        held.filter((h) => (h.lines?.length || 0) > 0).length;
      setCount(n);
    } catch {
      setCount(readHeldCarts().filter((h) => (h.lines?.length || 0) > 0).length);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 30000);
    return () => clearInterval(id);
  }, [refresh]);

  return { count, refresh };
}
