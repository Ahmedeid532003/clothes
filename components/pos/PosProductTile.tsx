import React from 'react';
import { Package } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { PosGalleryItem } from './pos-utils';
import { productInitials, productTileGradient } from './pos-utils';

type Props = {
  item: PosGalleryItem;
  onClick: () => void;
};

export function PosProductTile({ item, onClick }: Props) {
  const { t } = useLanguage();
  const { product, variant } = item;
  const gradient = productTileGradient(product.code || product.id);
  const initials = productInitials(product.name_ar, product.code);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-start shadow-sm transition hover:-translate-y-0.5 hover:border-[#4169E1]/40 hover:shadow-lg"
    >
      <div className={`relative flex h-[130px] items-center justify-center bg-gradient-to-br ${gradient} p-4`}>
        <span className="absolute start-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black text-[#4169E1] shadow">
          {variant.quantity_available} {t('pos.pcs')}
        </span>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black text-white shadow-inner backdrop-blur-sm">
          {initials}
        </div>
        <Package className="absolute bottom-2 end-2 h-5 w-5 text-white/30" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="font-mono text-[10px] font-black text-[#4169E1]">{product.code}</span>
        <span className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-slate-800">
          {product.name_ar}
        </span>
        <span className="text-[11px] text-slate-500">
          {variant.size_name} / {variant.color_name}
        </span>
        <span className="mt-auto text-lg font-black text-slate-900 tabular-nums">
          {variant.unit_price} <span className="text-xs font-bold text-slate-400">{t('dashboard.currency')}</span>
        </span>
      </div>
    </button>
  );
}
