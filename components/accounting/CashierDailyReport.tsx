import React from 'react';
import { fmtMoney } from '@/components/accounting/AccountingUi';
import type { CashierDailyReportDto } from '@/lib/api/accounting';

type Labels = {
  title: string;
  totalSales: string;
  creditSales: string;
  cashAndDown: string;
  customerReturns: string;
  downPaymentRefunds: string;
  installmentCollections: string;
  totalCashShift: string;
  generalExpensesTotal: string;
  supplierPaymentsTotal: string;
  wagesTotal: string;
  netCash: string;
};

type Props = {
  report: CashierDailyReportDto;
  labels: Labels;
  className?: string;
  id?: string;
};

function ReportRow({
  label,
  amount,
  variant = 'default',
  indent = false,
}: {
  label: string;
  amount: string;
  variant?: 'default' | 'header' | 'highlight-blue' | 'highlight-yellow' | 'header-dark';
  indent?: boolean;
}) {
  const styles: Record<string, string> = {
    default: 'bg-white text-slate-900',
    header: 'bg-emerald-100 text-emerald-950 font-bold',
    'header-dark': 'bg-emerald-200 text-emerald-950 font-bold',
    'highlight-blue': 'bg-sky-100 text-sky-950 font-bold border-y-2 border-slate-900',
    'highlight-yellow': 'bg-amber-200 text-amber-950 font-bold border-y-2 border-amber-500',
  };
  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${styles[variant]} ${indent ? 'ps-6' : ''}`}
    >
      <span>{label}</span>
      <span className="tabular-nums whitespace-nowrap font-semibold">{fmtMoney(amount)}</span>
    </div>
  );
}

function ExpenseBlock({
  totalLabel,
  total,
  items,
}: {
  totalLabel: string;
  total: string;
  items: { name: string; amount: string }[];
}) {
  const showItems = Number(total) > 0 && items.length > 0;
  return (
    <div className="border-t border-slate-200">
      <ReportRow label={totalLabel} amount={total} variant="header" />
      {showItems
        ? items.map((item) => (
            <ReportRow key={`${item.name}-${item.amount}`} label={item.name} amount={item.amount} indent />
          ))
        : null}
    </div>
  );
}

export function CashierDailyReport({ report, labels, className = '', id }: Props) {
  return (
    <div
      id={id}
      className={`overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm ${className}`}
      dir="rtl"
    >
      <div className="border-b border-slate-300 bg-slate-50 px-3 py-2 text-center">
        <p className="text-base font-bold text-slate-900">{labels.title}</p>
        <p className="text-xs text-slate-600">
          {report.shift_code} — {report.employee_name}
        </p>
      </div>

      <div>
        <ReportRow label={labels.totalSales} amount={report.sales.total} variant="header" />
        <ReportRow label={labels.creditSales} amount={report.sales.credit} indent />
        <ReportRow label={labels.cashAndDown} amount={report.sales.cash_and_down} indent />
      </div>

      <div className="border-t-4 border-slate-900">
        <ReportRow label={labels.customerReturns} amount={report.adjustments.customer_returns} />
        <ReportRow label={labels.downPaymentRefunds} amount={report.adjustments.down_payment_refunds} />
        <ReportRow
          label={labels.installmentCollections}
          amount={report.adjustments.installment_collections}
        />
        <ReportRow label={labels.totalCashShift} amount={report.total_cash_shift} variant="highlight-blue" />
      </div>

      <ExpenseBlock
        totalLabel={labels.generalExpensesTotal}
        total={report.general_expenses.total}
        items={report.general_expenses.items}
      />
      <ExpenseBlock
        totalLabel={labels.supplierPaymentsTotal}
        total={report.supplier_payments.total}
        items={report.supplier_payments.items}
      />
      <ExpenseBlock
        totalLabel={labels.wagesTotal}
        total={report.wages.total}
        items={report.wages.items}
      />

      <ReportRow label={labels.netCash} amount={report.net_cash} variant="highlight-yellow" />
    </div>
  );
}

export function buildCashierDailyReportLabels(t: (key: string) => string): Labels {
  return {
    title: t('accounting.cashierDailyReport'),
    totalSales: t('accounting.reportTotalSales'),
    creditSales: t('accounting.reportCreditSales'),
    cashAndDown: t('accounting.reportCashAndDown'),
    customerReturns: t('accounting.reportCustomerReturns'),
    downPaymentRefunds: t('accounting.reportDownPaymentRefunds'),
    installmentCollections: t('accounting.reportInstallmentCollections'),
    totalCashShift: t('accounting.reportTotalCashShift'),
    generalExpensesTotal: t('accounting.reportGeneralExpenses'),
    supplierPaymentsTotal: t('accounting.reportSupplierPayments'),
    wagesTotal: t('accounting.reportWages'),
    netCash: t('accounting.reportNetCash'),
  };
}

export function printCashierDailyReportHtml(
  report: CashierDailyReportDto,
  labels: Labels,
  actualBalance?: string,
): string {
  const row = (label: string, amount: string, style: string, indent = false) =>
    `<div style="display:flex;justify-content:space-between;padding:6px 12px;${style}${indent ? 'padding-right:24px' : ''}">
      <span>${label}</span><span style="font-weight:600">${fmtMoney(amount)}</span>
    </div>`;

  const expenseBlock = (totalLabel: string, total: string, items: { name: string; amount: string }[]) => {
    const show = Number(total) > 0 && items.length;
    return `
      ${row(totalLabel, total, 'background:#d1fae5;font-weight:bold;')}
      ${
        show
          ? items
              .map((i) => row(i.name, i.amount, 'background:#fff;', true))
              .join('')
          : ''
      }
    `;
  };

  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
    <title>${labels.title}</title>
    <style>body{font-family:Cairo,'Times New Roman',serif;margin:0;padding:12px;font-size:13px}
    @media print{body{padding:0}}</style></head><body>
    <div style="text-align:center;margin-bottom:8px">
      <div style="font-size:16px;font-weight:bold">${labels.title}</div>
      <div style="font-size:11px;color:#555">${report.shift_code} — ${report.employee_name}</div>
    </div>
    ${row(labels.totalSales, report.sales.total, 'background:#d1fae5;font-weight:bold;')}
    ${row(labels.creditSales, report.sales.credit, 'background:#fff;', true)}
    ${row(labels.cashAndDown, report.sales.cash_and_down, 'background:#fff;', true)}
    <div style="border-top:3px solid #000">
      ${row(labels.customerReturns, report.adjustments.customer_returns, 'background:#fff;')}
      ${row(labels.downPaymentRefunds, report.adjustments.down_payment_refunds, 'background:#fff;')}
      ${row(labels.installmentCollections, report.adjustments.installment_collections, 'background:#fff;')}
      ${row(labels.totalCashShift, report.total_cash_shift, 'background:#bae6fd;font-weight:bold;border-top:2px solid #000;border-bottom:2px solid #000;')}
    </div>
    ${expenseBlock(labels.generalExpensesTotal, report.general_expenses.total, report.general_expenses.items)}
    ${expenseBlock(labels.supplierPaymentsTotal, report.supplier_payments.total, report.supplier_payments.items)}
    ${expenseBlock(labels.wagesTotal, report.wages.total, report.wages.items)}
    ${row(`${labels.netCash} = ${fmtMoney(report.net_cash)} ج`, report.net_cash, 'background:#fde68a;font-weight:bold;border-top:2px solid #f59e0b;')}
    ${
      actualBalance
        ? `<p style="margin-top:12px;text-align:center;font-size:12px">${labels.netCash} (جرد): <b>${fmtMoney(actualBalance)}</b></p>`
        : ''
    }
    <p style="margin-top:8px;text-align:center;font-size:11px;color:#666">${new Date().toLocaleString('ar-EG')}</p>
  </body></html>`;
}
