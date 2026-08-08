import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, X, Zap } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { salesQuotationsApi, type SalesQuotationDto } from '@/lib/api/sales';
import { fmtPosAmount } from '../pos-utils';

type Props = {
  open: boolean;
  onClose: () => void;
  onLoad: (doc: SalesQuotationDto) => void;
};

function formatDate(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB').replace(/\//g, '-');
}

export function PosActiveQuotationsModal({ open, onClose, onLoad }: Props) {
  const { t, locale } = useLanguage();
  const [rows, setRows] = useState<SalesQuotationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await salesQuotationsApi.list();
      setRows(all.filter((q) => q.status !== 'converted' && !q.converted_sale));
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
  const title = useMemo(() => t('pos.smart.quotesTitle', { count: String(count) }), [count, t]);

  const handleLoad = async (doc: SalesQuotationDto) => {
    setLoadingId(doc.id);
    try {
      const full = await salesQuotationsApi.lookup(doc.code);
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
        <div className="psc-modal-head psc-modal-head--purple">
          <h2>
            <FileText className="h-5 w-5" />
            {title}
          </h2>
          <button type="button" className="psc-modal-close" onClick={onClose} aria-label={t('inventory.cancel')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="psc-modal-hint">{t('pos.smart.quotesHint')}</p>
        <div className="psc-modal-body">
          {loading ? (
            <p className="psc-modal-empty">{t('inventory.loading')}</p>
          ) : count === 0 ? (
            <p className="psc-modal-empty">{t('pos.smart.noQuotes')}</p>
          ) : (
            rows.map((doc) => {
              const total = parseFloat(doc.total) || 0;
              return (
                <article key={doc.id} className="psc-modal-card">
                  <div className="psc-modal-card-head">
                    <span className="psc-modal-badge psc-modal-badge--blue">{doc.code}</span>
                    <span className="psc-modal-date">{formatDate(doc.created_at, locale)}</span>
                  </div>
                  <p className="psc-modal-customer">
                    {t('pos.smart.quoteEntity')}: {doc.customer_name || t('pos.walkInCustomer')}
                  </p>
                  <p className="text-xs font-bold text-slate-600 mb-1">{t('pos.smart.quoteLines')}</p>
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
                  {doc.notes ? <p className="psc-modal-note">📝 {doc.notes}</p> : null}
                  <div className="psc-modal-foot">
                    <span className="psc-modal-total">
                      {t('pos.smart.totalValue')}: {fmtPosAmount(total)} {t('dashboard.currency')}
                    </span>
                    <button
                      type="button"
                      className="psc-modal-load-btn psc-modal-load-btn--purple"
                      disabled={loadingId === doc.id}
                      onClick={() => void handleLoad(doc)}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {t('pos.smart.recallInvoice')}
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

export function useActiveQuotationsCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const all = await salesQuotationsApi.list();
      setCount(all.filter((q) => q.status !== 'converted' && !q.converted_sale).length);
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
