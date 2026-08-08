import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bookmark, X, Zap } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { customerReservationsApi, type CustomerReservationDto } from '@/lib/api/sales';
import { fmtPosAmount } from '../pos-utils';

type Props = {
  open: boolean;
  onClose: () => void;
  onLoad: (doc: CustomerReservationDto) => void;
};

function formatDelivery(iso: string, locale: string) {
  const d = new Date(iso);
  const label = d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB').replace(/\//g, '-');
  return label;
}

export function PosPreReservationsModal({ open, onClose, onLoad }: Props) {
  const { t, locale } = useLanguage();
  const [rows, setRows] = useState<CustomerReservationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await customerReservationsApi.list();
      setRows(all.filter((r) => r.status !== 'converted' && !r.converted_sale));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const count = rows.length;
  const title = useMemo(() => t('pos.smart.bookingsTitle', { count: String(count) }), [count, t]);

  const handleLoad = async (doc: CustomerReservationDto) => {
    setLoadingId(doc.id);
    try {
      const full = await customerReservationsApi.lookup(doc.code);
      onLoad(full);
      onClose();
    } finally {
      setLoadingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="psc-modal-overlay" onClick={onClose} role="presentation">
      <div className="psc-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="psc-modal-head psc-modal-head--green">
          <h2>
            <Bookmark className="h-5 w-5" />
            {title}
          </h2>
          <button type="button" className="psc-modal-close" onClick={onClose} aria-label={t('inventory.cancel')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="psc-modal-hint">{t('pos.smart.bookingsHint')}</p>
        <div className="psc-modal-body">
          {loading ? (
            <p className="psc-modal-empty">{t('inventory.loading')}</p>
          ) : count === 0 ? (
            <p className="psc-modal-empty">{t('pos.smart.noBookings')}</p>
          ) : (
            rows.map((doc) => {
              const total = parseFloat(doc.total) || 0;
              const deposit = parseFloat(doc.deposit_amount) || 0;
              const remain = Math.max(total - deposit, 0);
              return (
                <article key={doc.id} className="psc-modal-card">
                  <div className="psc-modal-card-head">
                    <span className="psc-modal-badge psc-modal-badge--green">{doc.code}</span>
                    <span className="psc-modal-date">
                      {t('pos.smart.deliveryOn')} {formatDelivery(doc.created_at, locale)}
                    </span>
                  </div>
                  <p className="psc-modal-customer">
                    {t('pos.smart.reserver')}: {doc.customer_name}
                  </p>
                  <p className="text-xs font-bold text-slate-600 mb-1">{t('pos.smart.reservedItem')}</p>
                  <ul className="psc-modal-items">
                    {(doc.lines || []).map((ln) => (
                      <li key={ln.id}>
                        <span>• {ln.product_name}</span>
                        <span className="psc-qty">
                          {t('pos.smart.qtyLabel')}: {ln.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="psc-modal-fin-row">
                    <span className="paid">
                      {t('pos.smart.depositPaid')}: {fmtPosAmount(deposit)} {t('dashboard.currency')}
                    </span>
                    <span className="remain">
                      {t('pos.smart.remainDue')}: {fmtPosAmount(remain)} {t('dashboard.currency')}
                    </span>
                  </div>
                  {doc.notes ? <p className="psc-modal-note">📝 {doc.notes}</p> : null}
                  <div className="psc-modal-foot">
                    <span className="psc-modal-total">
                      {t('pos.smart.grandTotal')}: {fmtPosAmount(total)} {t('dashboard.currency')}
                    </span>
                    <button
                      type="button"
                      className="psc-modal-load-btn psc-modal-load-btn--green"
                      disabled={loadingId === doc.id}
                      onClick={() => void handleLoad(doc)}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {t('pos.smart.loadForDelivery')}
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

export function usePreReservationsCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const all = await customerReservationsApi.list();
      setCount(all.filter((r) => r.status !== 'converted' && !r.converted_sale).length);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 30000);
    return () => clearInterval(id);
  }, [refresh]);

  return { count, refresh };
}
