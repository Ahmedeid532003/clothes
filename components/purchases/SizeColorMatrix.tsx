import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Grid3x3, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { CatalogItem } from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';

export type MatrixCell = {
  sizeId: string;
  colorId: string;
  quantity: number;
};

type SizeColorMatrixProps = {
  productName: string;
  sizes: CatalogItem[];
  colors: CatalogItem[];
  onClose: () => void;
  onApply: (cells: MatrixCell[]) => void;
};

export function SizeColorMatrix({
  productName,
  sizes,
  colors,
  onClose,
  onApply,
}: SizeColorMatrixProps) {
  const { t } = useLanguage();
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const total = useMemo(
    () =>
      Object.values(quantities).reduce((sum, v) => sum + (parseFloat(v) || 0), 0),
    [quantities],
  );

  const buildCells = (): MatrixCell[] => {
    const cells: MatrixCell[] = [];
    for (const size of sizes) {
      for (const color of colors) {
        const key = `${size.id}-${color.id}`;
        const qty = parseFloat(quantities[key] || '0');
        if (qty > 0) {
          cells.push({ sizeId: size.id, colorId: color.id, quantity: qty });
        }
      }
    }
    return cells;
  };

  const handleApply = () => {
    const cells = buildCells();
    if (cells.length > 0) onApply(cells);
    else onClose();
  };

  const content = (
    <div
      className="fixed inset-0 z-[235] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-3 md:p-6"
      role="presentation"
    >
      <div
        className="flex max-h-[min(92vh,880px)] w-full max-w-[min(96vw,1100px)] flex-col overflow-hidden rounded-2xl border-2 border-[#4169E1]/25 bg-white shadow-[0_40px_100px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('purchases.form.sizeColorMatrix')}
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-[#4169E1] to-indigo-700 px-5 py-4 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Grid3x3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black uppercase tracking-wide">{t('purchases.form.sizeColorMatrix')}</h3>
              <p className="text-sm text-blue-100 truncate font-semibold">{productName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 p-4 min-h-[200px] border-b border-slate-200">
          {sizes.length === 0 || colors.length === 0 ? (
            <p className="text-center text-slate-500 py-8 font-medium">{t('purchases.matrixEmpty')}</p>
          ) : (
            <table className="w-full min-w-max border-separate border-spacing-1.5 text-sm">
              <thead>
                <tr>
                  <th className="p-2 sticky start-0 bg-slate-50 z-10" />
                  {sizes.map((sz) => (
                    <th
                      key={sz.id}
                      className="min-w-[68px] rounded-lg border-2 border-slate-200 bg-white px-2 py-2 text-[11px] font-black text-slate-600 uppercase"
                    >
                      {sz.name_ar}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colors.map((clr) => (
                  <tr key={clr.id}>
                    <td className="sticky start-0 z-[1] rounded-lg border-2 border-slate-200 bg-white px-2 py-2 text-[11px] font-black text-slate-700 whitespace-nowrap shadow-sm">
                      {clr.name_ar}
                    </td>
                    {sizes.map((sz) => {
                      const key = `${sz.id}-${clr.id}`;
                      return (
                        <td key={key} className="p-0.5">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="0"
                            value={quantities[key] ?? ''}
                            onChange={(e) =>
                              setQuantities((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="h-10 w-full min-w-[60px] rounded-lg border-2 border-slate-200 text-center text-sm font-black text-[#4169E1] bg-white focus:border-[#4169E1] focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3.5">
          <div className="rounded-xl border-2 border-slate-800/20 bg-slate-50 px-4 py-2">
            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
              {t('purchases.form.totalMatrixQty')}
            </span>
            <span className="text-xl font-black text-[#4169E1]">
              {total} {t('purchases.form.pcs')}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="font-bold">
              {t('purchases.form.cancel')}
            </Button>
            <Button
              onClick={handleApply}
              disabled={total <= 0}
              className="font-black bg-[#4169E1] hover:bg-[#3451b2]"
            >
              {t('purchases.form.applySelection')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
