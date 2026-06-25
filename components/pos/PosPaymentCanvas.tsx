import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  receivablesApi,
  type InstallmentPlan,
  type InstallmentPlanPreview,
} from '@/lib/api/receivables';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { fmtPosAmount, newLocalId, parsePosAmount } from './pos-utils';
import { PosInvoiceActionBar } from './PosInvoiceActionCards';

const PAYMENT_METHODS = [
  { id: 'cash', labelKey: 'pos.payCashLine' },
  { id: 'wallet', labelKey: 'pos.payWalletLine' },
  { id: 'card', labelKey: 'pos.payVisaLine' },
] as const;

type PaymentRow = { id: string; payment_method: string; amount: string; reference: string };

type Props = {
  open: boolean;
  onClose: () => void;
  netTotal: number;
  itemCount: number;
  qtyTotal: number;
  isCashCustomer: boolean;
  customerBalance?: number;
  saving?: boolean;
  checkoutError?: string | null;
  docSaving?: boolean;
  onReserve?: (deposit: { amount: string; method: string }) => void;
  onQuotation?: () => void;
  onDelivery?: () => void;
  onConfirm: (payload: {
    payments: Array<{ payment_method: string; amount: string; reference: string }>;
    paymentMethod: string;
    installmentPlanId?: string;
    downPaymentAmount?: string;
    numInstallments?: number;
  }) => void;
};

