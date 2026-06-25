import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Package, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { PurchaseProductSearchRow } from '@/lib/api/purchases';
import { Button } from '@/components/ui/button';

type Props = {
  product: PurchaseProductSearchRow;
  invoiceSupplierName: string;
  invoiceSeasonName: string;
  onClose: () => void;
  onCreateNew: () => void;
};

function mismatchKey(product: PurchaseProductSearchRow): string {
  if (!product.matches_supplier && !product.matches_season) return 'both';
  if (!product.matches_supplier) return 'supplier';
  return 'season';
}

export function PurchaseMismatchDialog({
  product,
  invoiceSupplierName,
  invoiceSeasonName,
  onClose,
  onCreateNew,
}: Props) {
  const { t } = useLanguage();
  const reason = mismatchKey(product);

  const content = (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg rounded-2xl border-2 border-amber-200 bg-white shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden"
        role="alertdialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 text-white">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black">{t('purchases.form.mismatchTitle')}</h3>
              <p className="text-xs text-amber-50/90 mt-0.5 font-medium">
                {t(`purchases.form.mismatchReason.${reason}`, {
                  invoiceSupplier: invoiceSupplierName,
                  invoiceSeason: invoiceSeasonName,
                  productSupplier: product.supplier_name || '—',
                  productSeason: product.season_name || '—',
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 hover:bg-white/15 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Package className="h-4 w-4 text-[#4169E1] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900 truncate">{product.name_ar}</p>
              <p className="text-[11px] text-slate-500 font-medium">{product.code}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className={`rounded-lg border px-2.5 py-2 ${product.matches_supplier ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <span className="block font-black text-slate-500 uppercase text-[9px]">{t('purchases.supplier')}</span>
              <span className="font-bold text-slate-800">{product.supplier_name || '—'}</span>
            </div>
            <div className={`rounded-lg border px-2.5 py-2 ${product.matches_season ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <span className="block font-black text-slate-500 uppercase text-[9px]">{t('purchases.season')}</span>
              <span className="font-bold text-slate-800">{product.season_name || '—'}</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">{t('purchases.form.mismatchDesc')}</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <Button variant="outline" onClick={onClose} className="font-bold">
            {t('purchases.form.cancel')}
          </Button>
          <Button onClick={onCreateNew} className="font-black bg-[#4169E1] hover:bg-[#3451b2]">
            {t('purchases.form.createNewProduct')}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
