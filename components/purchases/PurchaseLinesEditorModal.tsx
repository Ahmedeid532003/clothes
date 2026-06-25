import React, { useEffect, useState } from 'react';
import { Maximize2, Trash2, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { InvoiceLineDraft } from './types';
import { calcLineTotals } from './lineTotals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  open: boolean;
  lines: InvoiceLineDraft[];
  onClose: (lines: InvoiceLineDraft[]) => void;
  isReturn?: boolean;
};

export function PurchaseLinesEditorModal({ open, lines, onClose, isReturn }: Props) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<InvoiceLineDraft[]>(lines);

  useEffect(() => {
    if (open) setDraft(lines);
  }, [open, lines]);

  if (!open) return null;

  const commit = () => onClose(draft);
  const colSpan = isReturn ? 8 : 7;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4 md:p-8"
      onClick={commit}
      role="presentation"
    >
      <div
        className="flex w-full max-w-[min(96vw,1200px)] max-h-[min(92vh,900px)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          className={`flex items-center justify-between border-b px-5 py-4 text-white ${
            isReturn ? 'bg-amber-900' : 'bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Maximize2 className="h-5 w-5" />
            <div>
              <h3 className="text-lg font-bold">{t('purchases.form.linesEditorTitle')}</h3>
              <p className="text-xs opacity-80">{t('purchases.form.linesEditorHint')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={commit}
            className="rounded-full p-2 hover:bg-white/10"
            aria-label={t('purchases.form.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="flex-1 overflow-auto bg-slate-50 p-4 min-h-[280px] max-h-[65vh]"
          style={{ resize: 'vertical' }}
        >
          <table className="w-full min-w-[720px] text-sm bg-white rounded-lg border shadow-sm">
            <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2 w-10" />
                <th className="px-3 py-2 text-start">{t('purchases.form.columns.itemName')}</th>
                {isReturn && (
                  <th className="px-3 py-2 w-20 text-center">{t('purchases.form.columns.stock')}</th>
                )}
                <th className="px-3 py-2 w-28">{t('purchases.form.columns.qty')}</th>
                <th className="px-3 py-2 w-32">{t('purchases.form.columns.price')}</th>
                <th className="px-3 py-2 w-24">{t('purchases.form.columns.discPercent')}</th>
                <th className="px-3 py-2 w-24">{t('purchases.form.columns.taxPercent')}</th>
                <th className="px-3 py-2 w-28 text-end">{t('purchases.form.columns.netTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {draft.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="py-12 text-center text-slate-500">
                    {t('purchases.form.noResults')}
                  </td>
                </tr>
              ) : (
                draft.map((ln) => {
                  const { total } = calcLineTotals(ln);
                  return (
                    <tr key={ln.key} className="border-t hover:bg-slate-50/80">
                      <td className="px-1 py-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDraft((prev) => prev.filter((x) => x.key !== ln.key))}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                      <td className="px-3 py-2 font-medium">{ln.label}</td>
                      {isReturn && (
                        <td className="px-2 py-2 text-center text-slate-600 tabular-nums">
                          {ln.warehouse_qty ?? '—'}
                        </td>
                      )}
                      <td className="px-2 py-1">
                        <Input
                          className="h-10 w-full text-center text-base"
                          value={ln.quantity}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev.map((x) =>
                                x.key === ln.key ? { ...x, quantity: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          className="h-10 w-full text-center"
                          value={ln.unit_cost}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev.map((x) =>
                                x.key === ln.key ? { ...x, unit_cost: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          className="h-10 w-full text-center"
                          value={ln.discount_percent}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev.map((x) =>
                                x.key === ln.key
                                  ? { ...x, discount_percent: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          className="h-10 w-full text-center"
                          value={ln.tax_percent}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev.map((x) =>
                                x.key === ln.key ? { ...x, tax_percent: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-end font-semibold text-emerald-800 tabular-nums">
                        {total.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 border-t bg-white px-5 py-4">
          <Button variant="outline" onClick={commit}>
            {t('purchases.form.backToInvoice')}
          </Button>
        </div>
      </div>
    </div>
  );
}
