import React from 'react';
import { X, Printer } from 'lucide-react';
import type { InstallmentReceipt } from '@/lib/api/receivables';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { printPosInstallmentReceipt } from '@/lib/print/posInstallmentReceiptPrint';
import { fmtPosAmount, parsePosAmount } from './pos-utils';

type Props = {
  open: boolean;
  receipt: InstallmentReceipt | null;
  userName?: string;
  onClose: () => void;
};

function money(v: string | number) {
  return fmtPosAmount(typeof v === 'number' ? v : parsePosAmount(v));
}

export function PosInstallmentReceiptDetail({ open, receipt, userName, onClose }: Props) {
  const { t } = useLanguage();
  if (!receipt) return null;

  const grandLabel =
    receipt.grand_total_label ||
    (receipt.show_interest_on_receipt ? 'الإجمالي العام' : 'اجمالى نقدي+قيمه الفوائد');

  const cell = 'border border-slate-400 px-3 py-2.5 text-sm font-bold bg-white';
  const label = `${cell} text-slate-800`;
  const value = `${cell} text-end font-black tabular-nums`;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[720px] p-0 flex flex-col gap-0 border-s-0 h-full max-h-[100dvh] overflow-hidden [&>button]:hidden"
      >
        <div className="flex items-center justify-between bg-[#4169E1] px-4 py-3.5 text-white shrink-0">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-base font-black">{t('pos.saleReceiptDetail')}</h2>
          <span className="w-9" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 bg-white">
          <div className="flex justify-between text-xs font-bold text-slate-600">
            <span>{t('pos.receiptDate')}: {new Date().toLocaleString('ar-EG')}</span>
            {userName ? <span>{t('pos.receiptUser')}: {userName}</span> : null}
          </div>

          <p className="text-center text-sm font-black text-slate-800">
            {receipt.customer_name} — {receipt.sale_code}
          </p>

          {receipt.items?.length ? (
            <table className="w-full border-collapse text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
              <thead>
                <tr>
                  <th className={`${cell} text-start`}>{t('pos.receiptItem')}</th>
                  <th className={cell}>{t('pos.paymentQtyTotal')}</th>
                  <th className={`${cell} text-end`}>{t('pos.installmentAmount')}</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((ln, i) => (
                  <tr key={i}>
                    <td className={label}>{ln.product_name}</td>
                    <td className={`${value} text-center`}>{ln.quantity}</td>
                    <td className={value}>{money(ln.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          <table className="w-full border-collapse text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            <tbody>
              <tr>
                <td className={label}>{t('pos.receiptItemsTotal')}</td>
                <td className={value}>{money(receipt.subtotal)}</td>
              </tr>
              {receipt.show_interest_on_receipt ? (
                <tr>
                  <td className={label}>{t('pos.receiptInterest')}</td>
                  <td className={value}>{money(receipt.interest_amount)}</td>
                </tr>
              ) : null}
              <tr>
                <td className={label}>{grandLabel}</td>
                <td className={value}>{money(receipt.grand_total)}</td>
              </tr>
              <tr>
                <td className={label}>{t('pos.receiptCreditFromInvoice')}</td>
                <td className={value}>{money(receipt.credit_from_invoice)}</td>
              </tr>
              <tr>
                <td className={label}>{t('pos.receiptPreviousBalance')}</td>
                <td className={value}>{money(receipt.previous_balance)}</td>
              </tr>
              <tr>
                <td className={label}>{t('pos.receiptCollected')}</td>
                <td className={`${value} text-emerald-700`}>{money(receipt.down_payment_collected)}</td>
              </tr>
            </tbody>
          </table>

          <div className="rounded-xl border-4 border-black bg-blue-50 px-4 py-5 text-center">
            <p className="text-sm font-black text-slate-700 mb-1">{t('pos.receiptCurrentBalance')}</p>
            <p className="text-4xl font-black tabular-nums text-blue-900">{money(receipt.current_balance)}</p>
          </div>

          <p className="text-center text-sm font-black text-slate-800">{t('pos.receiptScheduleTitle')}</p>
          <table className="w-full border-collapse text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            <thead>
              <tr>
                <th className={cell}>{t('pos.installmentMonth')}</th>
                {receipt.show_penalty_on_receipt ? (
                  <>
                    <th className={cell}>{t('pos.installmentAmount')}</th>
                    <th className={cell}>{t('pos.receiptPenalty')}</th>
                    <th className={`${cell} text-end`}>{t('pos.receiptInstallmentTotal')}</th>
                  </>
                ) : (
                  <th className={`${cell} text-end`}>{t('pos.installmentAmount')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(receipt.schedule ?? []).map((ln, i) => (
                <tr key={i}>
                  <td className={label}>{ln.due_month_label}</td>
                  {receipt.show_penalty_on_receipt ? (
                    <>
                      <td className={value}>
                        {money(
                          Math.max(
                            parsePosAmount(ln.amount_due) - parsePosAmount(ln.penalty_amount || '0'),
                            0,
                          ),
                        )}
                      </td>
                      <td className={value}>{money(ln.penalty_amount || '0')}</td>
                      <td className={value}>{money(ln.total_amount)}</td>
                    </>
                  ) : (
                    <td className={value}>{money(ln.amount_due)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <table className="w-full border-collapse text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            <tbody>
              <tr>
                <td className={label}>{t('pos.receiptInstallmentsCount')}</td>
                <td className={value}>{receipt.total_installments_count}</td>
              </tr>
              <tr>
                <td className={label}>{t('pos.receiptRemainingInstallments')}</td>
                <td className={`${value} text-xl text-blue-900`}>
                  {money(receipt.remaining_installments_total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="shrink-0 bg-[#4169E1] px-4 py-4 flex gap-3">
          <Button
            className="h-11 flex-1 rounded-xl bg-sky-300 font-black text-slate-900 hover:bg-sky-400"
            onClick={() => printPosInstallmentReceipt(receipt, userName)}
          >
            <Printer className="h-4 w-4 me-2" />
            {t('pos.receiptPrint')}
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl border-0 bg-white font-black text-[#4169E1]"
            onClick={onClose}
          >
            {t('common.close')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
