import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, RefreshCw, UserRound, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { PosCartLine } from '@/lib/api/pos';
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
  variant?: 'default' | 'inline';
};

function sellerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function PosInvoiceSellerPick({
  seller,
  sellerCodeQ,
  onSellerCodeQChange,
  sellerCodeError,
  onLookupCode,
  cart = [],
  onApplyToLines,
  variant = 'default',
}: Props) {
  const { t } = useLanguage();
  const needsApply = cart.some((l) => !l.seller_id) && !!seller.defaultSeller;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const q = sellerCodeQ.trim().toLowerCase();
    if (!q) return seller.employees.slice(0, 5);
    return seller.employees
      .filter(
        (e) =>
          e.employee_code.toLowerCase().includes(q) ||
          (e.full_name || '').toLowerCase().includes(q) ||
          (e.username || '').toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [seller.employees, sellerCodeQ]);

  const quickPicks = useMemo(() => seller.employees.slice(0, 5), [seller.employees]);

  const showSuggest =
    focused &&
    !seller.defaultSeller &&
    suggestions.length > 0 &&
    (sellerCodeQ.trim().length > 0 || seller.employees.length <= 8);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const statusMessage = sellerCodeError
    ? { tone: 'error' as const, text: sellerCodeError }
    : seller.employeesError
      ? { tone: 'error' as const, text: seller.employeesError }
      : seller.employeesLoading
        ? { tone: 'info' as const, text: t('pos.sellersLoading') }
        : !seller.employeesLoading && seller.employees.length === 0
          ? { tone: 'warn' as const, text: t('pos.sellersEmpty') }
          : null;

  const activeName = seller.defaultSeller?.full_name || seller.defaultSeller?.username || '';

  return (
    <div
      ref={wrapRef}
      className={[
        'pos-seller-strip',
        variant === 'inline' ? 'pos-seller-strip--inline' : '',
        seller.defaultSeller ? 'pos-seller-strip--has-seller' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {seller.defaultSeller ? (
        <span className="pos-seller-avatar" aria-hidden>
          {sellerInitials(activeName)}
        </span>
      ) : (
        <UserRound className="h-4 w-4 shrink-0 text-[#2563eb]" aria-hidden />
      )}

      <div className="pos-seller-strip-head">
        {seller.defaultSeller ? <span className="pos-seller-status" aria-hidden /> : null}
        <span>{t('pos.invoiceSeller')}</span>
        <button
          type="button"
          title={t('inventory.refresh')}
          onClick={() => void seller.loadEmployees()}
        >
          <RefreshCw className={`h-3 w-3 ${seller.employeesLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="pos-seller-body">
        {seller.defaultSeller ? (
          <div className="pos-seller-active">
            <span className="pos-seller-active-code">{seller.defaultSeller.employee_code}</span>
            <span className="pos-seller-active-name">{activeName}</span>
            <button
              type="button"
              className="pos-seller-clear"
              aria-label={t('pos.selectSeller')}
              onClick={() => seller.setDefaultSellerId('')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="pos-seller-input-row">
            <input
              type="text"
              value={sellerCodeQ}
              placeholder={t('pos.sellerCodeHint')}
              autoComplete="off"
              onFocus={() => setFocused(true)}
              onChange={(e) => onSellerCodeQChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sellerCodeQ.trim() && onLookupCode()}
            />
            <button
              type="button"
              className="pos-seller-confirm"
              disabled={!sellerCodeQ.trim() || seller.employeesLoading}
              onClick={onLookupCode}
              aria-label={t('pos.sellerConfirmAdd')}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
          </div>
        )}

        {showSuggest ? (
          <div className="pos-seller-suggest" role="listbox">
            {suggestions.map((e) => (
              <button
                key={e.id}
                type="button"
                role="option"
                onClick={() => {
                  seller.setDefaultSellerId(e.id);
                  onSellerCodeQChange('');
                  setFocused(false);
                }}
              >
                <span className="pos-seller-suggest-code">{e.employee_code}</span>
                <span className="pos-seller-suggest-name">{e.full_name || e.username}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!seller.defaultSeller && quickPicks.length > 0 && variant === 'default' ? (
        <div className="pos-seller-quick">
          {quickPicks.map((e) => (
            <button
              key={e.id}
              type="button"
              className={`pos-seller-quick-chip${seller.defaultSellerId === e.id ? ' is-active' : ''}`}
              title={e.full_name || e.username}
              onClick={() => seller.setDefaultSellerId(e.id)}
            >
              <span>{e.employee_code.slice(-3)}</span>
              <span className="max-w-[4rem] truncate">{e.full_name || e.username}</span>
            </button>
          ))}
        </div>
      ) : null}

      {(statusMessage || needsApply) && variant === 'default' ? (
        <div className="pos-seller-meta">
          {statusMessage ? (
            <p className={`pos-seller-msg pos-seller-msg--${statusMessage.tone}`}>{statusMessage.text}</p>
          ) : null}
          {needsApply && onApplyToLines ? (
            <button type="button" className="pos-seller-apply" onClick={onApplyToLines}>
              {t('pos.applySellerToLines')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
