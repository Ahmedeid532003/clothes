import React, { useCallback, useRef, useState } from 'react';
import { RotateCcw, ScanBarcode, Search, Zap } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { PosCartLine } from '@/lib/api/pos';
import { lineSubtotal } from '../pos-utils';
import { playPosAddSound } from '../pos-click-sound';
import type { usePosSession } from '../usePosSession';

type Session = ReturnType<typeof usePosSession>;

type AccountSeller = { id?: string; full_name: string };

type Props = {
  session: Session;
  accountSeller: AccountSeller;
  customerId: string;
  customers: Array<{ id: string; name: string }>;
  onCustomerChange: (id: string) => void;
  discountPct: number;
  onDiscountChange: (v: number) => void;
  afterDiscount: number;
  finalTotal: number;
  cartItemCount: number;
  payGateError: string | null;
  onPay: () => void;
  onReset: () => void;
  onScanProduct: (code: string) => Promise<boolean>;
};

export function PosIntegratedStandaloneScreen({
  session,
  accountSeller,
  customerId,
  customers,
  onCustomerChange,
  discountPct,
  onDiscountChange,
  afterDiscount,
  finalTotal,
  cartItemCount,
  payGateError,
  onPay,
  onReset,
  onScanProduct,
}: Props) {
  const { t } = useLanguage();
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const bumpLine = useCallback(
    (line: PosCartLine, delta: number) => {
      if (delta > 0) session.bumpQty(line.key, delta);
      else if ((parseFloat(line.quantity) || 0) <= 1) session.removeLine(line.key);
      else session.bumpQty(line.key, delta);
    },
    [session],
  );

  const handleScan = async () => {
    const code = barcode.trim();
    if (!code) {
      inputRef.current?.focus();
      return;
    }
    const ok = await onScanProduct(code);
    if (ok) {
      playPosAddSound();
      setBarcode('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="pos-int-screen pos-int-standalone">
      <header className="pos-int-screen-head">
        <h2>{t('pos.integrated.standalone.title')}</h2>
        <p>{t('pos.integrated.standalone.subtitle', { seller: accountSeller.full_name })}</p>
      </header>

      <div className="pos-int-standalone-scan">
        <ScanBarcode className="h-6 w-6 text-emerald-600" />
        <input
          ref={inputRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleScan()}
          placeholder={t('pos.integrated.standalone.scanPlaceholder')}
          autoFocus
        />
        <button type="button" className="pos-integrated-scan-btn" onClick={() => void handleScan()}>
          <Zap className="h-3.5 w-3.5" />
          {t('pos.integrated.scan')}
        </button>
      </div>

      <div className="pos-int-standalone-layout">
        <section className="pos-int-panel pos-int-standalone-cart">
          <h3>{t('pos.integrated.standalone.invoiceLines')}</h3>
          <div className="pos-int-table-wrap">
            <table className="pos-int-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('pos.colName')}</th>
                  <th>{t('pos.colQty')}</th>
                  <th>{t('pos.colSubtotal')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {session.cart.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">{t('pos.cartEmpty')}</td>
                  </tr>
                ) : (
                  session.cart.map((line, idx) => (
                    <tr key={line.key}>
                      <td>{idx + 1}</td>
                      <td>
                        <span className="font-bold">{line.product_name || line.label}</span>
                        <span className="block text-[10px] text-slate-500">
                          {line.seller_name || accountSeller.full_name}
                        </span>
                      </td>
                      <td>
                        <div className="pos-int-inline-qty">
                          <button type="button" onClick={() => bumpLine(line, -1)}>−</button>
                          <span>{line.quantity}</span>
                          <button type="button" onClick={() => { bumpLine(line, 1); playPosAddSound(); }}>+</button>
                        </div>
                      </td>
                      <td className="amount">
                        {lineSubtotal(line.quantity, line.unit_price, line.discount_percent, line.discount_amount).toFixed(2)}
                      </td>
                      <td>
                        <button type="button" className="pos-int-line-del" onClick={() => session.removeLine(line.key)}>×</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="pos-integrated-checkout pos-int-standalone-checkout">
          <div className="pos-integrated-checkout-customer">
            <label>{t('pos.integrated.linkedCustomer')}</label>
            <select value={customerId} onChange={(e) => onCustomerChange(e.target.value)} aria-label={t('pos.integrated.linkedCustomer')}>
              <option value="">{t('pos.walkInCustomer')}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="pos-integrated-checkout-slider">
            <label>{t('pos.integrated.invoiceDiscountSlider')}</label>
            <div className="pos-integrated-slider-wrap" style={{ '--pct': `${(discountPct / 30) * 100}%` } as React.CSSProperties}>
              <span className="pos-integrated-slider-badge">{discountPct}%</span>
              <input type="range" min={0} max={30} value={discountPct} onChange={(e) => onDiscountChange(parseInt(e.target.value, 10))} aria-label={t('pos.integrated.invoiceDiscountSlider')} />
            </div>
          </div>
          <div className="pos-integrated-checkout-summary">
            <div className="row"><span>{t('pos.integrated.selectedItems')}</span><strong>{cartItemCount} {t('pos.pcs')}</strong></div>
            <div className="row"><span>{t('pos.integrated.baseTotal')}</span><strong>{afterDiscount.toFixed(2)}</strong></div>
          </div>
          <div className="pos-integrated-checkout-total">
            <span>{t('pos.grandTotal')}</span>
            <span className="amount">{finalTotal.toFixed(2)} {t('dashboard.currency')}</span>
          </div>
          {payGateError ? <p className="pos-integrated-checkout-error">{payGateError}</p> : null}
          <div className="pos-integrated-checkout-actions">
            <button type="button" className="pos-integrated-checkout-reset" onClick={onReset}><RotateCcw className="h-4 w-4" /></button>
            <button type="button" className="pos-integrated-checkout-pay" disabled={session.cart.length === 0 || session.loading} onClick={onPay}>
              {t('pos.integrated.payAndRegister')}
            </button>
          </div>
        </aside>
      </div>

      <p className="pos-int-standalone-hint">
        <Search className="inline h-3.5 w-3.5" /> {t('pos.integrated.standalone.hint')}
      </p>
    </div>
  );
}
