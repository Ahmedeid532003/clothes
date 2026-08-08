import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Banknote,
  CreditCard,
  Receipt,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { PosCartLine } from '@/lib/api/pos';
import { lineSubtotal } from './pos-utils';

type PayMethod = 'cash' | 'fawry' | 'wallet' | 'card';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    paymentMethod: string;
    payments: Array<{ payment_method: string; amount: string; reference: string }>;
  }) => void;
  saving?: boolean;
  cart: PosCartLine[];
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  customerName: string;
  cashierName: string;
  storeName: string;
  branchName?: string;
};

function genInvoiceCode() {
  return `INV-${String(Date.now()).slice(-5)}`;
}

function genFawryCode() {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

function ReceiptQr() {
  const cells = Array.from({ length: 64 }, (_, i) => ((i * 7 + 13) % 5) < 2);
  return (
    <div className="pos-pay-qr" aria-hidden>
      {cells.map((dark, i) => (
        <span key={i} className={dark ? 'dark' : ''} />
      ))}
    </div>
  );
}

export function PosIntegratedPaymentModal({
  open,
  onClose,
  onConfirm,
  saving,
  cart,
  subtotal,
  discountAmount,
  finalTotal,
  customerName,
  cashierName,
  storeName,
  branchName,
}: Props) {
  const { t, isRtl, locale } = useLanguage();
  const [method, setMethod] = useState<PayMethod>('cash');
  const [cashPaid, setCashPaid] = useState('');
  const [walletPhone, setWalletPhone] = useState('');
  const [cardName, setCardName] = useState('MOHAMED AHMED');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [fawryCode] = useState(() => genFawryCode());
  const [invoiceCode] = useState(() => genInvoiceCode());
  const [error, setError] = useState<string | null>(null);

  const nowLabel = useMemo(
    () =>
      new Date().toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
    [locale, open],
  );

  useEffect(() => {
    if (!open) return;
    setMethod('cash');
    setCashPaid(finalTotal.toFixed(1));
    setWalletPhone('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setError(null);
  }, [open, finalTotal]);

  if (!open) return null;

  const paidNum = parseFloat(cashPaid) || 0;
  const change = Math.max(paidNum - finalTotal, 0);

  const handleConfirm = (quick = false) => {
    setError(null);
    const totalStr = finalTotal.toFixed(2);

    if (quick || method === 'cash') {
      const paid = quick ? finalTotal : paidNum;
      if (!quick && paid < finalTotal - 0.01) {
        setError(t('pos.integrated.payModal.cashInsufficient'));
        return;
      }
      onConfirm({
        paymentMethod: 'cash',
        payments: [{ payment_method: 'cash', amount: totalStr, reference: '' }],
      });
      return;
    }

    if (method === 'fawry') {
      onConfirm({
        paymentMethod: 'fawry',
        payments: [{ payment_method: 'fawry', amount: totalStr, reference: fawryCode }],
      });
      return;
    }

    if (method === 'wallet') {
      if (!/^01\d{9}$/.test(walletPhone.replace(/\s/g, ''))) {
        setError(t('pos.integrated.payModal.walletInvalid'));
        return;
      }
      onConfirm({
        paymentMethod: 'wallet',
        payments: [{ payment_method: 'wallet', amount: totalStr, reference: walletPhone }],
      });
      return;
    }

    if (!cardName.trim() || cardNumber.replace(/\s/g, '').length < 12) {
      setError(t('pos.integrated.payModal.cardInvalid'));
      return;
    }
    onConfirm({
      paymentMethod: 'card',
      payments: [
        {
          payment_method: 'card',
          amount: totalStr,
          reference: `${cardName.trim()}|${cardNumber.replace(/\s/g, '').slice(-4)}`,
        },
      ],
    });
  };

  const methods: { id: PayMethod; label: string; icon: React.ReactNode }[] = [
    { id: 'cash', label: t('pos.payCash'), icon: <Banknote className="h-6 w-6" /> },
    { id: 'fawry', label: t('pos.integrated.payModal.fawry'), icon: <Receipt className="h-6 w-6" /> },
    { id: 'wallet', label: t('pos.integrated.payModal.wallet'), icon: <Smartphone className="h-6 w-6" /> },
    { id: 'card', label: t('pos.integrated.payModal.card'), icon: <CreditCard className="h-6 w-6" /> },
  ];

  const modal = (
    <div className="pos-pay-overlay" dir={isRtl ? 'rtl' : 'ltr'} role="dialog" aria-modal="true">
      <button type="button" className="pos-pay-overlay-backdrop" onClick={onClose} aria-label={t('pos.cancelSale')} />
      <div className="pos-pay-modal">
        <button type="button" className="pos-pay-close" onClick={onClose} aria-label={t('pos.cancelSale')}>
          <X className="h-5 w-5" />
        </button>

        <div className="pos-pay-layout">
          {/* Receipt preview */}
          <aside className="pos-pay-receipt">
            <span className="pos-pay-receipt-badge">{t('pos.integrated.payModal.receiptPreview')}</span>
            <h3 className="pos-pay-receipt-store">{storeName}</h3>
            <p className="pos-pay-receipt-meta">
              {branchName || t('pos.integrated.payModal.mainBranch')}
              <br />
              {t('pos.integrated.payModal.taxId')}: 123-456-789
              <br />
              {t('pos.integrated.payModal.cr')}: 987654
            </p>
            <div className="pos-pay-receipt-lines">
              <div className="row">
                <span>{t('pos.integrated.payModal.dateTime')}</span>
                <span>{nowLabel}</span>
              </div>
              <div className="row">
                <span>{t('pos.integrated.payModal.invoiceNo')}</span>
                <span>{invoiceCode}</span>
              </div>
              <div className="row">
                <span>{t('pos.integrated.payModal.cashier')}</span>
                <span>{cashierName}</span>
              </div>
              <div className="row">
                <span>{t('pos.integrated.payModal.customer')}</span>
                <span>{customerName}</span>
              </div>
            </div>
            <table className="pos-pay-receipt-table">
              <thead>
                <tr>
                  <th>{t('pos.colName')}</th>
                  <th>{t('pos.colQty')}</th>
                  <th>{t('pos.colSubtotal')}</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((line) => (
                  <tr key={line.key}>
                    <td>{line.product_name || line.label}</td>
                    <td>{line.quantity}</td>
                    <td>
                      {lineSubtotal(line.quantity, line.unit_price, line.discount_percent, line.discount_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pos-pay-receipt-totals">
              <div className="row">
                <span>{t('pos.integrated.payModal.subtotal')}</span>
                <span>{subtotal.toFixed(2)} {t('dashboard.currency')}</span>
              </div>
              {discountAmount > 0 ? (
                <div className="row">
                  <span>{t('pos.invoiceDiscount')}</span>
                  <span>-{discountAmount.toFixed(2)} {t('dashboard.currency')}</span>
                </div>
              ) : null}
              <div className="row grand">
                <span>{t('pos.grandTotal')}</span>
                <span>{finalTotal.toFixed(2)} {t('dashboard.currency')}</span>
              </div>
            </div>
            <ReceiptQr />
            <p className="pos-pay-receipt-thanks">{t('pos.integrated.payModal.thanks')}</p>
          </aside>

          {/* Payment gateway */}
          <section className="pos-pay-gateway">
            <header className="pos-pay-gateway-head">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
              <h2>{t('pos.integrated.payModal.gatewayTitle')}</h2>
            </header>

            <div className="pos-pay-top-row">
              <button
                type="button"
                className="pos-pay-quick-btn"
                disabled={saving}
                onClick={() => handleConfirm(true)}
              >
                <Zap className="h-4 w-4" />
                {t('pos.integrated.payModal.quickPay')}
                <Sparkles className="h-4 w-4 opacity-80" />
              </button>
              <div className="pos-pay-amount-box">
                <span>{t('pos.integrated.payModal.amountDue')}</span>
                <strong>{finalTotal.toFixed(2)} {t('dashboard.currency')}</strong>
              </div>
            </div>

            <div className="pos-pay-methods">
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`pos-pay-method${method === m.id ? ' is-active' : ''}`}
                  onClick={() => setMethod(m.id)}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            <div className="pos-pay-method-body">
              {method === 'cash' ? (
                <>
                  <div className="pos-pay-info-box">
                    <Banknote className="h-8 w-8 text-emerald-600" />
                    <div>
                      <strong>{t('pos.integrated.payModal.cashTitle')}</strong>
                      <p>{t('pos.integrated.payModal.cashHint')}</p>
                    </div>
                  </div>
                  <label className="pos-pay-field">
                    <span>{t('pos.integrated.payModal.cashPaid')}</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={cashPaid}
                      onChange={(e) => setCashPaid(e.target.value)}
                    />
                  </label>
                  {change > 0 ? (
                    <p className="pos-pay-change">
                      {t('pos.integrated.payModal.change')}: <strong>{change.toFixed(2)}</strong> {t('dashboard.currency')}
                    </p>
                  ) : null}
                </>
              ) : null}

              {method === 'fawry' ? (
                <>
                  <div className="pos-pay-info-box pos-pay-info-box--amber">
                    <p>{t('pos.integrated.payModal.fawryHint')}</p>
                  </div>
                  <div className="pos-pay-fawry-code">
                    <span>{t('pos.integrated.payModal.fawryRef')}</span>
                    <strong>{fawryCode}</strong>
                  </div>
                </>
              ) : null}

              {method === 'wallet' ? (
                <>
                  <div className="pos-pay-info-box">
                    <Smartphone className="h-8 w-8 text-pink-500" />
                    <div>
                      <strong>{t('pos.integrated.payModal.walletTitle')}</strong>
                      <p>{t('pos.integrated.payModal.walletHint')}</p>
                    </div>
                  </div>
                  <label className="pos-pay-field">
                    <span>{t('pos.integrated.payModal.walletPhone')}</span>
                    <div className="pos-pay-phone-row">
                      <span className="prefix">+20</span>
                      <input
                        type="tel"
                        placeholder="01xxxxxxxxx"
                        value={walletPhone}
                        onChange={(e) => setWalletPhone(e.target.value)}
                      />
                    </div>
                  </label>
                </>
              ) : null}

              {method === 'card' ? (
                <>
                  <div className="pos-pay-card-visual">
                    <div className="chip" />
                    <span className="brand">VISA</span>
                    <span className="num">•••• •••• •••• ••••</span>
                    <span className="exp">MM/YY</span>
                  </div>
                  <label className="pos-pay-field">
                    <span>{t('pos.integrated.payModal.cardName')}</span>
                    <input value={cardName} onChange={(e) => setCardName(e.target.value)} />
                  </label>
                  <label className="pos-pay-field">
                    <span>{t('pos.integrated.payModal.cardNumber')}</span>
                    <input
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </label>
                  <div className="pos-pay-card-row">
                    <label className="pos-pay-field">
                      <span>{t('pos.integrated.payModal.cardExpiry')}</span>
                      <input placeholder="MM/YY" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} />
                    </label>
                    <label className="pos-pay-field">
                      <span>CVV</span>
                      <input placeholder="•••" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} />
                    </label>
                  </div>
                </>
              ) : null}
            </div>

            {error ? <p className="pos-pay-error">{error}</p> : null}

            <div className="pos-pay-actions">
              <button type="button" className="pos-pay-cancel" onClick={onClose} disabled={saving}>
                {t('pos.cancelSale')}
              </button>
              <button
                type="button"
                className="pos-pay-confirm"
                disabled={saving}
                onClick={() => handleConfirm(false)}
              >
                <ShieldCheck className="h-5 w-5" />
                {saving ? t('pos.integrated.payModal.processing') : t('pos.integrated.payModal.confirmPay')}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
