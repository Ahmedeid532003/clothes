import React from 'react';
import { Activity, DollarSign, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { SaleDto } from '@/lib/api/pos';

type Props = {
  sales: SaleDto[];
  liveSales: number;
  netProfit: number;
  invoiceCount: number;
  shortageCount: number;
  locale: string;
};

function formatSaleTime(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

/** شاشة بيانات مستقلة — مؤشرات ومبيعات حية بدون واجهة البيع */
export function PosIntegratedDataScreen({ sales, liveSales, netProfit, invoiceCount, shortageCount, locale }: Props) {
  const { t } = useLanguage();

  return (
    <div className="pos-int-screen pos-int-data">
      <header className="pos-int-screen-head">
        <h2>{t('pos.integrated.data.title')}</h2>
        <p>{t('pos.integrated.data.subtitle')}</p>
      </header>

      <div className="pos-int-data-grid">
        <div className="pos-int-data-metric">
          <TrendingUp className="h-8 w-8 text-emerald-600" />
          <div>
            <span>{t('pos.integrated.liveSales')}</span>
            <strong>{liveSales.toFixed(1)}</strong>
            <small>{t('dashboard.currency')}</small>
          </div>
        </div>
        <div className="pos-int-data-metric">
          <Activity className="h-8 w-8 text-indigo-600" />
          <div>
            <span>{t('pos.integrated.netProfit')}</span>
            <strong>{netProfit.toFixed(1)}</strong>
            <small>{t('dashboard.currency')}</small>
          </div>
        </div>
        <div className="pos-int-data-metric">
          <DollarSign className="h-8 w-8 text-violet-600" />
          <div>
            <span>{t('pos.integrated.invoiceCount')}</span>
            <strong>{invoiceCount}</strong>
            <small>{t('pos.integrated.operations')}</small>
          </div>
        </div>
        <div className="pos-int-data-metric pos-int-data-metric--warn">
          <span className="pos-int-data-metric-icon">!</span>
          <div>
            <span>{t('pos.integrated.stockShortages')}</span>
            <strong>{shortageCount}</strong>
            <small>{t('pos.integrated.items')}</small>
          </div>
        </div>
      </div>

      <section className="pos-int-panel pos-int-panel--wide">
        <div className="pos-integrated-recent-head">
          <h3>
            <DollarSign className="h-4 w-4 text-emerald-600" />
            {t('pos.integrated.recentSales')}
          </h3>
          <span className="pos-integrated-live-badge">
            <span className="dot" />
            {t('pos.integrated.liveUpdate')}
          </span>
        </div>
        <div className="pos-int-data-feed">
          {sales.length === 0 ? (
            <p className="empty">{t('pos.integrated.noSales')}</p>
          ) : (
            sales.map((sale) => (
              <div key={sale.id} className="pos-integrated-sale-row">
                <span className="code">{sale.code}</span>
                <div className="meta">
                  <div className="time">
                    {formatSaleTime(sale.created_at, locale)} — {sale.customer_name || t('pos.walkInCustomer')}
                  </div>
                </div>
                <span className="amount">{parseFloat(sale.total).toFixed(2)} {t('dashboard.currency')}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
