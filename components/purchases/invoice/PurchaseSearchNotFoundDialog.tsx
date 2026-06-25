import React from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';

type Props = {
  searchQ: string;
  onClose: () => void;
  onCreate: () => void;
};

export function PurchaseSearchNotFoundDialog({ searchQ, onClose, onCreate }: Props) {
  const { t } = useLanguage();

  const content = (
    <div className="fixed inset-0 z-[245] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-2xl border-2 border-blue-200 bg-white shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-[#4169E1] to-indigo-600 px-5 py-4 text-white">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-6 w-6 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black text-base">{t('purchases.form.searchNotFoundTitle')}</h3>
              <p className="text-sm text-blue-100 mt-1 font-medium">«{searchQ}»</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-white/15">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="px-5 py-4 text-sm text-slate-600 leading-relaxed">
          {t('purchases.form.searchNotFoundDesc')}
        </p>
        <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-3">
          <Button variant="outline" onClick={onClose} className="font-bold">
            {t('purchases.form.cancel')}
          </Button>
          <Button onClick={onCreate} className="font-black bg-[#4169E1] hover:bg-[#3451b2]">
            {t('purchases.form.createNewProduct')}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
