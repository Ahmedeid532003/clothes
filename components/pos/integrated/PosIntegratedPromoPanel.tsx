import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, Sparkles, Tag, Trash2, Zap } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { applyStoreOfferNotice } from '@/lib/api/inventory';
import type { PosGalleryItem } from '../pos-utils';

export type PosActivePromo = {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  campaignName: string;
  percent: number;
  noticeCode?: string;
};

const DISCOUNT_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

type Props = {
  open: boolean;
  onClose: () => void;
  branchId: string | null;
  products: PosGalleryItem[];
  activePromos: PosActivePromo[];
  onPromosChange: (rows: PosActivePromo[]) => void;
  onApplied?: () => void;
};

export function PosIntegratedPromoPanel({
  open,
  onClose,
  branchId,
  products,
  activePromos,
  onPromosChange,
  onApplied,
}: Props) {
  const { t } = useLanguage();
  const [productId, setProductId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [discountPct, setDiscountPct] = useState('15');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productOptions = useMemo(() => {
    const seen = new Set<string>();
    return products.filter((item) => {
      if (seen.has(item.product.id)) return false;
      seen.add(item.product.id);
      return true;
    });
  }, [products]);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  const handleDelete = useCallback(
    (id: string) => {
      onPromosChange(activePromos.filter((row) => row.id !== id));
    },
    [activePromos, onPromosChange],
  );

  const handleApply = async () => {
    if (!branchId) {
      setError(t('pos.integrated.promo.needBranch'));
      return;
    }
    const picked = productOptions.find((item) => item.product.id === productId);
    if (!picked) {
      setError(t('pos.integrated.promo.pickProductRequired'));
      return;
    }
    const pct = parseInt(discountPct, 10);
    if (!pct || pct <= 0) {
      setError(t('pos.integrated.promo.discountRequired'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await applyStoreOfferNotice({
        branch_id: branchId,
        q: picked.product.code,
        default_mode: 'percent',
        default_value: '0',
        default_enabled: false,
        view_mode: 'all',
        lines: [
          {
            product_id: picked.product.id,
            mode: 'percent',
            value: String(pct),
            enabled: true,
          },
        ],
      });

      const row: PosActivePromo = {
        id: res.id || `${picked.product.id}-${Date.now()}`,
        productId: picked.product.id,
        productName: picked.product.name_ar,
        productCode: picked.product.code,
        campaignName: campaignName.trim() || t('pos.integrated.promo.defaultCampaign'),
        percent: pct,
        noticeCode: res.code,
      };
      onPromosChange([row, ...activePromos.filter((p) => p.productId !== picked.product.id)]);
      setProductId('');
      setCampaignName('');
      setDiscountPct('15');
      onApplied?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <section className="pos-integrated-promo-panel" aria-label={t('pos.integrated.promoDashboard')}>
      <header className="pos-integrated-promo-panel-head">
        <button type="button" className="pos-integrated-promo-panel-hide" onClick={onClose}>
          <Tag className="h-4 w-4" />
          {t('pos.integrated.promo.hidePanel')}
        </button>
        <div className="pos-integrated-promo-panel-title-wrap">
          <div className="pos-integrated-promo-panel-icon" aria-hidden>
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h3>{t('pos.integrated.promoBanner')}</h3>
            <p>{t('pos.integrated.promo.subtitle')}</p>
          </div>
        </div>
      </header>

      <div className="pos-integrated-promo-panel-body">
        <div className="pos-integrated-promo-panel-list">
          <div className="pos-integrated-promo-panel-list-head">
            <h4>{t('pos.integrated.promo.activeTitle')}</h4>
            <span className="pos-integrated-promo-panel-count">
              {t('pos.integrated.promo.activeCount', { count: activePromos.length })}
            </span>
          </div>

          {activePromos.length === 0 ? (
            <div className="pos-integrated-promo-panel-empty">
              <Sparkles className="h-8 w-8" />
              <p>{t('pos.integrated.promo.emptyTitle')}</p>
              <span>{t('pos.integrated.promo.emptyHint')}</span>
            </div>
          ) : (
            <ul className="pos-integrated-promo-panel-rows">
              {activePromos.map((row) => (
                <li key={row.id}>
                  <div className="pos-integrated-promo-panel-row-main">
                    <strong>{row.productName}</strong>
                    <span className="code">{row.productCode}</span>
                    <span className="meta">
                      {row.campaignName} — {row.percent}%
                    </span>
                  </div>
                  <button
                    type="button"
                    className="pos-integrated-promo-panel-row-del"
                    onClick={() => handleDelete(row.id)}
                    aria-label={t('pos.integrated.promo.deleteOffer')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          className="pos-integrated-promo-panel-form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleApply();
          }}
        >
          <h4>{t('pos.integrated.promo.newTitle')}</h4>

          <label className="pos-integrated-promo-field">
            <span>{t('pos.integrated.promo.pickProduct')}</span>
            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">{t('pos.integrated.promo.pickPlaceholder')}</option>
              {productOptions.map((item) => (
                <option key={item.product.id} value={item.product.id}>
                  {item.product.name_ar} ({item.product.code})
                </option>
              ))}
            </select>
          </label>

          <div className="pos-integrated-promo-form-row">
            <label className="pos-integrated-promo-field">
              <span>{t('pos.integrated.promo.campaignName')}</span>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder={t('pos.integrated.promo.campaignPlaceholder')}
              />
            </label>
            <label className="pos-integrated-promo-field">
              <span>{t('pos.integrated.promo.discountPct')}</span>
              <select value={discountPct} onChange={(e) => setDiscountPct(e.target.value)}>
                {DISCOUNT_OPTIONS.map((n) => (
                  <option key={n} value={String(n)}>
                    {n} %
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? <p className="pos-integrated-promo-panel-error">{error}</p> : null}

          <button type="submit" className="pos-integrated-promo-panel-submit" disabled={saving}>
            <Zap className="h-4 w-4" />
            {saving ? t('pos.integrated.promo.applying') : t('pos.integrated.promo.applyNow')}
          </button>
        </form>
      </div>
    </section>
  );
}
