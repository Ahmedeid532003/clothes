import React from 'react';
import { PaymentAmountHero } from '@/components/accounting/PaymentAmountHero';
import type { SupplierPaymentDto } from '@/lib/api/suppliers';
import { splitMoneyHero } from '@/lib/money';

export type PaymentVoucherLabels = {
  title: string;
  voucherNo: string;
  date: string;
  supplier: string;
  amount: string;
  method: string;
  reason: string;
  status: string;
  approved: string;
  company: string;
  footer: string;
};

type Props = {
  payment: SupplierPaymentDto;
  labels: PaymentVoucherLabels;
  methodLabel: string;
  statusLabel: string;
  locale: 'ar' | 'en';
};

export function buildPaymentVoucherHtml(
  payment: SupplierPaymentDto,
  labels: PaymentVoucherLabels,
  methodLabel: string,
  statusLabel: string,
  locale: 'ar' | 'en',
): string {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const { main: amountMain, decimal: amountDec } = splitMoneyHero(payment.amount, locale);
  const reason = payment.notes?.trim() || '—';

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${labels.title} — ${payment.code}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      background: #f1f5f9;
      color: #0f172a;
    }
    .sheet {
      max-width: 520px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(15,23,42,.12);
    }
    .head {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #2563eb 100%);
      color: #fff;
      padding: 28px 32px 24px;
    }
    .head h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; }
    .head p { margin: 0; opacity: .85; font-size: 13px; }
    .badge {
      display: inline-block;
      margin-top: 14px;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,.15);
      font-size: 12px;
      font-weight: 600;
    }
    .amount-block {
      text-align: center;
      padding: 32px 24px 28px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .amount-label { font-size: 13px; color: #64748b; margin-bottom: 8px; }
    .amount-value {
      display: inline-flex;
      align-items: flex-start;
      justify-content: center;
      gap: 2px;
      direction: ltr;
      unicode-bidi: isolate;
      font-weight: 900;
      color: #047857;
      line-height: 1;
      text-shadow: 0 4px 24px rgba(5, 150, 105, 0.22);
    }
    .amount-main {
      font-size: clamp(48px, 9vw, 72px);
      letter-spacing: -0.03em;
    }
    .amount-dec {
      font-size: clamp(22px, 4vw, 34px);
      margin-top: 0.45em;
      opacity: 0.82;
      font-weight: 800;
    }
    .amount-currency {
      font-size: 15px;
      color: #64748b;
      margin-top: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      padding: 24px 28px;
    }
    .field { }
    .field.full { grid-column: 1 / -1; }
    .field label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .field span {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
    }
    .reason-box {
      margin: 0 28px 28px;
      padding: 16px 18px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .reason-box label {
      display: block;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .reason-box p { margin: 0; font-size: 14px; line-height: 1.6; color: #334155; }
    .foot {
      padding: 16px 28px 24px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      border-top: 1px solid #f1f5f9;
    }
    .no-print {
      text-align: center;
      padding: 16px;
    }
    .no-print button {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 12px 32px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; max-width: 100%; border-radius: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button type="button" onclick="window.print()">${locale === 'ar' ? 'طباعة' : 'Print'}</button>
  </div>
  <div class="sheet">
    <div class="head">
      <h1>${labels.title}</h1>
      <p>${labels.company}</p>
      <span class="badge">${labels.voucherNo}: ${payment.code}</span>
    </div>
    <div class="amount-block">
      <div class="amount-label">${labels.amount}</div>
      <div class="amount-value"><span class="amount-main">${amountMain}</span><span class="amount-dec">.${amountDec}</span></div>
      <div class="amount-currency">${locale === 'ar' ? 'جنيه مصري' : 'EGP'}</div>
    </div>
    <div class="grid">
      <div class="field full">
        <label>${labels.supplier}</label>
        <span>${payment.supplier_name}</span>
      </div>
      <div class="field">
        <label>${labels.date}</label>
        <span>${payment.payment_date}</span>
      </div>
      <div class="field">
        <label>${labels.method}</label>
        <span>${methodLabel}</span>
      </div>
      <div class="field">
        <label>${labels.status}</label>
        <span>${statusLabel}</span>
      </div>
      ${
        payment.approved_at
          ? `<div class="field full"><label>${labels.approved}</label><span>${payment.approved_at.slice(0, 16).replace('T', ' ')}</span></div>`
          : ''
      }
    </div>
    <div class="reason-box">
      <label>${labels.reason}</label>
      <p>${reason.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>
    <div class="foot">${labels.footer}</div>
  </div>
</body>
</html>`;
}

export function printSupplierPaymentVoucher(
  payment: SupplierPaymentDto,
  labels: PaymentVoucherLabels,
  methodLabel: string,
  statusLabel: string,
  locale: 'ar' | 'en',
) {
  const html = buildPaymentVoucherHtml(payment, labels, methodLabel, statusLabel, locale);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

export function SupplierPaymentVoucherPreview({
  payment,
  labels,
  methodLabel,
  statusLabel,
  locale,
}: Props) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 overflow-hidden bg-white shadow-lg max-w-md mx-auto">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 px-6 py-5 text-white">
        <p className="text-xs text-blue-200/90">{labels.company}</p>
        <h3 className="text-lg font-bold mt-1">{labels.title}</h3>
        <p className="text-xs mt-2 opacity-80 font-mono">{payment.code}</p>
      </div>
      <div className="text-center py-8 px-4 border-b border-dashed border-slate-200 bg-gradient-to-b from-emerald-50/40 to-white">
        <p className="text-sm text-slate-500 mb-2">{labels.amount}</p>
        <PaymentAmountHero
          amount={payment.amount}
          locale={locale}
          size="xl"
          currencyLabel={locale === 'ar' ? 'جنيه مصري' : 'EGP'}
        />
      </div>
      <div className="p-5 space-y-3 text-sm">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">{labels.supplier}</p>
          <p className="font-semibold text-slate-900">{payment.supplier_name}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-400">{labels.date}</p>
            <p className="font-medium">{payment.payment_date}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">{labels.method}</p>
            <p className="font-medium">{methodLabel}</p>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs font-medium text-slate-500 mb-1">{labels.reason}</p>
          <p className="text-slate-800 leading-relaxed">{payment.notes?.trim() || '—'}</p>
        </div>
        <p className="text-xs text-slate-500">
          {labels.status}: <span className="font-semibold">{statusLabel}</span>
        </p>
      </div>
    </div>
  );
}
