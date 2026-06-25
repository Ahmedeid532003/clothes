import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { PosSellerDto } from '@/lib/api/pos';
import type { PosCartLine } from '@/lib/api/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { lineSubtotal } from './pos-utils';

type Props = {
  line: PosCartLine | null;
  canEditPrice: boolean;
  employees?: PosSellerDto[];
  onClose: () => void;
  onSave: (patch: Partial<PosCartLine>) => void;
};

export function PosLineEditDialog({ line, canEditPrice, employees = [], onClose, onSave }: Props) {
  const { t } = useLanguage();
  const [unitPrice, setUnitPrice] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [discountAmt, setDiscountAmt] = useState('');
  const [sellerId, setSellerId] = useState('');

  useEffect(() => {
    if (!line) return;
    setUnitPrice(line.unit_price);
    setDiscountPct(line.discount_percent || '0');
    setDiscountAmt(line.discount_amount || '0');
    setSellerId(line.seller_id || '');
  }, [line]);

  if (!line) return null;

  const preview = lineSubtotal(line.quantity, unitPrice, discountPct, discountAmt);
  const selectedSeller = employees.find((e) => e.id === sellerId);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-5 py-4">
          <h3 className="font-black text-lg text-slate-800">{t('pos.editLineTitle')}</h3>
          <p className="text-sm text-slate-500 truncate">{line.product_name || line.label}</p>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="text-xs font-bold text-slate-500">{t('pos.colSeller')}</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-bold"
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
            >
              <option value="">{t('pos.noSeller')}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employee_code} — {e.full_name || e.username}
                </option>
              ))}
            </select>
          </div>
          {canEditPrice ? (
            <div>
              <label className="text-xs font-bold text-slate-500">{t('pos.lineUnitPrice')}</label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-11 text-lg font-bold pe-10"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">ج.م</span>
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500">{t('pos.lineDiscountPct')}</label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="h-11 font-bold pe-8"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">{t('pos.lineDiscountAmt')}</label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-11 font-bold pe-10"
                  value={discountAmt}
                  onChange={(e) => setDiscountAmt(e.target.value)}
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">ج.م</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-center">
            <p className="text-xs text-blue-700">{t('pos.linePreviewTotal')}</p>
            <p className="text-2xl font-black text-blue-900">{preview.toFixed(2)}</p>
            {selectedSeller ? (
              <p className="text-xs text-emerald-700 mt-1 font-bold">{selectedSeller.full_name}</p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            className="bg-[#4169E1] hover:bg-[#3451b2]"
            onClick={() => {
              const seller = employees.find((e) => e.id === sellerId);
              const sellerSuffix = seller?.full_name ? ` [${seller.full_name}]` : '';
              const baseLabel = line.product_name
                ? `${line.product_name}${line.size_name ? ` — ${line.size_name}/${line.color_name}` : ''}`
                : line.label.replace(/\s*\[[^\]]+\]$/, '');
              onSave({
                unit_price: unitPrice,
                discount_percent: discountPct,
                discount_amount: discountAmt,
                seller_id: seller?.id,
                seller_name: seller?.full_name,
                label: seller ? `${baseLabel}${sellerSuffix}` : baseLabel,
              });
              onClose();
            }}
          >
            {t('pos.updateLine')}
          </Button>
        </div>
      </div>
    </div>
  );
}
