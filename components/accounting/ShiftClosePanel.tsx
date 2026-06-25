import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';
import { fmtMoney } from '@/components/accounting/AccountingUi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { CashierDailyReportDto, CashShiftDto } from '@/lib/api/accounting';
import {
  editableFromReport,
  moneyStr,
  num,
  recalcShiftClose,
  sumItems,
  type EditableShiftClose,
} from '@/lib/accounting/shiftCloseCalc';
import { buildCashierDailyReportLabels } from '@/components/accounting/CashierDailyReport';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type Labels = ReturnType<typeof buildCashierDailyReportLabels> & {
  openingBalance: string;
  expectedDrawer: string;
  countedCash: string;
  difference: string;
  autoCalcHint: string;
  resetAuto: string;
  editHint: string;
};

type Props = {
  report: CashierDailyReportDto;
  shift: CashShiftDto;
  countedBalance: string;
  onCountedBalanceChange: (v: string) => void;
  onEditableChange?: (state: EditableShiftClose) => void;
};

function MoneyInput({
  value,
  onChange,
  className = '',
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Input
      type="number"
      step="0.01"
      min="0"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 text-end tabular-nums font-semibold px-2 ${className}`}
    />
  );
}

function SectionHeader({ label, amount, onAmountChange }: { label: string; amount: string; onAmountChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-emerald-100 px-3 py-2">
      <span className="text-sm font-bold text-emerald-950">{label}</span>
      <MoneyInput value={amount} onChange={onAmountChange} className="w-28 bg-white" />
    </div>
  );
}

function SubRow({ label, amount, onChange }: { label: string; amount: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 ps-6 bg-white border-b border-slate-50">
      <span className="text-sm text-slate-700">{label}</span>
      <MoneyInput value={amount} onChange={onChange} className="w-28" />
    </div>
  );
}

function ItemRows({
  items,
  onChange,
}: {
  items: { name: string; amount: string }[];
  onChange: (items: { name: string; amount: string }[]) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="border-b border-slate-100">
      {items.map((item, idx) => (
        <div key={`${item.name}-${idx}`} className="flex items-center gap-2 px-3 py-1 ps-8 bg-slate-50/50">
          <span className="flex-1 text-xs text-slate-600 truncate">{item.name}</span>
          <MoneyInput
            value={item.amount}
            onChange={(v) => {
              const next = [...items];
              next[idx] = { ...item, amount: v };
              onChange(next);
            }}
            className="w-24 h-7 text-xs"
          />
        </div>
      ))}
    </div>
  );
}

export function ShiftClosePanel({
  report,
  shift,
  countedBalance,
  onCountedBalanceChange,
  onEditableChange,
}: Props) {
  const { t } = useLanguage();
  const labels: Labels = useMemo(
    () => ({
      ...buildCashierDailyReportLabels(t),
      openingBalance: t('accounting.openingBalance'),
      expectedDrawer: t('accounting.expectedDrawer'),
      countedCash: t('accounting.netCashLabel'),
      difference: t('accounting.difference'),
      autoCalcHint: t('accounting.autoCalcHint'),
      resetAuto: t('accounting.resetAutoValues'),
      editHint: t('accounting.editReportHint'),
    }),
    [t],
  );

  const [editable, setEditable] = useState<EditableShiftClose>(() => editableFromReport(report, shift));
  const [manualCounted, setManualCounted] = useState(false);

  useEffect(() => {
    setEditable(editableFromReport(report, shift));
    setManualCounted(false);
  }, [report, shift]);

  const totals = useMemo(
    () => recalcShiftClose(editable, countedBalance),
    [editable, countedBalance],
  );

  useEffect(() => {
    if (!manualCounted) {
      onCountedBalanceChange(totals.expected_drawer);
    }
  }, [totals.expected_drawer, manualCounted, onCountedBalanceChange]);

  useEffect(() => {
    onEditableChange?.(editable);
  }, [editable, onEditableChange]);

  const patch = (partial: Partial<EditableShiftClose>) => {
    setEditable((prev) => {
      const next = { ...prev, ...partial };
      if ('sales_total' in partial || 'sales_cash' in partial) {
        const total = num(next.sales_total);
        const cash = num(next.sales_cash);
        next.sales_credit = moneyStr(Math.max(total - cash, 0));
      }
      if ('general_expenses_items' in partial && partial.general_expenses_items) {
        next.general_expenses_total = moneyStr(sumItems(partial.general_expenses_items));
      }
      if ('supplier_payments_items' in partial && partial.supplier_payments_items) {
        next.supplier_payments_total = moneyStr(sumItems(partial.supplier_payments_items));
      }
      if ('wages_items' in partial && partial.wages_items) {
        next.wages_total = moneyStr(sumItems(partial.wages_items));
      }
      return next;
    });
  };

  const resetToAuto = () => {
    setEditable(editableFromReport(report, shift));
    setManualCounted(false);
  };

  const diffNum = num(totals.difference);
  const diffClass =
    diffNum === 0 ? 'text-emerald-700' : diffNum > 0 ? 'text-sky-700' : 'text-red-700';

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Calculator className="h-4 w-4" />
          {labels.title}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={resetToAuto}>
          <RotateCcw className="h-3.5 w-3.5 me-1" />
          {labels.resetAuto}
        </Button>
      </div>
      <p className="text-xs text-slate-500">{labels.editHint}</p>

      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-600">
          {report.shift_code} — {report.employee_name} — {report.branch_name}
        </div>

        <SubRow
          label={labels.openingBalance}
          amount={editable.opening_balance}
          onChange={(v) => patch({ opening_balance: v })}
        />

        <SectionHeader
          label={labels.totalSales}
          amount={editable.sales_total}
          onAmountChange={(v) => patch({ sales_total: v })}
        />
        <SubRow
          label={labels.creditSales}
          amount={editable.sales_credit}
          onChange={(v) => patch({ sales_credit: v })}
        />
        <SubRow
          label={labels.cashAndDown}
          amount={editable.sales_cash}
          onChange={(v) => patch({ sales_cash: v })}
        />

        <div className="border-t-4 border-slate-900">
          <SubRow
            label={labels.customerReturns}
            amount={editable.customer_returns}
            onChange={(v) => patch({ customer_returns: v })}
          />
          <SubRow
            label={labels.downPaymentRefunds}
            amount={editable.down_payment_refunds}
            onChange={(v) => patch({ down_payment_refunds: v })}
          />
          <SubRow
            label={labels.installmentCollections}
            amount={editable.installment_collections}
            onChange={(v) => patch({ installment_collections: v })}
          />
          <div className="flex items-center justify-between gap-2 bg-sky-100 border-y-2 border-slate-900 px-3 py-2">
            <span className="text-sm font-bold text-sky-950">{labels.totalCashShift}</span>
            <span className="tabular-nums font-bold text-sky-950">{fmtMoney(totals.total_cash_shift)}</span>
          </div>
        </div>

        <SectionHeader
          label={labels.generalExpensesTotal}
          amount={editable.general_expenses_total}
          onAmountChange={(v) => patch({ general_expenses_total: v })}
        />
        <ItemRows
          items={editable.general_expenses_items}
          onChange={(items) => patch({ general_expenses_items: items })}
        />

        <SectionHeader
          label={labels.supplierPaymentsTotal}
          amount={editable.supplier_payments_total}
          onAmountChange={(v) => patch({ supplier_payments_total: v })}
        />
        <ItemRows
          items={editable.supplier_payments_items}
          onChange={(items) => patch({ supplier_payments_items: items })}
        />

        <SectionHeader
          label={labels.wagesTotal}
          amount={editable.wages_total}
          onAmountChange={(v) => patch({ wages_total: v })}
        />
        <ItemRows items={editable.wages_items} onChange={(items) => patch({ wages_items: items })} />

        <div className="flex items-center justify-between gap-2 bg-amber-200 border-y-2 border-amber-500 px-3 py-2">
          <span className="text-sm font-bold text-amber-950">{labels.netCash}</span>
          <span className="tabular-nums font-bold text-amber-950">{fmtMoney(totals.net_cash)}</span>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-violet-900">{labels.expectedDrawer}</label>
          <p className="text-lg font-bold tabular-nums text-violet-950">{fmtMoney(totals.expected_drawer)}</p>
          <p className="text-[10px] text-violet-700">{labels.autoCalcHint}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-violet-900">{labels.countedCash}</label>
          <MoneyInput
            value={countedBalance}
            onChange={(v) => {
              setManualCounted(true);
              onCountedBalanceChange(v);
            }}
            className="mt-1 w-full h-10 text-base bg-white"
          />
        </div>
        <div className="sm:col-span-2 flex items-center justify-between rounded-lg bg-white border px-3 py-2">
          <span className="text-sm font-medium text-slate-700">{labels.difference}</span>
          <span className={`text-lg font-bold tabular-nums ${diffClass}`}>
            {diffNum > 0 ? '+' : ''}
            {fmtMoney(totals.difference)}
          </span>
        </div>
      </div>
    </div>
  );
}
