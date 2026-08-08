import React from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { PosCartLine } from '@/lib/api/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { lineSubtotal } from './pos-utils';

type CustomerOption = { id: string; name: string };

type Props = {
  cart: PosCartLine[];
  cartTotal: number;
  offerDiscountsTotal?: number;
  discount: string;
  onDiscountChange: (v: string) => void;
  customers: CustomerOption[];
  customerId: string;
  onCustomerChange: (id: string) => void;
  searchQ: string;
  onSearchQChange: (v: string) => void;
  onSearch?: () => void;
  onRemove: (key: string) => void;
  onUpdate: (key: string, patch: Partial<PosCartLine>) => void;
  onPay: () => void;
  onReset: () => void;
  paying?: boolean;
  payLabel?: string;
  compact?: boolean;
  showSeller?: boolean;
  sellerSection?: React.ReactNode;
  payGateError?: string | null;
  onEditLine?: (line: PosCartLine) => void;
};

export function PosCartPanel({
  cart,
  cartTotal,
  offerDiscountsTotal = 0,
  discount,
  onDiscountChange,
  customers,
  customerId,
  onCustomerChange,
  searchQ,
  onSearchQChange,
  onSearch,
  onRemove,
  onUpdate,
  onPay,
  onReset,
  paying,
  payLabel,
  compact,
  showSeller = true,
  sellerSection,
  payGateError,
  onEditLine,
}: Props) {
  const { t } = useLanguage();
  const disc = parseFloat(discount) || 0;
  const net = Math.max(cartTotal - disc, 0);

  return (
    <div className="pos-cart-panel">
      <div className="pos-cart-panel-head space-y-1.5">
        <div className="flex gap-2">
          <select
            className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-[#4169E1]"
            value={customerId}
            onChange={(e) => onCustomerChange(e.target.value)}
          >
            <option value="">{t('pos.walkInCustomer')}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" title={t('pos.addCustomer')}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {sellerSection}
        {!compact ? (
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQ}
              onChange={(e) => onSearchQChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
              placeholder={t('pos.cartSearchPlaceholder')}
              className="h-10 ps-9"
            />
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="pos-cart-panel-table w-full text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-8 px-2 py-2 text-center">#</th>
              <th className="px-2 py-2 text-start">{t('pos.colName')}</th>
              <th className="w-16 px-1 py-2 text-center">{t('pos.colQty')}</th>
              <th className="w-20 px-2 py-2 text-end">{t('pos.colSubtotal')}</th>
              <th className="w-16 px-1 py-2 text-center">{t('pos.colAction')}</th>
            </tr>
          </thead>
          <tbody>
            {cart.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-slate-400">
                  {t('pos.cartEmpty')}
                </td>
              </tr>
            ) : (
              cart.map((line, idx) => (
                <tr key={line.key} className="border-b border-slate-100 hover:bg-blue-50/30">
                  <td className="px-2 py-2 text-center text-xs text-slate-400">{idx + 1}</td>
                  <td className="px-2 py-2">
                    <p className="text-sm font-bold text-slate-800 leading-snug">{line.label}</p>
                    {showSeller && line.seller_name ? (
                      <span className="text-[10px] font-bold text-emerald-700">{line.seller_name}</span>
                    ) : showSeller && !line.seller_name ? (
                      <span className="text-[10px] font-bold text-red-600">{t('pos.noSeller')}</span>
                    ) : null}
                    <span className="mt-0.5 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-[#4169E1]">
                      {t('pos.avlQty')}: {line.available}
                    </span>
                  </td>
                  <td className="px-1 py-2">
                    <Input
                      className="h-8 w-14 text-center text-sm font-black"
                      value={line.quantity}
                      onChange={(e) => onUpdate(line.key, { quantity: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2 text-end text-sm font-black tabular-nums">
                    {lineSubtotal(line.quantity, line.unit_price, line.discount_percent).toFixed(2)}
                  </td>
                  <td className="px-1 py-2">
                    <div className="flex justify-center gap-0.5">
                      {onEditLine ? (
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4169E1] text-white hover:bg-[#3451b2]"
                          onClick={() => onEditLine(line)}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4169E1] text-white hover:bg-[#3451b2]"
                        onClick={() => onRemove(line.key)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pos-cart-panel-foot">
        <div className="mb-2 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase text-slate-500">{t('pos.invoiceDiscount')}</label>
            <Input
              className="h-9"
              value={discount}
              onChange={(e) => onDiscountChange(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="flex flex-col justify-end text-end text-xs text-slate-500">
            <span>{t('pos.items')}: {cart.length}</span>
            <span>{t('pos.beforeDiscount')}: {cartTotal.toFixed(2)}</span>
            {offerDiscountsTotal > 0 ? (
              <span className="font-bold text-orange-700">
                {t('pos.offerDiscountsTotal')}: {offerDiscountsTotal.toFixed(2)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-stretch gap-2">
          <div className="pos-cart-total-box">
            <span>{t('pos.grandTotal')}</span>
            <span>{net.toFixed(2)}</span>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            {payGateError ? (
              <p className="pos-alert pos-alert--error text-center text-xs">{payGateError}</p>
            ) : null}
            <Button
              className="pos-pay-btn flex-1 text-base"
              disabled={cart.length === 0 || paying}
              onClick={onPay}
            >
              {payLabel || t('pos.payNow')}
            </Button>
            <Button type="button" variant="outline" className="h-9" disabled={cart.length === 0} onClick={onReset}>
              {t('pos.reset')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
