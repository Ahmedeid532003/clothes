import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X, Zap } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchPosSales, type SaleDto } from '@/lib/api/pos';
import { fmtPosAmount } from '../pos-utils';

type Props = {
  open: boolean;
  onClose: () => void;
  onRecall: (sale: SaleDto) => void;
};

function formatDate(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB');
}

export function PosImportSalesInvoiceModal({ open, onClose, onRecall }: Props) {
  const { t, locale } = useLanguage();
  const [rows, setRows] = useState<SaleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await fetchPosSales();
      setRows(all.slice(0, 20));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const title = useMemo(() => t('pos.smart.exchange.importTitle'), [t]);

  const handleRecall = async (sale: SaleDto) => {
    setLoadingId(sale.id);
    try {
      onRecall(sale);
      onClose();
    } finally {
      setLoadingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="psc-modal-overlay" onClick={onClose} role="presentation">
      <div className="psc-modal psc-modal--wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="psc-modal-head psc-modal-head--red">
          <h2>
            <Search className="h-4 w-4" />
            {title}
          </h2>
          <button type="button" className="psc-modal-close" onClick={onClose} aria-label={t('inventory.cancel')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="psc-modal-hint">{t('pos.smart.exchange.importHint')}</p>
        <div className="psc-modal-body">
          {loading ? (
            <p className="psc-modal-empty">{t('inventory.loading')}</p>
          ) : rows.length === 0 ? (
            <p className="psc-modal-empty">{t('pos.smart.exchange.noInvoices')}</p>
          ) : (
            rows.map((sale) => {
              const total = parseFloat(sale.total) || 0;
              return (
                <article key={sale.id} className="psc-modal-card">
                  <div className="psc-modal-card-head">
                    <span className="psc-modal-badge psc-modal-badge--gray">{sale.code}</span>
                    <span className="psc-modal-date">{formatDate(sale.created_at, locale)}</span>
                  </div>
                  <p className="psc-modal-customer">
                    {t('pos.smart.exchange.buyer')}: {sale.customer_name || t('pos.walkInCustomer')}
                  </p>
                  <p className="text-xs font-bold text-slate-600 mb-1">{t('pos.smart.exchange.invoiceLines')}</p>
                  <ul className="psc-modal-items">
                    {(sale.lines || []).map((ln, idx) => (
                      <li key={ln.id || `${sale.id}-${idx}`}>
                        <span>• {ln.product_name}</span>
                        <span className="psc-qty">
                          {t('pos.smart.qtyLabel')}: {ln.quantity} × {fmtPosAmount(parseFloat(ln.line_total) / (parseFloat(ln.quantity) || 1))} {t('dashboard.currency')}
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
                      className="psc-modal-load-btn psc-modal-load-btn--red"
                      disabled={loadingId === sale.id}
                      onClick={() => void handleRecall(sale)}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {t('pos.smart.exchange.recallReturn')}
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