function newRow(method: string): PaymentRow {
  return { id: newLocalId('pay'), payment_method: method, amount: '', reference: '' };
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

const SHEET_SHELL =
  'w-full sm:max-w-[780px] p-0 flex flex-col gap-0 border-s-0 h-full max-h-[100dvh] overflow-hidden [&>button]:hidden';

export function PosPaymentCanvas({
  open,
  onClose,
  netTotal,
  itemCount,
  qtyTotal,
  isCashCustomer,
  customerBalance = 0,
  saving,
  checkoutError,
  docSaving,
  onReserve,
  onQuotation,
  onDelivery,
  onConfirm,
}: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const invoiceTotal = Math.max(Number(netTotal) || 0, 0);
  const [payments, setPayments] = useState<PaymentRow[]>([newRow('cash'), newRow('card')]);
  const [addMethod, setAddMethod] = useState('wallet');
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [planId, setPlanId] = useState('');
  const [preview, setPreview] = useState<InstallmentPlanPreview | null>(null);
  const [downPayment, setDownPayment] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [saveError, setSaveError] = useState('');

  const resetState = useCallback(() => {
    setSaveError('');
    setPreviewError('');
    setPayments([newRow('cash'), newRow('card')]);
    setPlanId('');
    setPreview(null);
    setDownPayment('');
  }, []);

  useEffect(() => {
    if (!open) return;
    resetState();
    if (!isCashCustomer) {
      receivablesApi.installmentPlans(true).then(setPlans).catch(() => setPlans([]));
    }
  }, [open, isCashCustomer, resetState]);

  const fetchPreview = useCallback(
    async (pid: string, explicitDown?: string) => {
      if (!pid || invoiceTotal <= 0) {
        setPreview(null);
        return;
      }
      setPreviewLoading(true);
      setPreviewError('');
      try {
        const p = await receivablesApi.previewInstallmentPlan({
          plan: pid,
          principal: invoiceTotal.toFixed(2),
          down_payment: explicitDown || undefined,
        });
        setPreview(p);
        setDownPayment(explicitDown ?? p.down_payment_amount);
      } catch {
        setPreview(null);
        setPreviewError(t('pos.installmentPreviewFailed'));
      } finally {
        setPreviewLoading(false);
      }
    },
    [invoiceTotal, t],
  );

  useEffect(() => {
    if (!open || isCashCustomer || !planId) return;
    fetchPreview(planId);
  }, [open, isCashCustomer, planId, invoiceTotal, fetchPreview]);

  useEffect(() => {
    if (!open || isCashCustomer || !planId || !downPayment.trim()) return;
    const timer = setTimeout(() => fetchPreview(planId, downPayment), 500);
    return () => clearTimeout(timer);
  }, [downPayment, open, isCashCustomer, planId, fetchPreview]);

  const requiredDown = useMemo(() => {
    if (isCashCustomer) return invoiceTotal;
    const fromField = parsePosAmount(downPayment);
    if (fromField > 0) return fromField;
    return parsePosAmount(preview?.down_payment_amount || '0');
  }, [isCashCustomer, invoiceTotal, downPayment, preview]);

  const paidTotal = useMemo(
    () => roundMoney(payments.reduce((s, p) => s + parsePosAmount(p.amount), 0)),
    [payments],
  );

  const remaining = Math.max(roundMoney(invoiceTotal) - paidTotal, 0);
  const minPayRequired = isCashCustomer ? invoiceTotal : requiredDown;

  const canSave = useMemo(() => {
    if (minPayRequired <= 0) return false;
    if (Math.abs(paidTotal - roundMoney(minPayRequired)) > 0.02) return false;
    if (paidTotal <= 0) return false;
    if (!isCashCustomer && (!planId || !preview)) return false;
    return true;
  }, [minPayRequired, paidTotal, isCashCustomer, planId, preview]);

  const installmentCredit = preview ? parsePosAmount(preview.installments_total) : 0;
  const previewCurrentBalance = roundMoney(customerBalance + installmentCredit - paidTotal);
  const scheduleTotal = preview
    ? preview.schedule.reduce((s, ln) => s + parsePosAmount(ln.amount), 0)
    : 0;
  const showPenalty = preview?.plan?.show_penalty_on_receipt ?? false;
  const penaltyAmount = preview ? parsePosAmount(preview.plan.penalty_fixed_amount) : 0;

  const updateAmount = (id: string, amount: string) => {
    setSaveError('');
    setPayments((rows) =>
      rows.map((r) => (r.id === id ? { ...r, amount: amount.replace(/[^\d.٠-٩]/g, '') } : r)),
    );
  };

  const fillRequiredPayment = () => {
    if (minPayRequired <= 0) return;
    const amt = String(roundMoney(minPayRequired));
    setPayments((rows) => {
      const idx = rows.findIndex((r) => r.payment_method === 'cash');
      const target = idx >= 0 ? idx : 0;
      return rows.map((r, i) => (i === target ? { ...r, amount: amt } : r));
    });
    setSaveError('');
  };

  const handlePlanChange = (pid: string) => {
    setPlanId(pid);
    setPreview(null);
    setDownPayment('');
    setSaveError('');
    setPreviewError('');
  };

  const handleSave = () => {
    if (saving) return;
    if (!isCashCustomer && !planId) {
      setSaveError(t('pos.selectInstallmentPlan'));
      return;
    }
    if (!isCashCustomer && !preview) {
      setSaveError(t('pos.installmentPreviewFailed'));
      return;
    }
    if (!canSave) {
      setSaveError(isCashCustomer ? t('pos.paymentNotComplete') : t('pos.downPaymentNotComplete'));
      return;
    }
    setSaveError('');
    const active = payments
      .filter((p) => parsePosAmount(p.amount) > 0)
      .map(({ payment_method, amount, reference }) => ({
        payment_method,
        amount: roundMoney(parsePosAmount(amount)).toFixed(2),
        reference,
      }));

    if (isCashCustomer) {
      onConfirm({
        payments: active,
        paymentMethod: active.length > 1 ? 'mixed' : active[0]?.payment_method || 'cash',
      });
    } else {
      onConfirm({
        payments: active,
        paymentMethod: 'installment',
        installmentPlanId: planId,
        downPaymentAmount: roundMoney(requiredDown).toFixed(2),
        numInstallments: preview?.num_installments,
      });
    }
  };

  const cell = 'border border-slate-400 px-3 py-2 text-sm font-bold bg-white';
  const label = `${cell} text-slate-800`;
  const value = `${cell} text-end font-black tabular-nums`;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className={SHEET_SHELL}>
        <div className="flex items-center justify-between bg-[#4169E1] px-4 py-3.5 text-white shrink-0">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-base font-black">{t('pos.orderPayment')}</h2>
          <span className="w-9" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 bg-white">
          {!isCashCustomer ? (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800">{t('pos.choosePaymentSystem')}</label>
              <select
                className="w-full h-12 rounded-full border-2 border-slate-200 bg-slate-50 px-4 text-sm font-bold"
                value={planId}
                onChange={(e) => handlePlanChange(e.target.value)}
              >
                <option value="">{t('pos.selectInstallmentPlan')}</option>
                {plans.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name_ar}
                  </option>
                ))}
              </select>
              {previewLoading ? <p className="text-sm text-slate-500 text-center">{t('inventory.loading')}</p> : null}
              {previewError ? <p className="text-sm text-red-600 text-center font-bold">{previewError}</p> : null}
            </div>
          ) : null}

          {/* ملخص الدفع — إجمالي − مدفوع = متبقي */}
          <table className="w-full border-collapse text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            <tbody>
              <tr>
                <td className={label}>{t('pos.paymentInvoiceTotal')}</td>
                <td className={value}>{fmtPosAmount(invoiceTotal)}</td>
              </tr>
              {!isCashCustomer && preview ? (
                <tr>
                  <td className={label}>{t('pos.requiredDownPayment')}</td>
                  <td className={`${value} text-violet-800`}>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-full border-0 bg-transparent text-end font-black outline-none"
                      value={downPayment}
                      onChange={(e) => {
                        setDownPayment(e.target.value.replace(/[^\d.٠-٩]/g, ''));
                        setSaveError('');
                      }}
                    />
                  </td>
                </tr>
              ) : null}
              <tr>
                <td className={label}>{t('pos.paymentPaidTotal')}</td>
                <td className={`${value} text-emerald-700`}>{fmtPosAmount(paidTotal)}</td>
              </tr>
              <tr className="bg-blue-50">
                <td className={`${label} bg-blue-100 text-base`}>{t('pos.paymentRemaining')}</td>
                <td className={`${value} bg-blue-200 text-blue-900 text-3xl`}>{fmtPosAmount(remaining)}</td>
              </tr>
            </tbody>
          </table>

          <p className="text-center text-xs font-bold text-slate-500">
            {t('pos.paymentFormulaHint')}
          </p>

          <div className="space-y-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full h-10 rounded-full border-2 border-blue-300 font-bold text-blue-800"
              onClick={fillRequiredPayment}
            >
              {isCashCustomer ? t('pos.fillInvoiceTotal') : t('pos.fillDownPayment')}
            </Button>

            <div className="flex items-center justify-end gap-2">
              <span className="text-sm font-bold">{t('pos.addPaymentMethod')}</span>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4169E1] text-white"
                onClick={() => setPayments((prev) => [...prev, newRow(addMethod)])}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <select
              className="w-full h-11 rounded-full border-2 border-slate-200 px-4 text-sm font-bold"
              value={addMethod}
              onChange={(e) => setAddMethod(e.target.value)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {t(m.labelKey)}
                </option>
              ))}
            </select>

            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-3 py-2"
              >
                <span className="shrink-0 text-xs font-bold">
                  {t(PAYMENT_METHODS.find((m) => m.id === p.payment_method)?.labelKey || 'pos.payCashLine')}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="h-10 min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 text-end text-xl font-black tabular-nums outline-none"
                  value={p.amount}
                  placeholder="0"
                  onChange={(e) => updateAmount(p.id, e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* تفاصيل التقسيط — كما في الصورة */}
          {preview ? (
            <div className="space-y-3 border-t-2 border-slate-300 pt-4">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>{t('pos.receiptDate')}: {new Date().toLocaleString('ar-EG')}</span>
                <span>{t('pos.receiptUser')}: {user?.full_name || user?.username || '—'}</span>
              </div>

              <table className="w-full border-collapse text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                <tbody>
                  <tr>
                    <td className={label}>{t('pos.receiptCreditFromInvoice')}</td>
                    <td className={value}>{fmtPosAmount(installmentCredit)}</td>
                  </tr>
                  <tr>
                    <td className={label}>{t('pos.receiptPreviousBalance')}</td>
                    <td className={value}>{fmtPosAmount(customerBalance)}</td>
                  </tr>
                  <tr>
                    <td className={label}>{t('pos.receiptCollected')}</td>
                    <td className={`${value} text-emerald-700`}>{fmtPosAmount(paidTotal)}</td>
                  </tr>
                  <tr>
                    <td className={`${label} bg-blue-50`}>{t('pos.receiptCurrentBalance')}</td>
                    <td className={`${value} bg-blue-50 text-xl text-blue-900`}>
                      {fmtPosAmount(previewCurrentBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <p className="text-center text-sm font-black">{t('pos.receiptScheduleTitle')}</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                  <thead>
                    <tr>
                      <th className={cell}>{t('pos.installmentDueDate')}</th>
                      <th className={cell}>{t('pos.installmentAmount')}</th>
                      {showPenalty ? (
                        <>
                          <th className={cell}>{t('pos.receiptPenalty')}</th>
                          <th className={`${cell} text-end`}>{t('pos.receiptInstallmentTotal')}</th>
                        </>
                      ) : (
                        <th className={`${cell} text-end`}>{t('pos.receiptInstallmentTotal')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.schedule.map((ln) => {
                      const base = parsePosAmount(ln.amount);
                      const penalty = showPenalty ? penaltyAmount : 0;
                      const total = base + penalty;
                      return (
                        <tr key={ln.sequence}>
                          <td className={label}>{ln.due_month_label}</td>
                          <td className={value}>{fmtPosAmount(base)}</td>
                          {showPenalty ? (
                            <>
                              <td className={value}>{fmtPosAmount(penalty)}</td>
                              <td className={value}>{fmtPosAmount(total)}</td>
                            </>
                          ) : (
                            <td className={value}>{fmtPosAmount(base)}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <table className="w-full border-collapse text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                <tbody>
                  <tr>
                    <td className={label}>{t('pos.receiptInstallmentsCount')}</td>
                    <td className={value}>{preview.num_installments}</td>
                  </tr>
                  <tr>
                    <td className={label}>{t('pos.receiptRemainingInstallments')}</td>
                    <td className={`${value} text-lg text-blue-900`}>{fmtPosAmount(scheduleTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}

          {preview && (onReserve || onQuotation || onDelivery) ? (
            <PosInvoiceActionBar
              onReserve={() => {
                const active = payments.filter((p) => parsePosAmount(p.amount) > 0);
                const paid = roundMoney(active.reduce((s, p) => s + parsePosAmount(p.amount), 0));
                onReserve?.({
                  amount: paid.toFixed(2),
                  method: active[0]?.payment_method || 'cash',
                });
              }}
              onQuotation={onQuotation}
              onDelivery={onDelivery}
              disabled={saving}
              docSaving={docSaving}
            />
          ) : null}

          {saveError || checkoutError ? (
            <div className="rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-center text-sm font-black text-red-700">
              {saveError || checkoutError}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 bg-[#4169E1] px-4 py-4">
          <div className="flex justify-start gap-3">
            <Button
              className="h-11 min-w-[100px] rounded-xl bg-sky-300 font-black text-slate-900 hover:bg-sky-400 disabled:opacity-70"
              disabled={saving}
              onClick={handleSave}
            >
              {t('common.save')}
            </Button>
            <Button
              variant="outline"
              className="h-11 min-w-[100px] rounded-xl border-0 bg-white font-black text-[#4169E1]"
              onClick={onClose}
              disabled={saving}
            >
              {t('inventory.cancel')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
