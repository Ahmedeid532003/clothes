import React from 'react';
import { FileText, ShoppingBag, PauseCircle, Receipt } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fmtMoney } from '@/components/accounting/AccountingUi';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { CustomerDocKind, CustomerDocOption } from './posCustomerDocs';

type Props = {
  open: boolean;
  customerName: string;
  options: CustomerDocOption[];
  loading?: boolean;
  onSelect: (opt: CustomerDocOption) => void;
  onClose: () => void;
};

function kindIcon(kind: CustomerDocKind) {
  if (kind === 'reservation') return <ShoppingBag className="h-4 w-4 text-violet-600" />;
  if (kind === 'quotation') return <FileText className="h-4 w-4 text-blue-600" />;
  if (kind === 'sale') return <Receipt className="h-4 w-4 text-emerald-600" />;
  return <PauseCircle className="h-4 w-4 text-amber-600" />;
}

function kindLabel(kind: CustomerDocKind, t: (k: string) => string) {
  if (kind === 'reservation') return t('pos.docKindReservation');
  if (kind === 'quotation') return t('pos.docKindQuotation');
  if (kind === 'sale') return t('pos.docKindSale');
  return t('pos.docKindHeld');
}

export function PosCustomerDocPicker({
  open,
  customerName,
  options,
  loading,
  onSelect,
  onClose,
}: Props) {
  const { t } = useLanguage();

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('pos.customerDocsTitle')}</SheetTitle>
          <p className="text-sm text-slate-600">{customerName}</p>
          <p className="text-xs text-slate-500">{t('pos.customerDocsPick')}</p>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">{t('inventory.loading')}</p>
          ) : options.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">{t('pos.customerDocsEmpty')}</p>
          ) : (
            options.map((opt) => (
              <button
                key={`${opt.kind}-${opt.id}`}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-start shadow-sm transition hover:border-blue-400 hover:bg-blue-50/40"
                onClick={() => onSelect(opt)}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  {kindIcon(opt.kind)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-black text-slate-900">{opt.code}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {kindLabel(opt.kind, t)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {opt.lineCount} {t('pos.posReview.invoiceLines')} · {fmtMoney(opt.total)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <Button variant="outline" className="mt-4 w-full font-bold" onClick={onClose}>
          {t('pos.customerDocsSkip')}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
