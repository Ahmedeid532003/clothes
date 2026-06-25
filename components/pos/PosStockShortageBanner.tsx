import React from 'react';
import { AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import type { PosShortageLine } from './PosStockTransferCanvas';

type Props = {
  lines: PosShortageLine[];
  onTransfer: () => void;
};

export function PosStockShortageBanner({ lines, onTransfer }: Props) {
  const { t } = useLanguage();
  if (lines.length === 0) return null;

  const totalDeficit = lines.reduce((s, l) => s + l.deficit, 0);

  return (
    <div className="rounded-2xl border-2 border-red-400 bg-gradient-to-r from-red-50 via-amber-50 to-red-50 p-3 shadow-sm ring-1 ring-red-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white shadow">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-red-950">{t('pos.stockShortageBannerTitle')}</p>
            <p className="text-xs font-bold text-red-800/90 leading-snug mt-0.5">
              {t('pos.stockShortageBannerDesc', { count: String(lines.length), deficit: String(totalDeficit) })}
            </p>
            <ul className="mt-2 space-y-0.5 text-[11px] font-bold text-red-900/80 max-h-20 overflow-y-auto">
              {lines.slice(0, 5).map((l) => (
                <li key={l.key} className="truncate">
                  • {l.label} — {t('pos.transferDeficit')}: {l.deficit}
                </li>
              ))}
              {lines.length > 5 ? (
                <li className="text-red-700">+ {lines.length - 5} …</li>
              ) : null}
            </ul>
          </div>
        </div>
        <Button
          type="button"
          className="h-12 shrink-0 bg-emerald-600 px-6 text-base font-black hover:bg-emerald-700 shadow-md"
          onClick={onTransfer}
        >
          <ArrowLeftRight className="h-4 w-4 me-2" />
          {t('pos.stockTransferBtn')}
        </Button>
      </div>
    </div>
  );
}
