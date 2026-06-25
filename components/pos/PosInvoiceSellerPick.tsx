import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { PosCartLine } from '@/lib/api/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { usePosSellerScan } from './usePosSellerScan';

type SellerHook = ReturnType<typeof usePosSellerScan>;

type Props = {
  seller: SellerHook;
  sellerCodeQ: string;
  onSellerCodeQChange: (v: string) => void;
  sellerCodeError?: string | null;
  onLookupCode: () => void;
  cart?: PosCartLine[];
  onApplyToLines?: () => void;
};

export function PosInvoiceSellerPick({
  seller,
  sellerCodeQ,
  onSellerCodeQChange,
  sellerCodeError,
  onLookupCode,
  cart = [],
  onApplyToLines,
}: Props) {
  const { t } = useLanguage();
  const needsApply = cart.some((l) => !l.seller_id) && !!seller.defaultSeller;

  return (
    <div className="w-full rounded-xl border-2 border-emerald-400 bg-gradient-to-b from-emerald-50 to-white p-2.5 space-y-2 shadow-sm">
      <label className="flex items-center justify-between gap-2 text-[10px] font-black uppercase text-emerald-900">
        <span>{t('pos.invoiceSeller')}</span>
        <button
          type="button"
          className="rounded p-0.5 text-emerald-700 hover:bg-emerald-100"
          title={t('inventory.refresh')}
          onClick={() => void seller.loadEmployees()}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${seller.employeesLoading ? 'animate-spin' : ''}`} />
        </button>
      </label>
      <select
        className="h-10 w-full rounded-lg border border-emerald-300 bg-white px-2 text-sm font-bold shadow-sm"
        value={seller.defaultSellerId}
        onChange={(e) => seller.setDefaultSellerId(e.target.value)}
        disabled={seller.employeesLoading}
      >
        <option value="">
          {seller.employeesLoading ? t('pos.sellersLoading') : t('pos.selectSeller')}
        </option>
        {seller.employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.employee_code} — {e.full_name || e.username}
          </option>
        ))}
      </select>
      {seller.employees.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto">
          {seller.employees.map((e) => (
            <button
              key={e.id}
              type="button"
              title={e.full_name || e.username}
              className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold transition text-start truncate ${
                seller.defaultSellerId === e.id
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-100'
              }`}
              onClick={() => seller.setDefaultSellerId(e.id)}
            >
              <span className="block font-mono">{e.employee_code}</span>
              <span
                className={`block truncate text-[10px] ${
                  seller.defaultSellerId === e.id ? 'text-emerald-100' : 'text-slate-600'
                }`}
              >
                {e.full_name || e.username}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex gap-1">
        <Input
          className="h-9 flex-1 font-mono text-sm font-bold bg-white"
          placeholder={t('pos.sellerCodeHint')}
          value={sellerCodeQ}
          onChange={(e) => onSellerCodeQChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onLookupCode()}
        />
        <Button
          type="button"
          variant="outline"
          className="h-9 shrink-0 border-emerald-400 font-bold text-emerald-900 bg-white"
          disabled={!sellerCodeQ.trim()}
          onClick={onLookupCode}
        >
          ✓
        </Button>
      </div>
      {seller.defaultSeller ? (
        <p className="text-xs font-bold text-emerald-900 text-center">
          ✓ {seller.defaultSeller.employee_code} — {seller.defaultSeller.full_name}
        </p>
      ) : null}
      {seller.employeesLoading ? (
        <p className="text-xs font-bold text-slate-500 text-center">{t('pos.sellersLoading')}</p>
      ) : null}
      {!seller.employeesLoading && seller.employees.length === 0 ? (
        <p className="text-xs font-bold text-amber-800 text-center leading-snug">{t('pos.sellersEmpty')}</p>
      ) : null}
      {seller.employeesError ? (
        <p className="text-xs font-bold text-red-700 text-center">{seller.employeesError}</p>
      ) : null}
      {sellerCodeError ? (
        <p className="text-xs font-bold text-red-700 text-center">{sellerCodeError}</p>
      ) : null}
      {needsApply && onApplyToLines ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full border-emerald-400 text-xs font-bold text-emerald-900 bg-white"
          onClick={onApplyToLines}
        >
          {t('pos.applySellerToLines')}
        </Button>
      ) : null}
    </div>
  );
}
